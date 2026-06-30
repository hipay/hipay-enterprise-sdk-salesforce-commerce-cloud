'use strict';

var base = require('base/checkout/billing');

/*
 * Holds the MutationObserver that watches the `data-checkout-stage` attribute on the
 * checkout root. We need to keep a reference so we can disconnect it before creating a
 * new one when `updatePaymentInformation` is re-invoked (e.g. on each Ajax checkout
 * refresh). Without disconnecting, observers stacked up on every refresh and each one
 * triggered redundant DOM work (and could fight with each other to show/hide buttons).
 */
var paypalV2Observer = null;

/**
 * Returns the PayPal V2 button element for the current placement.
 *
 * The placement (submitPayment | placeOrder) is configured by a HiPay site preference
 * and exposed via `window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement`.
 * The two placements have different DOM ids (`paypal-button-submit-payment` vs
 * `paypal-button-place-order`) so that both can coexist safely in the template tree.
 *
 * Returning a placement-aware selector here keeps `togglePaypalV2CTA` free of the
 * id-vs-placement branching duplication it used to carry.
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
 * Indicates whether the HiPay JS SDK has finished rendering the PayPal button inside
 * its container.
 *
 * paypalV2.js sets `data-hipay-paypal-ready="true"` on the container after the SDK
 * fires its `ready` event. We read that flag here to decide whether the standard
 * "Place Order" button should still be visible: while PayPal is the selected method
 * but the PayPal button is not yet rendered, we keep the SFRA place-order CTA visible
 * to avoid leaving the user with no actionable button.
 */
function isPaypalButtonReady() {
    return getPaypalButton().attr('data-hipay-paypal-ready') === 'true';
}

function togglePaypalV2CTA(selectedPaypalV2) {
    return function () {
        var placement = window.hipayCustomPreferences
            && window.hipayCustomPreferences.paypalV2
            && window.hipayCustomPreferences.paypalV2.hipayPaypalButtonPlacement;
        var paypalButton = getPaypalButton();

        if ($('#checkout-main').attr("data-checkout-stage") === 'payment' &&
            paypalButton.length > 0 &&
            placement === 'submitPayment') {
            paypalButton.show();
        } else if ($('#checkout-main').attr("data-checkout-stage") === 'placeOrder' && placement === 'placeOrder') {
            if (selectedPaypalV2) {
                paypalButton.show();
                // Only hide the SFRA place-order button once the PayPal SDK button is
                // actually rendered; otherwise the user would see no CTA at all during
                // the brief gap between selecting PayPal and the SDK initialising.
                // The narrower `.place-order` selector (instead of the previous
                // `.btn-primary.btn-block.place-order`) is intentional: it matches any
                // styling variant of the SFRA place-order button.
                $('.place-order').toggle(!isPaypalButtonReady());
            } else {
                // Hides the PayPal button and shows the place order button.
                paypalButton.hide();
                $('.place-order').show();
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

        // Disconnect any previously installed observer so that successive Ajax
        // refreshes (each of which calls updatePaymentInformation) do not stack
        // observers on the checkout root.
        if (paypalV2Observer) {
            paypalV2Observer.disconnect();
        }

        // `attributeFilter` keeps us from waking up on unrelated attribute mutations.
        // We only need to react when the checkout stage changes (payment -> placeOrder
        // and back), which is what drives the show/hide rules above.
        paypalV2Observer = new MutationObserver(togglePaypalV2CTA(selectedPaypalV2));
        paypalV2Observer.observe(document.getElementById('checkout-main'), {
            attributes: true,
            attributeFilter: ['data-checkout-stage']
        });

        // Run the toggler once immediately so the current stage is honoured even when
        // no further attribute mutation happens (e.g. user is already on the
        // place-order step).
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
