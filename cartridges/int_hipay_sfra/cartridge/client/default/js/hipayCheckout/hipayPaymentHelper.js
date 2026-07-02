'use strict';

// Imported here so error-related code paths can populate the SFRA form errors
// surface (the original file relied on `formHelpers` being implicitly available,
// which only worked when the bundle was loaded after billing.js).
var formHelpers = require('base/checkout/formErrors');

/**
 * Returns the currently relevant PayPal V2 error message container.
 *
 * The PayPal button is now rendered in at most two placements (`-submit-payment`
 * and `-place-order` ids) and each placement carries its own error container with
 * the `js-hipay-paypalv2-error-message` class. We prefer the visible one so the
 * error text actually appears next to the active button, and fall back to the
 * first match for unit-test contexts where nothing is `:visible` yet.
 *
 * Replaces the previous hard-coded `#hipay-paypalv2-error-message` selector, which
 * was ambiguous as soon as more than one PayPal button container existed in the
 * DOM (e.g. when the merchant enables both placements).
 */
function getPaypalErrorContainer() {
    var $visibleErrorContainer = $('.js-hipay-paypalv2-error-message:visible').first();

    return $visibleErrorContainer.length
        ? $visibleErrorContainer
        : $('.js-hipay-paypalv2-error-message').first();
}

/**
 * Hook for merchants who want to gate PayPal eligibility on billing/shipping
 * country. Off by default. Returning `true` makes paypalV2.js re-sync the SDK
 * whenever the relevant country fields change.
 */
function shouldUsePaypalCountryEligibility() {
    return false;
}

/**
 * Tells callers whether PayPal V2 is enabled for the current site/locale.
 *
 * Reads the `enabled` flag that the server-side `getHostedFieldsPreferences()`
 * now exposes on `window.hipayCustomPreferences.paypalV2`. paypalV2.js uses this
 * to know whether to mount the SDK at all and whether to leave the PayPal payment
 * tab visible, so we cover the case where PayPal is configured at the cartridge
 * level but disabled per-locale.
 */
function isPaypalV2Eligible() {
    return !!(
        window.hipayCustomPreferences
        && window.hipayCustomPreferences.paypalV2
        && window.hipayCustomPreferences.paypalV2.enabled
    );
}

/**
 * Serialize billing address form.
 * @returns {string}
 */
function serializeBillingAddressForm() {
    var billingAddressForm = $('#dwfrm_billing .billing-address-block :input').serialize();

    $('body').trigger('checkout:serializeBilling', {
        form: $('#dwfrm_billing .billing-address-block'),
        data: billingAddressForm,
        callback: function (data) {
            if (data) {
                billingAddressForm = data;
            }
        }
    });

    var contactInfoForm = $('#dwfrm_billing .contact-info-block :input').serialize();

    $('body').trigger('checkout:serializeBilling', {
        form: $('#dwfrm_billing .contact-info-block'),
        data: contactInfoForm,
        callback: function (data) {
            if (data) {
                contactInfoForm = data;
            }
        }
    });

    var activeTabId = $('.tab-pane.active').attr('id');
    var paymentInfoSelector = '#dwfrm_billing .' + activeTabId + ' .payment-form-fields :input';
    var paymentInfoForm = $(paymentInfoSelector).serialize();

    $('body').trigger('checkout:serializeBilling', {
        form: $(paymentInfoSelector),
        data: paymentInfoForm,
        callback: function (data) {
            if (data) {
                paymentInfoForm = data;
            }
        }
    });

    return billingAddressForm + '&' + contactInfoForm + '&' + paymentInfoForm;
}

