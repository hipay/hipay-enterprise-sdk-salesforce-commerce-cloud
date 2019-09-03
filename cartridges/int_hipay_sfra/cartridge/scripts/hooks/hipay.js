'use strict';

var OrderMgr           = require('dw/order/OrderMgr'),
    Resource           = require('dw/web/Resource'),
    PaymentStatusCodes = require('dw/order/PaymentStatusCodes'),
    Transaction        = require('dw/system/Transaction'),
    PaymentMgr         = require('dw/order/PaymentMgr');

/* Script Modules */
var hiPayCheckoutModule = require('*/cartridge/scripts/lib/hipay/modules/hipayCheckoutModule'),
    collections = require('*/cartridge/scripts/util/collections'),
    sitePrefs   = dw.system.Site.getCurrent().getPreferences();

/**
* Creates a HiPay PaymentInstrument
*
* @return {Object} success if the payment instrument is created, error otherwise
*/
function Handle(currentBasket, paymentInformation, paymentUUID) {
    var basket            = currentBasket,
        paymentMethod     = session.forms.billing.paymentMethod.value,
        paymentInstrument;

    if (!empty(paymentMethod)) {
        paymentInstrument = hiPayCheckoutModule.createPaymentInstrument(basket, paymentMethod, true);

        if (paymentInstrument == null) {
            return { error : true };
        }

        hiPayCheckoutModule.hiPayUpdatePaymentInstrument(paymentInstrument, paymentInformation);

        if (paymentMethod === "HIPAY_CREDIT_CARD") {
            var handleResponse = CreditCardHandle(paymentInstrument, paymentInformation, paymentUUID);

            if (handleResponse.success) {
                return { success : true };
            } else {
                return { fieldErrors: handleResponse.fieldErrors, serverErrors: handleResponse.serverErrors, error: true };
            }
        } else {
            return { success : true };
        }
    } else {
        return { error : true };
    }
}

/**
* Verifies a credit card against a valid card number and expiration date
* and possibly invalidates invalid form fields. If the verification was successful
* a credit card payment instrument is created.
*
* @param  {dw.order.PaymentInstrument} paymentInstrument - The payment instrument
* @return {Object} Object indicating success or error
*/
function CreditCardHandle(paymentInstrument, paymentInformation, paymentUUID) {
    var creditCard           = paymentInformation,
        hipayEnableOneClick  = sitePrefs.custom["hipayEnableOneClick"],
        hiPayMultiUseToken   = false,
        hiPayToken           = null,
        cardErrors = {},
        serverErrors = [],
        creditCardHolder,
        creditCardStatus,
        cardNumber,
        cardSecurityCode,
        cardType,
        expirationMonth,
        expirationYear,
        paymentCard,
        hiPayCardBrand,
        hiPayCardNumber,
        hiPayCardExpiryMonth,
        hiPayCardExpiryYear,
        hiPayCardHolder,
        hiPayCardCVC,
        hiPayCardType;

    if (empty(paymentUUID)) {
        cardNumber       = creditCard.cardNumber.value;

        if (!empty(creditCard.securityCode)) {
            cardSecurityCode = creditCard.securityCode.value;
        }

        cardType         = creditCard.cardType.value
        expirationMonth  = creditCard.expirationMonth.value;
        expirationYear   = creditCard.expirationYear.value;

        paymentCard      = PaymentMgr.getPaymentCard(cardType);

        if (!empty(cardSecurityCode)) {
            creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber, cardSecurityCode);
        } else {
            creditCardStatus = paymentCard.verify(expirationMonth, expirationYear, cardNumber);
        }

        if (creditCardStatus.error) {
            hiPayCheckoutModule.invalidatePaymentCardFormElements(creditCardStatus, creditCard);

            collections.forEach(creditCardStatus.items, function (item) {
                switch (item.code) {
                    case PaymentStatusCodes.CREDITCARD_INVALID_CARD_NUMBER:
                        cardErrors[paymentInformation.cardNumber.htmlName] =
                            Resource.msg('error.invalid.card.number', 'creditCard', null);
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_EXPIRATION_DATE:
                        cardErrors[paymentInformation.expirationMonth.htmlName] =
                            Resource.msg('error.expired.credit.card', 'creditCard', null);
                        cardErrors[paymentInformation.expirationYear.htmlName] =
                            Resource.msg('error.expired.credit.card', 'creditCard', null);
                        break;

                    case PaymentStatusCodes.CREDITCARD_INVALID_SECURITY_CODE:
                        cardErrors[paymentInformation.securityCode.htmlName] =
                            Resource.msg('error.invalid.security.code', 'creditCard', null);
                        break;
                    default:
                        serverErrors.push(
                            Resource.msg('error.card.information.error', 'creditCard', null)
                        );
                }
            });

            return { fieldErrors: [cardErrors], serverErrors: serverErrors, error: true };
        }
    }

    if (!empty(creditCard.cardOwner.value)) {
        if (creditCard.cardType.value == 'Amex') {
            var fullName = creditCard.cardOwner.value;

            creditCardHolder = fullName.split(' ').join('.');
        } else {
            creditCardHolder = creditCard.cardOwner.value;
        }
    }

    if (!empty(paymentUUID) && hipayEnableOneClick) { /* If one-click payment */
        var paymentInstruments   = customer.getProfile().getWallet().getPaymentInstruments("HIPAY_CREDIT_CARD"),
            uuid                 = paymentUUID,
            creditCardInstrument = null,
            selectedCreditCard   = null;

        var instrumentsIter = !empty(uuid) && !empty(paymentInstruments) ? paymentInstruments.iterator() : "";

        while (!empty(instrumentsIter) && instrumentsIter.hasNext()) {
            creditCardInstrument = instrumentsIter.next();

            if (uuid.equals(creditCardInstrument.UUID)) {
                selectedCreditCard = creditCardInstrument;
                break;
            }
        }

        if (empty(selectedCreditCard)) {
            return { error : true };
        }

        hiPayCardNumber      = selectedCreditCard.creditCardNumber;
        hiPayCardExpiryMonth = selectedCreditCard.creditCardExpirationMonth;
        hiPayCardExpiryYear  = selectedCreditCard.creditCardExpirationYear;
        hiPayCardHolder      = selectedCreditCard.creditCardHolder;
        hiPayMultiUseToken   = session.forms.billing.creditCardFields.saveCard.value;
        hiPayToken           = selectedCreditCard.creditCardToken;
        hiPayCardType        = selectedCreditCard.creditCardType;
    } else {
        hiPayCardBrand       = paymentInstrument.custom.hipayProductName;
        hiPayCardNumber      = creditCard.cardNumber.value;
        hiPayCardExpiryMonth = creditCard.expirationMonth.value;
        hiPayCardExpiryYear  = creditCard.expirationYear.value;
        hiPayCardHolder      = creditCardHolder;

        if (!empty(creditCard.securityCode)) {
            hiPayCardCVC = creditCard.securityCode.value;
        }

        hiPayMultiUseToken   = hipayEnableOneClick && session.forms.billing.creditCardFields.saveCard.value;
        hiPayCardType        = creditCard.cardType.value;

        var hiPayTokenResult     = hiPayCheckoutModule.hiPayGenerateToken(hiPayCardBrand, hiPayCardNumber, hiPayCardExpiryMonth,
            hiPayCardExpiryYear, hiPayCardHolder, hiPayCardCVC, hiPayMultiUseToken);

        if (!empty(hiPayTokenResult) && hiPayTokenResult.error == false) {
            hiPayToken      = hiPayTokenResult.HiPayToken;
            hiPayCardNumber = hiPayTokenResult.HiPayPan;
        } else {
            return { error : true };
        }
    }

    if (hiPayToken != null) {
        Transaction.wrap(function() {
            paymentInstrument.creditCardHolder          = hiPayCardHolder;
            paymentInstrument.creditCardNumber          = hiPayCardNumber;
            paymentInstrument.creditCardType            = hiPayCardType;
            paymentInstrument.creditCardExpirationMonth = hiPayCardExpiryMonth;
            paymentInstrument.creditCardExpirationYear  = hiPayCardExpiryYear;
            paymentInstrument.creditCardToken           = hiPayToken;
        });
    } else {
        return { error : true };
    }

    return { success : true };
}

