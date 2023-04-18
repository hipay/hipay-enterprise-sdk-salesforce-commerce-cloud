'use strict';

/**
* Auxiliary functions of the HiPay integration cartridge
*
* @module cartridge/scripts/lib/hipay/hipayMaintenanceModule
*/

var HiPayMaintenanceModule = function () {};

/**
 * Initiates HiPay maintenance call as builds all the request parameters.
 *
 * @param {Object} amount
 * @param {dw.order.Order} order
 *
 * @returns {Object}  response
 *          {Boolean} response.error
 *          {String}  response.hiPayMaintenanceResponse
 */

HiPayMaintenanceModule.hiPayMaintenanceRequest = function (order, amount, operation) {
    var Transaction = require('dw/system/Transaction');
    var Decimal = require('dw/util/Decimal');
    return Transaction.wrap(function () {
        var HiPayMaintenanceService = require('*/cartridge/scripts/lib/hipay/services/hipayMaintenanceService');
        var HiPayLogger = require('~/cartridge/scripts/lib/hipay/hipayLogger');
        var HiPayHelper = require('int_hipay_sfra/cartridge/scripts/lib/hipay/hipayHelper');
        var log = new HiPayLogger('HiPayMaintenanceRequest');
        var amountToRegister = amount;
        var regEx = /^[+]?([.]\d+|\d+[.]?\d*)$/; // Validate for positive number
        var response = {
            hiPayMaintenanceResponse: null,
            error: true
        };
        var errorMsg = '';

        if (empty(operation)) {
            operation = HiPayMaintenanceService.OPERATION_CAPTURE;
        }

        if (!amountToRegister.match(regEx)) {
            log.error('Calling HiPayMaintenance ' + operation + ' ::: Wrong ' + operation + ' amount value!');
            response.error = true;
            response.errorMessage = 'Wrong ' + operation + ' amount value!';
            return response;
        }

        var paymentInstr = HiPayHelper.getOrderPaymentInstrument(order);
        var transactionReference = paymentInstr.getPaymentTransaction().getTransactionID();
        var requestAmount = 0;
        var orderTotal = 0;
        if ('hipayTransactionCaptureRequestAmount' in paymentInstr.custom) {
            requestAmount = paymentInstr.custom.hipayTransactionCaptureRequestAmount;
        }

        if (order.totalGrossPrice.available) {
            orderTotal = order.totalGrossPrice.decimalValue;
        } else {
            orderTotal = order.getAdjustedMerchandizeTotalPrice(true).add(order.giftCertificateTotalPrice).decimalValue;
        }

        try {
            log.debug('Calling HiPayMaintenance ' + operation + ' ::: ' + transactionReference);

            if (empty(transactionReference)) {
                log.error('HiPay maintenance service ::: Missing transaction Reference');
                response.error = true;
                response.errorMessage = 'Missing transaction Reference';
                return response;
            }

            var serviceAmount = amountToRegister;

            if (amountToRegister === orderTotal && operation !== HiPayMaintenanceService.OPERATION_CANCEL) {
                serviceAmount = '';
            }

            var hipayResponse = HiPayMaintenanceService.initiateCapture(transactionReference, operation, serviceAmount);
            var msg = null;

            if (hipayResponse.ok === true) {
                msg = JSON.parse(hipayResponse.object.text);

                if (operation === HiPayMaintenanceService.OPERATION_CAPTURE) {
                    paymentInstr.custom.hipayTransactionCaptureRequestAmount = +requestAmount + +amountToRegister; // update capture amount
                }

                log.debug('HiPay Hosted Page Response ::: ' + JSON.stringify(msg, undefined, 2));
            } else {
                log.error(hipayResponse.msg);
                response.error = true;
                response.errorMessage = hipayResponse.msg;

                return response;
            }

            response.hiPayMaintenanceResponse = JSON.stringify(msg, undefined, 2);
        } catch (e) {
            log.error(e);
            response.error = true;
            response.errorMessage = e;
            return response;
        }

        response.error = false;

        return response;
    });
};

module.exports = HiPayMaintenanceModule;
