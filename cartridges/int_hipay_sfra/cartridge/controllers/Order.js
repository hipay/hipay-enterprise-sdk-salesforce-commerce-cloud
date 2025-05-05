'use strict';

var server = require('server');
server.extend(module.superModule);

var Logger = require('dw/system/Logger');
var OrderMgr = require('dw/order/OrderMgr');
var Site = require('dw/system/Site');

var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');
var hiPayCheckoutModule = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule');

server.append(
    'Confirm',
    consentTracking.consent,
    server.middleware.https,
    csrfProtection.generateToken,
    function (req, res, next) {
        // Save credit card (one click)
        try {
            var hipayEnableOneClick = Site.getCurrent().getCustomPreferenceValue('hipayEnableOneClick');
            var hipayCreditCardPaymentInstrument = null;
            var order = OrderMgr.getOrder(req.form.orderID, req.form.orderToken);
            if (order instanceof dw.order.Order) {
                hipayCreditCardPaymentInstrument = order.getPaymentInstruments().toArray().find(function(paymentInstrument) {
                    return paymentInstrument.getPaymentMethod() === 'HIPAY_CREDIT_CARD';
                });

                if (hipayCreditCardPaymentInstrument &&
                    hipayEnableOneClick &&
                    hipayCreditCardPaymentInstrument.getCustom().hipaySaveCreditCard &&
                    hipayCreditCardPaymentInstrument.getCustom().hipayIsOneClick)
                {
                    hiPayCheckoutModule.saveCreditCard(hipayCreditCardPaymentInstrument, order.customerName);
                }
            }
        } catch (e) {
            Logger.error('Error during save credit card: {0}', e.message);
        }

        next();
    }
);


module.exports = server.exports();
