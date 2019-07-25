'use strict';

/**
 * Initialize REST service registry for a HiPay API
 */
var ServiceConfig     = require('dw/svc/ServiceConfig'),
    ServiceCredential = require('dw/svc/ServiceCredential'),
    ServiceRegistry   = require('dw/svc/ServiceRegistry'),
    HTTPService       = require('dw/svc/HTTPService'),
    HTTPClient        = require('dw/net/HTTPClient'),
    Encoding          = require('dw/crypto/Encoding'),
    Bytes             = require('dw/util/Bytes');

/* HiPay REST Hosted Payment Default Service Registry */
ServiceRegistry.configure("hipay.rest.hpayment", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

/* HiPay Generate Token Default Service Registry */
ServiceRegistry.configure("hipay.rest.createtoken", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

/* HiPay Order Default Service Registry */
ServiceRegistry.configure("hipay.rest.order", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

/* HiPay REST Maintenance Default Service Registry */
ServiceRegistry.configure("hipay.rest.maintenance", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

/**
 Example for multi-hipay accounts integration.

 Uncomment this section to make it available and change `RefArch` to your specific site ID.
 Duplicate code below and provide another site ID, if you need more hipay account configurations for specific sites;
 Add in bm: services,profiles,credentials with proper naming, for example `hipay.rest.hpayment.RefArch` service name
 should be created in RefArch site with profile and credentials for current site.
*/

// HiPay REST Hosted Payment RefArch Service Registry
ServiceRegistry.configure("hipay.rest.hpayment.RefArch", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

// HiPay Generate Token RefArch Service Registry
ServiceRegistry.configure("hipay.rest.createtoken.RefArch", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

// HiPay Order RefArch Service Registry
ServiceRegistry.configure("hipay.rest.order.RefArch", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

// HiPay REST Maintenance RefArch Service Registry
ServiceRegistry.configure("hipay.rest.maintenance.RefArch", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

/////////////////////////////
//HiPay REST Hosted Payment RefArchGlobal Service Registry
ServiceRegistry.configure("hipay.rest.hpayment.RefArchGlobal", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

// HiPay Generate Token RefArchGlobal Service Registry
ServiceRegistry.configure("hipay.rest.createtoken.RefArchGlobal", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

// HiPay Order RefArchGlobal Service Registry
ServiceRegistry.configure("hipay.rest.order.RefArchGlobal", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});

// HiPay REST Maintenance RefArchGlobal Service Registry
ServiceRegistry.configure("hipay.rest.maintenance.RefArchGlobal", {
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
    parseResponse: function(svc, client) {
        return client;
    },
    mockCall: function(svc, client) {}
});