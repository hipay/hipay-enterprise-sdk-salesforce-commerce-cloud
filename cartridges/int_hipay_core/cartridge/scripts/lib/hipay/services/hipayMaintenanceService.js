/* HiPayMaintenanceService.ds object initiates HiPay maintenance request.*/
function HiPayMaintenanceService() {}

HiPayMaintenanceService.OPERATION_CAPTURE = 'capture';
HiPayMaintenanceService.OPERATION_REFUND = 'refund';

/* Initiates HiPay hosted payment request.*/
HiPayMaintenanceService.prototype.initiateCapture = function (transactionReference, operation, amount) {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit');
    var service = hipayServices.maintenance();

    service.URL += transactionReference;

    var params = {
        operation: operation
    };
    if (!empty(amount)) {
        params.amount = amount;
    }

    var response = service.call(params);

    return response;
};

module.exports = HiPayMaintenanceService;
