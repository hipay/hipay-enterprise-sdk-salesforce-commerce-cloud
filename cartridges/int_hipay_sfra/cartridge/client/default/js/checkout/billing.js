'use strict';

var base = require('base/checkout/billing');

function togglePaypalV2CTA(selectedPaypalV2) {
    return function () {
        var paypalButton = $('#paypal-button');

        if ($('#checkout-main').attr("data-checkout-stage") === 'payment' &&
            paypalButton.length > 0 &&
            window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement === 'submitPayment') {
            paypalButton.show();
        } else if ($('#checkout-main').attr("data-checkout-stage") === 'placeOrder') {
            if (selectedPaypalV2) {
                paypalButton.show();
                $('.btn-primary.btn-block.place-order').hide();
            } else {
                // Hides the PayPal button and shows the place order button.
                paypalButton.hide();
                $('.btn-primary.btn-block.place-order').show();
            }
        } else {
            paypalButton.hide();
        }
    };
}

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

        var observer = new MutationObserver(togglePaypalV2CTA(selectedPaypalV2));
        observer.observe(document.getElementById('checkout-main'), {
            attributes: true
        });
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
