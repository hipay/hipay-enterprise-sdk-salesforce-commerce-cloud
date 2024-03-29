var base = module.superModule;

var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var Decimal = require('dw/util/Decimal');
var TaxMgr = require('dw/order/TaxMgr');
var Transaction = require('dw/system/Transaction');
var Resource = require('dw/web/Resource');

var hipayUtils = require('*/cartridge/scripts/lib/hipay/hipayUtils');

// Import Constants
var Constants = require('*/cartridge/scripts/util/hipayConstants');

function fillHeaderData(HiPayConfig, order, params) {
    var threshold = HiPayConfig.hipayEnable3dSecureThresholdRule;
    var enforceThresholdRule = false;
    var language = request.locale;

    if (threshold !== 0) {
        var totalAmount;

        if (order.totalGrossPrice.available) {
            totalAmount = order.totalGrossPrice.decimalValue;
        } else {
            totalAmount = order.getAdjustedMerchandizeTotalPrice(true).add(order.giftCertificateTotalPrice).decimalValue;
        }

        if (totalAmount > threshold) {
            enforceThresholdRule = true;
        }
    }

    // use the rule to enforce 3DS depending on the total
    params.authentication_indicator = enforceThresholdRule ? HiPayConfig.THREEDSECURE_AUTH.MANDATORY : HiPayConfig.hipayEnable3dSecure;  // eslint-disable-line
    params.ipaddr = request.getHttpRemoteAddress();  // eslint-disable-line
    params.http_accept = request.httpHeaders.get('accept');  // eslint-disable-line
    params.http_user_agent = request.getHttpUserAgent();  // eslint-disable-line

    // if request.getHttpLocale() === null or had only 'ru' or 'ro' or 'en' etc. Try to check geolocation
    if (language.length === 2) {
        var geo = request.getGeolocation();

        if (!empty(geo) && !empty(geo.countryCode)) {
            language += '_' + geo.countryCode;
        }
    }

    if (language === 'default') {
        language = 'en_GB';
    }

    // always send the redirect urls
    params.language = language;  // eslint-disable-line
    params.accept_url = HiPayConfig.acceptURL;  // eslint-disable-line
    params.decline_url = HiPayConfig.declineURL;  // eslint-disable-line
    params.pending_url = HiPayConfig.pendingURL;  // eslint-disable-line
    params.exception_url = HiPayConfig.errorURL;  // eslint-disable-line
    params.cancel_url = HiPayConfig.cancelURL;  // eslint-disable-line
    params.notify_url = HiPayConfig.notifyURL;  // eslint-disable-line
}

