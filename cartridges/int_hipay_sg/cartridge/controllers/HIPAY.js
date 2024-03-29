'use strict';

/**
 * Controller that handles HiPay payments
 *
 * @module controllers/HIPAY
 */

/* API Includes */
var ISML = require('dw/template/ISML');

/* Script Modules */
var hiPayModule = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule');
var sitePrefs = require('dw/system/Site').getCurrent().getPreferences().getCustom();

/**
* Verifies a credit card against a valid card number and expiration date
* and possibly invalidates invalid form fields. If the verification was successful
* a credit card payment instrument is created.
*
* @param  {dw.order.PaymentInstrument} paymentInstrument - The payment instrument
* @return {Object} Object indicating success or error
*/
function creditCardHandle(paymentInstrument) {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var Transaction = require('dw/system/Transaction');
    var creditCard = session.forms.billing.paymentMethods.creditCard;
    var hipayEnableOneClick = sitePrefs.hipayEnableOneClick;
    var hiPayMultiUseToken = false;
    var hiPayToken = null;
    var hiPayTokenResult;
    var creditCardHolder;
    var creditCardStatus;
    var cardNumber;
    var cardSecurityCode;
    var cardType;
    var expirationMonth;
    var expirationYear;
    var paymentCard;
    var hiPayCardNumber;
    var hiPayCardExpiryMonth;
    var hiPayCardExpiryYear;
    var hiPayCardHolder;
    var hiPayCardCVC;
    var hiPayCardType;

    var hipayTokenize = JSON.parse(session.forms.billing.paymentMethods.hipayTokenize.value);

    if (!empty(creditCard.uuid.value) && hipayEnableOneClick) { // If one-click payment
        var paymentInstruments = customer.getProfile().getWallet().getPaymentInstruments('HIPAY_CREDIT_CARD');
        var uuid = creditCard.uuid.value;
        var creditCardInstrument = null;
        var selectedCreditCard = null;

        var instrumentsIter = !empty(uuid) && !empty(paymentInstruments) ? paymentInstruments.iterator() : '';

        while (!empty(instrumentsIter) && instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();

            if (uuid.equals(creditCardInstrument.UUID)) {
                selectedCreditCard = creditCardInstrument;
                break;
            }
        }

        if (empty(selectedCreditCard)) {
            return { error: true };
        }

        hiPayCardNumber = selectedCreditCard.creditCardNumber;
        hiPayCardExpiryMonth = selectedCreditCard.creditCardExpirationMonth;
        hiPayCardExpiryYear = selectedCreditCard.creditCardExpirationYear;
        hiPayCardHolder = selectedCreditCard.creditCardHolder;
        hiPayMultiUseToken = session.forms.billing.paymentMethods.creditCard.saveCard.value;
        hiPayToken = selectedCreditCard.creditCardToken;
        hiPayCardType = selectedCreditCard.creditCardType;
    } else {
        hiPayCardNumber = hipayTokenize.pan;
        hiPayCardExpiryMonth = Number(hipayTokenize.card_expiry_month);
        hiPayCardExpiryYear = Number(hipayTokenize.card_expiry_year);
        hiPayCardHolder = hipayTokenize.card_holder;
        // Exemple : 'VISA' to 'Visa'.
        hiPayCardType = hipayTokenize.brand.charAt(0).toUpperCase() + hipayTokenize.brand.slice(1).toLowerCase();

        if (hipayTokenize.token) {
            hiPayToken = hipayTokenize.token;
        } else {
            return { error: true };
        }
    }

    // Init flag saveCardChecked (depending on the storedPaymentUUID)
    if (empty(creditCard.uuid.value) && session.forms.billing.paymentMethods.creditCard.saveCard.value) {
        session.custom.saveCardChecked = session.forms.billing.paymentMethods.creditCard.saveCard.value;
    } else {
        session.custom.saveCardChecked = false;
    }

    try {
        Transaction.wrap(function () {
            paymentInstrument.setCreditCardHolder(hiPayCardHolder);
            paymentInstrument.setCreditCardNumber(hiPayCardNumber);
            paymentInstrument.setCreditCardType(hiPayCardType);
            paymentInstrument.setCreditCardExpirationMonth(hiPayCardExpiryMonth);
            paymentInstrument.setCreditCardExpirationYear(hiPayCardExpiryYear);
            paymentInstrument.setCreditCardToken(hiPayToken);
        });
    } catch (e) {
        return { error: true };
    }

    return { success: true };
}

/**
* Creates a HiPay PaymentInstrument
*
* @return {Object} success if the payment instrument is created, error otherwise
*/
function Handle(args) {
    var basket = args.Basket;
    var paymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
    var paymentInstrument;

    if (!empty(paymentMethod)) {
        paymentInstrument = hiPayModule.createPaymentInstrument(basket, paymentMethod, true);

        if (paymentInstrument === null) {
            return { error: true };
        }

        hiPayModule.hiPayUpdatePaymentInstrument(paymentInstrument);

        if (paymentMethod === 'HIPAY_CREDIT_CARD') {
            if (creditCardHandle(paymentInstrument).success) {
                return { success: true };
            } else { // eslint-disable-line
                return { error: true };
            }
        } else { // eslint-disable-line
            return { success: true };
        }
    } else {
        return { error: true };
    }
}

/**
* Authorize HiPay payment
*
* @param  {dw.order.Order} order
* @param  {dw.order.PaymentInstrument} paymentInstrument
* @return {Object} Object indicating authorized if successful or error otherwise
*/
function Authorize(args) {
    var PaymentMgr = require('dw/order/PaymentMgr');
    var Transaction = require('dw/system/Transaction');
    var hipayEnableOneClick = sitePrefs.hipayEnableOneClick;
    var order = args.Order;
    var paymentInstrument = args.PaymentInstrument;
    var paymentProcessor = null;
    var paymentMethod = session.forms.billing.paymentMethods.selectedPaymentMethodID.value;
    var recurring = false;
    var hiPayDeviceFingerprint;
    var response;

    if (!empty(paymentMethod)) {
        hiPayDeviceFingerprint = session.forms.billing.paymentMethods.deviceFingerprint.value;
        paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).paymentProcessor;

        if (paymentMethod === 'HIPAY_CREDIT_CARD' && hipayEnableOneClick) { // if one-click payment
            hiPayModule.saveCreditCard(paymentInstrument);
            recurring = !empty(session.forms.billing.paymentMethods.creditCard.uuid.value);
        }

        if (paymentProcessor != null) {
            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setTransactionID(order.orderNo);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            });

            response = hiPayModule.hiPayOrderRequest(paymentInstrument, order, hiPayDeviceFingerprint, recurring);

            if (response.error === true) {
                return {
                    error: true,
                    PlaceOrderError: response.hiPayPaymentStatus
                };
            } else { // eslint-disable-line
                if (empty(response.hiPayRedirectURL)) { // eslint-disable-line
                    return { authorized: true };
                } else { // eslint-disable-line
                    ISML.renderTemplate('hipay/hosted/hipayredirect', {
                        HiPayRedirectURL: response.hiPayRedirectURL
                    });

                    return { success: true };
                }
            }
        } else {
            return { error: true };
        }
    } else {
        return { error: true };
    }
}

/** @see {@link module:controllers/Hipay~Handle} */
exports.Handle = Handle;
/** @see {@link module:controllers/Hipay~Authorize} */
exports.Authorize = Authorize;
