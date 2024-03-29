'use strict';

/**
* HiPayTransactions.js
*
* HiPay extension controller. Handles search and capture order.
*
* @module  controllers/HiPayTransactions
*/

/* API includes */
var ISML = require('dw/template/ISML');
var OrderMgr = require('dw/order/OrderMgr');
var Resource = require('dw/web/Resource');

var SystemObjectMgr = require('dw/object/SystemObjectMgr');
var ArrayList = require('dw/util/ArrayList');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');
var PagingModel = require('dw/web/PagingModel');
var Order = require('dw/order/Order');

var statuses = require('*/cartridge/scripts/lib/hipay/hipayStatus').HiPayStatus;
var HiPayHelper = require('*/cartridge/scripts/lib/hipay/hipayHelper');

var MaintenanceModule = require('*/cartridge/scripts/lib/hipay/modules/hipayMaintenanceModule');
var TransactionModule = require('*/cartridge/scripts/lib/hipay/modules/hipayTransactionModule');
var HiPayMaintenanceService = require('*/cartridge/scripts/lib/hipay/services/hipayMaintenanceService');

/**
 * Get orders
 *
 * @param {string} orderNo - Order number used in "Search by order number" feature
 * @param {string} orderUUID - Optional, in case a specific order needs to be returned
 * @returns {dw.util.ArrayList} Combined array with all orders
 */
function getOrders(orderNo, orderUUID) {
    var orders = new ArrayList();
    var paymentInstrument;
    var orderDate;

    var queryString = '';
    var sortString = 'creationDate desc';
    var args = [];

    if (!empty(orderUUID)) {
        queryString = 'UUID = {0}';
        args.push(orderUUID);
    } else if (!empty(orderNo)) {
        queryString = 'status != {0} AND orderNo = {1} ';
        args.push(Order.ORDER_STATUS_FAILED);
        args.push(orderNo);
    } else {
        queryString = 'status != {0}';
        args.push(Order.ORDER_STATUS_FAILED);
        args.push(orderNo);
    }

    var searchOrders = OrderMgr.searchOrders(
        queryString,
        sortString,
        args
    );

    while (searchOrders.hasNext()) {
        var order = searchOrders.next();

        orderDate = new Date(order.creationDate);
        paymentInstrument = HiPayHelper.getOrderPaymentInstrument(order);

        if (paymentInstrument === null) {
            continue; // eslint-disable-line no-continue
        }

        var orderInfo = {
            orderNo: order.orderNo,
            orderDate: StringUtils.formatCalendar(new Calendar(orderDate), 'M/dd/yy h:mm a'),
            createdBy: order.createdBy,
            isRegestered: order.customer.registered,
            customer: order.customerName,
            email: order.customerEmail,
            orderTotal: order.totalGrossPrice,
            currencyCode: order.getCurrencyCode(),
            hipayAmount: paymentInstrument.getPaymentTransaction().getAmount(),
            hipayTransactionID: paymentInstrument.getPaymentTransaction().getTransactionID(),
            captureAmount: order.capturedAmount.value,
            refundedAmount: order.refundedAmount.value,
            status: order.status,
            paymentStatus: order.paymentStatus,
            isCustom: false,
            notes: order.notes
        };

        orders.push(orderInfo);
    }

    return orders;
}