/**
 * Submit billing then place the order.
 *
 * Key fixes versus the previous implementation:
 *   - Returns a jQuery promise so the caller (paypalV2.js / applePay.js) can chain
 *     post-submission logic. Previously the function returned `undefined` even
 *     though it created a `Deferred` internally.
 *   - Always calls `defer.resolve(data)` / `defer.reject(data)` from every code
 *     path, so PayPal/ApplePay callers can rely on the promise actually settling.
 *   - Stops referencing the undefined `instancePayPal` variable in the AJAX error
 *     handlers (that triggered a ReferenceError as soon as the network failed,
 *     swallowing the actual error message for the user).
 *   - Routes the PayPal V2 server error message to the placement-aware
 *     `js-hipay-paypalv2-error-message` container via `getPaypalErrorContainer()`,
 *     and routes the Apple Pay message to `#hipay-apple-error-message`. Mixing
 *     them on a single PayPal selector hid Apple Pay errors when both methods
 *     were enabled.
 *
 * @param {object} paymentForm
 * @param {string} type
 * @returns {JQuery.Promise}
 */
function submitBillingAndplaceOrder(paymentForm, type) {
    var defer = $.Deferred();

    $.ajax({
        url: $('#dwfrm_billing').attr('action'),
        method: 'POST',
        data: paymentForm,
        success: function (data) {
            // enable the next:Place Order button here
            $('body').trigger('checkout:enableButton', '.next-step-button button');
            // look for field validation errors
            if (data.error) {
                handleErrors(type);

                if (data.fieldErrors.length) {
                    data.fieldErrors.forEach(function (error) {
                        if (Object.keys(error).length) {
                            formHelpers.loadFormErrors('.payment-form', error);
                        }
                    });
                }

                if (data.serverErrors.length) {
                    data.serverErrors.forEach(function (error) {
                        $('.error-message').show();
                        $('.error-message-text').text(error);
                        scrollAnimate($('.error-message'));
                    });
                }

                if (data.cartError) {
                    window.location.href = data.redirectUrl;
                }
                $.spinner().stop();
                // Reject with `data` so callers can inspect the server response.
                defer.reject(data);
            } else {
                $.ajax({
                    url: $('.place-order').data('action'),
                    method: 'POST',
                    success: function (data) {
                        // enable the placeOrder button here
                        $('body').trigger('checkout:enableButton', '.next-step-button button');
                        if (data.error) {
                            handleErrors(type);

                            if (data.cartError) {
                                window.location.href = data.redirectUrl;
                            } else {
                                if (data.errorMessage) {
                                    // Pick the right error container based on the
                                    // payment method that triggered the call so
                                    // PayPal and Apple Pay errors do not stomp on
                                    // each other.
                                    if (type === 'HIPAY_APPLEPAY') {
                                        $('#hipay-apple-error-message').empty().text(data.errorMessage);
                                    } else {
                                        getPaypalErrorContainer().empty().text(data.errorMessage);
                                    }
                                }
                            }
                            defer.reject(data);
                        } else {
                            // Resolve before the navigation so the caller's
                            // `.then()` runs in the same tick (the redirect that
                            // follows tears the page down).
                            defer.resolve(data);

                            if (window.hipayCustomPreferences.isSFRA6) {
                                var redirect = $('<form>')
                                    .appendTo(document.body)
                                    .attr({
                                        method: 'POST',
                                        action: data.continueUrl
                                    });

                                $('<input>')
                                    .appendTo(redirect)
                                    .attr({
                                        name: 'orderID',
                                        value: data.orderID
                                    });

                                $('<input>')
                                    .appendTo(redirect)
                                    .attr({
                                        name: 'orderToken',
                                        value: data.orderToken
                                    });

                                redirect.submit();
                            } else {
                                var continueUrl = data.continueUrl;
                                var urlParams = {
                                    ID: data.orderID,
                                    token: data.orderToken
                                };

                                continueUrl += (continueUrl.indexOf('?') !== -1 ? '&' : '?') +
                                    Object.keys(urlParams).map(function (key) {
                                        return key + '=' + encodeURIComponent(urlParams[key]);
                                    }).join('&');

                                window.location.href = continueUrl;
                            }
                        }
                        $.spinner().stop();
                    },
                    error: function () {
                        // Previously this branch referenced an undefined
                        // `instancePayPal` and threw a ReferenceError. We just
                        // surface the failure through `handleErrors` and reject
                        // the promise so the caller can react.
                        handleErrors(type);
                        $.spinner().stop();
                        defer.reject();
                    }
                });
            }
        },
        error: function () {
            handleErrors(type);
            $.spinner().stop();
            defer.reject();
        }
    });

    return defer.promise();
}

