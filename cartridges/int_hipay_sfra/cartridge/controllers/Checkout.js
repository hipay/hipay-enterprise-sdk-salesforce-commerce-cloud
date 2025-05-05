'use strict';

var server = require('server');
var BasketMgr = require('dw/order/BasketMgr');
var Logger = require('dw/system/Logger');

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

server.extend(module.superModule);

/**
 * Appends the 'Begin' route to the Checkout controller.
 * Ensures the request is made over HTTPS.
 * Retrieves the current basket and adds its total price to the view data.
 */
server.append(
    'Begin',
    server.middleware.https,
    function (req, res, next) {
        var currentBasket = BasketMgr.getCurrentBasket();
        if (currentBasket) {
            var viewData = res.getViewData();
            viewData.total = currentBasket.getTotalGrossPrice().getValue();

            if (viewData.order) {
                // Process alma payment methods.
                try {
                    viewData.order.billing.payment.applicablePaymentMethods = COHelpers.processAlmaPaymentMethods(viewData);
                } catch (error) {
                    Logger.error('Error processing Alma payment methods: ' + error.message);
                }

            }
            res.setViewData(viewData);
        }

        return next();
    }
);

module.exports = server.exports();