function orders() {
    var orderNo;
    var orderUUID = !empty(request.httpParameterMap.OrderID.stringValue) ? request.httpParameterMap.OrderID.stringValue : null;
    var alternativeFlow = false;
    var orders;

    if (request.httpParameterMap.transactionId.submitted && !empty(request.httpParameterMap.transactionId.stringValue)) {
        var transactionId = request.httpParameterMap.transactionId.stringValue;

        var systemOrder = SystemObjectMgr.querySystemObjects('Order', 'custom.hipayTransactionID LIKE {0}', 'creationDate desc', transactionId);
        var firstOrder = (new ArrayList(systemOrder)).toArray()[0];
        if (firstOrder) {
            orderNo = firstOrder.orderNo;
        }
        systemOrder.close();
    }

    if (!orderNo) {
        alternativeFlow = true;
    }

    if (alternativeFlow) {
        orderNo = empty(request.httpParameterMap.orderNo.stringValue) ? '' : request.httpParameterMap.orderNo.stringValue;
        orderNo = request.httpParameterMap.transactionId.submitted ? '0' : orderNo;
        orderNo = request.httpParameterMap.transactionId.stringValue === '' ? '' : orderNo;
    }

    orders = getOrders(orderNo, orderUUID);

    var pageSize = !empty(request.httpParameterMap.pagesize.intValue) ? request.httpParameterMap.pagesize.intValue : 10;
    var currentPage = request.httpParameterMap.page.intValue ? request.httpParameterMap.page.intValue : 1;
    pageSize = pageSize === 0 ? orders.length : pageSize;
    var start = pageSize * (currentPage - 1);

    var orderPagingModel = new PagingModel(orders);

    orderPagingModel.setPageSize(pageSize);
    orderPagingModel.setStart(start);

    if (empty(orders)) { /* can not load requested order. */
        operationStatus.valid = false;
        operationStatus.msg = Resource.msg('hipay_bm.capture.order.error', 'hipay_bm', null);
    } else {
        session.forms.searchorder.clearFormElement();
    }

    return ISML.renderTemplate('order/orderList', {
        orderUUID: orderUUID,
        PagingModel: orderPagingModel
    });
}

function PaymentDialog() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    var capturedAmount = 0;
    var refundedAmount = 0;

    var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);

    var transactionOperations = getTransactions(hipayPaymentId);

    // Show error message if we failed to get transacations.
    if (transactionOperations.error) {
        return ISML.renderTemplate('order/error', {
            errorMessage: transactionOperations.errorMessage,
            error: true
        });
    }

    var transactionIsCancellable = false;

    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;
        transactionIsCancellable = transactionOperations.hiPayTransactionResponse.transaction.status === statuses.AUTHORIZED.code;
    }

    return ISML.renderTemplate('order/paymentDialog', {
        order: order,
        transactionAmount: paymentInstr.paymentTransaction.amount,
        capturedAmount: capturedAmount,
        refundedAmount: refundedAmount,
        hipayPaymentId: hipayPaymentId,
        transactionIsCancellable: transactionIsCancellable,
        paymentStatus: paymentInstr.custom.hipayTransactionStatus
    });
}

function getTransactions(transactionId) {
    return TransactionModule.hiPayTransactionRequest(transactionId);
}

function CapturePayment() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var amount = request.httpParameterMap.amount.value;

    var response = MaintenanceModule.hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_CAPTURE);

    if (response.error) {
        return ISML.renderTemplate('order/error', {
            errorMessage: response.errorMessage,
            error: response.error
        });
    }
}

function CancelPayment(hipayPaymentId) {
    var Transaction = require('dw/system/Transaction');
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);
    var amount = paymentInstr.paymentTransaction.amount.value;

    var response = MaintenanceModule.hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_CANCEL);

    if (response.error) {
        return ISML.renderTemplate('order/error', {
            errorMessage: response.errorMessage,
            error: response.error
        });
    }

    Transaction.wrap(function () {
        OrderMgr.cancelOrder(order);
    });
}

function RefundPayment() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var amount = request.httpParameterMap.amount.value;

    var response = MaintenanceModule.hiPayMaintenanceRequest(order, amount.toString(), HiPayMaintenanceService.OPERATION_REFUND);

    if (response.error) {
        return ISML.renderTemplate('order/error', {
            errorMessage: response.errorMessage,
            error: response.error
        });
    }
}

function RefreshPaymentDetails() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;
    var capturedAmount = 0;
    var refundedAmount = 0;

    var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);

    var transactionOperations = getTransactions(hipayPaymentId);
    var transactionIsCancellable = false;
    var paymentStatus = paymentInstr.custom.hipayTransactionStatus;
    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;
        transactionIsCancellable = transactionOperations.hiPayTransactionResponse.transaction.state === statuses.AUTHORIZED.code;
        paymentStatus = transactionOperations.hiPayTransactionResponse.transaction.message;
    }

    return ISML.renderTemplate('order/paymentDetails', {
        order: order,
        transactionAmount: paymentInstr.paymentTransaction.amount,
        capturedAmount: capturedAmount,
        refundedAmount: refundedAmount,
        hipayPaymentId: hipayPaymentId,
        transactionIsCancellable: transactionIsCancellable,
        paymentStatus: paymentStatus
    });
}

