'use strict';

/**
 * Minimal stand-ins for dw/crypto/MessageDigest, dw/crypto/Encoding, dw/util/Bytes
 * and dw/system/Site, backed by Node's real crypto module so tests exercise a real
 * SHA-256 computation rather than a rubber-stamped mock.
 */
var crypto = require('crypto');

var ALGO_MAP = {
    DIGEST_SHA_256: 'sha256',
    DIGEST_SHA_1: 'sha1',
    DIGEST_SHA_512: 'sha512'
};

function MessageDigest(algoConstant) {
    this.algoConstant = algoConstant;
}
MessageDigest.DIGEST_SHA_256 = 'DIGEST_SHA_256';
MessageDigest.DIGEST_SHA_1 = 'DIGEST_SHA_1';
MessageDigest.DIGEST_SHA_512 = 'DIGEST_SHA_512';
MessageDigest.prototype.digestBytes = function (bytesObj) {
    var nodeAlgo = ALGO_MAP[this.algoConstant];

    if (!nodeAlgo) {
        throw new Error('Unsupported digest algorithm: ' + this.algoConstant);
    }

    var buffer = crypto.createHash(nodeAlgo).update(Buffer.from(bytesObj.value, bytesObj.encoding || 'utf8')).digest();
    return { buffer: buffer };
};

var Encoding = {
    toHex: function (bytesLike) {
        return bytesLike.buffer.toString('hex');
    },
    toURI: function (value) {
        return encodeURIComponent(value);
    }
};

function Bytes(value, encoding) {
    this.value = value;
    this.encoding = encoding;
}

/**
 * @param {String} hashAlgoConstant - e.g. 'DIGEST_SHA_256', or undefined/null/'' to simulate a missing preference
 */
function makeSiteStub(hashAlgoConstant) {
    return {
        getCurrent: function () {
            return {
                getCustomPreferenceValue: function (name) {
                    if (name === 'hipayHashAlgorithm') {
                        return hashAlgoConstant ? { value: hashAlgoConstant } : null;
                    }

                    return null;
                }
            };
        }
    };
}

/** Independently computes the expected hex digest the same way HiPay's signature scheme does: sha256(input) */
function expectedHex(input, algoConstant) {
    var nodeAlgo = ALGO_MAP[algoConstant || 'DIGEST_SHA_256'];
    return crypto.createHash(nodeAlgo).update(input, 'utf8').digest('hex');
}

module.exports = {
    MessageDigest: MessageDigest,
    Encoding: Encoding,
    Bytes: Bytes,
    makeSiteStub: makeSiteStub,
    expectedHex: expectedHex
};
