'use strict';

/* Initiates HiPay hosted payment request.*/
function initiateCapture(transactionReference, operation, amount) {
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
}

module.exports = {
    OPERATION_CAPTURE: 'capture',
    OPERATION_REFUND: 'refund',
    OPERATION_CANCEL: 'cancel',
    initiateCapture: initiateCapture
};
