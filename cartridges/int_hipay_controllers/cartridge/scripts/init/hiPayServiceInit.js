/**
 * Initialize REST service registry for a HiPay API
 */

var svc                  = require('dw/svc'),
    LocalServiceRegistry = require('dw/svc/LocalServiceRegistry'),
    ServiceConfig        = require('dw/svc/ServiceConfig'),
    ServiceCredential    = require('dw/svc/ServiceCredential'),
    Encoding             = require('dw/crypto/Encoding'),
    Bytes                = require('dw/util/Bytes'),
    Site                 = require('dw/system/Site');

//HiPay Generate Token Service
function createToken() {
    var siteId  = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.createtoken.' + siteId, {
        createRequest: function(svc, args) {
            svc.addHeader("Content-Type", "application/x-www-form-urlencoded");
            svc.addHeader("Cache-Control", "no-cache");
            svc.addHeader("Accept", "application/json");

            var serviceConfig     = svc.getConfiguration(),
                credentials       = serviceConfig.getCredential(),
                credString        = credentials.getUser() + ":" + credentials.getPassword(),
                base64Credentials = Encoding.toBase64(new Bytes(credString));
            
            svc.addHeader("Authentication", "Basic " + base64Credentials);
            svc.setRequestMethod("POST");

            return args;
        },
        parseResponse: function(svc, response) {
            return response;
        },
        filterLogMessage: function(msg) {
            return msg;
        }
    });
	
	return service;
};

//HiPay Order Service
function order() {
    var siteId  = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.order.' + siteId, {
        createRequest: function(svc, args) {
            svc.addHeader("Content-Type", "application/x-www-form-urlencoded");
            svc.addHeader("Cache-Control", "no-cache");
            svc.addHeader("Accept", "application/json");

            var serviceConfig     = svc.getConfiguration(),
                credentials       = serviceConfig.getCredential(),
                credString        = credentials.getUser() + ":" + credentials.getPassword(),
                base64Credentials = Encoding.toBase64(new Bytes(credString));

            svc.addHeader("Authentication", "Basic " + base64Credentials);
            svc.setRequestMethod("POST");

            return args;
        },
        parseResponse: function(svc, response) {
            return response;
        },
        filterLogMessage: function(msg) {
            return msg;
        }
    });
	
	return service;
};

//HiPay Hosted Payment Service
function hpayment() {
    var siteId  = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.hpayment.' + siteId, {
        createRequest: function(svc, args) {
            svc.addHeader("Content-Type", "application/x-www-form-urlencoded");
            svc.addHeader("Cache-Control", "no-cache");
            svc.addHeader("Accept", "application/json");

            var serviceConfig     = svc.getConfiguration(),
                credentials       = serviceConfig.getCredential(),
                credString        = credentials.getUser() + ":" + credentials.getPassword(),
                base64Credentials = Encoding.toBase64(new Bytes(credString));

            svc.addHeader("Authentication", "Basic " + base64Credentials);
            svc.setRequestMethod("POST");

            return args;
        },
        parseResponse: function(svc, response) {
            return response;
        },
        filterLogMessage: function(msg) {
            return msg;
        }
    });
	
	return service;
};

// HiPay Maintenance Service
function maintenance() {
    var siteId  = Site.getCurrent().getID();
    var service = LocalServiceRegistry.createService('hipay.rest.maintenance.' + siteId, {
        createRequest: function(svc, args) {
            svc.addHeader("Content-Type", "application/x-www-form-urlencoded");
            svc.addHeader("Cache-Control", "no-cache");
            svc.addHeader("Accept", "application/json");

            var serviceConfig     = svc.getConfiguration(),
                credentials       = serviceConfig.getCredential(),
                credString        = credentials.getUser() + ":" + credentials.getPassword(),
                base64Credentials = Encoding.toBase64(new Bytes(credString));

            svc.addHeader("Authentication", "Basic " + base64Credentials);
            svc.setRequestMethod("POST");

            return args;
        },
        parseResponse: function(svc, response) {
            return response;
        },
        filterLogMessage: function(msg) {
            return msg;
        }
    });
	
	return service;
};

module.exports = {
    createToken : createToken,
    order : order,
    hpayment : hpayment,
    maintenance : maintenance
}