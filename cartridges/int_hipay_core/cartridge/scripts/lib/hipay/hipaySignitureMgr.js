'use strict';

var MessageDigest = require('dw/crypto/MessageDigest');
var Encoding = require('dw/crypto/Encoding');
var Bytes = require('dw/util/Bytes');
var Site = require('dw/system/Site');

/**
 * HiPaySignitureMgr object is responsible for calculating and verifying SHA hash string in HiPay requests.
 */
function HiPaySignitureMgr() {}

/**
 * Validates if the hashed string based on the parameters is correct.
 */
HiPaySignitureMgr.checkIsValidResponse = function (paramsMap, passPhrase) {
    var shaSign = paramsMap.get('hash')[0];
    var shaOut = HiPaySignitureMgr.calculateSigniture(paramsMap, passPhrase);

    return shaSign === shaOut;
};

/**
 * Validates if the hashed string based on the parameters is correct.
 */
HiPaySignitureMgr.checkIsValidNotification = function (paramsMap, passPhrase, shaSign) {
    var shaOut = HiPaySignitureMgr.calculateNotificationSigniture(paramsMap, passPhrase);
    return shaSign === shaOut;
};

/**
 * Generate SHA1 hash based on the given parameters and pass phrase.
 * Empty parameters are excluded.
 */
HiPaySignitureMgr.calculateSigniture = function (paramsMap, passPhrase) {
    var names = [];
    var entrysSet = paramsMap.entrySet();

    for (var j = 0; j < entrysSet.length; j++) {
        if (entrysSet[j].getKey() !== 'hash' && !empty(entrysSet[j].getValue()[0])) {
            names.push(entrysSet[j].getKey());
        }
    }

    names.sort(); // Sort the elements of the Array in alphabetical order

    // Construct the string to be hashed
    var stringToHash = '';
    for (var i = 0; i < names.length; i++) {
        stringToHash += names[i] + paramsMap.get(names[i])[0] + passPhrase;
    }

    // Hash the final string
    var digest = new MessageDigest(MessageDigest.DIGEST_SHA_256);
    return Encoding.toHex(digest.digestBytes(new Bytes(stringToHash, 'UTF-8')));
};

/**
 * Generate SHA1 hash based on the given parameters and pass phrase.
 * Empty parameters are exluded.
 */
HiPaySignitureMgr.calculateNotificationSigniture = function (paramsMap, passPhrase) {
    // Construct the string to be hashed
    var paramsList = [];

    var entrysSet = paramsMap.entrySet();

    for (var i = 0; i < entrysSet.length; i++) {
        paramsList.push(Encoding.toURI(entrysSet[i].getKey(), 'UTF-8') + '=' + Encoding.toURI(entrysSet[i].getValue()[0], 'UTF-8').replace(/\*/g, '%2A'));
    }

    var paramsString = paramsList.join('&');
    var stringToHash = paramsString + passPhrase;
    // SHA Hash the final string
    var hashAlgo = Site.getCurrent().getCustomPreferenceValue('hipayHashAlgorithm').value;

    var digest = new MessageDigest(MessageDigest[hashAlgo]);
    return Encoding.toHex(digest.digestBytes(new Bytes(stringToHash, 'UTF-8')));
};

module.exports.HiPaySignitureMgr = HiPaySignitureMgr;