/* Fills HiPay request data based on DW Order information */
function fillOrderData(order, params, pi) {
    var totalAmount = null;
    var items = null;
    var categoryList = [];
    var productNames = [];
    var customer = null;
    var gender = '';
    var billingAddress = null;
    var shippingAddress = null;
    // var systemVersion = require('dw/system/System').compatibilityMode.toString();
    // var brand_version = systemVersion.slice(0, systemVersion.length/2) + '.' +  Number(systemVersion.slice(systemVersion.length/2));
    var shipments = order.shipments;

    if (order.totalGrossPrice.available) {
        totalAmount = order.totalGrossPrice;
    } else {
        totalAmount = order.getAdjustedMerchandizeTotalPrice(true).add(order.giftCertificateTotalPrice);
    }

    items = order.getProductLineItems();

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        productNames.push(item.getProductName());
        if (!empty(item.getCategory())) {
            categoryList.push(item.getCategory());
        }
    }

    params.currency = order.getCurrencyCode(); // eslint-disable-line
    params.orderid = order.orderNo + '_' + Date.now(); // eslint-disable-line
    params.description = order.orderNo; // eslint-disable-line
    params.cid = order.customer.ID; // eslint-disable-line
    params.amount = totalAmount.value; // eslint-disable-line
    params.shipping = order.getAdjustedShippingTotalPrice().value; // eslint-disable-line
    params.tax = order.getTotalTax().value; // eslint-disable-line
    params.payment_product_category_list = categoryList.join(','); // eslint-disable-line

    params.source = JSON.stringify({
        source: 'CMS',
        brand: 'SFCC SFRA',
        brand_version: Resource.msg('global.version.number', 'version', null),
        integration_version: Resource.msg('hipay.version.number', 'hipay', null)
    });

    params.long_description = productNames.join(','); // eslint-disable-line
    customer = order.customer;
    billingAddress = order.billingAddress;

    var isAuthenticated = !customer.isAnonymous() && !empty(customer.profile);

    if (!empty(customer.profile)) {
        switch (customer.profile.gender.value) {
            case 1:
                gender = 'M';
                break;
            case 2:
                gender = 'F';
                break;
            default:
                gender = '';
                break;
        }
    }

    if (!empty(billingAddress)) {
        params.email = order.customerEmail; // eslint-disable-line
        params.phone = !empty(billingAddress.phone) ? billingAddress.phone.replace(/\s/g, '') : null; // eslint-disable-line

        params.firstname = billingAddress.firstName; // eslint-disable-line
        params.lastname = billingAddress.lastName; // eslint-disable-line
    }

    params.gender = gender; // eslint-disable-line

    // guest or no saved address
    if (!empty(billingAddress)) {
        params.recipientinfo = billingAddress.companyName; // eslint-disable-line
        params.streetaddress = billingAddress.address1; // eslint-disable-line

        if (!empty(billingAddress.address2)) {
            params.streetaddress2 = billingAddress.address2; // eslint-disable-line
        }

        params.city = billingAddress.city; // eslint-disable-line

        if (!empty(billingAddress.stateCode)) {
            params.state = billingAddress.stateCode; // eslint-disable-line
        }

        params.zipcode = billingAddress.postalCode; // eslint-disable-line
        params.country = billingAddress.countryCode.value.toUpperCase(); // eslint-disable-line
    }

    // Shipping info
    shippingAddress = order.defaultShipment.shippingAddress; // eslint-disable-line
    params.shipto_firstname = shippingAddress.firstName; // eslint-disable-line
    params.shipto_lastname = shippingAddress.lastName; // eslint-disable-line
    params.shipto_recipientinfo = shippingAddress.companyName; // eslint-disable-line
    params.shipto_streetaddress = shippingAddress.address1; // eslint-disable-line
    params.shipto_streetaddress2 = shippingAddress.address2; // eslint-disable-line
    params.shipto_city = shippingAddress.city; // eslint-disable-line

    if (!empty(shippingAddress.stateCode)) {
        params.shipto_state = shippingAddress.stateCode; // eslint-disable-line
    }

    params.shipto_zipcode = shippingAddress.postalCode; // eslint-disable-line
    params.shipto_country = shippingAddress.countryCode.value.toUpperCase(); // eslint-disable-line
    params.shipto_phone = shippingAddress.phone; // eslint-disable-line

    if (pi.paymentMethod.indexOf('HIPAY_HOSTED_ONEY_FACILITY_PAY') > -1 || pi.paymentMethod.indexOf('HIPAY_ONEY_FACILITY_PAY') > -1) {
        var basketObject = [];
        var categoriesCO = CustomObjectMgr.getCustomObject('OneyExtensionConfig', 'category').custom.settings;
        var categoriesConfig = JSON.parse(categoriesCO);
        var shippingCO = CustomObjectMgr.getCustomObject('OneyExtensionConfig', 'shipping').custom.settings;
        var shippingConfig = JSON.parse(shippingCO);

        params.shipto_gender = gender; // eslint-disable-line

        if (pi.paymentMethod.indexOf('HIPAY_HOSTED_ONEY_FACILITY_PAY') > -1 || pi.paymentMethod.indexOf('HIPAY_ONEY_FACILITY_PAY') > -1) {
            if (!empty(shipments)) {
                var shipment = shipments[0];
                var shipmentConfig = shippingConfig[shipment.getShippingMethodID()];

                var deliveryMethod = {};
                deliveryMethod.mode = shipmentConfig.deliveryMode;
                deliveryMethod.shipping = shipmentConfig.deliveryMethod;

                params.delivery_method = JSON.stringify(deliveryMethod); // eslint-disable-line

                // Estimated delivery date based on shipping method config from CO OneyExtensionConfig
                // calculated with date of the day + Order preparation estimated time (n days) + Delivery estimated time (n days).
                var calendar = new Calendar();
                var etaDays = 24 * (shipmentConfig.preparationTime + shipmentConfig.deliveryTime); // 24 hours per day

                calendar.add(Calendar.HOUR, etaDays);

                params.delivery_date = StringUtils.formatCalendar(calendar, 'YYYY-MM-dd'); // eslint-disable-line
            }
        }

        // Products section
        for (var plii = 0; plii < order.productLineItems.length; plii++) {
            var pli = order.productLineItems[plii];
            var itemObject = {};
            var productCategory = '';

            var appliedProductTotalDiscount = new Decimal();
            if (!empty(pli.priceAdjustments)) {
                for (var pai = 0; pai < pli.priceAdjustments.length; pai++) {
                    var productPriceAdjustment = pli.priceAdjustments[pai];
                    if (!empty(productPriceAdjustment.promotion) && productPriceAdjustment.promotion.promotionClass === 'PRODUCT') {
                        appliedProductTotalDiscount = appliedProductTotalDiscount.add(productPriceAdjustment.priceValue);
                    }
                }
            }

            var masterProd = pli.product.getMasterProduct();
            var assignedCategories = masterProd.getCategories();

            for (var aci = 0; aci < assignedCategories.length; aci++) {
                var assignedCategory = assignedCategories[aci];
                var categoryId = assignedCategory.getID();

                // check if a current category or if any parent has valid configuration
                var categoryConfig = categoriesConfig[categoryId];
                if (categoryConfig && categoryConfig.hipayCategory !== 0) {
                    productCategory = categoryConfig.hipayCategory;
                }

                // loop further into parent categories in order to receive a product_category value.
                if (empty(productCategory)) {
                    var category;
                    category = assignedCategory;

                    while (category.parent !== null) {
                        categoryConfig = categoriesConfig[category.ID];

                        if (categoryConfig && categoryConfig.hipayCategory !== 0) {
                            productCategory = categoryConfig.hipayCategory;
                        }

                        category = category.parent;
                    }
                }
            }

            itemObject.product_reference = pli.productID;
            itemObject.name = pli.productName;
            itemObject.type = 'good';
            itemObject.quantity = pli.quantityValue;
            itemObject.unit_price = pli.getBasePrice().getValue();
            itemObject.discount = appliedProductTotalDiscount.get();
            itemObject.tax_rate = Number(pli.getTaxRate() * 100).toFixed(2);
            itemObject.total_amount = pli.getAdjustedPrice().getValue();
            itemObject.product_category = Number(productCategory);

            basketObject.push(itemObject);
        }

        // Shipping section
        if (!empty(order.shipments)) {
            var orderShipment = order.shipments[0];
            var shippingLineItem = orderShipment.getStandardShippingLineItem();
            var shippingObject = {};

            shippingObject.product_reference = 'SHIP-' + orderShipment.getShippingMethod().getID();
            shippingObject.name = orderShipment.getShippingMethod().getDisplayName();
            shippingObject.type = 'fee';
            shippingObject.quantity = 1;
            shippingObject.unit_price = orderShipment.getShippingTotalPrice().getValue();
            shippingObject.discount = orderShipment.getAdjustedShippingTotalPrice().getValue() - orderShipment.getShippingTotalPrice().getValue();
            shippingObject.tax_rate = empty(shippingLineItem) ? 0 : Number(shippingLineItem.getTaxRate() * 100).toFixed(2);
            shippingObject.total_amount = orderShipment.getAdjustedShippingTotalPrice().getValue();
            shippingObject.product_category = 1;

            basketObject.push(shippingObject);
        }

        // Tax section
        if (TaxMgr.getTaxationPolicy() === TaxMgr.TAX_POLICY_NET) {
            var taxObject = {};
            taxObject.product_reference = 'Sales Tax';
            taxObject.name = 'Sales Tax';
            taxObject.type = 'fee';
            taxObject.quantity = 1;
            taxObject.unit_price = order.getTotalTax().getValue();
            taxObject.discount = 0;
            taxObject.tax_rate = 0;
            taxObject.total_amount = order.getTotalTax().getValue();

            basketObject.push(taxObject);
        }

        // Order level discounts
        if (!empty(order.getPriceAdjustments())) {
            // for each (var orderPriceAdjustment in order.getPriceAdjustments()) {
            var basketPriceAdjustments = order.getPriceAdjustments().iterator();
            while (basketPriceAdjustments.hasNext()) {
                var orderPriceAdjustment = basketPriceAdjustments.next();

                if (!empty(orderPriceAdjustment.promotion) && orderPriceAdjustment.promotion.promotionClass === 'ORDER') {
                    var appliedOrderTotalDiscount = new Decimal(orderPriceAdjustment.priceValue);
                    var orderDiscountObject = {};

                    orderDiscountObject.product_reference = 'DISC-' + orderPriceAdjustment.promotionID;
                    orderDiscountObject.name = orderPriceAdjustment.promotionID;
                    orderDiscountObject.type = 'discount';
                    orderDiscountObject.quantity = 1;
                    orderDiscountObject.unit_price = 0;
                    orderDiscountObject.discount = appliedOrderTotalDiscount.get();
                    orderDiscountObject.tax_rate = 0;
                    orderDiscountObject.total_amount = appliedOrderTotalDiscount.get();
                    orderDiscountObject.product_category = 1;

                    basketObject.push(orderDiscountObject);
                }
            }
        }

        params.basket = JSON.stringify(basketObject); // eslint-disable-line
    }

    // ### DPS2 params for Credit cards ### //
    if (pi.paymentMethod === 'HIPAY_CREDIT_CARD' || pi.paymentMethod === 'HIPAY_HOSTED_CREDIT_CARD') {
        // Device channel always 2, BROWSER
        params.device_channel = '2';
        // Add DSP2 browser info
        params.browser_info = JSON.parse(session.forms.billing.browserInfo.value);
        // Add http_accept
        params.browser_info.http_accept = params.http_accept;
        // Add Ip address
        params.browser_info.ipaddr = params.ipaddr;

        /* Merchant risk statement */

        params.merchant_risk_statement = {};

        var allDematerializedProducts = true;
        var atLeastOneDematerializedProduct = false;
        var atLeastOnePreOrderProduct = false;
        var latestDatePreOrderProduct = null;
        var productLineItem;
        var basketProductIDS = [];
        var basketProductQuantities = [];

        // Check all items of basket
        for (var j = 0; j < items.length; j++) {
            productLineItem = items[j];

            if (!empty(productLineItem.product)) {
                // Construct simple basket for auth users
                if (isAuthenticated) {
                    basketProductIDS.push(productLineItem.productID);
                    basketProductQuantities.push(productLineItem.quantity.value);
                }

                // If product is dematerialized
                if (!empty(productLineItem.product.custom.productDematerialized)
                    && productLineItem.product.custom.productDematerialized
                ) {
                    atLeastOneDematerializedProduct = true;
                } else {
                    allDematerializedProducts = false;
                }

                // If product is PRE ORDER
                if (!empty(productLineItem.product.availabilityModel)
                    && !empty(productLineItem.product.availabilityModel.availabilityStatus)
                    && productLineItem.product.availabilityModel.availabilityStatus === 'PREORDER'
                ) {
                    // At least one pre-order product
                    atLeastOnePreOrderProduct = true;

                    if (!empty(productLineItem.product.availabilityModel.inventoryRecord)
                        && !empty(productLineItem.product.availabilityModel.inventoryRecord.inStockDate)
                    ) {
                        if (latestDatePreOrderProduct) {
                            if (productLineItem.product.availabilityModel.inventoryRecord.inStockDate > latestDatePreOrderProduct) {
                                latestDatePreOrderProduct = productLineItem.product.availabilityModel.inventoryRecord.inStockDate;
                            }
                        } else {
                            latestDatePreOrderProduct = productLineItem.product.availabilityModel.inventoryRecord.inStockDate;
                        }
                    }
                }
            }
        }

        // At least one dematerialized product (email_delivery_address and delivery_time_frame)
        if (atLeastOneDematerializedProduct) {
            params.merchant_risk_statement.email_delivery_address = order.customerEmail;
            params.merchant_risk_statement.delivery_time_frame = 1;
        }
        // At least one pre-order product (purchase_indicator and pre_order_date)
        if (atLeastOnePreOrderProduct) {
            params.merchant_risk_statement.purchase_indicator = 2;
            if (latestDatePreOrderProduct) {
                params.merchant_risk_statement.pre_order_date =
                    parseInt(latestDatePreOrderProduct.toISOString().slice(0, 10).replace(/-/g, ''), 10);
            }
        } else {
            params.merchant_risk_statement.purchase_indicator = 1;
        }

        // shipping_indicator
        // If all products dematerialized, shipping_indicator = 5
        if (allDematerializedProducts) {
            params.merchant_risk_statement.shipping_indicator = 5;

            // Compare shipping and billing addresses
            // If equals, shipping_indicator = 1
        } else if (
            !empty(billingAddress)
            && hipayUtils.compareStrings(shippingAddress.address1, billingAddress.address1)
            && hipayUtils.compareStrings(shippingAddress.address2, billingAddress.address2)
            && hipayUtils.compareStrings(shippingAddress.postalCode, billingAddress.postalCode)
            && hipayUtils.compareStrings(shippingAddress.city, billingAddress.city)
            && hipayUtils.compareStrings(shippingAddress.countryCode.value, billingAddress.countryCode.value)
        ) {
            params.merchant_risk_statement.shipping_indicator = 1;
        } else {
            // Else, check if shipping address known for auth user (shipping_indicator = 2)
            // We check it later with other params
            // Else, shipping_indicator = 3
            params.merchant_risk_statement.shipping_indicator = 3;
        }

        // Add DSP2 account info
        if (isAuthenticated) {
            var customerNo = customer.profile.customerNo;

            /* Previous auth info*/

            // Get last processed order
            var lastProcessedOrder = OrderMgr.searchOrders('customerNo = {0} AND status >= {1} AND status <= {2}',
                'creationDate desc', customerNo, 3, 8).first();

            if (!empty(lastProcessedOrder) && !empty(lastProcessedOrder.paymentTransaction)) {
                // Get transaction ID of order
                var transactionReference = lastProcessedOrder.paymentTransaction.transactionID;

                if (!empty(transactionReference)) {
                    // If longer than 16 digits, truncate
                    if (transactionReference.length > 16) {
                        transactionReference = transactionReference.substring(0, 16);
                    }
                    // Fill transaction reference
                    params.previous_auth_info = {
                        transactionReference: transactionReference
                    };
                }
            }

            /* Account info */

            params.account_info = {
                customer: {},
                purchase: {},
                shipping: {}
            };

            /* Account info - payment */

            // Identify one-click payment if eci = 9
            if (!empty(params.eci) && params.eci === '9' && !empty(pi.creationDate)) {
                // Get creation date of payment instrument
                var oneClickCreationDate = pi.getCreationDate().toISOString().slice(0, 10).replace(/-/g, '');

                if (!empty(oneClickCreationDate)) {
                    params.account_info.payment = {
                        enrollment_date: parseInt(oneClickCreationDate, 10)
                    };
                }
            }

            /* Account info - Customer */

            var creationDate = customer.profile.getCreationDate().toISOString().slice(0, 10).replace(/-/g, '');

            // Add opening_account_date
            params.account_info.customer.opening_account_date = parseInt(creationDate, 10);
            // Add account_change
            params.account_info.customer.account_change =
                parseInt(customer.profile.getLastModified().toISOString().slice(0, 10).replace(/-/g, ''), 10);
            // Add password_change
            var datePasswordLastChange = customer.profile.custom.datePasswordLastChange;
            if (!empty(datePasswordLastChange)) {
                params.account_info.customer.password_change = parseInt(datePasswordLastChange, 10);
            } else {
                params.account_info.customer.password_change = parseInt(creationDate, 10);
                Transaction.wrap(function () {
                    customer.profile.custom.datePasswordLastChange = creationDate;
                });
            }

            /* Account info - Purchase */

            var dateNow = new Date();
            var lastDay = new Date(dateNow.valueOf());
            lastDay.setDate(lastDay.getDate() - 1);
            var lastYear = new Date(dateNow.valueOf());
            lastYear.setFullYear(lastYear.getFullYear() - 1);
            var lastSixMonth = new Date(dateNow.valueOf());
            lastSixMonth.setMonth(lastSixMonth.getMonth() - 6);

            // Add card_stored_24h (List of attempts by customerNo)
            var listAttempts = CustomObjectMgr.queryCustomObjects(Constants.OBJ_SAVE_ONE_CLICK,
                'custom.customerNo = {0} AND custom.attemptDate >= {1}', 'custom.attemptDate desc', customerNo, lastDay);
            if ('count' in listAttempts) {
                params.account_info.purchase.card_stored_24h = listAttempts.count;
            } else {
                params.account_info.purchase.card_stored_24h = 0;
            }

            // Get last processed orders from the last 24 hours
            var ordersLastDay = OrderMgr.searchOrders('customerNo = {0} AND creationDate >= {1}',
                'creationDate desc', customerNo, lastDay);
            var currentOrder;

            var ordersNumberLastDay = 0;
            if (ordersLastDay && ordersLastDay.getCount() > 0) {
                while (ordersLastDay.hasNext()) {
                    currentOrder = ordersLastDay.next();
                    if (currentOrder
                        && !empty(currentOrder.paymentTransaction)
                        && !empty(currentOrder.paymentTransaction.transactionID)
                        && !empty(currentOrder.paymentTransaction.paymentInstrument)
                        && !empty(currentOrder.paymentTransaction.paymentInstrument.paymentMethod)
                        && (
                            currentOrder.paymentTransaction.paymentInstrument.paymentMethod === 'HIPAY_CREDIT_CARD'
                            || currentOrder.paymentTransaction.paymentInstrument.paymentMethod === 'HIPAY_HOSTED_CREDIT_CARD'
                        )
                    ) {
                        ordersNumberLastDay++;
                    }
                }
            }
            // payment_attempts_24h (List of payment attempts during last 24 hours)
            params.account_info.purchase.payment_attempts_24h = ordersNumberLastDay;

            // Get last processed orders from the last year
            var ordersLastYear = OrderMgr.searchOrders('customerNo = {0} AND creationDate >= {1}',
                'creationDate desc', customerNo, lastYear);

            var ordersNumberLastYear = 0;
            if (ordersLastYear && ordersLastYear.getCount() > 0) {
                while (ordersLastYear.hasNext()) {
                    currentOrder = ordersLastYear.next();
                    if (currentOrder && !empty(currentOrder.getPaymentInstruments())) {
                        var paymentTransaction = currentOrder.getPaymentInstruments()[0].getPaymentTransaction();
                        if (
                            !empty(paymentTransaction)
                            && !empty(paymentTransaction.transactionID)
                            && !empty(paymentTransaction.paymentInstrument)
                            && !empty(paymentTransaction.paymentInstrument.paymentMethod)
                            && (
                                currentOrder.paymentTransaction.paymentInstrument.paymentMethod === 'HIPAY_CREDIT_CARD'
                                || currentOrder.paymentTransaction.paymentInstrument.paymentMethod === 'HIPAY_HOSTED_CREDIT_CARD'
                            )
                        ) {
                            ordersNumberLastYear++;
                        }
                    }
                }
            }
            // payment_attempts_24h (List of payment attempts during last year)
            params.account_info.purchase.payment_attempts_1y = ordersNumberLastYear;

            // Add count (Number of orders during 6 previous months)
            var ordersLastSixMonth = OrderMgr.searchOrders('customerNo = {0} AND creationDate >= {1}',
                'creationDate desc', customerNo, lastSixMonth);
            if (ordersLastSixMonth && ordersLastSixMonth.getCount() > 0) {
                params.account_info.purchase.count = ordersLastSixMonth.getCount();
            } else {
                params.account_info.purchase.count = 0;
            }

            /* Account info - Shipping */

            // Get all orders of customer
            var ordersAll = OrderMgr.searchOrders('customerNo = {0}', 'creationDate asc', customerNo);

            var addressFound = false;
            var reOrderFound = false;

            // Loop over all orders to check if shipping address used before
            if (ordersAll && ordersAll.getCount() > 0) {
                while ((!reOrderFound || !addressFound) && ordersAll.hasNext()) {
                    currentOrder = ordersAll.next();

                    if (!empty(currentOrder.defaultShipment) && !empty(currentOrder.defaultShipment.shippingAddress)) {
                        var currentOrderAddress = currentOrder.defaultShipment.shippingAddress;

                        if (
                            hipayUtils.compareStrings(shippingAddress.address1, currentOrderAddress.address1)
                            && hipayUtils.compareStrings(shippingAddress.address2, currentOrderAddress.address2)
                            && hipayUtils.compareStrings(shippingAddress.postalCode, currentOrderAddress.postalCode)
                            && hipayUtils.compareStrings(shippingAddress.city, currentOrderAddress.city)
                            && hipayUtils.compareStrings(shippingAddress.countryCode.value, currentOrderAddress.countryCode.value)
                        ) {
                            // break while condition
                            addressFound = true;

                            // Set shipping_indicator to 2
                            if (params.merchant_risk_statement.shipping_indicator === 3) {
                                params.merchant_risk_statement.shipping_indicator = 2;
                            }
                            // Add shipping_used_date (Date of first order with the same shipping address)
                            params.account_info.shipping.shipping_used_date =
                                parseInt(currentOrderAddress.getCreationDate().toISOString().slice(0, 10).replace(/-/g, ''), 10);
                        }
                    }

                    // Check if reorder
                    var currentOrderProducts = currentOrder.getProductLineItems();
                    var reOrderBasket = true;

                    // If baskets not same length, it is not reorder
                    if (basketProductIDS.length !== currentOrderProducts.length) {
                        reOrderBasket = false;
                    } else {
                        // Loop over current order basket to check each product
                        for (var k = 0; k < currentOrderProducts.length; k++) {
                            productLineItem = currentOrderProducts[k];

                            if (!empty(productLineItem.product)) {
                                // Check if ID exists in order basket
                                var indexId = basketProductIDS.indexOf(productLineItem.productID);
                                if (indexId >= 0) {
                                    // If ID exists, check if same quantity
                                    if (basketProductQuantities[indexId] !== productLineItem.quantity.value) {
                                        reOrderBasket = false;
                                        break;
                                    }
                                } else {
                                    reOrderBasket = false;
                                    break;
                                }
                            }
                        }
                    }

                    if (reOrderBasket) {
                        reOrderFound = true;
                    }
                }
            }

            // Add reorder_indicator (1 if order first time, 2 if reordered
            params.merchant_risk_statement.reorder_indicator = reOrderFound ? 2 : 1;

            // Add name_indicator (1 if name of customer = name of shipping address, else 2)
            params.account_info.shipping.name_indicator =
                hipayUtils.compareNames(
                    shippingAddress.firstName,
                    shippingAddress.lastName,
                    customer.profile.firstName,
                    customer.profile.lastName
                ) ? 1 : 2;
        }
    }
}

module.exports = {
    fillHeaderData: fillHeaderData,
    fillOrderData: fillOrderData,
    getHostedFieldsPreferences: base.getHostedFieldsPreferences,
    getOrderPaymentInstrument: base.getOrderPaymentInstrument,
    updatePaymentStatus: base.updatePaymentStatus,
    validateOneyAvailability: base.validateOneyAvailability
};
