'use strict';

var page = module.superModule;
var server = require('server');
var Site = require('dw/system/Site');

var COHelpers = require('*/cartridge/scripts/checkout/checkoutHelpers');
var BasketMgr = require('dw/order/BasketMgr');
var Transaction = require('dw/system/Transaction');

var Constants = require('*/cartridge/scripts/util/hipayConstants');
var HipayCustomObject = require('*/cartridge/scripts/lib/hipay/hipayCustomObject');

server.extend(page);

/**
 *  Handle Ajax payment (and billing) form submit
 */
server.append(
    'SubmitPayment',
    server.middleware.https,
    function (req, res, next) {
        var PaymentMgr = require('dw/order/PaymentMgr');
        var paymentForm = server.forms.getForm('billing');
        var paymentMethodID = paymentForm.paymentMethod.value;
        var creditCardErrors = {};
        var hiPayErrors = {};

        if (!req.form.storedPaymentUUID) {
            if (paymentMethodID === 'CREDIT_CARD' || paymentMethodID === 'HIPAY_CREDIT_CARD') {
                // verify credit card form data
                delete paymentForm.hipayMethodsFields;

                if (!empty(paymentForm.creditCardFields.cardType.value)) {
                    var paymentCard = PaymentMgr.getPaymentCard(paymentForm.creditCardFields.cardType.value);

                    if (!empty(paymentCard) && paymentCard.custom.hipayCVVIgnored) {
                        delete paymentForm.creditCardFields.securityCode;
                    }
                }

                creditCardErrors = COHelpers.validateCreditCard(paymentForm);
            } else if (paymentMethodID === 'HIPAY_IDEAL') {
                hiPayErrors = COHelpers.validateFields(paymentForm.hipayMethodsFields.ideal);
                paymentForm.hipayMethodsFields = paymentForm.hipayMethodsFields.ideal;
            } else if (paymentMethodID === 'HIPAY_GIROPAY') {
                hiPayErrors = COHelpers.validateFields(paymentForm.hipayMethodsFields.giropay);
                paymentForm.hipayMethodsFields = paymentForm.hipayMethodsFields.giropay;
            }
        }

        if (Object.keys(creditCardErrors).length || Object.keys(hiPayErrors).length) {
            // respond with form data and errors
            res.json({
                form: paymentForm,
                fieldErrors: [creditCardErrors, hiPayErrors],
                serverErrors: [],
                error: true
            });
        }

        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var BasketMgr = require('dw/order/BasketMgr');
            var Transaction = require('dw/system/Transaction');
            var currentBasket = BasketMgr.getCurrentBasket();

            var billingData = res.getViewData();

            // Init flag saveCardChecked (depending on the storedPaymentUUID)
            if (billingData.storedPaymentUUID) {
                req.session.raw.custom.saveCardChecked = false;
            } else {
                req.session.raw.custom.saveCardChecked = billingData.saveCard;
            }

            Transaction.wrap(function () {
                if (empty(currentBasket.customerEmail) && !empty(req.currentCustomer.profile)) {
                    currentBasket.setCustomerEmail(req.currentCustomer.profile.email);
                }
            });
        });

        return next();
    }
);


