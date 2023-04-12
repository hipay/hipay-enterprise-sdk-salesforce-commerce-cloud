'use strict';

const ArrayList = require('dw/util/ArrayList');
const hipayConstants = require('int_hipay_sfra/cartridge/scripts/lib/hipay/constants');

/**
 * Returns customer's country code based on geolocation, shipping address or billing address
 * @param {dw.order.Basket} currentBasket - Customer's Basket object
 * @returns {string} countryCode - Customer's Country Code
 */
function getCustomerCountryCode(currentBasket) {
    let countryCode = request.geolocation.countryCode;

    if (currentBasket.billingAddress && currentBasket.billingAddress.countryCode) {
        countryCode = currentBasket.billingAddress.countryCode.value;
    } else if (currentBasket.defaultShipment && currentBasket.defaultShipment.shippingAddress && currentBasket.defaultShipment.shippingAddress.countryCode) {
        countryCode = currentBasket.defaultShipment.shippingAddress.countryCode.value;
    }

    return countryCode;
}

/**
 * Determines if checkout type is set to Hosted Tokenization Page
 * @returns {boolean} hostedTokenizationEnabled
 */
function isHostedTokenizationEnabled() {
    const currentSite = require('dw/system/Site').getCurrent();

    return (hipayConstants.CHECKOUT_TYPE_TOKENIZATION === currentSite.getCustomPreferenceValue("ingenicoOgoneCheckoutType").value);
}

/**
 * Handles the payment status actions
 * @param {dw.order.Order} order - The current order
 * @param {Object} payment -  The PaymentResult Object
 */
function handlePaymentStatus(order, payment) {
    const OrderMgr = require('dw/order/OrderMgr');
    const Order = require('dw/order/Order');
    const Resource = require('dw/web/Resource');
    const Transaction = require('dw/system/Transaction');

    if (order.status.value === Order.ORDER_STATUS_CREATED && hipayConstants.REJECTED_PAYMENT_STATUSES.indexOf(payment.status) > -1) {
        Transaction.wrap(function () {
            order.custom.ingenicoOgoneStatusCategory = hipayConstants.REJECTED_PAYMENT_STATUS_CATEGORY;
            OrderMgr.failOrder(order, true);
        });

        session.privacy.ingenicoOgoneError = Resource.msg('error.payment.not.valid', 'ingenicoOgone', null);
        throw new Error('error.payment.not.valid');
    } else if (hipayConstants.REJECTED_PAYMENT_STATUSES.indexOf(payment.status) > -1) {
        Transaction.wrap(function () {
            order.custom.ingenicoOgoneStatusCategory = hipayConstants.REJECTED_PAYMENT_STATUS_CATEGORY;
            OrderMgr.cancelOrder(order);
        });
    } else if (hipayConstants.UNKNOWN_PAYMENT_STATUSES.indexOf(payment.status) > -1) {
        Transaction.wrap(function () {
            order.setPaymentStatus(Order.PAYMENT_STATUS_NOTPAID);
            order.custom.ingenicoOgoneStatusCategory = hipayConstants.UNKNOWN_PAYMENT_STATUS_CATEGORY;
        });
    } else if (hipayConstants.SUCCESSFUL_PAYMENT_STATUSES.indexOf(payment.status) > -1) {
        Transaction.wrap(function () {
            order.custom.ingenicoOgoneStatusCategory = hipayConstants.AUTHORIZED_PAYMENT_STATUS_CATEGORY;
        });
    } else if (hipayConstants.COMPLETED_PAYMENT_STATUSES.indexOf(payment.status) > -1) {
        Transaction.wrap(function () {
            order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            order.custom.ingenicoOgoneStatusCategory = hipayConstants.COMPLETED_PAYMENT_STATUS_CATEGORY;
        });
    }
}

/**
 * Handles order placement actions
 * @param {dw.order.Order} order - The current order
 * @param {Object} paymentResult -  The PaymentResult Object
 * @param {Object|null} req -  Current Request Object || null
 * @param {Object|null} res -  Current Response Object || null
 * @returns {Object} orderPlacementResult
 */
