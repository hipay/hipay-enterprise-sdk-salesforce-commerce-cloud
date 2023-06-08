'use strict';

var ArrayList = require('dw/util/ArrayList');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var Logger = require('dw/system/Logger');
var Order = require('dw/order/Order');

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
}

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
}

/**
 * Update the payment status of in the Order and manages the state of the transaction
 *
 * @param {Order} order
 * @param {*} paymentInstr
 * @param {String} paymentStatus
 * @param {Double} capturedAmount
 */
function updatePaymentStatus(order, paymentInstr, paymentStatus, capturedAmount) {
    var statuses = require('*/cartridge/scripts/lib/hipay/hipayStatus').HiPayStatus;
    var statusType;

    // set the payment instrument status
    // a key/value object here. 'for in' loop only here
    for (var statusKey in statuses) { // eslint-disable-line
        statusType = statuses[statusKey];
        if (statusType.code === paymentStatus) {
            paymentInstr.custom.hipayTransactionStatus = statusType.value; // eslint-disable-line
            break;
        }
    }

    // if status is 109 to 120 or 124 or 125 or 126 or 129 or 142
    switch (paymentStatus) {
        case statuses.CAPTURED.code:
            if (capturedAmount) {
                paymentInstr.custom.hipayTransactionCapturedAmount = parseFloat(capturedAmount); // eslint-disable-line
                order.paymentStatus = Order.PAYMENT_STATUS_PAID; // eslint-disable-line
            }
            break;
        case statuses.PARTIALLY_CAPTURED.code:
            order.paymentStatus = Order.PAYMENT_STATUS_PARTPAID; // eslint-disable-line
            break;
        default:
            break;
    }
}

/**
 * Get hosted fields custom preferences and build an object.
 * @return {Object}
 */
function getHostedFieldsPreferences() {
    var Site = require('dw/system/Site');
    var HiPayConfig = require('*/cartridge/scripts/lib/hipay/hipayConfig').HiPayConfig;
    var currentSite = Site.getCurrent();

    var hipayHostedFields = {
        hipayEnabled: currentSite.getCustomPreferenceValue('hipayEnabled'),
        hipayEnableOneClick: currentSite.getCustomPreferenceValue('hipayEnableOneClick'),
        hipayOperationMode: currentSite.getCustomPreferenceValue('hipayOperationMode').value,
        isSFRA6: currentSite.getCustomPreferenceValue('hipaySFRAVersion'),
        cardConfig: {
            config: {
                template: 'auto',
                selector: 'hipay-hostedfields-form',
                fields: {
                    cardHolder: {
                        uppercase: true,
                        defaultFirstname: null,
                        defaultLastname: null
                    }
                },
                styles: {
                    base: {
                        color: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleBaseColor'),
                        fontSize: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleBaseFrontSize'),
                        fontWeight: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleBaseFrontWeight'),
                        placeholderColor: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleBasePlaceHolderColor'),
                        iconColor: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleBaseIconColor'),
                        caretColor: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleBaseCaretColor')
                    },
                    invalid: {
                        color: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleInvalidColor'),
                        caretColor: currentSite.getCustomPreferenceValue('hipayHostedFieldsStyleInvalidCaretColor')
                    }
                }
            }
        },
        idealConfig: {
            config: {
                template: 'auto',
                selector: 'hipay-hostedfields-form-ideal' // form container div id
            }
        },
        giropayConfig: {
            config: {
                template: 'auto',
                selector: 'hipay-hostedfields-form-giropay' // form container div id
            }
        },
        mbwayConfig: {
            config: {
                template: 'auto',
                selector: 'hipay-hostedfields-form-mbway' // form container div id
            }
        },
        globalVariable: {
            username: HiPayConfig['hipayPublic' + HiPayConfig.hipayEnvironment + 'Username'],
            password: HiPayConfig['hipayPublic' + HiPayConfig.hipayEnvironment + 'Password'],
            environment: HiPayConfig.hipayEnvironment === 'Live' ? 'production' : 'stage'
        },
        applePayConfig: {
            total: {
                label: currentSite.getCustomPreferenceValue('HipayAppleLabel')
            },
            request: {
                countryCode: currentSite.getCustomPreferenceValue('hipayAppleCountryCode'),
                supportedNetworks: currentSite.getCustomPreferenceValue('HipayAppleSupportedNetworks')
            },
            style: {
                type: currentSite.getCustomPreferenceValue('HipayAppleTypeStyle'),
                color: currentSite.getCustomPreferenceValue('HipayAppleColorStyle')
            },
            options: {
                displayName: currentSite.getCustomPreferenceValue('HipayAppleDisplayName')
            }
        }
    };

    return hipayHostedFields;
}

module.exports = {
    getOrderPaymentInstrument: getOrderPaymentInstrument,
    updatePaymentStatus: updatePaymentStatus,
    validateOneyAvailability: validateOneyAvailability,
    getHostedFieldsPreferences: getHostedFieldsPreferences
};
