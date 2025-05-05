'use strict';

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
 * Submit billing and Place order.
 * @param {object} paymentForm
 * @param {string} type
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
                handleErrors(type)
    
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
                defer.reject();
            } else {
                $.ajax({
                    url: $('.place-order').data('action'),
                    method: 'POST',
                    success: function (data) {
                        // enable the placeOrder button here
                        $('body').trigger('checkout:enableButton', '.next-step-button button');
                        if (data.error) {
                            handleErrors(type)
    
                            if (data.cartError) {
                                window.location.href = data.redirectUrl;
                                defer.reject();
                            } else {
                                if (data.errorMessage) {
                                    $('#hipay-paypalv2-error-message').empty().text(data.errorMessage);
                                }
                            }
                        } else {
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
                        $.spinner().stop();
                    },
                    error: function () {
                        instancePayPal.on('paymentUnauthorized', function(error) {
                            handleErrors(type)
                        });
                        $.spinner().stop();
                    }
                });
            }
        },
        error: function () {
            instancePayPal.on('paymentUnauthorized', function(error) {
                handleErrors(type)
            });
            $.spinner().stop();
        }
    });
}

function placeOrder(type, paypalOrderID) {
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
                handleErrors(type)

                if (data.cartError) {
                    window.location.href = data.redirectUrl;
                    defer.reject();
                } else {
                    if (data.errorMessage) {
                        $('#hipay-paypalv2-error-message').empty().text(data.errorMessage);
                    }
                }
            } else {
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
            $.spinner().stop();
        },
        error: function () {
            instancePayPal.on('paymentUnauthorized', function(error) {
                handleErrors(type)
            });
            $.spinner().stop();
        }
    });
}

/**
 * Handle errors
 * @param {string} type
 */
function handleErrors(type) {
    switch(type) {
        case 'HIPAY_APPLEPAY':
            intanceApplePayButton.completePaymentWithSuccess();
            break;
        case 'HIPAY_PAYPAL_V2':
            // Rien à faire
            break;
    }
}

module.exports = {
    serializeBillingAddressForm: serializeBillingAddressForm,
    submitBillingAndplaceOrder: submitBillingAndplaceOrder,
    placeOrder: placeOrder
};