function handleOrderPlacement(order, paymentResult, req, res) {
    const OrderMgr = require('dw/order/OrderMgr');
    const Resource = require('dw/web/Resource');
    const Transaction = require('dw/system/Transaction');
    const URLUtils = require('dw/web/URLUtils');
    const Site = require('dw/system/Site');

    const hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    const COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
    const addressHelpers = require('*/cartridge/scripts/helpers/addressHelpers');

    // Handle custom processing post authorization
    let options = {
        req: req,
        res: res
    };
    let postAuthCustomizations = hooksHelper('app.post.auth', 'postAuthorization', paymentResult, order, options, require('*/cartridge/scripts/hooks/postAuthorizationHandling').postAuthorization);
    if (postAuthCustomizations && Object.prototype.hasOwnProperty.call(postAuthCustomizations, 'error')) {
        return postAuthCustomizations;
    }

    let fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', order, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);
    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        if (req) {
            req.session.privacyCache.set('fraudDetectionStatus', true);
        }

        return {
            error: true,
            redirectUrl: URLUtils.https('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode)
        };
    }

    // Places the order
    let placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);
    if (placeOrderResult.error) {
        return {
            error: true,
            errorMsg: Resource.msg('error.technical', 'checkout', null),
            redirectUrl: URLUtils.https('Checkout-Begin', 'stage', 'payment', 'showError', 'true')
        };
    }

    if (order.custom.ingenicoOgoneStatusCategory.value === hipayConstants.UNKNOWN_PAYMENT_STATUS_CATEGORY) {
        const Order = require('dw/order/Order');
        Transaction.wrap(function () {
            order.setConfirmationStatus(Order.CONFIRMATION_STATUS_NOTCONFIRMED);
            order.setExportStatus(Order.EXPORT_STATUS_NOTEXPORTED);
        });
    }

    // if the order is placed in SALE mode, mark that it has captures
    if (Site.getCurrent().getCustomPreferenceValue('ingenicoOgoneOperationCode').getValue() === hipayConstants.OPERATION_CODE_SALE) {
        Transaction.wrap(function () {
            order.custom.ingenicoOgoneHasCaptures = true;
        });
    }

    if (req) {
        if (req.currentCustomer.addressBook) {
            // save all used shipping addresses to address book of the logged in customer
            let allAddresses = addressHelpers.gatherShippingAddresses(order);
            allAddresses.forEach(function (address) {
                if (!addressHelpers.checkIfAddressStored(address, req.currentCustomer.addressBook.addresses)) {
                    addressHelpers.saveAddress(address, req.currentCustomer, addressHelpers.generateAddressName(address));
                }
            });
        }

        req.session.privacyCache.set('usingMultiShipping', false);
    }

    if (order.getCustomerEmail()) {
        COHelpers.sendConfirmationEmail(order, order.customerLocaleID);
    }

    return {
        error: false,
        redirectUrl: URLUtils.https('Order-Confirm', 'ID', order.orderNo, 'token', order.orderToken)
    };
}

/**
 * Retrieves tokens for customer's saved payment instruments per payment product
 * @param {int} paymentProductId - The payment product ID
 * @param {dw.customer.Customer} customer -  Current Customer
 * @returns {array} tokens - Array of tokens
 */
function getWalletPaymentIntsrumentTokensByPaymentProductId(paymentProductId, customer) {
    let tokens = [];

    if (customer.authenticated) {
        let wallet = customer.getProfile().getWallet();
        let paymentInstruments = wallet.paymentInstruments;

        if (paymentInstruments.getLength() > 0) {
            let paymentInstrumentsIterator = paymentInstruments.iterator();
            while (paymentInstrumentsIterator.hasNext()) {
                let paymentInstrument = paymentInstrumentsIterator.next();

                //if (paymentProductId === null || paymentInstrument.custom.ingenicoOgonePaymentProductID === paymentProductId) {
                //    tokens.push(paymentInstrument.getCreditCardToken());
                //}
            }
        }
    }

    return tokens;
}

/**
 * Retrieves tokens for customer's saved payment instruments per payment method
 * @param {string} paymentMethodID - The payment method ID
 * @param {dw.customer.Customer} customer -  Current Customer
 * @returns {array} tokens - Array of tokens
 */
function getWalletPaymentIntsrumentTokensByPaymentMethod(paymentMethodID, customer) {
    let tokens = [];

    if (customer.authenticated) {
        let wallet = customer.getProfile().getWallet();
        let paymentInstruments = wallet.getPaymentInstruments(paymentMethodID);

        if (paymentInstruments.getLength() > 0) {
            let paymentInstrumentsIterator = paymentInstruments.iterator();
            while (paymentInstrumentsIterator.hasNext()) {
                let paymentInstrument = paymentInstrumentsIterator.next();
                tokens.push(paymentInstrument.getCreditCardToken());
            }
        }
    }

    return tokens;
}

/**
 * Saves current payment instrument in customer's wallet
 * @param {string} token - The token for the current payment
 * @param {dw.order.PaymentInstrument} orderPaymentInstrument -  The payment instrument to save
 * @param {dw.customer.Customer} customer -  Current Customer
 */
