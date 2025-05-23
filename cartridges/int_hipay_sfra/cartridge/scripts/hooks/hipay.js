'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var PaymentMgr = require('dw/order/PaymentMgr');

/* Script Modules */
var hiPayCheckoutModule = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule');
var sitePrefs = require('dw/system/Site').getCurrent().getPreferences().getCustom();

/**
* Verifies a credit card against a valid card number and expiration date
* and possibly invalidates invalid form fields. If the verification was successful
* a credit card payment instrument is created.
*
* @param  {dw.order.PaymentInstrument} paymentInstrument - The payment instrument
* @return {Object} Object indicating success or error
*/
function creditCardHandle(paymentInstrument, paymentInformation, req) {
    var creditCard = paymentInformation;
    var hipayEnableOneClick = sitePrefs.hipayEnableOneClick;
    var hiPayMultiUseToken;
    var hiPayToken = null;
    var hiPayCardNumber;
    var hiPayCardExpiryMonth;
    var hiPayCardExpiryYear;
    var hiPayCardHolder;
    var hiPayCardType;

    if (
        creditCard.one_click
        && !creditCard.hasOwnProperty('multi_use')
        && hipayEnableOneClick
        && !empty(customer.getProfile().getWallet())
        && customer.getProfile().getWallet().getPaymentInstruments('HIPAY_CREDIT_CARD').length > 0
        ) { // If one-click payment
        var paymentInstruments = customer.getProfile().getWallet().getPaymentInstruments('HIPAY_CREDIT_CARD');
        var creditCardInstrument = null;
        var selectedCreditCard = null;

        var instrumentsIter = !empty(paymentInstruments) ? paymentInstruments.iterator() : [];

        while (!empty(instrumentsIter) && instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();
            if (creditCard.token.equals(creditCardInstrument.getCreditCardToken())) {
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
        hiPayToken = selectedCreditCard.creditCardToken;
        hiPayCardType = selectedCreditCard.creditCardType;
    } else if (!empty(creditCard)) {
        hiPayCardNumber = creditCard.pan;
        hiPayCardExpiryMonth = Number(creditCard.card_expiry_month);
        hiPayCardExpiryYear = Number(creditCard.card_expiry_year);
        hiPayCardHolder = creditCard.card_holder;
        hiPayToken = creditCard.token;
        hiPayCardType = paymentInstrument.paymentMethod === 'HIPAY_APPLEPAY' ?
            creditCard.brand.toLowerCase() : creditCard.payment_product;
    }

    if (hiPayToken) {
        Transaction.wrap(function () {
            paymentInstrument.setCreditCardHolder(hiPayCardHolder);
            paymentInstrument.setCreditCardNumber(hiPayCardNumber);
            paymentInstrument.setCreditCardType(hiPayCardType);
            paymentInstrument.setCreditCardExpirationMonth(hiPayCardExpiryMonth);
            paymentInstrument.setCreditCardExpirationYear(hiPayCardExpiryYear);
            paymentInstrument.setCreditCardToken(hiPayToken);
            paymentInstrument.getCustom().hipaySaveCreditCard = !!creditCard.multi_use;
            paymentInstrument.getCustom().hipayIsOneClick = creditCard.one_click ? creditCard.one_click : false;
        });
    } else {
        return { error: true };
    }

    return { success: true };
}

/**
* Creates a HiPay PaymentInstrument
*
* @return {Object} success if the payment instrument is created, error otherwise
*/
function Handle(currentBasket, paymentInformation, paymentUUID, req) {
    var basket = currentBasket;
    var paymentMethod = session.forms.billing.paymentMethod.value;
    var paymentInstrument;
    var hipayTokenize = JSON.parse(session.forms.billing.hipaytokenize.value);

    if (!empty(paymentMethod)) {
        paymentInstrument = hiPayCheckoutModule.createPaymentInstrument(basket, paymentMethod, true);

        if (paymentInstrument == null) {
            return { error: true };
        }

        var isUpdate = hiPayCheckoutModule.hiPayUpdatePaymentInstrument(paymentInstrument, paymentInformation, req, hipayTokenize);

        if (!isUpdate) {
            return { error: true };
        }

        if (paymentMethod === 'HIPAY_CREDIT_CARD' || paymentMethod === 'HIPAY_APPLEPAY') {
            var handleResponse = creditCardHandle(paymentInstrument, hipayTokenize, req);

            if (handleResponse.success) {
                return { success: true };
            } else { // eslint-disable-line
                return { fieldErrors: handleResponse.fieldErrors, serverErrors: handleResponse.serverErrors, error: true };
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
function Authorize(orderNumber, paymentInstrument, paymentProcessor, storedPaymentUUID) {
    var hipayEnableOneClick = sitePrefs.hipayEnableOneClick;
    var order = OrderMgr.getOrder(orderNumber);
    var paymentProcessor = null; // eslint-disable-line no-redeclare
    var paymentMethod = paymentInstrument.getPaymentMethod();
    var recurring = false;
    var hiPayDeviceFingerprint;
    var response;

    if (!empty(paymentMethod)) {
        hiPayDeviceFingerprint = session.forms.billing.deviceFingerprint.value;
        paymentProcessor = PaymentMgr.getPaymentMethod(paymentMethod).paymentProcessor; // eslint-disable-line no-param-reassign

        if (paymentMethod === 'HIPAY_CREDIT_CARD' && hipayEnableOneClick) { // if one-click payment
            recurring = !empty(storedPaymentUUID);
        }

        if (paymentProcessor != null) {
            Transaction.wrap(function () {
                paymentInstrument.paymentTransaction.setTransactionID(order.orderNo);
                paymentInstrument.paymentTransaction.setPaymentProcessor(paymentProcessor);
            });

            response = hiPayCheckoutModule.hiPayOrderRequest(paymentInstrument, order, hiPayDeviceFingerprint, recurring);

            if (response.error === true) {
                return {
                    error: true,
                    PlaceOrderError: response.hiPayPaymentStatus
                };
            } else { // eslint-disable-line
                if (empty(response.hiPayRedirectURL)) {
                    return { authorized: true };
                } else { // eslint-disable-line
                    return {
                        HiPay: true,
                        HiPayRedirectURL: response.hiPayRedirectURL,
                        API: true,
                        success: true
                    };
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
