'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');

var HiPayHelper = require('*/cartridge/scripts/lib/hipay/hipayHelper');

var Constants = require('*/cartridge/scripts/util/hipayConstants');
var HiPayLogger = require('*/cartridge/scripts/lib/hipay/hipayLogger');
var log = new HiPayLogger('HiPayProcessNotificationCall');

// XML notification support -- see processIncomingNotification below.
var XML_CONTENT_TYPES = ['text/xml', 'application/xml'];
var MANDATORY_XML_FIELDS = ['order[id]', 'status', 'transaction_reference', 'attempt_id'];
var SIMPLE_XML_FIELDS = ['status', 'transaction_reference', 'attempt_id', 'captured_amount', 'message'];
var TRIMMED_XML_FIELDS = ['order[id]', 'status', 'transaction_reference', 'attempt_id', 'captured_amount'];
var MAX_XML_BODY_LENGTH = 200000;

/**
 * Normalizes Content-Type: lowercase, strips ";..." parameters, trims.
 *
 * @param {Request} request
 * @returns {String}
 */
function normalizeContentType(request) {
    var rawContentType = request.getHttpHeaders().get('content-type');

    if (empty(rawContentType)) {
        return '';
    }

    return rawContentType.toLowerCase().split(';')[0].trim();
}

/**
 * @param {Request} request
 * @returns {Boolean}
 */
function isXmlNotification(request) {
    return XML_CONTENT_TYPES.indexOf(normalizeContentType(request)) !== -1;
}

/**
 * Reads the raw request body, unmodified.
 *
 * @param {Request} request
 * @returns {String}
 */
function getRawBody(request) {
    return request.httpParameterMap.requestBodyAsString;
}

/**
 * Validates an XML notification's signature against the given raw body.
 *
 * @param {Request} request
 * @param {String} rawBody
 * @returns {Boolean}
 */
function validateXmlSignature(request, rawBody) {
    var HiPayConfig = require('*/cartridge/scripts/lib/hipay/hipayConfig').HiPayConfig;
    var HiPaySignitureMgr = require('*/cartridge/scripts/lib/hipay/hipaySignitureMgr').HiPaySignitureMgr;
    var shaSignature = request.getHttpHeaders().get('x-allopass-signature');
    var isRequestValid;

    log.info('HiPay XML notification :: rawBodyLength=' + (rawBody ? rawBody.length : 0));

    try {
        isRequestValid = HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, HiPayConfig.hipayApiPassphrase, shaSignature);
    } catch (e) {
        isRequestValid = false;
    }

    log.info('HiPay XML notification signature :: ' + (isRequestValid ? 'valid' : 'invalid'));

    if (!isRequestValid) {
        log.error('The XML notification call from HiPay has an invalid signature!');
    }

    return isRequestValid;
}

/**
 * Validates a form-urlencoded notification's signature from parsed HTTP parameters.
 *
 * @param {Request} request
 * @returns {Boolean}
 */
function validateFormSignature(request) {
    var HiPayConfig = require('*/cartridge/scripts/lib/hipay/hipayConfig').HiPayConfig;
    var HiPaySignitureMgr = require('*/cartridge/scripts/lib/hipay/hipaySignitureMgr').HiPaySignitureMgr;
    var shaSignature = request.getHttpHeaders().get('x-allopass-signature');
    var isRequestValid = HiPaySignitureMgr.checkIsValidNotification(request.getHttpParameters(), HiPayConfig.hipayApiPassphrase, shaSignature);

    if (!isRequestValid) {
        log.error('The notification call from HiPay has an invalid signature!');
    }

    return isRequestValid;
}

/**
 * Verify signature parameter from notification.
 *
 * @param {Request} request
 * @returns {Boolean}
 */
function checkSignature(request) {
    var contentType = normalizeContentType(request);
    var isXml = XML_CONTENT_TYPES.indexOf(contentType) !== -1;

    log.info('HiPay notification received :: content-type=' + (contentType || 'unknown') + ' payloadType=' + (isXml ? 'xml' : 'form'));

    if (isXml) {
        return validateXmlSignature(request, getRawBody(request));
    }

    return validateFormSignature(request);
}

/* Creates a formatted text message from the request parameters */

/**
 * Format notification attributes to an order note (string).
 *
 * @param {Object} Notification custom object
 * @returns {String} Note to add to order.
 */
function formatNotificationNote(notification) {
    var requestLog = [];

    for (var i = 0; i < notification.length; i++) {
        var key = notification[i].getKey().toString();
        var value = notification[i].getValue()[0];

        if (!empty(value)
            && key.indexOf('payment_method[') === -1
            && key.indexOf('order[') === -1
            && key.indexOf('three_d_secure') === -1
            && key.indexOf('fraud_screening[') === -1
            && key.indexOf('ip_') === -1
            && key.indexOf('test') === -1
            && key.indexOf('device_id') === -1
            && key.indexOf('cdata') === -1
            && key.indexOf('decimals') === -1
            && key.indexOf('eci') === -1
        ) {
            requestLog.push(key + ' : ' + value);
        }
    }

    requestLog.sort();

    return requestLog.join("\n"); // eslint-disable-line
}