function savePaymentInstrumentToWallet(token, orderPaymentInstrument, customer) {
    //let existingTokens = getWalletPaymentIntsrumentTokensByPaymentProductId(orderPaymentInstrument.custom.ingenicoOgonePaymentProductID, customer);
    let existingTokens = '';
    if (existingTokens.indexOf(token) < 0) {
        const Transaction = require('dw/system/Transaction');

        let wallet = customer.getProfile().getWallet();
        let isCardPaymentInstrument = (orderPaymentInstrument.custom.ingenicoOgonePaymentMethod === 'card');
        let paymentMethod = (isCardPaymentInstrument) ? hipayConstants.PAYMENT_METHOD_CARD : hipayConstants.PAYMENT_METHOD_REDIRECT;

        Transaction.wrap(function () {
            var storedPaymentInstrument = wallet.createPaymentInstrument(paymentMethod);

            //storedPaymentInstrument.custom.ingenicoOgonePaymentProductID = orderPaymentInstrument.custom.ingenicoOgonePaymentProductID;
            //storedPaymentInstrument.custom.ingenicoOgonePaymentProductName = orderPaymentInstrument.custom.ingenicoOgonePaymentProductName;
            //storedPaymentInstrument.custom.ingenicoOgonePaymentMethod = orderPaymentInstrument.custom.ingenicoOgonePaymentMethod;

            if (isCardPaymentInstrument) {
                storedPaymentInstrument.setCreditCardNumber(
                    orderPaymentInstrument.getCreditCardNumber()
                );
                storedPaymentInstrument.setCreditCardType(
                    orderPaymentInstrument.getCreditCardType()
                );
                storedPaymentInstrument.setCreditCardExpirationMonth(
                    orderPaymentInstrument.getCreditCardExpirationMonth()
                );
                storedPaymentInstrument.setCreditCardExpirationYear(
                    orderPaymentInstrument.getCreditCardExpirationYear()
                );
            }

            storedPaymentInstrument.setCreditCardHolder(orderPaymentInstrument.getCreditCardHolder());
            storedPaymentInstrument.setCreditCardToken(token);
        });
    }
}

/**
 * Updates the Ingenico-related statuses of an order.
 *
 * @param {dw.order.Order} order The order to be updated
 * @param {string} transactionStatus The Ingenico status returned by the API
 * @param {Object} transactionStatusOutput A statusOutput JSON object returned by the API
 * @param {string} transactionStatusCategory A status category returned by the API
 */
function updatePaymentTransaction(order, transactionStatus, transactionStatusOutput, transactionStatusCategory) {
    const Transaction = require('dw/system/Transaction');

    /*Transaction.wrap(function () {
        order.custom.ingenicoOgoneStatus = transactionStatus;
        order.custom.ingenicoOgoneStatusCode = transactionStatusOutput.statusCode;
        order.custom.ingenicoOgoneIsAuthorized = transactionStatusOutput.isAuthorized;
        order.custom.ingenicoOgoneIsCancellable = transactionStatusOutput.isCancellable;
        order.custom.ingenicoOgoneIsRefundable = transactionStatusOutput.isRefundable;

        if (transactionStatusCategory !== null) {
            order.custom.ingenicoOgoneStatusCategory = transactionStatusCategory;
        }
    });*/
}

/**
 * Return Hipay order payment instrument
 *
 * @param {dw.order.LineItemCtnr} basket - Basket
 * @returns {dw.order.OrderPaymentInstrument} payment instrument with id hipay
 */
function getHipayPaymentInstrument(basket) {
    var paymentInstruments = basket.getPaymentInstruments();

    for (let i = 0; i < paymentInstruments.length; i++) {
        let paymentInstrument = paymentInstruments[i];
        //if (!empty(paymentInstrument.custom.ingenicoOgonePaymentProductID)) {
            return paymentInstrument;
        //}
    }

    return null;
}

/**
 * Processes orders that have a pending payment or a payment in unknown status.
 *
 * @param {dw.order.Order} order The order to be processed
 */
