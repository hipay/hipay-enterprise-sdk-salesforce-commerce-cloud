var HTTPService     = require('dw/svc/HTTPService'),
    ServiceRegistry = require('dw/svc/ServiceRegistry'),
    Site            = require('dw/system/Site'),
    Logger          = require('dw/system/Logger');

/**
* Initiates HiPay hosted payment request.
*/
function HiPayHostedService() {}

HiPayHostedService.prototype.loadHostedPayment = function(params) {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit.js');
    var service       = hipayServices.hpayment();

    var content = "";

    for (var param in params) {
        if (empty(params[param])) {
            continue;
        }

        content += param + '=' + encodeURIComponent(params[param]) + '&';
    }

    var response = service.call(content);

    return response;
}

module.exports = HiPayHostedService;
