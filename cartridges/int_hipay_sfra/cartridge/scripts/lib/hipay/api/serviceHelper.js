'use strict';

const StringUtils = require('dw/util/StringUtils');
const Calendar = require('dw/util/Calendar');
const LinkedHashMap = require('dw/util/LinkedHashMap');
const Mac = require('dw/crypto/Mac');

const hipayConstants = require('int_hipay_sfra/cartridge/scripts/lib/hipay/constants');

const currentSite = require('dw/system/Site').getCurrent();
var hipayService = null;

const Logger = require('dw/system/Logger');
const logger = Logger.getRootLogger();

/**
 *  Returns Ingenico-Ogone Service
 *  @param {string} siteID The current site ID
 *  @returns {dw.svc.LocalServiceRegistry} ingenicoService Ingenico-Ogone Service
 */
function getService() {
    if (hipayService == null) {
        var hipayService = require('int_hipay_core/cartridge/scripts/lib/hipay/services/hipayMaintenanceService');
    }
    return hipayService;
}

/**
 *  Returns Ingenico-Ogone Service Credentials
 *  @returns {Object} hipayService Hipay Service Credentials
 */
function getHipayServiceCredentials() {
    var hipayServices = require('int_hipay_core/cartridge/scripts/init/hiPayServiceInit.js');
    var service = hipayServices.maintenance();

    //let service = getService();
    return {
        apiHost: service.configuration.credential.URL,
        apiKey: service.configuration.credential.user,
        apiSecret: service.configuration.credential.password,
        //merchantID: currentSite.getCustomPreferenceValue('ingenicoOgoneMerchantID')
    };
}

/**
 *  Returns sorted context headers
 *  @param {dw.util.LinkedHashMap} gcsHeaders Ingenico-Ogone context headers
 *  @returns {string} headers Sorted context headers
 */
function getSortedHeadersForContext(gcsHeaders) {
    let headers = '';
    if (gcsHeaders) {
        let sortedXGCSHeaders = [];
        let gcsHeadersKeys = gcsHeaders.keySet().iterator();
        while (gcsHeadersKeys.hasNext()) {
            let key = gcsHeadersKeys.next();
            if (key.toUpperCase().indexOf('X-GCS') === 0) {
                sortedXGCSHeaders.push({ key: key, value: gcsHeaders.get(key) });
            }
        }

        sortedXGCSHeaders = sortedXGCSHeaders.sort(function (a, b) {
            a.key = a.key.toUpperCase();
            b.key = b.key.toUpperCase();
            if (a.key < b.key) {
                return -1;
            }
            if (a.key > b.key) {
                return 1;
            }
            return 0;
        });
        sortedXGCSHeaders.forEach(function (header) {
            headers += header.key.toLowerCase() + ':' + header.value + "\n";
        });
    }
    return headers;
}

/**
 *  Returns formatted date for HTTP Request
 *  @returns {string} date Formatted date for HTTP Request
 */
function getFormatedDate() {
    let now = new Calendar();
    //let dateLocale = currentSite.getCustomPreferenceValue("ingenicoOgoneDateLocale");
    let dateLocale = 'dd/mm/YYYY';
    now.setTimeZone('GMT');
    var bb= StringUtils.formatCalendar(now, "EEE, dd MMM yyyy HH:mm:ss z");
    var cc = request.locale.indexOf('en');
    //var aa =StringUtils.formatCalendar(now, dateLocale, Calendar.LONG_DATE_PATTERN);
    return StringUtils.formatCalendar(now, "EEE, dd MMM yyyy HH:mm:ss z");
    //return (request.locale.indexOf('en') === 0) ? StringUtils.formatCalendar(now, "EEE, dd MMM yyyy HH:mm:ss z") : StringUtils.formatCalendar(now, dateLocale, Calendar.LONG_DATE_PATTERN);
}

/**
 *  Signs data using HMAC256 algorithm
 *  @param {string} dataToSign Data to sign
 *  @param {string} secretKey Secret key
 *  @returns {string} signature Encrypted Request Signature
 */
function signedDataUsingHMAC256(dataToSign, secretKey) {
    let mac = new Mac(Mac.HMAC_SHA_256);
    let signature;

    if (!empty(dataToSign) && !empty(secretKey)) {
        signature = dw.crypto.Encoding.toBase64(mac.digest(new dw.util.Bytes(dataToSign, "UTF-8"), new dw.util.Bytes(secretKey, "UTF-8")));
    }

    return signature;
}

/**
 *  Returns Encrypted Request Signature
 *  @param {string} method HTTP Method
 *  @param {string} path HTTP Request past
 *  @param {dw.util.LinkedHashMap} headers HTTP Request headers
 *  @param {string} secretApiKey Ingenico-Ogone Service Secret Key
 *  @returns {string} signedDataUsingHMAC256 Encrypted Request Signature
 */