function processUnconfirmedOrder(order) {
    const Transaction = require('dw/system/Transaction');
    const OrderMgr = require('dw/order/OrderMgr');
    const Order = require('dw/order/Order');
    const ingenicoApiFacade = require('~/cartridge/scripts/lib/hipay/api/facade');

    let paymentInstrument = getHipayPaymentInstrument(order);
    let paymentTransaction = paymentInstrument.getPaymentTransaction();
    let paymentProcessor = paymentTransaction.getPaymentProcessor();

    let paymentAPIResponse = null;
    let apiStatusOutput = null;
    let apiStatus = null;
    let transactionID = null;
    if (paymentProcessor.ID === hipayConstants.PAYMENT_PROCESSOR_CREDIT) {
        transactionID = paymentTransaction.getTransactionID();
        paymentAPIResponse = ingenicoApiFacade.getPayment(transactionID);

        if (paymentAPIResponse.success === true) {
            apiStatusOutput = paymentAPIResponse.paymentOutput.statusOutput;
            apiStatus = paymentAPIResponse.paymentOutput.status;
        }
    } else if (paymentProcessor.ID === hipayConstants.PAYMENT_PROCESSOR_REDIRECT) {
        transactionID = order.custom.ingenicoOgoneTransactionID;
        paymentAPIResponse = ingenicoApiFacade.getHostedCheckout(transactionID);

        if (paymentAPIResponse.success === true) {
            apiStatusOutput = paymentAPIResponse.createdPaymentOutput.payment.statusOutput;
            apiStatus = paymentAPIResponse.createdPaymentOutput.payment.status;
        }
    }

    if (paymentAPIResponse.success === true) {
        if (hipayConstants.REJECTED_PAYMENT_STATUSES.indexOf(apiStatus) > -1) {
            updatePaymentTransaction(order, apiStatus, apiStatusOutput, hipayConstants.REJECTED_PAYMENT_STATUS_CATEGORY);

            Transaction.wrap(function () {
                OrderMgr.cancelOrder(order);
            });
        } else if (hipayConstants.SUCCESSFUL_PAYMENT_STATUSES.indexOf(apiStatus) > -1) {
            updatePaymentTransaction(order, apiStatus, apiStatusOutput, hipayConstants.AUTHORIZED_PAYMENT_STATUS_CATEGORY);

            Transaction.wrap(function () {
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                order.setExportStatus(Order.EXPORT_STATUS_READY);
            });
        } else if (hipayConstants.COMPLETED_PAYMENT_STATUSES.indexOf(apiStatus) > -1) {
            updatePaymentTransaction(order, apiStatus, apiStatusOutput, hipayConstants.COMPLETED_PAYMENT_STATUS_CATEGORY);

            Transaction.wrap(function () {
                order.setConfirmationStatus(Order.CONFIRMATION_STATUS_CONFIRMED);
                order.setExportStatus(Order.EXPORT_STATUS_READY);
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);
            });
        }
    }
}

/**
 * Uses Ingenico's API to verify is all payments have been successfully captured.
 *
 * @param {dw.order.PaymentTransaction} paymentTransaction The payment transaction, associated with the Ingenico's payment instrument
 * @returns {boolean} Whether all payments have been captured
 */
function allPaymentsAreCaptured(paymentTransaction) {
    const ingenicoApiFacade = require('*/cartridge/scripts/ingenico/ogone/api/facade');

    let capturesResponse = ingenicoApiFacade.getPaymentCaptures(paymentTransaction.getTransactionID());
    if (capturesResponse.success !== true) {
        return false;
    }

    let originalAmount = paymentTransaction.amount.value;
    let capturedAmount = 0;

    for (let i = 0; i < capturesResponse.captures.length; i++) {
        let paymentCapture = capturesResponse.captures[i];
        if (paymentCapture.status === hipayConstants.CAPTURED_PAYMENT_STATUS) {
            capturedAmount += paymentCapture.captureOutput.amountOfMoney.amount / 100;
        }
    }

    return capturedAmount >= originalAmount;    // depending on the configuration in Ingenico, it may be possible to capture a higher amount than the original transaction
}

/**
 * This function should be called everytime a capture is performed. It checks if this was the last capture and if so, it finalizes the order.
 *
 * @param {dw.order.Order} order The associated order
 * @param {dw.order.PaymentInstrument} ingenicoPaymentInstrument The Ingenico payment instrument, associated with the order
 * @param {string} ingenicoStatus The payment status, taken from the webhook or the API response
 * @param {Object} ingenicoStatusOutput the statusOutput object, taken from the webhook or the API response
 */
