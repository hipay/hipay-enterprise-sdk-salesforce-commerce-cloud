'use strict'

var hipay = require('./globalVariable').getGlobalVariable();


var formHelpers = require('base/checkout/formErrors');
var scrollAnimate = require('base/components/scrollAnimate');

// Configuration
const total = {
    label: window.hipayCustomPreferences.applePayConfig.total.label,
    amount: $('.grand-total .grand-total-sum').text().replace(/[^0-9.,]/g, '').replace(',', '.')
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
    var defer = $.Deferred();
    intanceApplePayButton.on('paymentAuthorized', function(hipayToken) {
        $('#hipay-apple-error-message').empty();

        formHelpers.clearPreviousErrors('.payment-form');

        $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(hipayToken));

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

        var paymentForm = billingAddressForm + '&' + contactInfoForm + '&' + paymentInfoForm;

        // disable the next:Place Order button here
        $('body').trigger('checkout:disableButton', '.next-step-button button');

        $.ajax({
            url: $('#dwfrm_billing').attr('action'),
            method: 'POST',
            data: paymentForm,
            success: function (data) {
                // enable the next:Place Order button here
                $('body').trigger('checkout:enableButton', '.next-step-button button');
                // look for field validation errors
                if (data.error) {
                    intanceApplePayButton.completePaymentWithFailure();
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
                    defer.reject();
                } else {
                    $.ajax({
                        url: $('.place-order').data('action'),
                        method: 'POST',
                        success: function (data) {
                            // enable the placeOrder button here
                            $('body').trigger('checkout:enableButton', '.next-step-button button');
                            if (data.error) {
                                intanceApplePayButton.completePaymentWithFailure();
                                if (data.cartError) {
                                    window.location.href = data.redirectUrl;
                                    defer.reject();
                                } else {
                                    if (data.errorMessage) {
                                        $('#hipay-apple-error-message').empty().text(data.errorMessage);
                                    }
                                }
                            } else {
                                intanceApplePayButton.completePaymentWithSuccess();

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

                                defer.resolve(data);
                            }
                        },
                        error: function () {
                            intanceApplePayButton.completePaymentWithFailure();
                        }
                    });
                }
            },
            error: function () {
                intanceApplePayButton.completePaymentWithFailure();
            }
        });
    });
} else {
    // Removed Apple Pay nav-item if intanceApplePayButton don't exists.
    $("li[data-method-id='HIPAY_APPLEPAY']").toggleClass("d-none");
}

// Remove next-step-button if HIPAY_APPLEPAY is clicked.
$('.nav-item').on('click', function() {
    $('.next-step-button').toggleClass('d-none',  $(this).data('method-id') === 'HIPAY_APPLEPAY');
});