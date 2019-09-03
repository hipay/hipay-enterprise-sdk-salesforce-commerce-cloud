/**
* Initiates HiPay order request.
*/

var HTTPService     = require('dw/svc/HTTPService'),
    ServiceRegistry = require('dw/svc/ServiceRegistry'),
    Site            = require('dw/system/Site'),
    Logger          = require('dw/system/Logger');

function HiPayOrderService() {}

HiPayOrderService.prototype.loadOrderPayment = function(params) {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit.js');
    var service       = hipayServices.order();

    var content = "";

    for (var param in params) {
        if(empty(params[param])) {
            continue;
        }

        content +=  param + '=' + encodeURIComponent(params[param]) + '&';
    }

    var response = service.call(content);

    return response;
}

module.exports = HiPayOrderService;
