/* HiPayTransactionService.ds object initiates HiPay transaction request.*/
function HiPayTransactionService() {}

/* Initiates HiPay hosted payment request.*/
HiPayTransactionService.prototype.initiateTransaction = function (transactionReference) {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit');
    var service = hipayServices.transaction();

    service.URL += transactionReference;

    var params = {
        transaction_reference: transactionReference
    };
    var response = service.call(params);

    return response;
};

module.exports = HiPayTransactionService;
