'use strict';

function HipayAvailablePaymentProductService() {};


HipayAvailablePaymentProductService.prototype.availablePaymentProducts = function () {
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit');

    // Init service
    var result = hipayServices.getAvailablePaymentProducts().call();

    if (result.status === 'OK' && result.object.text) {
        return JSON.parse(result.object.text)
    }

    return {};
};

module.exports = HipayAvailablePaymentProductService;