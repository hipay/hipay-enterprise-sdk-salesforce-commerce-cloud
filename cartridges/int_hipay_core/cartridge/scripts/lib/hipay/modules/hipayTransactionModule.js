'use strict';

/**
* Auxiliary functions of the HiPay integration cartridge
*
* @module cartridge/scripts/lib/hipay/HiPayTransactionModule
*/

var HiPayTransactionModule = function () {};

/**
 * Initiates HiPay transaction call as builds all the request parameters.
 *
 * @param {Object} transactionId
 *
 * @returns {Object}  response
 *          {Boolean} response.error
 *          {String}  response.hiPayTransactionResponse
 */

HiPayTransactionModule.hiPayTransactionRequest = function (transactionId) {
    var Transaction = require('dw/system/Transaction');
    var Decimal = require('dw/util/Decimal');
    return Transaction.wrap(function () {
        var HipayTransactionService = require('~/cartridge/scripts/lib/hipay/services/hipayTransactionService');
        var HiPayLogger = require('~/cartridge/scripts/lib/hipay/hipayLogger');
        var log = new HiPayLogger('HiPayTransactionRequest');
        var hipayTransactionService = new HipayTransactionService();
        var HiPayHelper = require('int_hipay_sfra/cartridge/scripts/lib/hipay/hipayHelper');
        var helper = new HiPayHelper();
        var response = {
            hiPayTransactionResponse: null,
            error: true
        };

        try {
            log.debug('Calling HiPayTransaction Request ::: ' + transactionId);

            if (empty(transactionId)) {
                log.error('HiPay transaction service ::: Missing transaction Reference');
                response.error = true;

                return response;
            }

            var hipayResponse = hipayTransactionService.initiateTransaction(transactionId);
            var msg = null;

            if (hipayResponse.ok === true) {
                msg = hipayResponse.object.text;
                log.debug('HiPay Hosted Page Response ::: ' + JSON.stringify(msg, undefined, 2));
            } else {
                log.error(hipayResponse.msg);
                response.error = true;

                return response;
            }

            response.hiPayTransactionResponse = JSON.parse(msg);
        } catch (e) {
            log.error(e);
            response.error = true;

            return response;
        }

        response.error = false;

        return response;
    });
};


module.exports = HiPayTransactionModule;
