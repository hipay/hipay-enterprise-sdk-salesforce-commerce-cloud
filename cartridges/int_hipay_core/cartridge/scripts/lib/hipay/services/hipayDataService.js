/**
 * Initiates HiPay Token Generation request.
 */
function HiPayDataService() {};

HiPayDataService.prototype.dataService = function (params, hipayResponse, dateRequest, dateResponse) {
    var hipaytokenize = JSON.parse(session.forms.billing.hipaytokenize.value);
    var hipayServices = require('*/cartridge/scripts/init/hiPayServiceInit');
    // Init service
    var service = hipayServices.apiData();
    // Call API
    var response = service.call(payload(params, hipayResponse, hipaytokenize, dateRequest, dateResponse));

    return response;
};

 /**
 * Generats the SHA256 encrypted String starting from the given String
 * @param {string} unicode - the string to be encrypted SHA256
 * @return {string} SHA256 encrypted string
 */
function getDataId(deviceFingerprint, domain) {
    /* eslint-disable new-cap */
    var encriptorSha256 = require('dw/crypto').MessageDigest(require('dw/crypto').MessageDigest.DIGEST_SHA_256);

    if (deviceFingerprint) {
        return encriptorSha256.digest(deviceFingerprint + (domain ? ':' + domain : ''));
    } else {
        return encriptorSha256.digest(domain);
    }
};

function payload(params, hipayResponse, hipaytokenize, dateRequest, dateResponse) {
    var Site = require('dw/system/Site');
    var cmsComponent = JSON.parse(params.source);
    var deviceFingerprint = hipaytokenize && hipaytokenize.device_fingerpint ?
    hipaytokenize.device_fingerpint : session.forms.billing.deviceFingerprint.value;

    return {
        id: getDataId(deviceFingerprint, request.getHttpHost()),
        event: 'initSFCCPayment',
        amount: params.amount,
        currency: params.currency,
        order_id: params.orderid,
        transaction_id: Number(hipayResponse.transactionReference),
        status: hipayResponse.status,
        eci: hipayResponse.eci,
        mid: hipayResponse.mid,
        payment_method: params.payment_product,
        customer: {
            email: params.email,
            cid: params.cid,
            paddr: params.ipaddr
        },
        merchant_display_name: Site.current.getName(),
        monitoring: {
            date_request: dateRequest,
            date_response: dateResponse
        },
        domain: request.getHttpHost(),
        components: {
            cms: cmsComponent.brand ? cmsComponent.brand : 'sdk_sfcc',
            cms_version: cmsComponent.brand_version ? cmsComponent.brand_version : '',
            cms_module_version: cmsComponent.integration_version ? cmsComponent.integration_version : '',
            sdk_server: 'nodejs',
            // sdk_server_engine_version: TODO
        }
    }
};

 module.exports = HiPayDataService;