function getRequestSignature(method, path, headers, secretApiKey) {
    const date = headers.get('Date');
    const sortedGCSHeaders = getSortedHeadersForContext(headers);
    let contentType = '';
    if (method === 'POST' || method === 'PUT') {
        contentType = headers.get('Content-Type');
    }

    let dataToSign = method + "\n" + contentType + "\n" + date + "\n" + sortedGCSHeaders + path + "\n";

    logger.debug(dataToSign);

    return signedDataUsingHMAC256(dataToSign, secretApiKey);
}

/**
 *  Prepares Ingenico-Ogone ServerMetaInfo Header
 *  @returns {Object} info ServerMetaInfo Header Object
 */
function serverMetaInfo() {
    const System = require('dw/system/System');
    const Resource = require('dw/web/Resource');

    let serverMetaInfoObj = {
        sdkCreator: 'Greenlight Commerce',
        sdkIdentifier: 'SFCC-B2C-SFRA/v' + Resource.msg('ingenico.ogone.sdk.version.number', 'ingenicoOgoneSDK', null),
        platformIdentifier: 'Salesforce B2C Commerce Cloud v' + System.getCompatibilityMode(),
        shoppingCartExtension: {
            extensionId: currentSite.ID,
            name: currentSite.name,
            version: Resource.msg('global.version.number', 'version', null)
        }
    };

    let systemIntegator = Resource.msg('ingenico.ogone.sdk.integrator', 'ingenicoOgoneSDK', null);

    if (systemIntegator !== 'YOUR_COMPANY_NAME') {
        serverMetaInfoObj.integrator = systemIntegator;
    }

    return {
        key: 'X-GCS-ServerMetaInfo',
        value: StringUtils.encodeBase64(JSON.stringify(serverMetaInfoObj))
    };
}

/**
 *  Prepares request headers
 *  @param {Array} gcsHeaders Ingenico-Ogone context headers array
 *  @returns {dw.util.LinkedHashMap} headers HTTP Request Headers
 */
function prepareRequestHeaders(gcsHeaders) {
    if (typeof (gcsHeaders) == 'undefined') {
        gcsHeaders = [];
    }

    const serverMetaInfoStr = serverMetaInfo();
    gcsHeaders.push(serverMetaInfoStr);

    let headers = new LinkedHashMap();
    headers.put("Date", getFormatedDate());
    headers.put("Content-Type", "application/json");
    gcsHeaders.forEach(function (gcsHeader) {
        headers.put(gcsHeader.key, gcsHeader.value);
    });

    return headers;
}

/**
 *  Creates Authorization Header using Secret key and Signature
 *  @param {string} method HTTP Method
 *  @param {string} path HTTP Request past
 *  @param {dw.util.LinkedHashMap} headers HTTP Request headers
 *  @param {Object} credentials Ingenico-Ogone service credentials
 *  @returns {string} authHeader Authorization Header
 */
function prepareAuthorizationHeader(method, path, headers, credentials) {
    return "GCS v1HMAC:" + credentials.apiKey + ':' + getRequestSignature(method, path, headers, credentials.apiSecret);
}

/**
 *  Prepares the Request Object which is used in Ingenico-Ogone Service
 *  @param {string} method HTTP Method
 *  @param {string} path HTTP Request past
 *  @param {Array} gcsHeaders HTTP Request headers
 *  @param {Object} qsObject QueryString object
 *  @returns {Object} serviceRequest Service Request Object
 */
function prepareRequestObject(method, path, gcsHeaders, qsObject) {
    const credentials = getHipayServiceCredentials();
    let headers = prepareRequestHeaders(gcsHeaders);
    let qsArray = [];

    path = path.replace('{{merchantId}}', credentials.merchantID);

    if (!empty(qsObject)) {
        Object.keys(qsObject).forEach(function (key) {
            qsArray.push(encodeURIComponent(key) + '=' + encodeURIComponent(qsObject[key]));
        });

        if (!empty(qsArray)) {
            path = path + '?' + qsArray.join('&');
        }
    }

    headers.put("Authorization", prepareAuthorizationHeader(method, path, headers, credentials));
    // body preparation goes here
    return {
        method: method,
        url: credentials.apiHost + path,
        headers: headers,
        body: {}
    };
}

/**
 *  Returns prefixed URL
 *  @param {string} responseUrl URL to be prefixed
 *  @returns {string} url Prefixed URL
 */
function prefixResponseUrl(responseUrl) {
    return hipayConstants.PAYMENT_URL_PREFIX + responseUrl;
}

module.exports = {
    prepareRequestObject: prepareRequestObject,
    getService: getService,
    prefixResponseUrl: prefixResponseUrl
};
