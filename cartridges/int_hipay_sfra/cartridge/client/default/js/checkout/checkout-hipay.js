'use strict';

var base = require('base/checkout/checkout');

var shippingHelpers = require('base/checkout/shipping');
var billingHelpers = require('./billing');
var summaryHelpers = require('base/checkout/summary');
var customerHelpers = require('base/checkout/customer');
var cleave = require('base/components/cleave');

var hipaytokenize = $('#hipaytokenize').val();
var time = 0;
function __delay__(timer) {
    return new Promise(resolve => {
        setTimeout(function () {
            hipaytokenize = $('#hipaytokenize').val();
            resolve();
        }, timer);
    });
};

async function waitTokenize(timer) {
    while (hipaytokenize === '') {
        if (time > 2000) {
            return false;
        } else {
            time += timer;
            await __delay__(timer);
        }
    }

    if ($('#hipaytokenize').val() !== '') {
        hipaytokenize = $('#hipaytokenize').val();
        await __delay__(timer);
        $('button[value="submit-payment"]').trigger('click');
    }
};

$('body').on('checkout:serializeBilling', async function(){
    waitTokenize(500);
});

base.updateCheckoutView = function() {
    $('body').on('checkout:updateCheckoutView', function (e, data) {
        customerHelpers.methods.updateCustomerInformation(data.customer, data.order);
        shippingHelpers.methods.updateMultiShipInformation(data.order);
        summaryHelpers.updateTotals(data.order.totals);
        data.order.shipping.forEach(function (shipping) {
            shippingHelpers.methods.updateShippingInformation(
                shipping,
                data.order,
                data.customer,
                data.options
            );
        });
        billingHelpers.methods.updateBillingInformation(
            data.order,
            data.customer,
            data.options
        );
        billingHelpers.methods.updatePaymentInformation(data.order, data.options);
        summaryHelpers.updateOrderProductSummaryInformation(data.order, data.options);
    });
}

base.paymentTabs = function () {
    $('.payment-options .nav-item').on('click', function (e) {
        e.preventDefault();
        var methodID = $(this).data('method-id');
        $('.payment-information').data('payment-method-id', methodID);
        $('.paymentMethod').val(methodID);
        $('.credit-card-selection-new .tab-content > div[role="tabpanel"]').removeClass('active');
        if (methodID === 'HIPAY_CREDIT_CARD') {
            if (!$('.credit-card-content').hasClass('active')) {
                $('.credit-card-content').addClass('active');
            }
        }
    });
};

base.handleCreditCardNumber = function () {
    if ($('.cardNumber').length) {
        cleave.handleCreditCardNumber('.cardNumber', '#cardType');
    }
};

module.exports = base;