/**
* Authorize HiPay payment
*
* @param  {dw.order.Order} order
* @param  {dw.order.PaymentInstrument} paymentInstrument
* @return {Object} Object indicating authorized if successful or error otherwise
*/
function Authorize(orderNumber, paymentInstrument, paymentProcessor, storedPaymentUUID) {
    var hipayEnableOneClick    = sitePrefs.custom["hipayEnableOneClick"],
        orderNo                = orderNumber,
        order                  = OrderMgr.getOrder(orderNumber),
        paymentProcessor       = null,
        paymentMethod          = session.forms.billing.paymentMethod.value,
        recurring              = false,
        hiPayDeviceFingerprint,
        response;

    if (!empty(paymentMethod)) {
        hiPayDeviceFingerprint = session.forms.billing.deviceFingerprint.value;
        paymentProcessor       = PaymentMgr.getPaymentMethod(paymentMethod).paymentProcessor;

        if (paymentMethod === "HIPAY_CREDIT_CARD" && hipayEnableOneClick) { /* if one-click payment */
            recurring = !empty(storedPaymentUUID);
        }

        if (paymentProcessor != null) {
            Transaction.wrap(function() {
                paymentInstrument.paymentTransaction.transactionID    = order.orderNo;
                paymentInstrument.paymentTransaction.paymentProcessor = paymentProcessor;
            });

            response = hiPayCheckoutModule.hiPayOrderRequest(paymentInstrument, order, hiPayDeviceFingerprint, recurring);

            if (response.error === true) {
                return {
                    error : true,
                    PlaceOrderError : response.hiPayPaymentStatus
                };
            } else {
                if (paymentMethod === "HIPAY_CREDIT_CARD" && hipayEnableOneClick && !paymentInstrument.custom.hipayOneClickDisabled) { /* if one-click payment */
                    hiPayCheckoutModule.saveCreditCard(paymentInstrument, order.customerName);
                }

                if (empty(response.hiPayRedirectURL)) {
                    return { authorized : true };
                } else {
                    return {
                        HiPay : true,
                        HiPayRedirectURL : response.hiPayRedirectURL,
                        API : true,
                        success : true
                    };
                }
            }
        } else {
            return { error : true };
        }
    } else {
        return { error : true };
    }
}

/** @see {@link module:controllers/Hipay~Handle} */
exports.Handle = Handle;
/** @see {@link module:controllers/Hipay~CreditCardHandle} */
exports.CreditCardHandle = CreditCardHandle;
/** @see {@link module:controllers/Hipay~Authorize} */
exports.Authorize = Authorize;