server.replace('PlaceOrder', server.middleware.https, function (req, res, next) {
    var BasketMgr = require('dw/order/BasketMgr');
    var OrderMgr = require('dw/order/OrderMgr');
    var Resource = require('dw/web/Resource');
    var Transaction = require('dw/system/Transaction');
    var URLUtils = require('dw/web/URLUtils');
    var basketCalculationHelpers = require('*/cartridge/scripts/helpers/basketCalculationHelpers');
    var hooksHelper = require('*/cartridge/scripts/helpers/hooks');
    var Logger = require('dw/system/Logger');
    var array = require('*/cartridge/scripts/util/array');

    var currentBasket = BasketMgr.getCurrentBasket();
    var saveCardChecked = req.session.raw.custom.saveCardChecked;

    if (!currentBasket) {
        res.json({
            error: true,
            cartError: true,
            fieldErrors: [],
            serverErrors: [],
            redirectUrl: URLUtils.url('Cart-Show').toString()
        });

        return next();
    }

    if (req.session.privacyCache.get('fraudDetectionStatus')) {
        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', '01').toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    var validationOrderStatus = hooksHelper('app.validate.order', 'validateOrder', currentBasket, require('*/cartridge/scripts/hooks/validateOrder').validateOrder);

    if (validationOrderStatus.error) {
        res.json({
            error: true,
            errorMessage: validationOrderStatus.message
        });

        return next();
    }

    // Check to make sure there is a shipping address
    if (currentBasket.defaultShipment.shippingAddress === null) {
        res.json({
            error: true,
            errorStage: {
                stage: 'shipping',
                step: 'address'
            },
            errorMessage: Resource.msg('error.no.shipping.address', 'checkout', null)
        });

        return next();
    }

    // Check to make sure billing address exists
    if (!currentBasket.billingAddress) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'billingAddress'
            },
            errorMessage: Resource.msg('error.no.billing.address', 'checkout', null)
        });

        return next();
    }

    // Calculate the basket
    Transaction.wrap(function () {
        basketCalculationHelpers.calculateTotals(currentBasket);
    });

    // Re-validates existing payment instruments
    var validPayment = COHelpers.validatePayment(req, currentBasket);

    if (validPayment.error) {
        res.json({
            error: true,
            errorStage: {
                stage: 'payment',
                step: 'paymentInstrument'
            },
            errorMessage: Resource.msg('error.payment.not.valid', 'checkout', null)
        });
        return next();
    }

    // Re-calculate the payments.
    var calculatedPaymentTransactionTotal = COHelpers.calculatePaymentTransaction(currentBasket);

    if (calculatedPaymentTransactionTotal.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Creates a new order.
    var order = COHelpers.createOrder(currentBasket);

    if (!order) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Check if the Card exists in the list of PaymentInstruments Only for Customer Authenticated
    if (req.currentCustomer && !empty(req.currentCustomer.wallet)) {
        var incrementAttempt = false;
        var basketPaymentInstrument = currentBasket.getPaymentInstruments()[0];
        var paymentInstruments = req.currentCustomer.wallet.paymentInstruments;
        var paymentInstrument = array.find(paymentInstruments, function (item) {
            return item.UUID === basketPaymentInstrument.UUID;
        });

        if (saveCardChecked && !paymentInstrument) {
            incrementAttempt = true;
        }
        // If Card not exist in the list of PaymentInstruments : Incrementing the attempts (Create Custom Object for attempts)
        var varCustomer = currentBasket.customer;
        var writeToCustomObject = varCustomer.isAuthenticated() && varCustomer.isRegistered() && incrementAttempt;
        if (writeToCustomObject) {
            var params = {
                objName: Constants.OBJ_SAVE_ONE_CLICK,
                data: {
                    customerNo: currentBasket.customerNo,
                    attemptDate: new Date()
                }
            };
            var result = HipayCustomObject.writeToCustomObject(params);
            if (result === Constants.STATUS_ERROR) {
                Logger.error('writeToCustomObject : Fail to add the custom object : ' + params.objName);
            } else {
                Logger.info('writeToCustomObject : Record added for custom object : ' + params.objName);
            }
        }
    }

    // Handles payment authorization
    var handlePaymentResult = COHelpers.handlePayments(order, order.orderNo, !empty(req.querystring.uuid) ? req.querystring.uuid : null);

    if (handlePaymentResult.error) {
        res.json({
            error: true,
            errorMessage: !empty(handlePaymentResult.errorMessage) ? handlePaymentResult.errorMessage : Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    if (handlePaymentResult.HiPay) {
        if ((handlePaymentResult.Hosted || handlePaymentResult.API) && !empty(handlePaymentResult.HiPayRedirectURL)) {
            res.json({
                error: false,
                continueUrl: handlePaymentResult.HiPayRedirectURL
            });
        } else if (handlePaymentResult.Iframe) {
            res.json({
                error: false,
                continueUrl: URLUtils.url('CheckoutServices-RenderIFrame', 'iframeurl', handlePaymentResult.HiPayRedirectURL, 'templatename', handlePaymentResult.Template).toString()
            });
        }
        return next();
    }

    var fraudDetectionStatus = hooksHelper('app.fraud.detection', 'fraudDetection', currentBasket, require('*/cartridge/scripts/hooks/fraudDetection').fraudDetection);

    if (fraudDetectionStatus.status === 'fail') {
        Transaction.wrap(function () { OrderMgr.failOrder(order, true); });

        // fraud detection failed
        req.session.privacyCache.set('fraudDetectionStatus', true);

        res.json({
            error: true,
            cartError: true,
            redirectUrl: URLUtils.url('Error-ErrorCode', 'err', fraudDetectionStatus.errorCode).toString(),
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });

        return next();
    }

    // Places the order
    var placeOrderResult = COHelpers.placeOrder(order, fraudDetectionStatus);

    if (placeOrderResult.error) {
        res.json({
            error: true,
            errorMessage: Resource.msg('error.technical', 'checkout', null)
        });
        return next();
    }

    var HiPayHelper = require('*/cartridge/scripts/lib/hipay/hipayHelper');
    var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);

    COHelpers.sendConfirmationEmail(order, req.locale.id);
    //var parseHipayTokenize = JSON.parse(req.session.forms.billing.hipaytokenize.value);
    Transaction.wrap(function () {
        order.custom.hipayTransactionID = paymentInstr.getPaymentTransaction().getTransactionID();
    });
    // Reset usingMultiShip after successful Order placement
    req.session.privacyCache.set('usingMultiShipping', false);

    res.json({
        error: false,
        orderID: order.orderNo,
        orderToken: order.orderToken,
        continueUrl: URLUtils.url('Order-Confirm').toString(),
        sfraVersion: Site.getCurrent().getCustomPreferenceValue('hipaySFRAVersion') // SFRA version greater than or equal to 6 (boolean)
    });

    return next();
});

server.post('RenderIFrame',
    server.middleware.https,
    function (req, res, next) {
        res.render(req.querystring.templatename, {
            HiPayRedirectURL: req.querystring.iframeurl
        });

        next();
    }
);

module.exports = server.exports();
