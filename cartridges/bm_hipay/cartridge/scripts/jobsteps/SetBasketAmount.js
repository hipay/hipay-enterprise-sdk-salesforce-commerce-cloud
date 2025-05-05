'use strict';

const Site = require('dw/system/Site');
const Status = require('dw/system/Status');
const Transaction = require('dw/system/Transaction');
const Logger = require('dw/system/Logger');

/**
 * Sets a site custom preference value.
 *
 * @param {object} options The options object containing the value.
 * @param {number} installment Alma installment (3 or 4).
 */
function setAlmaPreference(options, installment) {
    if (options) {
        Site.getCurrent().setCustomPreferenceValue(`almaBasketAmountMin${installment}x`, Number(options[`basketAmountMin${installment}x`]));
        Site.getCurrent().setCustomPreferenceValue(`almaBasketAmountMax${installment}x`, Number(options[`basketAmountMax${installment}x`]));
    }
}

/**
 * Entry point
 */
function execute() {
    var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    var HipayAvailablePaymentProductService = require('*/cartridge/scripts/lib/hipay/services/hipayAvailablePaymentProductService');
    var hipayAvailablePaymentProductService = new HipayAvailablePaymentProductService();

    try {
        var almaPaymentProducts = COHelpers.getAlmaPaymentProducts(hipayAvailablePaymentProductService);

        if (almaPaymentProducts && almaPaymentProducts.length > 0) {
            almaPaymentProducts.forEach(function(almaPaymentProduct) {
                Transaction.wrap(function() {
                    if (almaPaymentProduct.code.includes('alma-3')) {
                        setAlmaPreference(almaPaymentProduct.options, 3);
                    }

                    if (almaPaymentProduct.code.includes('alma-4')) {
                        setAlmaPreference(almaPaymentProduct.options, 4);
                    }
                });
            });
        } else {
            Logger.warn('No Alma payment products found.');
            return new Status(Status.ERROR);
        }
    } catch (e) {
        Logger.error('An error occurred while processing Alma payment products: ' + e.message);
        return new Status(Status.ERROR);
    }

    return new Status(Status.OK);
}

exports.execute = execute;
