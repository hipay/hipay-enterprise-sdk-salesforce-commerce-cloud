'use strict';

var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');
var PaymentStatusCodes = require('dw/order/PaymentStatusCodes');
var Transaction = require('dw/system/Transaction');
var PaymentMgr = require('dw/order/PaymentMgr');

/* Script Modules */
var hiPayCheckoutModule = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule');
var collections = require('*/cartridge/scripts/util/collections');
var sitePrefs = require('dw/system/Site').getCurrent().getPreferences().getCustom();

/**
* Verifies a credit card against a valid card number and expiration date
* and possibly invalidates invalid form fields. If the verification was successful
* a credit card payment instrument is created.
*
* @param  {dw.order.PaymentInstrument} paymentInstrument - The payment instrument
* @return {Object} Object indicating success or error
*/
function creditCardHandle(paymentInstrument, paymentInformation, paymentUUID, req) {
    var creditCard = paymentInformation;
    var hipayEnableOneClick = sitePrefs.hipayEnableOneClick;
    var hiPayMultiUseToken = false;
    var hiPayToken = null;
    var cardErrors = {};
    var serverErrors = [];
    var creditCardHolder;
    var creditCardStatus;
    var cardNumber;
    var cardSecurityCode;
    var cardType;
    var expirationMonth;
    var expirationYear;
    var paymentCard;
    var hiPayCardBrand;
    var hiPayCardNumber;
    var hiPayCardExpiryMonth;
    var hiPayCardExpiryYear;
    var hiPayCardHolder;
    var hiPayCardCVC;
    var hiPayCardType;

    paymentUUID = req.form && req.form.storedPaymentUUID ? req.form.storedPaymentUUID : null;

    if (
        !empty(paymentUUID)
        && hipayEnableOneClick
        && !empty(customer.getProfile().wallet)
        && customer.getProfile().getWallet().getPaymentInstruments('HIPAY_CREDIT_CARD').length > 0
        ) { // If one-click payment
        var paymentInstruments = customer.getProfile().getWallet().getPaymentInstruments('HIPAY_CREDIT_CARD');
        var uuid = paymentUUID;
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
        hiPayMultiUseToken = session.forms.billing.creditCardFields.saveCard.value;
        hiPayToken = selectedCreditCard.creditCardToken;
        hiPayCardType = selectedCreditCard.creditCardType;
    }

    if (creditCard && creditCard.token) {
        Transaction.wrap(function () {
            paymentInstrument.setCreditCardHolder(creditCard.card_holder);
            paymentInstrument.setCreditCardNumber(creditCard.pan);
            paymentInstrument.setCreditCardType(creditCard.payment_product.charAt(0).toUpperCase() + creditCard.payment_product.slice(1));
            paymentInstrument.setCreditCardExpirationMonth(Number(creditCard.card_expiry_month));
            paymentInstrument.setCreditCardExpirationYear(Number(creditCard.card_expiry_year));
            paymentInstrument.setCreditCardToken(creditCard.token);
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

    if (!empty(paymentMethod)) {
        paymentInstrument = hiPayCheckoutModule.createPaymentInstrument(basket, paymentMethod, true);

        if (paymentInstrument == null) {
            return { error: true };
        }

        hiPayCheckoutModule.hiPayUpdatePaymentInstrument(paymentInstrument, paymentInformation);

        if (paymentMethod === 'HIPAY_CREDIT_CARD') {
            var handleResponse = creditCardHandle(paymentInstrument, JSON.parse(session.forms.billing.hipaytokenize.value), paymentUUID, req);

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
    var paymentMethod = session.forms.billing.paymentMethod.value;
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
                if (paymentMethod === 'HIPAY_CREDIT_CARD' && hipayEnableOneClick && !paymentInstrument.custom.hipayOneClickDisabled) { // if one-click payment
                    hiPayCheckoutModule.saveCreditCard(paymentInstrument, order.customerName);
                }

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
