'use strict';

var assert = require('chai').assert;
var path = require('path');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var cryptoStub = require('../../../../../../mocks/hipay/cryptoStub');
var xmlStub = require('../../../../../../mocks/hipay/xmlStreamReaderStub');

var modulePath = path.resolve(__dirname, '../../../../../../../cartridges/int_hipay_core/cartridge/scripts/lib/hipay/modules/hipayNotificationModule');

var PASSPHRASE = 'test-passphrase';

function makeHiPayLoggerStub(logs) {
    function FakeHiPayLogger() {}
    FakeHiPayLogger.prototype.info = function (msg) { logs.info.push(msg); };
    FakeHiPayLogger.prototype.error = function (msg) { logs.error.push(msg); };
    FakeHiPayLogger.prototype.debug = function (msg) { logs.debug.push(msg); };
    return FakeHiPayLogger;
}

function loadModule(state) {
    return proxyquire(modulePath, {
        'dw/object/CustomObjectMgr': {
            createCustomObject: function (type, id) {
                var instance = { custom: {} };
                state.createdObjects.push({ type: type, id: id, instance: instance });
                return instance;
            }
        },
        'dw/util/Calendar': function () {},
        'dw/util/StringUtils': { formatCalendar: function () { return '20260729000000000'; } },
        'dw/system/Transaction': { wrap: function (cb) { return cb(); } },
        '*/cartridge/scripts/lib/hipay/hipayHelper': {},
        '*/cartridge/scripts/util/hipayConstants': { OBJ_NOTIFICATION: 'hipayNotification' },
        '*/cartridge/scripts/lib/hipay/hipayLogger': makeHiPayLoggerStub(state.logs),
        '*/cartridge/scripts/lib/hipay/hipayConfig': { HiPayConfig: { hipayApiPassphrase: PASSPHRASE } },
        '*/cartridge/scripts/lib/hipay/hipaySignitureMgr': proxyquire(
            path.resolve(__dirname, '../../../../../../../cartridges/int_hipay_core/cartridge/scripts/lib/hipay/hipaySignitureMgr'),
            {
                'dw/crypto/MessageDigest': cryptoStub.MessageDigest,
                'dw/crypto/Encoding': cryptoStub.Encoding,
                'dw/util/Bytes': cryptoStub.Bytes,
                'dw/system/Site': cryptoStub.makeSiteStub('DIGEST_SHA_256')
            }
        ),
        'dw/io/Reader': xmlStub.Reader,
        'dw/io/XMLStreamReader': xmlStub.XMLStreamReader
    });
}

/**
 * @param {Object} options
 * @param {Object} [options.headers]
 * @param {Array} [options.formEntries]
 * @param {String|Function} [options.rawBody] - a string, or a function(accessCount) returning
 *   a string, letting a test detect a second read by "poisoning" the value it returns.
 */
function fakeRequest(options) {
    var headers = options.headers || {};
    var formEntries = options.formEntries || [];
    var rawBodyAccessCount = 0;
    var httpParameterMap = {};

    Object.defineProperty(httpParameterMap, 'requestBodyAsString', {
        get: function () {
            rawBodyAccessCount += 1;
            return typeof options.rawBody === 'function' ? options.rawBody(rawBodyAccessCount) : options.rawBody;
        }
    });

    return {
        getHttpHeaders: function () {
            return {
                get: function (name) {
                    return Object.prototype.hasOwnProperty.call(headers, name) ? headers[name] : null;
                }
            };
        },
        getHttpParameters: function () {
            return {
                entrySet: function () {
                    return formEntries.map(function (entry) {
                        return {
                            getKey: function () { return entry.key; },
                            getValue: function () { return [entry.value]; }
                        };
                    });
                }
            };
        },
        httpParameterMap: httpParameterMap,
        getRawBodyAccessCount: function () { return rawBodyAccessCount; }
    };
}

function formSignature(pairs) {
    var paramsList = pairs.map(function (p) {
        return encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value).replace(/\*/g, '%2A');
    });

    return cryptoStub.expectedHex(paramsList.join('&') + PASSPHRASE);
}

function xmlSignature(rawBody) {
    return cryptoStub.expectedHex(rawBody + PASSPHRASE);
}

