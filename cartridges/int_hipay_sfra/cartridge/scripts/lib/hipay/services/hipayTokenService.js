var HTTPService = require('dw/svc/HTTPService');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');

/**
* Initiates HiPay Token Generation request.
*/
function HiPayTokenService() {}

HiPayTokenService.prototype.generateToken = function(params) {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit.js');
    var service       = hipayServices.createToken();

    var content = "";
    for (var param in params) {
        if(empty(params[param])) continue;

        content+=  param + '=' + encodeURIComponent(params[param]) + '&';
    }

    var response = service.call(content);

    return response;
}

module.exports = HiPayTokenService;
