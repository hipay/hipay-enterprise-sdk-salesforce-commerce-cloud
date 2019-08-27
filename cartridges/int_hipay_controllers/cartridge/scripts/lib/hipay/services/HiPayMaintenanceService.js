var HTTPService     = require('dw/svc/HTTPService'),
    ServiceRegistry = require('dw/svc/ServiceRegistry'),
    Site            = require('dw/system/Site'),
    Logger          = require('dw/system/Logger');

/* HiPayMaintenanceService.ds object initiates HiPay maintenance request.*/
function HiPayMaintenanceService() {}

HiPayMaintenanceService.OPERATION_CAPTURE = "capture";

/* Initiates HiPay hosted payment request.*/
HiPayMaintenanceService.prototype.initiateCapture = function(transactionReference, operation, amount) {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit.js');
    var service       = hipayServices.maintenance();

    service.URL += transactionReference;

    var content = "operation=" + operation;

    if (!empty(amount)) {
        content+= "&amount=" + amount;
    }

    var response = service.call(content);

    return response;
}

module.exports = HiPayMaintenanceService;
