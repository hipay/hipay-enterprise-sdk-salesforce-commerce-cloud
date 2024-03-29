'use strict';

var ajax = require('../../ajax'),
    formPrepare = require('./formPrepare'),
    giftcard = require('../../giftcard'),
    util = require('../../util');

/**
 * Get preferences.
 * @returns
 */
function getPreferences() {
    return JSON.parse($('input[name="hipayPreferences"]').val());
}

/**
 * @function
 * @description Fills the Credit Card form with the passed data-parameter and clears the former cvn input
 * @param {Object} data The Credit Card data (holder, type, masked number, expiration month/year)
 */
function setCCFields(data) {
    /* HiPay custom code - start */
    if (getPreferences().hipayEnabled) {
        var $creditCard = $('[data-method="HIPAY_CREDIT_CARD"]');
        $creditCard.find('input[name*="uuid"]').val(data.uuid).trigger('change');
    } else {
        var $creditCard = $('[data-method="CREDIT_CARD"]');
        /* HiPay custom code - end */
        $creditCard.find('input[name$="creditCard_owner"]').val(data.holder).trigger('change');
        $creditCard.find('select[name$="_type"]').val(data.type).trigger('change');
        $creditCard.find('input[name*="_creditCard_number"]').val(data.maskedNumber).trigger('change');
        $creditCard.find('[name$="_month"]').val(data.expirationMonth).trigger('change');
        $creditCard.find('[name$="_year"]').val(data.expirationYear).trigger('change');
        $creditCard.find('input[name$="_cvn"]').val('').trigger('change');
    }

}

/* HiPay custom code – start */
/**
 * @function
 * @description Clears the Credit Card form and show fields
 */
function clearCCFields() {
    var $creditCard = $('[data-method="HIPAY_CREDIT_CARD"]');
    $creditCard.find('input[name$="creditCard_owner"]').val('').trigger('change');
    $creditCard.find('input[name$="creditCard_uuid"]').val('').trigger('change');
    $creditCard.find('select[name$="_type"]').val('').trigger('change');
    $creditCard.find('input[name*="_creditCard_number"]').val('').trigger('change');
    $creditCard.find('[name$="_month"]').val('').trigger('change');
    $creditCard.find('[name$="_year"]').val('').trigger('change');
    $creditCard.find('input[name$="_cvn"]').val('').trigger('change');
}
/* HiPay custom code - end */

/**
 * @function
 * @description Updates the credit card form with the attributes of a given card
 * @param {String} cardID the credit card ID of a given card
 */
function populateCreditCardForm(cardID) {
    // load card details
    var url = util.appendParamToURL(Urls.billingSelectCC, 'creditCardUUID', cardID);
    ajax.getJson({
        url: url,
        callback: function (data) {
            if (!data) {
                window.alert(Resources.CC_LOAD_ERROR);
                return false;
            }
            setCCFields(data);

            /* HiPay custom code – start */
            if (getPreferences().hipayEnabled && getPreferences().hipayEnableOneClick) {
                $('[data-method="HIPAY_CREDIT_CARD"]').find('.ccfields-wrap').hide();
                formPrepare.validateForm();
            }
            /* HiPay custom code - end */
        }
    });
}

/**
 * @function
 * @description Changes the payment method form depending on the passed paymentMethodID
 * @param {String} paymentMethodID the ID of the payment method, to which the payment method form should be changed to
 */
function updatePaymentMethod(paymentMethodID) {
    var $paymentMethods = $('.payment-method');
    $paymentMethods.removeClass('payment-method-expanded');

    var $selectedPaymentMethod = $paymentMethods.filter('[data-method="' + paymentMethodID + '"]');
    if ($selectedPaymentMethod.length === 0) {
        $selectedPaymentMethod = $('[data-method="Custom"]');
    }
    $selectedPaymentMethod.addClass('payment-method-expanded');

    // ensure checkbox of payment method is checked
    $('input[name$="_selectedPaymentMethodID"]').removeAttr('checked');
    $('input[value=' + paymentMethodID + ']').prop('checked', 'checked');

    formPrepare.validateForm();
}

/**
 * @function
 * @description loads billing address, Gift Certificates, Coupon and Payment methods
 */