/**
 * Place an order with a PayPal V2 orderID already authorised on the client.
 *
 * Same set of fixes as `submitBillingAndplaceOrder`: a real `Deferred`, a promise
 * returned to the caller, a placement-aware error container, and the removal of
 * the dangling `instancePayPal` reference in the AJAX error handler.
 *
 * @param {string} type
 * @param {string} paypalOrderID
 * @returns {JQuery.Promise}
 */
function placeOrder(type, paypalOrderID) {
    var defer = $.Deferred();

    $.ajax({
        url: $('.place-order').data('action'),
        method: 'POST',
        data: {
            paypalOrderID: paypalOrderID
        },
        success: function (data) {
            // enable the placeOrder button here
            $('body').trigger('checkout:enableButton', '.next-step-button button');
            if (data.error) {
                handleErrors(type);

                if (data.cartError) {
                    window.location.href = data.redirectUrl;
                } else {
                    if (data.errorMessage) {
                        getPaypalErrorContainer().empty().text(data.errorMessage);
                    }
                }

                defer.reject(data);
            } else {
                defer.resolve(data);

                if (window.hipayCustomPreferences.isSFRA6) {
                    var redirect = $('<form>')
                        .appendTo(document.body)
                        .attr({
                            method: 'POST',
                            action: data.continueUrl
                        });

                    $('<input>')
                        .appendTo(redirect)
                        .attr({
                            name: 'orderID',
                            value: data.orderID
                        });

                    $('<input>')
                        .appendTo(redirect)
                        .attr({
                            name: 'orderToken',
                            value: data.orderToken
                        });

                    redirect.submit();
                } else {
                    var continueUrl = data.continueUrl;
                    var urlParams = {
                        ID: data.orderID,
                        token: data.orderToken
                    };

                    continueUrl += (continueUrl.indexOf('?') !== -1 ? '&' : '?') +
                        Object.keys(urlParams).map(function (key) {
                            return key + '=' + encodeURIComponent(urlParams[key]);
                        }).join('&');

                    window.location.href = continueUrl;
                }
            }
            $.spinner().stop();
        },
        error: function () {
            handleErrors(type);
            $.spinner().stop();
            defer.reject();
        }
    });

    return defer.promise();
}

/**
 * Handle errors
 *
 * The Apple Pay branch previously referenced `intanceApplePayButton` as a free
 * variable, which fails (ReferenceError) when this helper is bundled separately
 * from applePay.js or when Apple Pay was never instantiated (PayPal-only flows).
 * We now look it up on `window` and no-op when it is missing.
 *
 * @param {string} type
 */
function handleErrors(type) {
    switch(type) {
        case 'HIPAY_APPLEPAY':
            // `intanceApplePayButton` is a global owned by applePay.js (the name
            // typo is intentional for backwards compatibility with existing
            // overrides). Guarding the call avoids ReferenceErrors when it has
            // not been initialised.
            if (window.intanceApplePayButton) {
                window.intanceApplePayButton.completePaymentWithSuccess();
            }
            break;
        case 'HIPAY_PAYPAL_V2':
            // Rien à faire
            break;
    }
}

module.exports = {
    isPaypalV2Eligible: isPaypalV2Eligible,
    shouldUsePaypalCountryEligibility: shouldUsePaypalCountryEligibility,
    serializeBillingAddressForm: serializeBillingAddressForm,
    submitBillingAndplaceOrder: submitBillingAndplaceOrder,
    placeOrder: placeOrder
};
