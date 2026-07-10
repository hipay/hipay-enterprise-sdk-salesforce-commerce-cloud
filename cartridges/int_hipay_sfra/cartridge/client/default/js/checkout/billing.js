'use strict';

var base = require('base/checkout/billing');
var formHelpers = require('base/checkout/formErrors');

// Tracks the MutationObserver so it can be disconnected before creating a new one.
var paypalV2Observer = null;

/**
 * Returns the PayPal V2 button element for the configured placement
 * (`window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement`).
 */
function getPaypalButton() {
    var placement = window.hipayCustomPreferences
        && window.hipayCustomPreferences.paypalV2
        && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement;
    var buttonId = placement === 'placeOrder'
        ? '#paypal-button-place-order'
        : '#paypal-button-submit-payment';

    return $(buttonId);
}

/**
 * Whether the HiPay SDK has finished rendering the PayPal button
 * (paypalV2.js sets `data-hipay-paypal-ready` on the container).
 */
function isPaypalButtonReady() {
    return getPaypalButton().attr('data-hipay-paypal-ready') === 'true';
}

// Clears any inline display override, handing control back to base SFRA's stage-driven CSS.
function resetNativeCheckoutButtons() {
    $('.submit-payment').css('display', '');
    $('.place-order').css('display', '');
}

function togglePaypalV2CTA(selectedPaypalV2) {
    return function () {
        var placement = window.hipayCustomPreferences
            && window.hipayCustomPreferences.paypalV2
            && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement;
        var paypalButton = getPaypalButton();
        var stage = $('#checkout-main').attr('data-checkout-stage');

        if (!selectedPaypalV2) {
            paypalButton.hide();
            resetNativeCheckoutButtons();
            return;
        }

        if (stage === 'payment' && paypalButton.length > 0 && placement === 'submitPayment') {
            paypalButton.show();
            $('.submit-payment').toggle(!isPaypalButtonReady());
        } else if (stage === 'placeOrder' && placement === 'placeOrder') {
            paypalButton.show();
            $('.place-order').toggle(!isPaypalButtonReady());
        } else {
            paypalButton.hide();
            resetNativeCheckoutButtons();
        }
    };
}

// Whether HIPAY_PAYPAL_V2 is the currently selected payment method.
function isPaypalV2Selected() {
    var activeMethodId = $('.payment-options .nav-link.active').closest('.nav-item').data('method-id');

    if (activeMethodId) {
        return activeMethodId === 'HIPAY_PAYPAL_V2';
    }

    return $('.payment-information').data('payment-method-id') === 'HIPAY_PAYPAL_V2';
}

// Re-run the toggle on SDK readiness changes, not just stage transitions.
$('body').on('hipay:paypalv2-availability', function () {
    togglePaypalV2CTA(isPaypalV2Selected())();
});

// Clears every HiPay payment error surface across all payment methods.
function clearHipayPaymentErrors() {
    formHelpers.clearPreviousErrors('.payment-form');
    $('#hipay-error-message').empty();
    $('#hipay-apple-error-message').empty();
    $('.js-hipay-paypalv2-error-message').empty();
}

$('.payment-options .nav-item').on('click', clearHipayPaymentErrors);
$('body').on('checkout:disableButton', clearHipayPaymentErrors);

base.methods.updatePaymentInformation = function (order) {
    // update payment details
    var $paymentSummary = $('.payment-details');
    var htmlToAppend = '';

    if (order.billing.payment && order.billing.payment.selectedPaymentInstruments && order.billing.payment.selectedPaymentInstruments.length > 0) {

        if (order.billing.payment.selectedPaymentInstruments[0].paymentMethod.indexOf('CREDIT_CARD') > -1 && order.billing.payment.selectedPaymentInstruments[0].paymentMethod.indexOf('HOSTED') < 0) {
            htmlToAppend += '<span>' + order.resources.cardType + ' '
                + order.billing.payment.selectedPaymentInstruments[0].type
                + '</span><div>'
                + order.billing.payment.selectedPaymentInstruments[0].maskedCreditCardNumber
                + '</div><div><span>'
                + order.resources.cardEnding + ' '
                + order.billing.payment.selectedPaymentInstruments[0].expirationMonth
                + '/' + order.billing.payment.selectedPaymentInstruments[0].expirationYear
                + '</span></div>';
        } else {
            htmlToAppend += '<span>' + order.billing.payment.selectedPaymentInstruments[0].name + '</span></div>';
        }
    }

    $paymentSummary.empty().append(htmlToAppend);

    // PAYPAL V2
    if (order.billing && order.billing.payment && order.billing.payment.selectedPaymentInstruments) {
        var selectedPaypalV2 = false;
        for (var selectedPaymentInstrument of order.billing.payment.selectedPaymentInstruments) {
            if (selectedPaymentInstrument.paymentMethod === 'HIPAY_PAYPAL_V2') {
                selectedPaypalV2 = true;
            }
        }

        if (paypalV2Observer) {
            paypalV2Observer.disconnect();
        }

        paypalV2Observer = new MutationObserver(togglePaypalV2CTA(selectedPaypalV2));
        paypalV2Observer.observe(document.getElementById('checkout-main'), {
            attributes: true,
            attributeFilter: ['data-checkout-stage']
        });

        togglePaypalV2CTA(selectedPaypalV2)();
    }
};

/**
* Validate and update payment instrument form fields
* @param {Object} order - the order model
*/
base.methods.validateAndUpdateBillingPaymentInstrument = function (order) {
    var billing = order.billing;
    if (!billing.payment || !billing.payment.selectedPaymentInstruments
        || billing.payment.selectedPaymentInstruments.length <= 0) return;

    var form = $('form[name=dwfrm_billing]');
    if (!form) return;

    var instrument = billing.payment.selectedPaymentInstruments[0];
    $('select[name$=expirationMonth]', form).val(instrument.expirationMonth);
    $('select[name$=expirationYear]', form).val(instrument.expirationYear);
    // Force security code and card number clear
    $('input[name$=securityCode]', form).val('');
    $('input[name$=cardNumber]').lengh && $('input[name$=cardNumber]').data('cleave').setRawValue('');
};

module.exports = base;