function ListPaymentCaptures() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;

    var transactionOperations = getTransactions(hipayPaymentId);
    var capturableAmount = 0;
    var capturedAmount = 0;
    var capture = {};

    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;

        if (statuses.REJECTED.paymentStatus.indexOf(transactionOperations.hiPayTransactionResponse.transaction.status) === -1) {
            capturableAmount = transactionOperations.hiPayTransactionResponse.transaction.order.amount - capturedAmount;
        }

        if (transactionOperations.hiPayTransactionResponse.transaction.capturedAmount > 0) {
            capture = {
                id: transactionOperations.hiPayTransactionResponse.transaction.transactionReference,
                amount: transactionOperations.hiPayTransactionResponse.transaction.capturedAmount,
                currency: transactionOperations.hiPayTransactionResponse.transaction.currency,
                status: statuses.CAPTURED.value,
                stateCode: statuses.CAPTURED.code
            };
        }
    }

    if (capturableAmount < 0) {
        capturableAmount = 0;
    }

    return ISML.renderTemplate('order/listPaymentCaptures', {
        paymentCaptures: capture,
        capturableAmount: capturableAmount,
        capturedAmount: capturedAmount,
        order: order
    });
}

function ListPaymentRefunds() {
    var orderNo = request.httpParameterMap.orderNo.value;
    var order = OrderMgr.getOrder(orderNo);
    var hipayPaymentId = request.httpParameterMap.hipayPaymentId.value;

    var transactionOperations = getTransactions(hipayPaymentId);

    var refundedAmount = 0;
    var refundableAmount = 0;
    var capturedAmount = 0;
    var refunds = {};
    var status = '';
    var stateCode = '';

    if (!empty(transactionOperations.hiPayTransactionResponse.transaction)) {
        capturedAmount = transactionOperations.hiPayTransactionResponse.transaction.capturedAmount;
        refundedAmount = transactionOperations.hiPayTransactionResponse.transaction.refundedAmount;
        refundableAmount = parseFloat(capturedAmount - refundedAmount);

        if (parseFloat(refundedAmount) > 0) {
            if (refundableAmount > 0) {
                status = statuses.PARTIALLY_REFUNDED.value;
                stateCode = statuses.PARTIALLY_REFUNDED.code;
            } else {
                status = statuses.REFUNDED.value;
                stateCode = statuses.REFUNDED.code;
            }
            refunds = {
                id: transactionOperations.hiPayTransactionResponse.transaction.transactionReference,
                amount: refundedAmount,
                currency: transactionOperations.hiPayTransactionResponse.transaction.currency,
                status: status,
                stateCode: stateCode
            };
        }
    }

    if (refundableAmount < 0) {
        refundableAmount = 0;
    }

    return ISML.renderTemplate('order/listPaymentRefunds', {
        paymentRefunds: refunds,
        refundableAmount: refundableAmount,
        order: order
    });
}

exports.Orders = orders;
exports.Orders.public = true;

exports.PaymentDialog = PaymentDialog;
exports.PaymentDialog.public = true;

exports.CapturePayment = CapturePayment;
exports.CapturePayment.public = true;

exports.CancelPayment = CancelPayment;
exports.CancelPayment.public = true;

exports.RefundPayment = RefundPayment;
exports.RefundPayment.public = true;

exports.RefreshPaymentDetails = RefreshPaymentDetails;
exports.RefreshPaymentDetails.public = true;

exports.ListPaymentCaptures = ListPaymentCaptures;
exports.ListPaymentCaptures.public = true;

exports.ListPaymentRefunds = ListPaymentRefunds;
exports.ListPaymentRefunds.public = true;
