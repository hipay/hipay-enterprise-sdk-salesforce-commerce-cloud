'use strict';

var base = require('base/checkout/billing');
var addressHelpers = require('base/checkout/address');
var cleave = require('../components/cleave');

base.methods.updatePaymentInformation = function (order) {
    console.warn('updatePaymentInformation HIPAY v2');

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
};

base.paymentTabs = function () {
    $('.payment-options .nav-item').on('click', function (e) {
        e.preventDefault();
        var methodID = $(this).data('method-id');
        $('.payment-information').data('payment-method-id', methodID);
        console.warn('Update method ' + methodID);
        $('.paymentMethod').val(methodID);
    });
};

module.exports = base;