exports.init = function () {
    var $checkoutForm = $('.checkout-billing');
    var $addGiftCert = $('#add-giftcert');
    var $giftCertCode = $('input[name$="_giftCertCode"]');
    var $addCoupon = $('#add-coupon');
    var $couponCode = $('input[name$="_couponCode"]');
    var $selectPaymentMethod = $('.payment-method-options');
    var selectedPaymentMethod = $selectPaymentMethod.find(':checked').val();

    formPrepare.init({
        formSelector: 'form[id$="billing"]',
        continueSelector: '[name$="billing_save"]'
    });

    /* HiPay custom code - start */
    if (getPreferences().hipayEnabled) {
        // select payment method if available
        if (selectedPaymentMethod){
            updatePaymentMethod(selectedPaymentMethod);
        }
        $selectPaymentMethod.on('click', 'input[type="radio"]', function () {
            $(this).prop('checked', true);
            updatePaymentMethod($(this).val());
        });
    } else {
        // default payment method to 'CREDIT_CARD'
        updatePaymentMethod((selectedPaymentMethod) ? selectedPaymentMethod : 'CREDIT_CARD');
        $selectPaymentMethod.on('click', 'input[type="radio"]', function () {
            updatePaymentMethod($(this).val());
        });
    }
    /* HiPay custom code - end */

    // select credit card from list
    $('#creditCardList').on('change', function () {
        var cardUUID = $(this).val();
        /* HiPay custom code - start */
        if (!cardUUID) {
            if (getPreferences().hipayEnabled && getPreferences().hipayEnableOneClick) {
                clearCCFields();
                var $creditCard = $('[data-method="HIPAY_CREDIT_CARD"]');
                $creditCard.find('.ccfields-wrap').show();
                formPrepare.validateForm();
            }
            return;
        }
        /* HiPay custom code - end */
        populateCreditCardForm(cardUUID);

        // remove server side error
        $('.required.error').removeClass('error');
        $('.error-message').remove();
    });

    /* HiPay custom code - start */
    if (getPreferences().hipayEnabled) {
        var $creditCard = $('[data-method="HIPAY_CREDIT_CARD"]');
    	//on init, set limit for a selected card. After change limits accordingly
        var initCard = $creditCard.find('select[name$="_type"]').find(":selected").text();
        if (initCard == "Amex") {
            $creditCard.find('input[name$="_cvn"]').attr({maxLength : 4});
        } else {
            $creditCard.find('input[name$="_cvn"]').attr({maxLength : 3});
        }

        $creditCard.find('select[name$="_type"]').on('change', function () {

           var cvv = $creditCard.find('.cvn-wrap');
           var hiPaySaveOptions = $('*[data-hipay-cardtype="'+$(this).val()+'"]');
           var selectedCard = $(this).val();

           //CVC digits min and max
           if (selectedCard == "Maestro" || selectedCard == "Master Card" || selectedCard == "Visa" || selectedCard == "CarteBancaire") {
               $creditCard.find('input[name$="_cvn"]').attr({maxLength : 3});
           } else if (selectedCard == "Amex") {
               $creditCard.find('input[name$="_cvn"]').attr({maxLength : 4});
           }

           //hide cvv for Mister Cash
           if (selectedCard == "BancontactMisterCash") {
              cvv.hide();
              $creditCard.find('input[name$="_cvn"]').val('000').trigger('change');
           } else {
              $creditCard.find('input[name$="_cvn"]').val('').trigger('change');
              cvv.show();
           }

           if (hiPaySaveOptions.attr('data-hipay-cvv-disabled') == 'true') {
               $creditCard.find('input[name$="_cvn"]').removeClass('required');
               $creditCard.find('input[name$="_cvn"]').val(' ');
               $creditCard.find('div.cvn').removeClass('required');
               $creditCard.find('div.cvn').find('span.required-indicator').hide();

               if (selectedCard == 'Maestro') {
            	   $creditCard.find('input[name$="_cvn"]').addClass('optional');
            	   $creditCard.find('div.cvn').addClass('optional');
               } else {
            	   $creditCard.find('input[name$="_cvn"]').removeClass('optional');
            	   $creditCard.find('div.cvn').removeClass('optional');
               }

           } else {
        	   $creditCard.find('input[name$="_cvn"]').addClass('required');
        	   $creditCard.find('div.cvn').addClass('required');
        	   $creditCard.find('span.required-indicator').show();

        	   if (selectedCard != 'Maestro') {
        		   $creditCard.find('input[name$="_cvn"]').removeClass('optional');
            	   $creditCard.find('div.cvn').removeClass('optional');
        	   }
           }

           if (selectedCard == "Amex") {
              $(".owner-single").addClass("hide");
              $(".owner-split").removeClass("hide");
           } else {
              $(".owner-split").addClass("hide");
    	      $(".owner-single").removeClass("hide");
    	   }

           //hide 'Save Card' based on custom.hipayOneClickDisabled
           var saveCard = $creditCard.find('.save-card');
           var saveCardBox = saveCard.find('input[name$="_saveCard"]');
           if (hiPaySaveOptions.attr('data-hipay-oneclick-disabled') == 'true') {
        	   saveCardBox.prop('checked', false);
        	   saveCard.hide();
           } else {
        	   saveCardBox.prop('checked', true);
        	   saveCard.show();
           }
        });
   	}
    /* HiPay custom code - end */

    $('#check-giftcert').on('click', function (e) {
        e.preventDefault();
        var $balance = $('.balance');
        if ($giftCertCode.length === 0 || $giftCertCode.val().length === 0) {
            var error = $balance.find('span.error');
            if (error.length === 0) {
                error = $('<span>').addClass('error').appendTo($balance);
            }
            error.html(Resources.GIFT_CERT_MISSING);
            return;
        }

        giftcard.checkBalance($giftCertCode.val(), function (data) {
            if (!data || !data.giftCertificate) {
                $balance.html(Resources.GIFT_CERT_INVALID).removeClass('success').addClass('error');
                return;
            }
            $balance.html(Resources.GIFT_CERT_BALANCE + ' ' + data.giftCertificate.balance).removeClass('error').addClass('success');
        });
    });

    $addGiftCert.on('click', function (e) {
        e.preventDefault();
        var code = $giftCertCode.val(),
            $error = $checkoutForm.find('.giftcert-error');
        if (code.length === 0) {
            $error.html(Resources.GIFT_CERT_MISSING);
            return;
        }

        var url = util.appendParamsToUrl(Urls.redeemGiftCert, {giftCertCode: code, format: 'ajax'});
        $.getJSON(url, function (data) {
            var fail = false;
            var msg = '';
            if (!data) {
                msg = Resources.BAD_RESPONSE;
                fail = true;
            } else if (!data.success) {
                msg = data.message.split('<').join('&lt;').split('>').join('&gt;');
                fail = true;
            }
            if (fail) {
                $error.html(msg);
                return;
            } else {
                window.location.assign(Urls.billing);
            }
        });
    });

    $addCoupon.on('click', function (e) {
        e.preventDefault();
        var $error = $checkoutForm.find('.coupon-error'),
            code = $couponCode.val();
        if (code.length === 0) {
            $error.html(Resources.COUPON_CODE_MISSING);
            return;
        }

        var url = util.appendParamsToUrl(Urls.addCoupon, {couponCode: code, format: 'ajax'});
        $.getJSON(url, function (data) {
            var fail = false;
            var msg = '';
            if (!data) {
                msg = Resources.BAD_RESPONSE;
                fail = true;
            } else if (!data.success) {
                msg = data.message.split('<').join('&lt;').split('>').join('&gt;');
                fail = true;
            }
            if (fail) {
                $error.html(msg);
                return;
            }

            //basket check for displaying the payment section, if the adjusted total of the basket is 0 after applying the coupon
            //this will force a page refresh to display the coupon message based on a parameter message
            if (data.success && data.baskettotal === 0) {
                window.location.assign(Urls.billing);
            }
        });
    });

    // trigger events on enter
    $couponCode.on('keydown', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $addCoupon.click();
        }
    });
    $giftCertCode.on('keydown', function (e) {
        if (e.which === 13) {
            e.preventDefault();
            $addGiftCert.click();
        }
    });
};
