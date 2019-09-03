'use strict';

var formValidation = require('base/components/formValidation');
var base = require('base/paymentInstruments/paymentInstruments');
var cleave = require('../components/cleave');

var url;

base.handleCreditCardNumber = function () {
    if ($('#cardNumber').length && $('#cardType').length && $('.nav-item').data('method-id').indexOf('HIPAY') < 0) {
        cleave.handleCreditCardNumber('#cardNumber', '#cardType');
    }
};

module.exports = base;
