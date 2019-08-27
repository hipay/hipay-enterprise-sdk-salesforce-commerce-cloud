'use strict';

var PaymentMgr  = require('dw/order/PaymentMgr'),
    Transaction = require('dw/system/Transaction'),
    OrderMgr    = require('dw/order/OrderMgr');

/**
 * Creates a HiPay PaymentInstrument and returns 'success'
 */
function Handle(currentBasket, paymentInformation) {
    var basket        = currentBasket,
        paymentMethod = session.forms.billing.paymentMethod.value,
        HiPayLogger   = require('*/cartridge/scripts/lib/hipay/hipayLogger'),
        log           = new HiPayLogger("HIPAY_HOSTED");

    if (!empty(paymentMethod)) {
        try {
            var hiPayCheckoutModule = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule'),
                paymentInstrument   = hiPayCheckoutModule.createPaymentInstrument(basket, paymentMethod, true);
            hiPayCheckoutModule.hiPayUpdatePaymentInstrument(paymentInstrument);

        } catch (e) {
            log.error(e);
            return { error : true };
        }

        return { error : false };
    } else {
        return { error : true };
    }
}

/**
 * Authorize HiPay Hosted Page payment
 */
function Authorize(orderNumber, paymentInstrument, paymentProcessor) {
    var paymentMethod     = session.forms.billing.paymentMethod.value,
        orderNo           = orderNumber,
        order = OrderMgr.getOrder(orderNumber);
        HiPayLogger       = require('*/cartridge/scripts/lib/hipay/hipayLogger'),
        log               = new HiPayLogger("HIPAY_HOSTED");

    if (!empty(paymentMethod)) {
        Transaction.wrap(function () {
            paymentInstrument.paymentTransaction.transactionID    = orderNo;
            paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
        });

        var result = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule').hiPayHostedPageRequest(order, paymentInstrument);

        if (result.error) {
            return { error : true };
        }

        if (result.hiPayIFrameEnabled) {
            return {
                HiPay : true,
                HiPayRedirectURL : result.hiPayRedirectURL,
                Iframe : true,
                Template : 'hipay/hosted/hipayIframe'
            };
        } else {
            return {
                HiPay : true,
                HiPayRedirectURL : result.hiPayRedirectURL,
                Hosted : true
            };
        }

        return { success : true };
    } else {
        return { error : true };
    }
}

exports.Handle = Handle;
exports.Authorize = Authorize;
