'use strict';

var assert = require('assert');
var Module = require('module');
var path = require('path');

var helperPath = path.resolve(__dirname, '../../../../../../cartridges/int_hipay_sfra/cartridge/scripts/lib/hipay/hipayPendingOrderHelper');
var originalEmpty = global.empty;

global.empty = function empty(value) {
    return value === null || value === undefined || value === '';
};

function createAddress() {
    return {
        firstName: '',
        lastName: '',
        address1: '',
        address2: '',
        city: '',
        postalCode: '',
        stateCode: '',
        countryCode: '',
        phone: '',
        setFirstName: function (value) { this.firstName = value; },
        setLastName: function (value) { this.lastName = value; },
        setAddress1: function (value) { this.address1 = value; },
        setAddress2: function (value) { this.address2 = value; },
        setCity: function (value) { this.city = value; },
        setPostalCode: function (value) { this.postalCode = value; },
        setStateCode: function (value) { this.stateCode = value; },
        setCountryCode: function (value) { this.countryCode = value; },
        setPhone: function (value) { this.phone = value; }
    };
}

function loadHelper(stubs) {
    var originalLoad = Module._load;

    Module._load = function patchedLoad(request, parent, isMain) {
        if (Object.prototype.hasOwnProperty.call(stubs, request)) {
            return stubs[request];
        }

        return originalLoad(request, parent, isMain);
    };

    delete require.cache[require.resolve(helperPath)];

    try {
        return require(helperPath);
    } finally {
        Module._load = originalLoad;
    }
}

function testSetAndClearPendingOrder() {
    var privacyCacheValues = {};
    var helper = loadHelper({
        'dw/order/BasketMgr': {
            getCurrentBasket: function () {
                return null;
            }
        },
        'dw/order/Order': {
            ORDER_STATUS_CREATED: 'CREATED'
        },
        'dw/order/OrderMgr': {
            getOrder: function () {
                return null;
            },
            failOrder: function () {}
        },
        'dw/system/Transaction': {
            wrap: function (callback) {
                callback();
            }
        },
        '*/cartridge/scripts/checkout/shippingHelpers': {
            selectShippingMethod: function () {}
        }
    });
    var req = {
        session: {
            privacyCache: {
                get: function (key) {
                    return privacyCacheValues[key];
                },
                set: function (key, value) {
                    privacyCacheValues[key] = value;
                }
            }
        }
    };
    var order = {
        orderNo: '000123',
        orderToken: 'token-1'
    };

    helper.setPendingHipayOrder(req, order);
    assert.strictEqual(privacyCacheValues.hipayPendingOrderNo, '000123');
    assert.strictEqual(privacyCacheValues.hipayPendingOrderToken, 'token-1');

    helper.clearPendingHipayOrder(req);
    assert.strictEqual(privacyCacheValues.hipayPendingOrderNo, null);
    assert.strictEqual(privacyCacheValues.hipayPendingOrderToken, null);
}

function testRestoreBasketFromPendingOrder() {
    var failedOrders = [];
    var selectedShippingMethods = [];
    var privacyCacheValues = {
        hipayPendingOrderNo: '000456',
        hipayPendingOrderToken: 'token-2'
    };
    var currentBasket = {
        defaultShipment: {
            shippingAddress: null,
            shippingMethod: null,
            createShippingAddress: function () {
                this.shippingAddress = createAddress();
                return this.shippingAddress;
            }
        },
        billingAddress: null,
        customerEmail: '',
        createBillingAddress: function () {
            this.billingAddress = createAddress();
            return this.billingAddress;
        },
        setCustomerEmail: function (value) {
            this.customerEmail = value;
        }
    };
    var order = {
        status: {
            value: 'CREATED'
        },
        billingAddress: {
            firstName: 'Bill',
            lastName: 'Buyer',
            address1: '10 Billing street',
            address2: 'Apt 9',
            city: 'Paris',
            postalCode: '75001',
            stateCode: 'IDF',
            countryCode: {
                value: 'FR'
            },
            phone: '0102030405'
        },
        customerEmail: 'buyer@example.com',
        getDefaultShipment: function () {
            return {
                shippingAddress: {
                    firstName: 'Ship',
                    lastName: 'Buyer',
                    address1: '20 Shipping street',
                    address2: '',
                    city: 'Paris',
                    postalCode: '75002',
                    stateCode: 'IDF',
                    countryCode: {
                        value: 'FR'
                    },
                    phone: '0504030201'
                },
                shippingMethod: {
                    ID: 'STANDARD'
                }
            };
        }
    };
    var helper = loadHelper({
        'dw/order/BasketMgr': {
            getCurrentBasket: function () {
                return currentBasket;
            }
        },
        'dw/order/Order': {
            ORDER_STATUS_CREATED: 'CREATED'
        },
        'dw/order/OrderMgr': {
            getOrder: function (orderNo, orderToken) {
                if (orderNo === '000456' && orderToken === 'token-2') {
                    return order;
                }

                return null;
            },
            failOrder: function (currentOrder, reopenBasket) {
                failedOrders.push({
                    order: currentOrder,
                    reopenBasket: reopenBasket
                });
            }
        },
        'dw/system/Transaction': {
            wrap: function (callback) {
                callback();
            }
        },
        '*/cartridge/scripts/checkout/shippingHelpers': {
            selectShippingMethod: function (shipment, shippingMethodID) {
                selectedShippingMethods.push({
                    shipment: shipment,
                    shippingMethodID: shippingMethodID
                });
                shipment.shippingMethod = {
                    ID: shippingMethodID
                };
            }
        }
    });
    var req = {
        session: {
            privacyCache: {
                get: function (key) {
                    return privacyCacheValues[key];
                },
                set: function (key, value) {
                    privacyCacheValues[key] = value;
                }
            }
        }
    };

    var restored = helper.tryRestoreBasketFromPendingHipay(req);

    assert.strictEqual(restored, true);
    assert.strictEqual(failedOrders.length, 1);
    assert.strictEqual(failedOrders[0].order, order);
    assert.strictEqual(failedOrders[0].reopenBasket, true);
    assert.strictEqual(selectedShippingMethods.length, 1);
    assert.strictEqual(selectedShippingMethods[0].shippingMethodID, 'STANDARD');
    assert.strictEqual(currentBasket.defaultShipment.shippingAddress.address1, '20 Shipping street');
    assert.strictEqual(currentBasket.billingAddress.address1, '10 Billing street');
    assert.strictEqual(currentBasket.customerEmail, 'buyer@example.com');
    assert.strictEqual(privacyCacheValues.hipayPendingOrderNo, null);
    assert.strictEqual(privacyCacheValues.hipayPendingOrderToken, null);
}

testSetAndClearPendingOrder();
testRestoreBasketFromPendingOrder();

if (originalEmpty) {
    global.empty = originalEmpty;
} else {
    delete global.empty;
}
