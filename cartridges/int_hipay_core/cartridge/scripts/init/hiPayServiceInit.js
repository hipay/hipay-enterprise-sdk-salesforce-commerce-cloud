/**
 * Initialize REST service registry for a HiPay API
 */

var LocalServiceRegistry = require('dw/svc/LocalServiceRegistry');
var HiPayConfig = require('*/cartridge/scripts/lib/hipay/hipayConfig').HiPayConfig;
var Encoding = require('dw/crypto/Encoding');
var Bytes = require('dw/util/Bytes');
var Site = require('dw/system/Site');

/**
 * Return public or private credentials.
 * @param {Boolean} isPublic
 * @returns {String}
 */
function getCredentials(isPublic) {
    if (isPublic) {
        return HiPayConfig['hipayPublic' + HiPayConfig.hipayEnvironment + 'Username'] +
        ':' + HiPayConfig['hipayPublic' + HiPayConfig.hipayEnvironment + 'Password'];
    } else {
        return HiPayConfig['hipayPrivate' + HiPayConfig.hipayEnvironment + 'Username'] +
        ':' + HiPayConfig['hipayPrivate' + HiPayConfig.hipayEnvironment + 'Password'];
    }
}

/**
 * Return public credentials.
 * @returns {String}
 */
function getCredentialsPublic() {
    return HiPayConfig['hipayPublic' + HiPayConfig.hipayEnvironment + 'Username'] +
        ':' + HiPayConfig['hipayPublic' + HiPayConfig.hipayEnvironment + 'Password'];
}

/**
 * Return private credentials.
 * @returns {String}
 */
function getCredentialsPrivate() {
    return HiPayConfig['hipayPrivate' + HiPayConfig.hipayEnvironment + 'Username'] +
        ':' + HiPayConfig['hipayPrivate' + HiPayConfig.hipayEnvironment + 'Password'];
}

// HiPay Generate Token Service
function createToken() {
    var siteId = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.createtoken.' + siteId, {
        createRequest: function (svc, args) {
            svc.setRequestMethod('POST');

            // Set headers
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Cache-Control', 'no-cache');
            svc.addHeader('Accept', 'application/json');

            var sitePrefCredentials = getCredentialsPublic();
            var base64Credentials = Encoding.toBase64(new Bytes(sitePrefCredentials));
            svc.addHeader('Authorization', 'Basic ' + base64Credentials);

            return JSON.stringify(args);
        },
        parseResponse: function (svc, response) {
            return response;
        },
        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return service;
}

// HiPay Order Service
function order() {
    var siteId = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.order.' + siteId, {
        createRequest: function (svc, args) {
            svc.setRequestMethod('POST');
            // Set headers
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Cache-Control', 'no-cache');
            svc.addHeader('Accept', 'application/json');

            // Get HiPay credentials.
            var credString = getCredentialsPrivate();
            var base64Credentials = Encoding.toBase64(new Bytes(credString));

            svc.addHeader('Authorization', 'Basic ' + base64Credentials);

            return JSON.stringify(args);
        },
        parseResponse: function (svc, response) {
            return response;
        },
        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return service;
}

// HiPay Hosted Payment Service
function hpayment() {
    var siteId = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.hpayment.' + siteId, {
        createRequest: function (svc, args) {
            svc.setRequestMethod('POST');

            // Set headers
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Cache-Control', 'no-cache');
            svc.addHeader('Accept', 'application/json');
            svc.addHeader('x-origin-referer', 'sfcc');

            // Get HiPay credentials.
            var credString = getCredentialsPrivate();
            var base64Credentials = Encoding.toBase64(new Bytes(credString));
            svc.addHeader('Authorization', 'Basic ' + base64Credentials);

            return JSON.stringify(args);
        },
        parseResponse: function (svc, response) {
            return response;
        },
        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return service;
}

// HiPay Maintenance Service
function maintenance() {
    var siteId = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.maintenance.' + siteId, {
        createRequest: function (svc, args) {
            svc.setRequestMethod('POST');

           // Set headers
            svc.addHeader('Content-Type', 'application/json');
            svc.addHeader('Cache-Control', 'no-cache');
            svc.addHeader('Accept', 'application/json');

           // Get HiPay credentials.
           var credString = getCredentialsPrivate();
            var base64Credentials = Encoding.toBase64(new Bytes(credString));
            svc.addHeader('Authorization', 'Basic ' + base64Credentials);

            return JSON.stringify(args);
        },
        parseResponse: function (svc, response) {
            return response;
        },
        filterLogMessage: function (msg) {
            return msg;
        }
    });

    return service;
}

module.exports = {
    createToken: createToken,
    order: order,
    hpayment: hpayment,
    maintenance: maintenance
};
