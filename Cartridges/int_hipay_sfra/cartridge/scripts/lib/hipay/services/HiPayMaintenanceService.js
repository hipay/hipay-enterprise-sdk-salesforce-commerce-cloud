var HTTPService = require('dw/svc/HTTPService');
var ServiceRegistry = require('dw/svc/ServiceRegistry');
var Site = require('dw/system/Site');
var Logger = require('dw/system/Logger');

/**
* HiPayMaintenanceService.ds object initiates HiPay maintenance request.
*
* To include this script use:
* var HiPayMaintenanceService = require("int_hipay_sfra/cartridge/scripts/lib/hipay/HiPayMaintenanceService");
*/
function HiPayMaintenanceService() {}

HiPayMaintenanceService.OPERATION_CAPTURE = "capture";
/**
* Initiates HiPay hosted payment request.
*/
HiPayMaintenanceService.prototype.initiateCapture = function( transactionReference, operation, amount ) {
    //get current ID of the site.
    var siteId : String = Site.getCurrent().getID();
    //try create service for current site
    try {
        var service : HTTPService = ServiceRegistry.get("hipay.rest.maintenance"+"."+siteId);
    } catch (e) {
        Logger.warn("Service {0}, doesn't exist", "hipay.rest.maintenance"+"."+siteId);
    }
    //get default service if service for current site  was not configured in BM
    if (service==null) {
        service = ServiceRegistry.get("hipay.rest.maintenance");
    }

    service.URL += transactionReference;
    var content = "operation=" + operation;
    if(!empty(amount)) {
        content+= "&amount=" + amount;
    }

    var response = service.call(content);
    return response;
}

module.exports = HiPayMaintenanceService;
