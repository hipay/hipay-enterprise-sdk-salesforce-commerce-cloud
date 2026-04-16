'use strict';

var BasketMgr = require('dw/order/BasketMgr');
var Order = require('dw/order/Order');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');

var ShippingHelper = require('*/cartridge/scripts/checkout/shippingHelpers');

function copyAddress(sourceAddress, targetAddress) {
    if (!sourceAddress || !targetAddress) {
        return;
    }

    targetAddress.setFirstName(sourceAddress.firstName || '');
    targetAddress.setLastName(sourceAddress.lastName || '');
    targetAddress.setAddress1(sourceAddress.address1 || '');
    targetAddress.setAddress2(sourceAddress.address2 || '');
    targetAddress.setCity(sourceAddress.city || '');
    targetAddress.setPostalCode(sourceAddress.postalCode || '');

    if (!empty(sourceAddress.stateCode)) {
        targetAddress.setStateCode(sourceAddress.stateCode);
    }

    if (sourceAddress.countryCode) {
        targetAddress.setCountryCode(sourceAddress.countryCode.value || sourceAddress.countryCode);
    }

    if (sourceAddress.phone) {
        targetAddress.setPhone(sourceAddress.phone);
    }
}

function setPendingHipayOrder(req, order) {
    if (!req || !order) {
        return;
    }

    req.session.privacyCache.set('hipayPendingOrderNo', order.orderNo);
    req.session.privacyCache.set('hipayPendingOrderToken', order.orderToken);
}

function clearPendingHipayOrder(req) {
    if (!req) {
        return;
    }

    req.session.privacyCache.set('hipayPendingOrderNo', null);
    req.session.privacyCache.set('hipayPendingOrderToken', null);
}

function tryRestoreBasketFromPendingHipay(req) {
    if (!req) {
        return false;
    }

    var orderNo = req.session.privacyCache.get('hipayPendingOrderNo');
    var orderToken = req.session.privacyCache.get('hipayPendingOrderToken');
    var restored = false;

    if (empty(orderNo) || empty(orderToken)) {
        return false;
    }

    var order = null;
    try {
        order = OrderMgr.getOrder(orderNo, orderToken);
    } catch (e) {
        order = null;
    }

    if (order && order.status.value === Order.ORDER_STATUS_CREATED) {
        Transaction.wrap(function () {
            OrderMgr.failOrder(order, true);
        });
        restored = true;

        var currentBasket = BasketMgr.getCurrentBasket();
        if (currentBasket) {
            var orderShipment = order.getDefaultShipment ? order.getDefaultShipment() : order.defaultShipment;
            var basketShipment = currentBasket.defaultShipment;

            Transaction.wrap(function () {
                var orderShippingAddress = orderShipment && orderShipment.shippingAddress ? orderShipment.shippingAddress : null;
                var basketShippingAddress = basketShipment ? basketShipment.shippingAddress : null;
                var shouldCopyShipping = orderShippingAddress
                    && (!basketShippingAddress || empty(basketShippingAddress.address1));

                if (shouldCopyShipping && basketShipment) {
                    var shippingAddress = basketShippingAddress || basketShipment.createShippingAddress();
                    copyAddress(orderShippingAddress, shippingAddress);
                }

                if (orderShipment && orderShipment.shippingMethod && basketShipment && !basketShipment.shippingMethod) {
                    ShippingHelper.selectShippingMethod(basketShipment, orderShipment.shippingMethod.ID);
                }

                var orderBillingAddress = order.billingAddress || null;
                var basketBillingAddress = currentBasket.billingAddress || null;
                var shouldCopyBilling = orderBillingAddress
                    && (!basketBillingAddress || empty(basketBillingAddress.address1));

                if (shouldCopyBilling) {
                    var billingAddress = basketBillingAddress || currentBasket.createBillingAddress();
                    copyAddress(orderBillingAddress, billingAddress);
                }

                if (order.customerEmail && empty(currentBasket.customerEmail) && typeof currentBasket.setCustomerEmail === 'function') {
                    currentBasket.setCustomerEmail(order.customerEmail);
                }
            });
        }
    }

    clearPendingHipayOrder(req);

    return restored;
}

module.exports = {
    setPendingHipayOrder: setPendingHipayOrder,
    clearPendingHipayOrder: clearPendingHipayOrder,
    tryRestoreBasketFromPendingHipay: tryRestoreBasketFromPendingHipay
};
