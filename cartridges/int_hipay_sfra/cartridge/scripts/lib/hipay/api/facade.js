'use strict';

const Logger = require('dw/system/Logger');
const StringUtils = require('dw/util/StringUtils');

const hipayServiceHelper = require('int_hipay_sfra/cartridge/scripts/lib/hipay/api/serviceHelper');

const hipayService = hipayServiceHelper.getService();
const hipayServiceCacheTTL = 0;
const logger = Logger.getRootLogger();

let testConnection = function () {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/services/testconnection';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return { success: true };
    }

    return { success: false, errorMessage: serviceResponse.errorMessage };
};

let getPaymentProducts = function (args) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/products';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, [], args);

    hipayService.setCachingTTL(hipayServiceCacheTTL);

    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return { success: true, paymentProducts: serviceResponse.object.paymentProducts };
    }

    logger.error('Error retrieving payment products. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let getPaymentProduct = function (paymentProductId, args) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/products/' + paymentProductId;

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, [], args);

    hipayService.setCachingTTL(hipayServiceCacheTTL);

    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return { success: true, paymentProduct: serviceResponse.object };
    }

    logger.error('Error retrieving payment products. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let getPaymentProductDirectory = function (paymentProductId, args) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/products/' + paymentProductId + '/directory';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, [], args);

    hipayService.setCachingTTL(hipayServiceCacheTTL);

    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return { success: true, entries: serviceResponse.object.entries };
    }
    logger.error('Error retrieving payment products. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let createHostedTokenizationSession = function (args) {
    const method = 'POST';
    const path = '/v2/{{merchantId}}/hostedtokenizations';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    requestObj.body = args.requestBody;
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return {
            success: true,
            redirectUrl: hipayServiceHelper.prefixResponseUrl(serviceResponse.object.partialRedirectUrl),
            hostedTokenizationId: serviceResponse.object.hostedTokenizationId
        };
    }
    logger.error('Error creating hosted tokenization session. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let getHostedTokenizationSession = function (hostedTokenizationSessionId) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/hostedtokenizations/' + hostedTokenizationSessionId;

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return {
            success: true,
            token: serviceResponse.object.token,
            status: serviceResponse.object.tokenStatus
        };
    }
    logger.error('Error retrieving hosted checkout status. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let createHostedCheckout = function (args) {
    const method = 'POST';
    const path = '/v2/{{merchantId}}/hostedcheckouts';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    requestObj.body = args.requestBody;
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return {
            success: true,
            redirectUrl: hipayServiceHelper.prefixResponseUrl(serviceResponse.object.partialRedirectUrl),
            hostedCheckoutId: serviceResponse.object.hostedCheckoutId,
            orderId: serviceResponse.object.merchantReference
        };
    }
    logger.error('Error creating hosted tokenization session ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let getHostedCheckout = function (hostedCheckoutId) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/hostedcheckouts/' + hostedCheckoutId;

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }

    logger.error('Error retrieving hosted tokenization session. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let createPayment = function (args) {
    const method = 'POST';
    const path = '/v2/{{merchantId}}/payments';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    requestObj.body = args.requestBody;

    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }

    logger.error('Error creating payment ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let getPayment = function (paymentId) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/payments/' + paymentId;

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }

    logger.error('Error retrieving payment. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

let getPaymentCaptures = function (paymentId) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/payments/' + paymentId + '/captures';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }
    logger.error(StringUtils.format('Error in getPaymentCaptures(id: {0}): {1}', paymentId, serviceResponse.errorMessage));
    return { success: false, errorMessage: serviceResponse.errorMessage };
};

let getPaymentRefunds = function (paymentId) {
    const method = 'GET';
    const path = '/v2/{{merchantId}}/payments/' + paymentId + '/refunds';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }

    logger.error(StringUtils.format('Error in getPaymentRefunds(id: {0}): {1}', paymentId, serviceResponse.errorMessage));
    return { success: false, errorMessage: serviceResponse.errorMessage };
};

let capturePayment = function (paymentId, amount, isFinal) {
    const method = 'POST';
    const path = '/v2/{{merchantId}}/payments/' + paymentId + '/capture';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    requestObj.body.amount = amount;
    requestObj.body.isFinal = isFinal;

    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }

    logger.error('Error in capturePayment(): ' + serviceResponse.errorMessage);
    return { success: false, errorMessage: serviceResponse.errorMessage };
};

let cancelPayment = function (paymentId) {
    const method = 'POST';
    const path = '/v2/{{merchantId}}/payments/' + paymentId + '/cancel';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }
    logger.error('Error in cancelPayment(): ' + serviceResponse.errorMessage);
    return { success: false, errorMessage: serviceResponse.errorMessage };
};

let refundPayment = function (paymentId, amount, currencyCode) {
    const method = 'POST';
    const path = '/v2/{{merchantId}}/payments/' + paymentId + '/refund';

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    requestObj.body.amountOfMoney = {
        amount: amount,
        currencyCode: currencyCode
    };

    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        let responseObj = serviceResponse.object;
        responseObj.success = true;

        return responseObj;
    }
    logger.error('Error in refundPayment(): ' + serviceResponse.errorMessage);
    return { success: false, errorMessage: serviceResponse.errorMessage };
};

let deleteToken = function (tokenId) {
    const method = 'DELETE';
    const path = '/v2/{{merchantId}}/tokens/' + tokenId;

    let requestObj = hipayServiceHelper.prepareRequestObject(method, path, []);
    let serviceResponse = hipayService.call(requestObj);

    if (serviceResponse.status == 'OK') {
        return { error: false };
    }

    logger.error('Error deleting token. ' + serviceResponse.errorMessage);
    return { error: true, errorMessage: serviceResponse.errorMessage };
};

module.exports = {
    testConnection: testConnection,
    getPaymentProducts: getPaymentProducts,
    getPaymentProduct: getPaymentProduct,
    getPaymentProductDirectory: getPaymentProductDirectory,
    createHostedTokenizationSession: createHostedTokenizationSession,
    getHostedTokenizationSession: getHostedTokenizationSession,
    createHostedCheckout: createHostedCheckout,
    getHostedCheckout: getHostedCheckout,
    createPayment: createPayment,
    getPayment: getPayment,
    getPaymentCaptures: getPaymentCaptures,
    getPaymentRefunds: getPaymentRefunds,
    capturePayment: capturePayment,
    cancelPayment: cancelPayment,
    refundPayment: refundPayment,
    deleteToken: deleteToken
};
