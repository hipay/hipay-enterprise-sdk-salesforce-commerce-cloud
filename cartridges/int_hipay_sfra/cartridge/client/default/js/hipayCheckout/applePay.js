'use strict'

var hipay = require('./globalVariable').getGlobalVariable();


var formHelpers = require('base/checkout/formErrors');
var scrollAnimate = require('base/components/scrollAnimate');

// Configuration
const total = {
    label: 'Total',
    amount: $('.grand-total .grand-total-sum').text().replace(/[^0-9.,]/g, '').replace(',', '.')
  };

  const request = {
    countryCode: 'FR',
    currencyCode: 'EUR',
    total: total,
    supportedNetworks: ['visa', 'masterCard']
  };

  const applePayStyle = {
    type: 'plain',
    color: 'black'
  };

  const options = {
    displayName: 'OGONE CLEVERAGE',
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
        formHelpers.clearPreviousErrors('.payment-form');

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

        $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(hipayToken));

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
                            console.log('PLACE-ORDER');
                            console.log(data);
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
}