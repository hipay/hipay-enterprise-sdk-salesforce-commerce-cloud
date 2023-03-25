'use strict';

var base = require('base/checkout/checkout');

var shippingHelpers = require('base/checkout/shipping');
var billingHelpers = require('./billing');
var summaryHelpers = require('base/checkout/summary');
var customerHelpers = require('base/checkout/customer');
var cleave = require('base/components/cleave');

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
