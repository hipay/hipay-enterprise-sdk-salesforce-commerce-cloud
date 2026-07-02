'use strict';

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Locale = require('dw/util/Locale');

var CUSTOM_OBJECT_TYPE = 'HiPayMultiLocaleConfig';
var cachedCountryCode = null;
var cachedConfigObject = null;

function unwrapValue(value) {
    if (value && typeof value.getValue === 'function') {
        return value.getValue();
    }

    if (value && value.value !== undefined) {
        return value.value;
    }

    return value;
}

function getCountryCodeFromRequestLocale() {
    var requestLocale = Locale.getLocale(request.locale);

    return requestLocale.country;
}

function getConfigObject() {
    var countryCode = module.exports.getCountryCode();

    if (!countryCode) {
        return null;
    }

    if (!cachedConfigObject) {
        cachedConfigObject = CustomObjectMgr.getCustomObject(CUSTOM_OBJECT_TYPE, countryCode);
    }

    return cachedConfigObject;
}

function getCustomObjectValue(field) {
    var configObject = getConfigObject();

    return configObject ? unwrapValue(configObject.custom[field]) : null;
}

module.exports = {
    setCountryCode: function (countryCode) {
        cachedCountryCode = countryCode;
        cachedConfigObject = null;
    },

    getCountryCode: function () {
        if (!cachedCountryCode) {
            cachedCountryCode = getCountryCodeFromRequestLocale();
        }

        return cachedCountryCode;
    },

    getHiPayCountriesObject: getConfigObject,

    isHiPayPaypal2Enabled: function () {
        return getCustomObjectValue('hipayPaypal2Enabled') === 'yes';
    },

    getHiPayPaypal2Color: function () {
        return getCustomObjectValue('hipayPaypal2Color') || 'gold';
    },

    getHiPayPaypal2Shape: function () {
        return getCustomObjectValue('hipayPaypal2Shape') || 'pill';
    },

    getHiPayPaypal2Label: function () {
        return getCustomObjectValue('hipayPaypal2Label') || 'pay';
    },

    getHiPayPaypal2Height: function () {
        return getCustomObjectValue('hipayPaypal2Height') || 40;
    },

    getHiPayPaypal2CanPayLater: function () {
        return getCustomObjectValue('hipayPaypal2CanPayLater') === 'yes';
    },

    getHiPayPaypalButtonPlacement: function () {
        return getCustomObjectValue('hipayPaypalButtonPlacement') || 'submitPayment';
    }
};
