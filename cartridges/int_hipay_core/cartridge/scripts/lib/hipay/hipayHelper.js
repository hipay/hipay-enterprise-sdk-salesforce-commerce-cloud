var ArrayList = require('dw/util/ArrayList');
var Order = require('dw/order/Order');
var HttpParameterMap = require('dw/web/HttpParameterMap');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Decimal = require('dw/util/Decimal');
var TaxMgr = require('dw/order/TaxMgr');
var Logger = require('dw/system/Logger');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

var statuses = require('*/cartridge/scripts/lib/hipay/hipayStatus').HiPayStatus;
var hipayUtils = require('*/cartridge/scripts/lib/hipay/hipayUtils');

// Import Constants
var Constants = require('*/cartridge/scripts/util/hipayConstants');

/* Create an order note based on the status message */
function addOrderNote(order, noteSubject) {
    order.addNote(noteSubject, this.formatRequestData(request.getHttpParameters()));
};

/* Creates a formatted text message from the request parameters */
function formatRequestData(params) {
    var requestLog = [];
    var entrysSet = params.entrySet();

    for (var i = 0; i < entrysSet.length; i++) {
        if (!empty(entrysSet[i].getValue()[0])
            //
            && entrysSet[i].getKey().toString().indexOf('payment_method[') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('order[') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('three_d_secure') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('fraud_screening[') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('ip_') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('test') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('device_id') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('cdata') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('decimals') === -1
            //
            && entrysSet[i].getKey().toString().indexOf('eci') === -1) {
            requestLog.push(entrysSet[i].getKey() + ' : ' + entrysSet[i].getValue()[0]);
        }
    }

    requestLog.sort();
    return requestLog.join("\n"); // eslint-disable-line
};

/* Updated the payment status of in the Order and manages the state of the transaction */
function updatePaymentStatus(order, paymentInstr, params) {
    var paymentStatus = null;
    var statusType = null;

    if (params instanceof HttpParameterMap) {
        paymentStatus = params.status.stringValue; //= 116,117
    } else {
        paymentStatus = params.status;
    }

    // set the payment instrument status
    // a key/value object here. 'for in' loop only here
    for (var statusKey in statuses) { // eslint-disable-line
        statusType = statuses[statusKey];
        if (paymentStatus === statusType.code) {
            paymentInstr.custom.hipayTransactionStatus = statusType.value; // eslint-disable-line
            break;
        }
    }

    // if status is 109 to 120 or 124 or 125 or 126 or 129 or 142
    switch (paymentStatus) {
        case statuses.CAPTURED.code:
            // if capture amount is the whole sum
            var capturedAmount = null;

            if (params instanceof HttpParameterMap) {
                capturedAmount = params.captured_amount.doubleValue; // eslint-disable-line
            } else {
                capturedAmount = parseFloat(params.capturedAmount);
            }

            paymentInstr.custom.hipayTransactionCapturedAmount = capturedAmount; // eslint-disable-line
            order.paymentStatus = Order.PAYMENT_STATUS_PAID; // eslint-disable-line
            break;
        case statuses.PARTIALLY_CAPTURED.code:
            order.paymentStatus = Order.PAYMENT_STATUS_PARTPAID; // eslint-disable-line
            break;
        default:
            break;
    }
};

/* Validates if the Oney payment instrument must be rendered for the selected shipping method
 * Oney payment method should not be displayed if mapped shipping method is not chosen.
 *
 * Oney payment method should not be displayed if order_category_code of at least 1 product is not mapped out.
 * Mapping is required for delivery_method, order_category_code.
 * The order_category_code should work like this:
 * we get the line item >
 * we get the category the product is assigned to >
 * we start matching the category id with the mapping by going up the levels until we find the parent category that is mapped or we hit root;
 * if we hit root, the oney payment method is not displayed
 * */
function validateOneyAvailability(basket) {
    var decision = false;
    var shippingDecision = false;
    var productDecision = false;

    try {
        var shippingCO = CustomObjectMgr.getCustomObject('OneyExtensionConfig', 'shipping').custom.settings;
        var shippingConfig = JSON.parse(shippingCO);
        var categoriesCO = CustomObjectMgr.getCustomObject('OneyExtensionConfig', 'category').custom.settings;
        var categoriesConfig = JSON.parse(categoriesCO);

        if (empty(shippingConfig) || empty(categoriesConfig)) {
            return false;
        }

        // check if the selected shipping method compatible (has configuration) with Oney payment method
        var shipments = basket.shipments;

        if (!empty(shipments)) {
            var shipment = shipments[0];
            var shipmentConfig = shippingConfig[shipment.getShippingMethodID()];

            if (shipmentConfig && !empty(shipmentConfig.preparationTime) && !empty(shipmentConfig.deliveryTime) && shipmentConfig.deliveryMode !== '0' && shipmentConfig.deliveryMethod !== '0') {
                shippingDecision = true;
            }
        }

        // check if a product(s) in basket are compatible with Oney payment method
        var products = basket.getAllProductLineItems();

        if (!empty(products)) {
            for (var i = 0; i < products.length; i++) {
                var pli = products[i];
                var productHasConfiguredCategory = false;

                var masterProd = pli.product.getMasterProduct();
                var assignedCategories = masterProd.getCategories();

                for (var cati = 0; cati < assignedCategories.length; cati++) {
                    var assignedCategory = assignedCategories[cati];
                    var categoryId = assignedCategory.getID();

                    // check if a current category or if any parent has valid configuration
                    var categoryConfig = categoriesConfig[categoryId];
                    if (categoryConfig && categoryConfig.hipayCategory !== 0) {
                        productHasConfiguredCategory = true;
                    }

                    var category;
                    category = assignedCategory;

                    while (category.parent !== null) {
                        categoryConfig = categoriesConfig[category.ID];

                        if (categoryConfig && categoryConfig.hipayCategory !== 0) {
                            productHasConfiguredCategory = true;
                        }

                        category = category.parent;
                    }
                }

                // if at least one product doesn't have a configured category, don't show the Oney payment method
                if (productHasConfiguredCategory === true) {
                    productDecision = true;
                } else {
                    productDecision = false;
                }
            }
        }
    } catch (e) {
        Logger.error('[HiPayHelper.js] crashed on line: ' + e.lineNumber + ' with error: ' + e);
    }

    if (shippingDecision === true && productDecision === true) {
        decision = true;
    }

    return decision;
};

/* Retrieves the PaymentInstrument for the Order */
function getOrderPaymentInstrument(order) {
    var paymentInstr = null;
    var paymentInstrColl = order.getPaymentInstruments();

    if (paymentInstrColl.size() !== 0) {
        var list = new ArrayList(paymentInstrColl);
        paymentInstr = list.get(0);
    }

    if (paymentInstr === null) {
        var message = 'No Payment Instrument was found for Order ' + order.orderNo + ', please check the configuration!';
        throw new Error(message);
    }

    return paymentInstr;
};

module.exports = {
    addOrderNote: addOrderNote,
    formatRequestData: formatRequestData,
    getOrderPaymentInstrument: getOrderPaymentInstrument,
    updatePaymentStatus: updatePaymentStatus,
    validateOneyAvailability: validateOneyAvailability
};
