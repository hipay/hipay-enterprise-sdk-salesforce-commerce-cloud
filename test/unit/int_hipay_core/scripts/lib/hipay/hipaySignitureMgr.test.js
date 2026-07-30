'use strict';

var assert = require('chai').assert;
var path = require('path');
var proxyquire = require('proxyquire').noCallThru().noPreserveCache();

var cryptoStub = require('../../../../../mocks/hipay/cryptoStub');

var modulePath = path.resolve(__dirname, '../../../../../../cartridges/int_hipay_core/cartridge/scripts/lib/hipay/hipaySignitureMgr');

function loadSignitureMgr(hashAlgoConstant) {
    return proxyquire(modulePath, {
        'dw/crypto/MessageDigest': cryptoStub.MessageDigest,
        'dw/crypto/Encoding': cryptoStub.Encoding,
        'dw/util/Bytes': cryptoStub.Bytes,
        'dw/system/Site': cryptoStub.makeSiteStub(hashAlgoConstant === undefined ? 'DIGEST_SHA_256' : hashAlgoConstant)
    }).HiPaySignitureMgr;
}

function fakeParamsMap(pairs) {
    return {
        get: function (key) {
            var match = pairs.filter(function (p) { return p.key === key; })[0];
            return match ? [match.value] : [undefined];
        },
        entrySet: function () {
            return pairs.map(function (p) {
                return {
                    getKey: function () { return p.key; },
                    getValue: function () { return [p.value]; }
                };
            });
        }
    };
}

describe('hipaySignitureMgr', function () {
    // Set (not saved/restored) so it's available regardless of load/run order relative to
    // sibling spec files sharing this Node process -- empty() is a pure, side-effect-free
    // SFCC global polyfill, so leaving it defined for the rest of the run is harmless.
    before(function () {
        global.empty = function empty(value) {
            return value === null || value === undefined || value === '';
        };
    });

    describe('FORM signature (unchanged notification path)', function () {
        var HiPaySignitureMgr = loadSignitureMgr();
        var passPhrase = 'form-passphrase';
        var pairs = [
            { key: 'status', value: '116' },
            { key: 'transaction_reference', value: 'TXN1' },
            { key: 'attempt_id', value: '1' }
        ];

        function expectedFormHash() {
            var paramsList = pairs
                .slice()
                .map(function (p) {
                    return encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value).replace(/\*/g, '%2A');
                });

            return cryptoStub.expectedHex(paramsList.join('&') + passPhrase);
        }

        it('1. accepts a valid existing form signature', function () {
            var shaSign = expectedFormHash();
            var paramsMap = fakeParamsMap(pairs);

            assert.isTrue(HiPaySignitureMgr.checkIsValidNotification(paramsMap, passPhrase, shaSign));
        });

        it('2. rejects an invalid form signature', function () {
            var paramsMap = fakeParamsMap(pairs);

            assert.isFalse(HiPaySignitureMgr.checkIsValidNotification(paramsMap, passPhrase, 'not-the-real-signature'));
        });
    });

    describe('XML signature (new, raw-body based)', function () {
        var passPhrase = 'xml-passphrase';

        it('computes the same digest as an independent sha256(rawBody + passphrase) computation', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var rawBody = '<notification><status>142</status></notification>';

            var actual = HiPaySignitureMgr.calculateXmlNotificationSigniture(rawBody, passPhrase);
            var expected = cryptoStub.expectedHex(rawBody + passPhrase);

            assert.strictEqual(actual, expected);
        });

        it('validates when the signature matches', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var rawBody = '<notification><status>142</status></notification>';
            var shaSign = cryptoStub.expectedHex(rawBody + passPhrase);

            assert.isTrue(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, passPhrase, shaSign));
        });

        it('8. fails closed when the calculated signature differs', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var rawBody = '<notification><status>142</status></notification>';

            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, passPhrase, 'wrong-signature'));
        });

        it('9. fails closed when the signature is missing', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var rawBody = '<notification><status>142</status></notification>';

            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, passPhrase, null));
            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, passPhrase, ''));
        });

        it('10. fails closed when the raw body is empty', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var shaSign = cryptoStub.expectedHex('' + passPhrase);

            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification('', passPhrase, shaSign));
        });

        it('fails closed when the passphrase is missing', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var rawBody = '<notification><status>142</status></notification>';
            var shaSign = cryptoStub.expectedHex(rawBody);

            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, '', shaSign));
        });

        it('fails closed when the configured hash algorithm is invalid/unsupported', function () {
            var HiPaySignitureMgr = loadSignitureMgr('DIGEST_NOT_A_REAL_ALGO');
            var rawBody = '<notification><status>142</status></notification>';

            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, passPhrase, 'anything'));
        });

        it('fails closed when the hash algorithm preference is missing entirely', function () {
            var HiPaySignitureMgr = loadSignitureMgr(null);
            var rawBody = '<notification><status>142</status></notification>';

            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBody, passPhrase, 'anything'));
        });

        it('fails closed on unexpected exceptions instead of throwing', function () {
            var HiPaySignitureMgr = proxyquire(modulePath, {
                'dw/crypto/MessageDigest': function () { throw new Error('boom'); },
                'dw/crypto/Encoding': cryptoStub.Encoding,
                'dw/util/Bytes': cryptoStub.Bytes,
                'dw/system/Site': cryptoStub.makeSiteStub('DIGEST_SHA_256')
            }).HiPaySignitureMgr;

            assert.doesNotThrow(function () {
                assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification('<a/>', passPhrase, 'anything'));
            });
        });

        it('11. hashes the raw body exactly as received, without trimming whitespace or normalizing CRLF', function () {
            var HiPaySignitureMgr = loadSignitureMgr();
            var rawBodyWithWhitespace = '\r\n  <notification>\r\n  <status>142</status>\r\n  </notification>\r\n  ';
            var trimmedBody = rawBodyWithWhitespace.trim();

            var shaSignForExactBody = cryptoStub.expectedHex(rawBodyWithWhitespace + passPhrase);
            var shaSignForTrimmedBody = cryptoStub.expectedHex(trimmedBody + passPhrase);

            assert.notStrictEqual(shaSignForExactBody, shaSignForTrimmedBody, 'test setup sanity: whitespace must actually change the hash');
            assert.isTrue(HiPaySignitureMgr.checkIsValidXmlNotification(rawBodyWithWhitespace, passPhrase, shaSignForExactBody));
            assert.isFalse(HiPaySignitureMgr.checkIsValidXmlNotification(rawBodyWithWhitespace, passPhrase, shaSignForTrimmedBody));
        });

        it('never calculates the XML signature from HTTP parameters (only accepts a string body)', function () {
            var HiPaySignitureMgr = loadSignitureMgr();

            assert.lengthOf(HiPaySignitureMgr.calculateXmlNotificationSigniture, 2);
            assert.lengthOf(HiPaySignitureMgr.checkIsValidXmlNotification, 3);
        });
    });

    describe('existing public API (unchanged)', function () {
        it('does not rename or remove existing exported methods', function () {
            var HiPaySignitureMgr = loadSignitureMgr();

            assert.isFunction(HiPaySignitureMgr.checkIsValidResponse);
            assert.isFunction(HiPaySignitureMgr.checkIsValidNotification);
            assert.isFunction(HiPaySignitureMgr.calculateSigniture);
            assert.isFunction(HiPaySignitureMgr.calculateNotificationSigniture);
        });
    });
});
