'use strict'

var hipay = require('./globalVariable').getGlobalVariable();
var hipayPaymentHelper = require('./hipayPaymentHelper');


var formHelpers = require('base/checkout/formErrors');

// Configuration
const total = {
    label: window.hipayCustomPreferences.applePayConfig.total.label,
    amount: $('#apple-pay-button').data('total')
};

const request = {
    countryCode: window.hipayCustomPreferences.applePayConfig.request.countryCode,
    currencyCode: $('.form-control.paymentMethod').data('currency-code'),
    total: total,
    supportedNetworks: window.hipayCustomPreferences.applePayConfig.request.supportedNetworks
};

const applePayStyle = {
    type: window.hipayCustomPreferences.applePayConfig.style.type,
    color: window.hipayCustomPreferences.applePayConfig.style.color
};

const options = {
    displayName: window.hipayCustomPreferences.applePayConfig.options.displayName,
    request: request,
    applePayStyle: applePayStyle,
    selector: 'apple-pay-button'
};

var intanceApplePayButton = hipay.create(
    'paymentRequestButton',
    options
);

if (intanceApplePayButton) {
    intanceApplePayButton.on('paymentAuthorized', function(hipayToken) {
        $('#hipay-apple-error-message').empty();

        formHelpers.clearPreviousErrors('.payment-form');
        $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(hipayToken));

        var paymentForm = hipayPaymentHelper.serializeBillingAddressForm();

        // disable the next:Place Order button here
        $('body').trigger('checkout:disableButton', '.next-step-button button');

        hipayPaymentHelper.placeOrder(paymentForm, 'HIPAY_APPLEPAY')
    });
} else {
    // Removed Apple Pay nav-item if intanceApplePayButton don't exists.
    $("li[data-method-id='HIPAY_APPLEPAY']").toggleClass("d-none");
}

// Remove next-step-button if HIPAY_APPLEPAY is clicked.
$('.nav-item').on('click', function() {
    $('.next-step-button').toggleClass('d-none',  $(this).data('method-id') === 'HIPAY_APPLEPAY');
});