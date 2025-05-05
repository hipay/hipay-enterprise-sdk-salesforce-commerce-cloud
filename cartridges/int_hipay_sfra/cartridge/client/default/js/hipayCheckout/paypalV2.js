'use strict';

var hipay = require('./globalVariable').getGlobalVariable();
var hipayPaymentHelper = require('./hipayPaymentHelper');
var formHelpers = require('base/checkout/formErrors');

var instancePayPal = null;
var total = $('#paypal-button').data('total');
var currency = $('.form-control.paymentMethod').data('currency-code');
// Configuration
const request = {
    amount: total,
    currency: currency,
};

const paypalButtonStyle = window.hipayCustomPreferences.paypalV2.style

const options = {
    canPayLater: window.hipayCustomPreferences.paypalV2.options.canPayLater,
    request: request,
    paypalButtonStyle: paypalButtonStyle,
    selector: 'paypal-button',
    template: 'auto'
};

if (total && currency) {
    instancePayPal = hipay.create(
        'paypal',
        options
    );
}

if (instancePayPal) {
    $('.btn-primary.btn-block.place-order').hide();

    instancePayPal.on('paymentAuthorized', function(paypalData) {
        $.spinner().start();

        formHelpers.clearPreviousErrors('.payment-form');

        $('input[name=dwfrm_billing_paypalV2OrderID]').val(paypalData.orderID);
        var paymentForm = hipayPaymentHelper.serializeBillingAddressForm();

        // disable the next:Place Order button here
        $('body').trigger('checkout:disableButton', '.next-step-button button');

        if (window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'submitPayment') {
            hipayPaymentHelper.submitBillingAndplaceOrder(paymentForm, 'HIPAY_PAYPAL_V2')
        } else if (window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'placeOrder') {
            hipayPaymentHelper.placeOrder('HIPAY_PAYPAL_V2', paypalData.orderID);
        }

    });
}

// Remove next-step-button if HIPAY_PAYPAL_V2 is clicked.
if (window.hipayCustomPreferences &&
    window.hipayCustomPreferences.paypalV2 &&
    window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'submitPayment'
)
{
    $('.nav-item').on('click', function() {
        $('.next-step-button').toggleClass('d-none',  $(this).data('method-id') === 'HIPAY_PAYPAL_V2');
    });
}

// Hides the PayPal button if the current page is not the 'placeOrder' stage and
// the PayPal button placement is configured to be only on the 'placeOrder' stage.
// This prevents the PayPal button from being displayed on page.
var urlParams = new URLSearchParams(window.location.search);
var stage = urlParams.get('stage');

if (stage !== 'placeOrder' && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'placeOrder') {
    $('#paypal-button').hide();
}

// Hides the PayPal button if the current page is not the 'payment' stage and
// the PayPal button placement is configured to be only on the 'submitPayment' stage.
// This prevents the PayPal button from being displayed on page.
if (stage !== 'payment' && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'submitPayment') {
    $('#paypal-button').hide();
}