function handlePaymentCapture(order, ingenicoPaymentInstrument, ingenicoStatus, ingenicoStatusOutput) {
    const Transaction = require('dw/system/Transaction');
    const Order = require('dw/order/Order');

    if (hipayConstants.VALID_CAPTURE_STATUSES.indexOf(ingenicoStatus) > -1) {
        Transaction.wrap(function () {
            order.custom.ingenicoOgoneHasCaptures = true;
        });
    }

    if (ingenicoStatus === hipayConstants.CAPTURED_PAYMENT_STATUS) {
        // payment is successfully captured (it's not pending), verify if this was the last pending capture, if so - mark the order as paid
        if (allPaymentsAreCaptured(ingenicoPaymentInstrument.getPaymentTransaction())) {
            Transaction.wrap(function () {
                order.custom.ingenicoOgoneStatus = ingenicoStatus;
                order.custom.ingenicoOgoneStatusCode = ingenicoStatusOutput.statusCode;
                order.custom.ingenicoOgoneStatusCategory = hipayConstants.COMPLETED_PAYMENT_STATUS_CATEGORY;

                order.setExportStatus(Order.EXPORT_STATUS_READY);
                order.setPaymentStatus(Order.PAYMENT_STATUS_PAID);

                order.trackOrderChange("Order marked as paid.");

                // isAuthorized, isCancellable and isRefundable are sometimes not available in the capture response JSON and in the first webhook with type "payment.capture_requested".
                // A later webhook with type "payment.captured" has them.
                if (ingenicoStatusOutput.isCancellable !== undefined) {
                    order.custom.ingenicoOgoneIsCancellable = ingenicoStatusOutput.isCancellable;
                }
                if (ingenicoStatusOutput.isAuthorized !== undefined) {
                    order.custom.ingenicoOgoneIsAuthorized = ingenicoStatusOutput.isAuthorized;
                }
                if (ingenicoStatusOutput.isRefundable !== undefined) {
                    order.custom.ingenicoOgoneIsRefundable = ingenicoStatusOutput.isRefundable;
                }
            });
        }
    }
}


/**
 * Calculates the captured amount
 *
 * @param {dw.order.Order} order the referenced order
 * @param {Array} paymentCaptures a JSON array containing the captures from the API response
 * @param {Object} originalTransactionAmount the amount of the original transaction
 * @returns {integer} the captured amount
 */
function getCapturedAmount(order, paymentCaptures, originalTransactionAmount) {
    let amount = 0;
    for (let i = 0; i < paymentCaptures.length; i++) {
        let paymentCapture = paymentCaptures[i];
        if (hipayConstants.VALID_CAPTURE_STATUSES.indexOf(paymentCapture.status) > -1) {
            amount += paymentCapture.captureOutput.amountOfMoney.amount;
        }
    }

    if (amount === 0 && order.custom.ingenicoOgoneStatusCategory.value === hipayConstants.COMPLETED_PAYMENT_STATUS_CATEGORY) {
        amount = originalTransactionAmount;
    }

    return amount;
}

/**
 * Calculates the refunded amount
 *
 * @param {Array} paymentRefunds a JSON array containing the refunds from the API response
 * @returns {integer} the refunded amount
 */
function getRefundedAmount(paymentRefunds) {
    let amount = 0;
    for (let i = 0; i < paymentRefunds.length; i++) {
        let paymentRefund = paymentRefunds[i];
        if (hipayConstants.VALID_REFUND_STATUSES.indexOf(paymentRefund.status) > -1) {
            amount += paymentRefund.refundOutput.amountOfMoney.amount;
        }
    }

    return amount;
}

/**
 * Adds value custom attribute with the SetOfStrings type
 *
 * @param {dw.util.Collection} attribute - custom attribute
 * @returns {dw.util.ArrayList} - updated custom attribute
 */
const addToSetOfStrings = function (attribute) {
    let list;

    if (!attribute) {
        list = new ArrayList();
    } else {
        list = new ArrayList(attribute);
    }

    for (let i = 1; i < arguments.length; i++) {
        list.push(arguments[i]);
    }

    return list;
};

module.exports = {
    getCustomerCountryCode: getCustomerCountryCode,
    getHipayPaymentInstrument: getHipayPaymentInstrument,
    isHostedTokenizationEnabled: isHostedTokenizationEnabled,
    handlePaymentStatus: handlePaymentStatus,
    savePaymentInstrumentToWallet: savePaymentInstrumentToWallet,
    getWalletPaymentIntsrumentTokensByPaymentProductId: getWalletPaymentIntsrumentTokensByPaymentProductId,
    getWalletPaymentIntsrumentTokensByPaymentMethod: getWalletPaymentIntsrumentTokensByPaymentMethod,
    handleOrderPlacement: handleOrderPlacement,
    updatePaymentTransaction: updatePaymentTransaction,
    addToSetOfStrings: addToSetOfStrings,
    handlePaymentCapture: handlePaymentCapture,
    processUnconfirmedOrder: processUnconfirmedOrder,
    getCapturedAmount: getCapturedAmount,
    getRefundedAmount: getRefundedAmount
};