function xmlNotificationBody(overrides) {
    var fields = Object.assign({
        orderId: 'SG01_00009801_1574781117343',
        status: '116',
        transactionReference: 'TXN-1',
        attemptId: '1'
    }, overrides || {});

    var optionalTags = '';

    if (fields.capturedAmount !== undefined) {
        optionalTags += '<captured_amount>' + fields.capturedAmount + '</captured_amount>';
    }
    if (fields.message !== undefined) {
        optionalTags += '<message>' + fields.message + '</message>';
    }

    return '<notification>'
        + '<order><Id>' + fields.orderId + '</Id></order>'
        + '<status>' + fields.status + '</status>'
        + '<transaction_reference>' + fields.transactionReference + '</transaction_reference>'
        + '<attempt_id>' + fields.attemptId + '</attempt_id>'
        + optionalTags
        + '</notification>';
}

function xmlRequest(rawBody, headerOverrides) {
    var headers = Object.assign({ 'content-type': 'text/xml', 'x-allopass-signature': xmlSignature(rawBody) }, headerOverrides || {});
    return fakeRequest({ headers: headers, rawBody: rawBody });
}

describe('hipayNotificationModule', function () {
    var state;

    before(function () {
        // Set (not saved/restored) so it's available regardless of load/run order relative to
        // sibling spec files sharing this Node process -- empty() is a pure, side-effect-free
        // SFCC global polyfill, so leaving it defined for the rest of the run is harmless.
        global.empty = function empty(value) {
            return value === null || value === undefined || value === '';
        };
    });

    beforeEach(function () {
        state = { createdObjects: [], logs: { info: [], error: [], debug: [] } };
        xmlStub.resetInstances();
    });

    describe('FORM path (non-regression)', function () {
        it('3. keeps form normalization/parameter handling and queue behavior unchanged', function () {
            var mod = loadModule(state);
            var pairs = [
                { key: 'order[id]', value: 'SG01_00009801_1574781117343' },
                { key: 'status', value: '116' },
                { key: 'transaction_reference', value: 'TXN-1' },
                { key: 'attempt_id', value: '1' }
            ];
            var request = fakeRequest({
                headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-allopass-signature': formSignature(pairs) },
                formEntries: pairs
            });

            assert.isTrue(mod.processIncomingNotification(request));

            assert.lengthOf(state.createdObjects, 1);
            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.deepEqual(stored, {
                'order[id]': 'SG01_00009801_1574781117343',
                status: '116',
                transaction_reference: 'TXN-1',
                attempt_id: '1'
            });
        });

        it('never accesses httpParameterMap.requestBodyAsString for a form request', function () {
            var mod = loadModule(state);
            var pairs = [
                { key: 'order[id]', value: 'SG01_00009801_1574781117343' },
                { key: 'status', value: '116' },
                { key: 'transaction_reference', value: 'TXN-1' },
                { key: 'attempt_id', value: '1' }
            ];
            var request = fakeRequest({
                headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-allopass-signature': formSignature(pairs) },
                formEntries: pairs
            });

            mod.processIncomingNotification(request);

            assert.strictEqual(request.getRawBodyAccessCount(), 0);
        });

        it('4. logs a generic message on an invalid form signature, never the parameter map', function () {
            var mod = loadModule(state);
            var request = fakeRequest({
                headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-allopass-signature': 'wrong' },
                formEntries: [{ key: 'status', value: '116' }]
            });

            assert.isFalse(mod.processIncomingNotification(request));

            assert.isAtLeast(state.logs.error.length, 1);
            state.logs.error.forEach(function (msg) {
                assert.notInclude(msg, '[object');
                assert.notInclude(msg.toLowerCase(), 'httpparametermap');
                assert.notInclude(msg, 'status : 116');
            });
            assert.include(state.logs.error, 'The notification call from HiPay has an invalid signature!');
        });
    });

    describe('XML content-type detection + signature (4-10)', function () {
        var contentTypeCases = [
            { label: '4. text/xml', header: 'text/xml' },
            { label: '5. text/xml; charset=UTF-8', header: 'text/xml; charset=UTF-8' },
            { label: '6. application/xml', header: 'application/xml' },
            { label: '7. application/xml; charset=UTF-8', header: 'application/xml; charset=UTF-8' }
        ];

        contentTypeCases.forEach(function (testCase) {
            it('accepts a valid XML notification with Content-Type ' + testCase.label, function () {
                var mod = loadModule(state);
                var rawBody = xmlNotificationBody();
                var request = fakeRequest({
                    headers: { 'content-type': testCase.header, 'x-allopass-signature': xmlSignature(rawBody) },
                    rawBody: rawBody
                });

                assert.isTrue(mod.processIncomingNotification(request));
            });
        });

        it('8. rejects an invalid XML signature', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody, { 'x-allopass-signature': 'wrong-signature' });

            assert.isFalse(mod.processIncomingNotification(request));
            assert.lengthOf(state.createdObjects, 0);
        });

        it('9. rejects an XML notification with a missing signature header', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = fakeRequest({ headers: { 'content-type': 'text/xml' }, rawBody: rawBody });

            assert.isFalse(mod.processIncomingNotification(request));
        });

        it('10. rejects an XML notification with an empty body', function () {
            var mod = loadModule(state);
            var request = xmlRequest('');

            assert.isFalse(mod.processIncomingNotification(request));
        });
    });

    describe('single-read entry flow (blocker 5)', function () {
        it('reads httpParameterMap.requestBodyAsString exactly once for a valid XML notification', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.strictEqual(request.getRawBodyAccessCount(), 1);
        });

        it('reads httpParameterMap.requestBodyAsString exactly once even when the XML is invalid', function () {
            var mod = loadModule(state);
            var rawBody = '<notification><status>142</status'; // malformed
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.strictEqual(request.getRawBodyAccessCount(), 1);
        });

        it('uses the exact same raw string for signature validation and for parsing', function () {
            var mod = loadModule(state);
            var validBody = xmlNotificationBody({ status: '142' });
            var poisonedBody = '<notification><status>NOT-THE-SAME-BODY</status></notification>';
            var signatureForValidBody = xmlSignature(validBody);

            // If the code read the body a second time for parsing, it would get poisonedBody
            // instead, which would still be well-formed XML but would produce a different
            // (numeric-invalid / mismatched) result -- so a passing assertion here proves the
            // exact same string instance/value was reused for both steps.
            var request = fakeRequest({
                headers: { 'content-type': 'text/xml', 'x-allopass-signature': signatureForValidBody },
                rawBody: function (accessCount) {
                    return accessCount === 1 ? validBody : poisonedBody;
                }
            });

            assert.isTrue(mod.processIncomingNotification(request));
            assert.strictEqual(request.getRawBodyAccessCount(), 1);

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.strictEqual(stored.status, '142');
        });
    });

    describe('XML character chunk handling (blocker 1)', function () {
        it('accumulates a status value split across multiple CHARACTERS events into "142", not a conflict', function () {
            var mod = loadModule(state);
            var chunkedStatus = '1' + xmlStub.CHUNK_BOUNDARY + '4' + xmlStub.CHUNK_BOUNDARY + '2';
            var rawBody = '<notification>'
                + '<order><Id>ORDER_1</Id></order>'
                + '<status>' + chunkedStatus + '</status>'
                + '<transaction_reference>TXN-1</transaction_reference>'
                + '<attempt_id>1</attempt_id>'
                + '</notification>';
            var request = xmlRequest(rawBody);

            assert.isTrue(mod.processIncomingNotification(request));

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.strictEqual(stored.status, '142');
            assert.notInclude(state.logs.error.join(' | '), 'conflicting');
        });

        it('accumulates a chunked transaction_reference correctly', function () {
            var mod = loadModule(state);
            var chunkedRef = 'TXN' + xmlStub.CHUNK_BOUNDARY + '-' + xmlStub.CHUNK_BOUNDARY + '123';
            var rawBody = '<notification>'
                + '<order><Id>ORDER_1</Id></order>'
                + '<status>116</status>'
                + '<transaction_reference>' + chunkedRef + '</transaction_reference>'
                + '<attempt_id>1</attempt_id>'
                + '</notification>';
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.strictEqual(stored.transaction_reference, 'TXN-123');
        });
    });

    describe('Reader cleanup (blocker 2)', function () {
        it('closes both the XMLStreamReader and the underlying Reader on success', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.isTrue(xmlStub.lastXmlStreamReader().closed, 'XMLStreamReader.close() should have been called');
            assert.strictEqual(xmlStub.lastXmlStreamReader().closeCallCount, 1);
            assert.isTrue(xmlStub.lastReader().closed, 'Reader.close() should have been called');
            assert.strictEqual(xmlStub.lastReader().closeCallCount, 1);
        });

        it('closes both readers even when the XML is malformed', function () {
            var mod = loadModule(state);
            var rawBody = '<notification><status>142</status'; // malformed
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.isTrue(xmlStub.lastXmlStreamReader().closed);
            assert.isTrue(xmlStub.lastReader().closed);
        });
    });

    describe('Trimming of normalized field values (blocker 3)', function () {
        it('trims whitespace/newlines around pretty-printed field values', function () {
            var mod = loadModule(state);
            var rawBody = '<notification>\n'
                + '  <order>\n    <Id>  ORDER_1  </Id>\n  </order>\n'
                + '  <status>\n    116\n  </status>\n'
                + '  <transaction_reference>  TXN-1  </transaction_reference>\n'
                + '  <attempt_id>\t1\t</attempt_id>\n'
                + '  <captured_amount>  49.99  </captured_amount>\n'
                + '</notification>';
            var request = xmlRequest(rawBody);

            assert.isTrue(mod.processIncomingNotification(request));

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.deepEqual(stored, {
                'order[id]': 'ORDER_1',
                status: '116',
                transaction_reference: 'TXN-1',
                attempt_id: '1',
                captured_amount: '49.99'
            });
        });

        it('does not trim message (only order[id]/status/transaction_reference/attempt_id/captured_amount are trimmed)', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody({ message: '  padded message  ' });
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.strictEqual(stored.message, '  padded message  ');
        });

        it('rejects a notification whose mandatory field is whitespace-only', function () {
            var mod = loadModule(state);
            var rawBody = '<notification>'
                + '<order><Id>ORDER_1</Id></order>'
                + '<status>116</status>'
                + '<transaction_reference>   </transaction_reference>'
                + '<attempt_id>1</attempt_id>'
                + '</notification>';
            var request = xmlRequest(rawBody);

            assert.isFalse(mod.processIncomingNotification(request));
            assert.lengthOf(state.createdObjects, 0);
        });

        it('does not trim/normalize the raw body used for the signature calculation', function () {
            var mod = loadModule(state);
            var rawBodyWithPadding = '  \r\n<notification><order><Id>ORDER_1</Id></order><status>116</status>'
                + '<transaction_reference>TXN-1</transaction_reference><attempt_id>1</attempt_id></notification>\r\n  ';
            // Signature computed against the exact untrimmed string.
            var request = xmlRequest(rawBodyWithPadding);

            assert.isTrue(mod.processIncomingNotification(request));

            // A signature computed against the trimmed body must NOT validate, proving the
            // raw body is hashed exactly as received.
            var requestWithTrimmedSignature = fakeRequest({
                headers: { 'content-type': 'text/xml', 'x-allopass-signature': xmlSignature(rawBodyWithPadding.trim()) },
                rawBody: rawBodyWithPadding
            });

            assert.isFalse(mod.processIncomingNotification(requestWithTrimmedSignature));
        });
    });

    describe('XML parsing (12-23)', function () {
        ['142', '116', '117', '118'].forEach(function (statusCode, idx) {
            it((12 + idx) + '. accepts a valid notification with status ' + statusCode, function () {
                var mod = loadModule(state);
                var rawBody = xmlNotificationBody({ status: statusCode });
                var request = xmlRequest(rawBody);

                assert.isTrue(mod.processIncomingNotification(request));

                var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
                assert.strictEqual(stored.status, statusCode);
            });
        });

        it('16. extracts the nested order Id (case-insensitive tag) into order[id]', function () {
            var mod = loadModule(state);
            var rawBody = '<notification>'
                + '<order><ID>NESTED_ORDER_123</ID></order>'
                + '<status>116</status>'
                + '<transaction_reference>TXN-1</transaction_reference>'
                + '<attempt_id>1</attempt_id>'
                + '</notification>';
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.strictEqual(stored['order[id]'], 'NESTED_ORDER_123');
        });

        it('17. rejects (does not store) a notification missing mandatory fields', function () {
            var mod = loadModule(state);
            var rawBody = '<notification>'
                + '<order><Id>ORDER_1</Id></order>'
                + '<status>116</status>'
                + '</notification>'; // missing transaction_reference and attempt_id
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.lengthOf(state.createdObjects, 0);
        });

        it('18. rejects (does not store) conflicting duplicate mandatory fields', function () {
            var mod = loadModule(state);
            var rawBody = '<notification>'
                + '<order><Id>ORDER_1</Id></order>'
                + '<status>116</status>'
                + '<status>117</status>'
                + '<transaction_reference>TXN-1</transaction_reference>'
                + '<attempt_id>1</attempt_id>'
                + '</notification>';
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.lengthOf(state.createdObjects, 0);
        });

        it('19. rejects malformed XML (unterminated tag) instead of throwing', function () {
            var mod = loadModule(state);
            var rawBody = '<notification><status>142</status';
            var request = xmlRequest(rawBody);

            assert.doesNotThrow(function () {
                mod.processIncomingNotification(request);
            });
            assert.lengthOf(state.createdObjects, 0);
        });

        it('20. rejects a body containing <!DOCTYPE before the parser is constructed', function () {
            var mod = loadModule(state);
            var rawBody = '<?xml version="1.0"?><!DOCTYPE foo [<!ELEMENT foo ANY>]><notification><status>142</status></notification>';
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.lengthOf(state.createdObjects, 0);
        });

        it('21. rejects a body containing <!ENTITY before the parser is constructed', function () {
            var mod = loadModule(state);
            var rawBody = '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'
                + '<notification><status>142</status><message>&xxe;</message></notification>';
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.lengthOf(state.createdObjects, 0);
        });

        it('22. maps captured_amount when present', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody({ capturedAmount: '49.99' });
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            var stored = JSON.parse(state.createdObjects[0].instance.custom.notification);
            assert.strictEqual(stored.captured_amount, '49.99');
        });

        it('23. produces a normalized object equivalent in shape to the form path', function () {
            var mod = loadModule(state);

            var xmlBody = xmlNotificationBody({ capturedAmount: '49.99', message: 'Authorized' });
            mod.processIncomingNotification(xmlRequest(xmlBody));
            var xmlStored = JSON.parse(state.createdObjects[0].instance.custom.notification);

            var formPairs = [
                { key: 'order[id]', value: 'SG01_00009801_1574781117343' },
                { key: 'status', value: '116' },
                { key: 'transaction_reference', value: 'TXN-1' },
                { key: 'attempt_id', value: '1' },
                { key: 'captured_amount', value: '49.99' },
                { key: 'message', value: 'Authorized' }
            ];
            mod.processIncomingNotification(fakeRequest({
                headers: { 'content-type': 'application/x-www-form-urlencoded', 'x-allopass-signature': formSignature(formPairs) },
                formEntries: formPairs
            }));
            var formStored = JSON.parse(state.createdObjects[1].instance.custom.notification);

            assert.sameMembers(Object.keys(xmlStored), Object.keys(formStored));
            assert.deepEqual(xmlStored, formStored);
        });
    });

    describe('Downstream storage (24-26)', function () {
        it('24. a valid XML notification reaches persistence and is stored', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody);

            assert.isTrue(mod.processIncomingNotification(request));

            assert.lengthOf(state.createdObjects, 1);
            assert.strictEqual(state.createdObjects[0].type, 'hipayNotification');
        });

        it('25. an invalid XML notification (bad signature) is never stored', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody, { 'x-allopass-signature': 'wrong' });

            mod.processIncomingNotification(request);

            assert.lengthOf(state.createdObjects, 0);
        });

        it('26. existing deduplication (unique id from transaction_reference + attempt_id + timestamp) remains active', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody({ transactionReference: 'TXN-DEDUP', attemptId: '7' });
            var request = xmlRequest(rawBody);

            mod.processIncomingNotification(request);

            assert.lengthOf(state.createdObjects, 1);
            assert.strictEqual(state.createdObjects[0].id, 'TXN-DEDUP-7-20260729000000000');
        });
    });

    describe('legacy standalone exports (checkSignature / saveNotification)', function () {
        it('checkSignature still validates a standalone XML request', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody);

            assert.isTrue(mod.checkSignature(request));
        });

        it('saveNotification still stores a standalone XML request', function () {
            var mod = loadModule(state);
            var rawBody = xmlNotificationBody();
            var request = xmlRequest(rawBody);

            mod.saveNotification(request);

            assert.lengthOf(state.createdObjects, 1);
        });
    });
});