/**
 * Create an order note based on the status message
 *
 * @param {Order} order
 * @param {String} noteSubject
 */
function addOrderNote(order, notification) {
    var noteSubject = 'HiPay Notification - ' + notification.message;
    order.addNote(noteSubject, formatNotificationNote(notification));
}

/**
 * Resolves the flat notification key for an element path, or null if unmapped.
 * id/Id/ID only map to order[id] when directly nested inside <order>.
 *
 * @param {Array} pathStack - element local names from root to current element
 * @returns {String|null}
 */
function resolveFlatKey(pathStack) {
    var lastLower = pathStack.length ? pathStack[pathStack.length - 1].toLowerCase() : '';
    var parentLower = pathStack.length > 1 ? pathStack[pathStack.length - 2].toLowerCase() : '';

    if (parentLower === 'order' && lastLower === 'id') {
        return 'order[id]';
    }

    if (SIMPLE_XML_FIELDS.indexOf(lastLower) !== -1) {
        return lastLower;
    }

    return null;
}

/**
 * Reject unsafe XML declarations before parsing.
 *
 * @param {String} rawBody
 * @returns {Boolean}
 */
function containsUnsafeXmlDeclarations(rawBody) {
    return /<!DOCTYPE/i.test(rawBody) || /<!ENTITY/i.test(rawBody);
}

/**
 * Parses a raw XML notification into the same flat object shape as the form path.
 *
 * XMLStreamReader may split one element's text across several CHARACTERS events, so text is
 * accumulated per element and only finalized on its matching END_ELEMENT.
 *
 * @param {String} rawBody
 * @returns {Object} { valid: Boolean, notification: Object= }
 */
function parseXmlNotification(rawBody) {
    if (empty(rawBody)) {
        log.error('The XML notification call from HiPay has an empty body');
        return { valid: false };
    }

    if (rawBody.length > MAX_XML_BODY_LENGTH) {
        log.error('The XML notification call from HiPay exceeds the maximum accepted payload size');
        return { valid: false };
    }

    if (containsUnsafeXmlDeclarations(rawBody)) {
        log.error('The XML notification call from HiPay contains a disallowed DOCTYPE/ENTITY declaration');
        return { valid: false };
    }

    var Reader = require('dw/io/Reader');
    var XMLStreamReader = require('dw/io/XMLStreamReader');

    var reader;
    var xmlReader;
    var notification = {};
    var conflict = false;

    try {
        reader = new Reader(rawBody);
        xmlReader = new XMLStreamReader(reader);

        var elementStack = []; // { name, key, buffer }

        while (xmlReader.hasNext()) {
            xmlReader.next();

            if (xmlReader.isStartElement()) {
                var name = xmlReader.getLocalName();
                var pathStack = elementStack.map(function (e) { return e.name; }).concat([name]); // eslint-disable-line no-loop-func

                elementStack.push({ name: name, key: resolveFlatKey(pathStack), buffer: '' });
            } else if (xmlReader.isCharacters()) {
                var current = elementStack[elementStack.length - 1];

                if (current && current.key) {
                    current.buffer += xmlReader.getText();
                }
            } else if (xmlReader.isEndElement()) {
                var finished = elementStack.pop();

                if (finished && finished.key) {
                    var isBlank = finished.buffer.trim() === '';

                    if (!isBlank) {
                        var value = TRIMMED_XML_FIELDS.indexOf(finished.key) !== -1 ? finished.buffer.trim() : finished.buffer;

                        if (Object.prototype.hasOwnProperty.call(notification, finished.key)
                            && notification[finished.key] !== value
                            && MANDATORY_XML_FIELDS.indexOf(finished.key) !== -1) {
                            conflict = true;
                        }

                        notification[finished.key] = value;
                    }
                }
            }
        }
    } catch (e) {
        log.error('The XML notification call from HiPay could not be parsed :: malformed XML');
        return { valid: false };
    } finally {
        // XMLStreamReader.close() does not close the underlying Reader (StAX semantics).
        if (xmlReader) {
            try {
                xmlReader.close();
            } catch (e) {
                // ignore
            }
        }

        if (reader) {
            try {
                reader.close();
            } catch (e) {
                // ignore
            }
        }
    }

    if (conflict) {
        log.error('The XML notification call from HiPay contains conflicting duplicate mandatory fields');
        return { valid: false };
    }

    var missing = MANDATORY_XML_FIELDS.filter(function (field) {
        return empty(notification[field]);
    });

    if (missing.length > 0) {
        log.error('The XML notification call from HiPay is missing mandatory fields :: ' + missing.join(','));
        return { valid: false };
    }

    if (!/^\d+$/.test(String(notification.status))) {
        log.error('The XML notification call from HiPay has a non-numeric status');
        return { valid: false };
    }

    log.info('HiPay XML notification parsed :: status=' + notification.status);

    return { valid: true, notification: notification };
}

