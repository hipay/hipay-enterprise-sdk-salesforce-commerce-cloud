'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Transaction = require('dw/system/Transaction');

var HiPayHelper = require('*/cartridge/scripts/lib/hipay/hipayHelper');

var Constants = require('*/cartridge/scripts/util/hipayConstants');
var HiPayLogger = require('*/cartridge/scripts/lib/hipay/hipayLogger');
var log = new HiPayLogger('HiPayProcessNotificationCall');

/**
 * Verify signature parameter from notification.
 *
 * @param {Request} request
 * @returns {Boolean}
 */
function checkSignature(request) {
    var HiPayConfig = require('*/cartridge/scripts/lib/hipay/hipayConfig').HiPayConfig;
    var HiPaySignitureMgr = require('*/cartridge/scripts/lib/hipay/hipaySignitureMgr').HiPaySignitureMgr;
    var shaSignature = request.getHttpHeaders().get('x-allopass-signature');
    var isRequestValid = HiPaySignitureMgr.checkIsValidNotification(request.getHttpParameters(), HiPayConfig.hipayApiPassphrase, shaSignature);

    if (!isRequestValid) {
        log.error('The notification call from HiPay has an invalid signature! :: ' + request.httpParameterMap);
    }

    return isRequestValid;
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
 * Store notification in a custom object.
 *
 * @param {Request} request
 */
function saveNotification(request) {
    var notification = getNotificationFromRequest(request);

    // Generate unique ID with Transcation-Attempt-Date.
    var id = [
        notification.transaction_reference,
        notification.attempt_id,
        StringUtils.formatCalendar(new Calendar(), 'yyyyMMddhhmmssSSS')
    ].join('-');

    Transaction.wrap(function () {
        var instance = CustomObjectMgr.createCustomObject(Constants.OBJ_NOTIFICATION, id);
        instance.custom.notification = JSON.stringify(notification);
    });
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
    var order = getOrderFromNotification(notification);
    if (!order) {
        return false;
    }

    var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);

    Transaction.wrap(function () {
        HiPayHelper.updatePaymentStatus(order, paymentInstr, notification.status, notification.captured_amount);
        addOrderNote(order, notification);
    });

    return true;
}

module.exports = {
    checkSignature: checkSignature,
    processNotification: processNotification,
    saveNotification: saveNotification
};
