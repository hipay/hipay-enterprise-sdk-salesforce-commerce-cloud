'use strict';

var server = require('server');

var Calendar = require('dw/util/Calendar');
var Customer = require('dw/customer/Customer');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

/**
 * Retrieves a JSON list of the current customer's payment instruments.

 * It returns a filtered list of payment instruments stored in the customer's wallet,
 * excluding expired cards.
 *
 * @route GET /JsonList
 * @middleware userLoggedIn.validateLoggedIn - Ensures the user is logged in.
 * @middleware consentTracking.consent - Handles consent tracking validation.
 * @middleware csrfProtection.validateAjaxRequest - Protects against CSRF attacks.
 *
 * @returns {Object} JSON response containing:
 *  - paymentInstruments: Array of valid payment instruments (non-expired).
 *  - registeredUser: Boolean indicating if the user is authenticated and registered.
 */
server.get('JsonList',
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var currentCustomer = req.currentCustomer;
        var paymentInstrumentsResult = [];
        var paymentInstruments = currentCustomer.wallet.paymentInstruments;

        var currentDate = new Calendar();
        var currentYear = currentDate.get(Calendar.YEAR);
        var currentMonth = currentDate.get(Calendar.MONTH) + 1;

        if (paymentInstruments.length > 0) {
            paymentInstrumentsResult = paymentInstruments.map(function(paymentInstrument) {
                return {
                    token: paymentInstrument.raw.getCreditCardToken(),
                    brand: paymentInstrument.raw.getCreditCardType(),
                    pan: paymentInstrument.raw.getCustom().hipayCreditCardNumber,
                    // Ensure the month is always two digits by padding with '0' if necessary
                    card_expiry_month: paymentInstrument.raw.getCreditCardExpirationMonth().toString().padStart(2, '0'),
                    card_expiry_year:  paymentInstrument.raw.getCreditCardExpirationYear().toString(),
                    card_holder: paymentInstrument.raw.getCreditCardHolder()
                }
            }).filter(function (card) {
                return (
                    Number(card.card_expiry_year) > Number(currentYear) ||
                    (Number(card.card_expiry_year) === Number(currentYear) && Number(card.card_expiry_month) >= Number(currentMonth))
                );
            });
        }

        res.json({
            paymentInstruments: paymentInstrumentsResult,
            registeredUser : currentCustomer instanceof Customer ? (currentCustomer.authenticated && currentCustomer.registered) : (currentCustomer.raw.authenticated && currentCustomer.raw.registered)
        })

        return next();
    }
);

module.exports = server.exports();