/**
 * Create simple object from request's parameters.
 *
 * @param {Request} request
 * @returns {object}
 */
function getNotificationFromRequest(request) {
    var httpParams = request.getHttpParameters();
    var entrySet = httpParams.entrySet();

    var notification = {};
    for (var i = 0; i < entrySet.length; i++) {
        var key = entrySet[i].getKey().toString();
        var value = entrySet[i].getValue()[0];

        notification[key] = value;
    }

    return notification;
}

/**
 * Stores a normalized notification object in a custom object.
 *
 * @param {Object} notification
 */
function persistNotification(notification) {
    // Generate unique ID with Transcation-Attempt-Date.
    var id = [
        notification.transaction_reference,
        notification.attempt_id,
        StringUtils.formatCalendar(new Calendar(), 'yyyyMMddhhmmssSSS')
    ].join('-');

    Transaction.wrap(function () {
        var instance = CustomObjectMgr.createCustomObject(Constants.OBJ_NOTIFICATION, id);
        instance.custom.notification = JSON.stringify(notification);
        instance.custom.hipayTimestamp = Date.now().toString();
    });
}

/**
 * Store notification in a custom object.
 *
 * @param {Request} request
 */
function saveNotification(request) {
    var notification;

    if (isXmlNotification(request)) {
        var parsed = parseXmlNotification(getRawBody(request));

        if (!parsed.valid) {
            return;
        }

        notification = parsed.notification;
    } else {
        notification = getNotificationFromRequest(request);
    }

    persistNotification(notification);
}

/**
 * Handles an incoming HiPay notification (form or XML).
 * Reuses the exact XML body for signature validation and parsing.
 *
 * @param {Request} request
 * @returns {Boolean} true if the notification was valid and stored
 */
function processIncomingNotification(request) {
    var contentType = normalizeContentType(request);
    var isXml = XML_CONTENT_TYPES.indexOf(contentType) !== -1;

    log.info('HiPay notification received :: content-type=' + (contentType || 'unknown') + ' payloadType=' + (isXml ? 'xml' : 'form'));

    if (isXml) {
        var rawBody = getRawBody(request);

        if (!validateXmlSignature(request, rawBody)) {
            return false;
        }

        var parsed = parseXmlNotification(rawBody);

        if (!parsed.valid) {
            return false;
        }

        persistNotification(parsed.notification);
        return true;
    }

    if (!validateFormSignature(request)) {
        return false;
    }

    persistNotification(getNotificationFromRequest(request));
    return true;
}

/**
 * Loads Order from notification if possible.
 *
 * @param {Object} Notification custom object
 * @return {Order}
 */
function getOrderFromNotification(notification) {
    var OrderMgr = require('dw/order/OrderMgr');
    var hipayUtils = require('*/cartridge/scripts/lib/hipay/hipayUtils');

    var order = false;
    if (Object.hasOwnProperty.call(notification, 'order[id]')) {
        var orderNo = hipayUtils.extractOrderId(notification['order[id]']);

        if (empty(orderNo)) {
            log.error('The notification call from HiPay does not have a valid OrderNo!');
        }
        order = OrderMgr.getOrder(orderNo);
        if (empty(order)) {
            log.error('The notification call from HiPay bares an OrderNo which is not valid! :: ' + orderNo);
        }
    } else {
        log.error('The notification call from HiPay does not have the order[id] parameter!');
    }

    return order;
}

/**
 * Extracts parameters from the call made from the HiPay hosted page
 *
 * @param {dw.web.HttpParameterMap} httpParams
 */
function processNotification(notification) {
    var OrderMgr = require('dw/order/OrderMgr');
    var hipayUtils = require('*/cartridge/scripts/lib/hipay/hipayUtils');

    // Extract and validate the order number before opening any transaction.
    var orderNo;
    if (Object.hasOwnProperty.call(notification, 'order[id]')) {
        orderNo = hipayUtils.extractOrderId(notification['order[id]']);
    }

    if (empty(orderNo)) {
        log.error('Notification is missing a valid order[id]');
        return false;
    }

    // Pre-check: fail fast without opening a transaction if the order does not exist.
    if (empty(OrderMgr.getOrder(orderNo))) {
        log.error('Notification references unknown order :: ' + orderNo);
        return false;
    }

    Transaction.wrap(function () {
        // Re-fetch the order inside the transaction to get the latest committed version.
        // This prevents stale-read optimistic locking conflicts when a concurrent checkout
        // or notification job has already written to the same order between the pre-check
        // above and this write.
        var order = OrderMgr.getOrder(orderNo);
        if (empty(order)) {
            throw new Error('Order not found inside transaction: ' + orderNo);
        }
        var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);
        HiPayHelper.updatePaymentStatus(order, paymentInstr, notification.status, notification.captured_amount);
        HiPayHelper.updateOrderStatus(order, notification);
        addOrderNote(order, notification);
    });

    return true;
}

module.exports = {
    processIncomingNotification: processIncomingNotification,
    checkSignature: checkSignature,
    processNotification: processNotification,
    saveNotification: saveNotification
};
