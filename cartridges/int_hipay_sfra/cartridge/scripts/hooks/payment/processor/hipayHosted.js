'use strict';

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');

/**
 * Verifies the required information for billing form is provided.
 * @param {Object} req - The request object
 * @param {Object} paymentForm - the payment form
 * @param {Object} viewFormData - object contains billing form data
 * @returns {Object} an object that has error information or payment information
 */
function processForm(req, paymentForm, viewFormData) {
    var array = require('*/cartridge/scripts/util/array');
    var PaymentMgr = require('dw/order/PaymentMgr');

    var viewData = viewFormData;
    var creditCardErrors = {};

    if (!req.form.storedPaymentUUID) {
        if (paymentForm.paymentMethod.htmlValue === 'CREDIT_CARD' || paymentForm.paymentMethod.htmlValue === 'HIPAY_CREDIT_CARD') {
            // verify credit card form data
            delete paymentForm.hipayMethodsFields;

            if (!empty(paymentForm.creditCardFields.cardType.value)) {
                var paymentCard = PaymentMgr.getPaymentCard(paymentForm.creditCardFields.cardType.value);

                if (!empty(paymentCard) && paymentCard.custom.hipayCVVIgnored) {
                    delete paymentForm.creditCardFields.securityCode;
                }
            }

            creditCardErrors = COHelpers.validateCreditCard(paymentForm);
        }
        else if (paymentForm.paymentMethod.htmlValue === 'HIPAY_KLARNA' && paymentForm.hipayMethodsFields.klarna) {
            hiPayErrors = COHelpers.validateFields(paymentForm.hipayMethodsFields.klarna);
            paymentForm.hipayMethodsFields = paymentForm.hipayMethodsFields.klarna;
        } else if (paymentForm.paymentMethod.htmlValue === 'HIPAY_IDEAL' && paymentForm.hipayMethodsFields.ideal) {
            hiPayErrors = COHelpers.validateFields(paymentForm.hipayMethodsFields.ideal);
            paymentForm.hipayMethodsFields = paymentForm.hipayMethodsFields.ideal;
        } else if (paymentForm.paymentMethod.htmlValue === 'HIPAY_GIROPAY' && paymentForm.hipayMethodsFields.giropay) {
            hiPayErrors = COHelpers.validateFields(paymentForm.hipayMethodsFields.giropay);
            paymentForm.hipayMethodsFields = paymentForm.hipayMethodsFields.giropay;
        }
    }


    if (Object.keys(creditCardErrors).length) {
        return {
            fieldErrors: creditCardErrors,
            error: true
        };
    }

    viewData.paymentMethod = {
        value: paymentForm.paymentMethod.value,
        htmlName: paymentForm.paymentMethod.value
    };

    viewData.paymentInformation = {
        cardType: {
            value: paymentForm.creditCardFields.cardType.value,
            htmlName: paymentForm.creditCardFields.cardType.htmlName
        },
        cardNumber: {
            value: paymentForm.creditCardFields.cardNumber.value,
            htmlName: paymentForm.creditCardFields.cardNumber.htmlName
        },
        securityCode: {
            value: paymentForm.creditCardFields.securityCode.value,
            htmlName: paymentForm.creditCardFields.securityCode.htmlName
        },
        expirationMonth: {
            value: parseInt(
                paymentForm.creditCardFields.expirationMonth.selectedOption,
                10
            ),
            htmlName: paymentForm.creditCardFields.expirationMonth.htmlName
        },
        expirationYear: {
            value: parseInt(paymentForm.creditCardFields.expirationYear.value, 10),
            htmlName: paymentForm.creditCardFields.expirationYear.htmlName
        },
        cardOwner: {
            value: paymentForm.addressFields.firstName.value + ' ' + paymentForm.addressFields.lastName.value,
            htmlName: paymentForm.creditCardFields.cardOwner.htmlName
        }
    };

    if (req.form.storedPaymentUUID) {
        viewData.storedPaymentUUID = req.form.storedPaymentUUID;
    }

    viewData.saveCard = paymentForm.creditCardFields.saveCard.checked;

    // process payment information
    if (viewData.storedPaymentUUID
        && req.currentCustomer.raw.authenticated
        && req.currentCustomer.raw.registered
    ) {
        var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
        var paymentInstrument = array.find(paymentInstruments, function (item) {
            return viewData.storedPaymentUUID === item.UUID;
        });

        viewData.paymentInformation.cardNumber.value = paymentInstrument.creditCardNumber;
        viewData.paymentInformation.cardType.value = paymentInstrument.creditCardType;
        viewData.paymentInformation.securityCode.value = req.form.securityCode;
        viewData.paymentInformation.expirationMonth.value = paymentInstrument.creditCardExpirationMonth;
        viewData.paymentInformation.expirationYear.value = paymentInstrument.creditCardExpirationYear;
        viewData.paymentInformation.creditCardToken = paymentInstrument.raw.creditCardToken;
    }

    return {
        error: false,
        viewData: viewData
    };
}

/**
 * Save the credit card information to login account if save card option is selected
 * @param {Object} req - The request object
 * @param {dw.order.Basket} basket - The current basket
 * @param {Object} billingData - payment information
 */
function savePaymentInformation(req, basket, billingData) {
    var CustomerMgr = require('dw/customer/CustomerMgr');

    if (!billingData.storedPaymentUUID
        && req.currentCustomer.raw.authenticated
        && req.currentCustomer.raw.registered
        && billingData.saveCard
        && (billingData.paymentMethod.value === 'CREDIT_CARD')
    ) {
        var customer = CustomerMgr.getCustomerByCustomerNumber(
            req.currentCustomer.profile.customerNo
        );

        var saveCardResult = COHelpers.savePaymentInstrumentToWallet(
            billingData,
            basket,
            customer
        );

        req.currentCustomer.wallet.paymentInstruments.push({
            creditCardHolder: saveCardResult.creditCardHolder,
            maskedCreditCardNumber: saveCardResult.maskedCreditCardNumber,
            creditCardType: saveCardResult.creditCardType,
            creditCardExpirationMonth: saveCardResult.creditCardExpirationMonth,
            creditCardExpirationYear: saveCardResult.creditCardExpirationYear,
            UUID: saveCardResult.UUID,
            creditCardNumber: Object.hasOwnProperty.call(
                saveCardResult,
                'creditCardNumber'
            )
                ? saveCardResult.creditCardNumber
                : null,
            raw: saveCardResult
        });
    }

}

exports.processForm = processForm;
exports.savePaymentInformation = savePaymentInformation;
