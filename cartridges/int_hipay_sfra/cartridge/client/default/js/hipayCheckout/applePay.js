'use strict'

var hipay = require('./globalVariable').getGlobalVariable();

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
        setTimeout(function() {
            var activeTabId = $('.tab-pane.active').attr('id');
            var paymentInfoSelector = '#dwfrm_billing .' + activeTabId + ' .payment-form-fields :input';
            var paymentInfoForm = $(paymentInfoSelector).serialize();

            $('body').trigger('checkout:serializeBilling', {
                form: $(paymentInfoSelector),
                data: paymentInfoForm,
                callback: function (data) {
                    if (data) {
                        paymentInfoForm = data;
                        console.log(paymentInfoForm);
                    }
                }
            });

            var paymentForm = billingAddressForm + '&' + contactInfoForm + '&' + paymentInfoForm;

            if ($('.data-checkout-stage').data('customer-type') === 'registered') {
                // if payment method is credit card
                if ($('.payment-information').data('payment-method-id') === 'CREDIT_CARD') {
                    if (!($('.payment-information').data('is-new-payment'))) {
                        var cvvCode = $('.saved-payment-instrument.' +
                            'selected-payment .saved-payment-security-code').val();

                        if (cvvCode === '') {
                            var cvvElement = $('.saved-payment-instrument.' +
                                'selected-payment ' +
                                '.form-control');
                            cvvElement.addClass('is-invalid');
                            scrollAnimate(cvvElement);
                            defer.reject();
                            return defer;
                        }

                        var $savedPaymentInstrument = $('.saved-payment-instrument' +
                            '.selected-payment'
                        );

                        paymentForm += '&storedPaymentUUID=' +
                            $savedPaymentInstrument.data('uuid');

                        paymentForm += '&securityCode=' + cvvCode;
                    }
                }
            }
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
                        //
                        // Populate the Address Summary
                        //
                        $('body').trigger('checkout:updateCheckoutView',
                            { order: data.order, customer: data.customer });

                        if (data.renderedPaymentInstruments) {
                            $('.stored-payments').empty().html(
                                data.renderedPaymentInstruments
                            );
                        }

                        if (data.customer.registeredUser
                            && data.customer.customerPaymentInstruments.length
                        ) {
                            $('.cancel-new-payment').removeClass('checkout-hidden');
                        }

                        scrollAnimate();
                        defer.resolve(data);
                    }
                },
                error: function (err) {
                    // enable the next:Place Order button here
                    $('body').trigger('checkout:enableButton', '.next-step-button button');
                    if (err.responseJSON && err.responseJSON.redirectUrl) {
                        window.location.href = err.responseJSON.redirectUrl;
                    }
                }
            });
        }, 1000);
        // return defer;
        console.log(hipayToken);
        // intanceApplePayButton.completePaymentWithSuccess();
    });
}