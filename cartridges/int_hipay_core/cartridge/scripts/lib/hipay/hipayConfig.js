'use strict';

var Site = require('dw/system/Site');
var URLUtils = require('dw/web/URLUtils');
var HiPayLogger = require('*/cartridge/scripts/lib/hipay/hipayLogger');

/**
 * HiPayConfig object contains all configuration data,
 * which are necessary to call the HiPay service.
 * This data is retrieved from custom site preferences.
 *
 * To include this script use:
 * var config = require('~/cartridge/scripts/lib/hipay/hipayConfig.ds').HiPayConfig;
 */
function HiPayConfig() {
    this.hiPayLogger = new HiPayLogger('HiPayConfig.js');

    this.OPERATION = {
        HOSTED: 'hosted',
        IFRAME: 'iframe',
        HOSTED_FIELDS: 'hostedFields'
    };

    this.THREEDSECURE_AUTH = {
        BYPASS: 0,
        IFAVAILABLE: 1,
        MANDATORY: 2
    };

    this.HOSTED_SCRIPT = 'basic-js';
    this.IFRAME_SCRIPT = 'iframe-js';

    this.acceptURL = URLUtils.https('HiPayOrder-Accept').toString();
    this.pendingURL = URLUtils.https('HiPayOrder-Pending').toString();
    this.declineURL = URLUtils.https('HiPayOrder-Decline').toString();
    this.cancelURL = URLUtils.https('HiPayOrder-Cancel').toString();
    this.errorURL = URLUtils.https('HiPayOrder-Error').toString();
    this.notifyURL = URLUtils.https('HiPayNotification-Notify').toString();

    this.hipayOperationMode = this.getSitePeference('hipayOperationMode').value;
    this.hipayEnvironment = this.getSitePeference('hipayEnvironment').value;
    this.hipayEnable3dSecure = this.getSitePeference('hipayEnable3dSecure').value;
    this.hipayEnable3dSecureThresholdRule = this.getSitePeference('hipayEnable3dSecureThresholdRule').value;
    this.hipayApiPassphrase = this.getSitePeference('hipayApiPassphrase');
    this.hipayPaymentAction = this.getSitePeference('hipayPaymentAction').value;
    this.hipayIframeHeight = this.getSitePeference('hipayIframeHeight');
    this.hipayIframeWidth = this.getSitePeference('hipayIframeWidth');
    this.hipayPublicLiveUsername = this.getSitePeference('hipayPublicLiveUsername');
    this.hipayPublicLivePassword = this.getSitePeference('hipayPublicLivePassword');
    this.hipayPublicTestUsername = this.getSitePeference('hipayPublicTestUsername');
    this.hipayPublicTestPassword = this.getSitePeference('hipayPublicTestPassword');
    this.hipayPrivateLiveUsername = this.getSitePeference('hipayPrivateLiveUsername');
    this.hipayPrivateLivePassword = this.getSitePeference('hipayPrivateLivePassword');
    this.hipayPrivateTestUsername = this.getSitePeference('hipayPrivateTestUsername');
    this.hipayPrivateTestPassword = this.getSitePeference('hipayPrivateTestPassword');

    this.getTemplateType = function () {
        switch (this.hipayOperationMode) {
            case this.OPERATION.HOSTED:
                return this.HOSTED_SCRIPT;
            case this.OPERATION.IFRAME:
                return this.IFRAME_SCRIPT;
            default:
                return '';
        }
    };

    this.isIframeEnabled = function () {
        return this.hipayOperationMode === this.OPERATION.IFRAME;
    };
}

/**
 * Load custom site preference.
 */
HiPayConfig.prototype.getSitePeference = function (preference) {
    var result = null;
    result = Site.getCurrent().getCustomPreferenceValue(preference);
    if (empty(result)) {
        result = '';
        this.hiPayLogger.debug('HiPay Site specific custom preference ' + preference + ' is missing.');
    }
    return result;
};

Object.freeze(HiPayConfig);
module.exports.HiPayConfig = new HiPayConfig();
