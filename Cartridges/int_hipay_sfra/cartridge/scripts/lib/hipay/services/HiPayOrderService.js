var HTTPService = require('dw/svc/HTTPService');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');

/**
* Initiates HiPay order request.
*/
function HiPayOrderService() {}

HiPayOrderService.prototype.loadOrderPayment = function(params) {
    //get current ID of the site.
    var siteId : String = Site.getCurrent().getID();
    //try create service for current site
    try {
        var service : HTTPService = ServiceRegistry.get("hipay.rest.order"+"."+siteId);
    } catch (e) {
        Logger.warn("Service {0}, doesn't exist", "hipay.rest.order"+"."+siteId);
    }
    //get default service if service for current site  was not configured in BM
    if (service==null) {
        service = ServiceRegistry.get("hipay.rest.order");
    }

    var content = "";
    for (var param in params) {
        if(empty(params[param])) { continue; }

        content+=  param + '=' + encodeURIComponent(params[param]) + '&';
    }

    var response = service.call(content);
    return response;
}

module.exports = HiPayOrderService;
