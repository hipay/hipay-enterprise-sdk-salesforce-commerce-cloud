'use strict';

(function () {
    const MODE_OPERATION = 'hostedFields';

    var $cache = {
        paymentMethod: {
            creditCard: 'CREDIT_CARD',
            hipayCreditCard: 'HIPAY_CREDIT_CARD',
            iDeal: 'HIPAY_IDEAL',
            giropay: 'HIPAY_GIROPAY',
            mbway: 'HIPAY_MBWAY'
        },
        instance: null,
        preferences: JSON.parse($('input[name="hipayPreferences"]').val())
    };

    var hipay = HiPay($cache.preferences.globalVariable);

    var browserInfo = hipay.getBrowserInfo();
    $("#browserInfo").val(JSON.stringify(browserInfo));

    /**
     * Set full name to credit card form.
     */
    function setFullnameToCreditCardForm() {
        var firstname = $('input[id="dwfrm_billing_billingAddress_addressFields_firstName"]').val();
        var lastname = $('input[id="dwfrm_billing_billingAddress_addressFields_lastName"]').val();
        console.log(firstname, lastname);
        if (firstname && lastname) {
            $cache.preferences.cardConfig.config.fields.cardHolder.uppercase = true;
            $cache.preferences.cardConfig.config.fields.cardHolder.defaultFirstname = firstname;
            $cache.preferences.cardConfig.config.fields.cardHolder.defaultLastname = lastname;
        }

    }

    /**
     * Remove all hosted fields form.
     */
    function removeAllHostedfieldsForms() {
        $('#hipay-hostedfields-form').empty();
        $('#hipay-hostedfields-form-giropay').empty();
        $('#hipay-hostedfields-form-mbway').empty();
        $('#hipay-hostedfields-form-ideal').empty();
    }

    /**
     * Create instance.
     * @param {string} type
     */
    function createInstance(type) {
        removeAllHostedfieldsForms();
        enabledHipayCTA();

        if (type === 'card') {
            setFullnameToCreditCardForm();
        }

        $cache.instance = hipay.create(type, $cache.preferences[type + 'Config'].config);

        $cache.instance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=hipay-submit-payment]').disabled = !event.valid;

            $('.submit-payment-hipay').toggleClass('disabled', !event.valid);
        });
    }

    /**
     * Enabled Hipay CTA.
     */
    function enabledHipayCTA() {
        $('.button-fancy-large').addClass('d-none');
        $('.hipay-submit-payment').removeClass('d-none');
    }

    /**
     * Disabled Hipay CTA.
     */
    function disabledHipayCTA() {
        $('.button-fancy-large').removeClass('d-none');
        $('.hipay-submit-payment').addClass('d-none');

    }

    function initialize() {
        if (!$cache.preferences.hipayEnabled ||
            $cache.preferences.hipayOperationMode !== MODE_OPERATION) {
            return;
        }

        createInstance('card');

        // Create hipayCTA custom.
        $('.button-fancy-large').addClass('d-none');
        var hipayCTA = $('<div>').addClass('button-fancy-large hipay-submit-payment').text($('.button-fancy-large').val());
        $('.button-fancy-large').after(hipayCTA);

        /**
         * Fetch payment method ID and call createInstance function.
         */
        $('.payment-method-options .form-row.label-inline').click(function () {
            removeAllHostedfieldsForms();

            var paymentMethodID = $("input[name='dwfrm_billing_paymentMethods_selectedPaymentMethodID']:checked").val();

            if (paymentMethodID === $cache.paymentMethod.hipayCreditCard) {
                createInstance('card');
            } else if (paymentMethodID === $cache.paymentMethod.giropay) {
                createInstance('giropay');
            } else if (paymentMethodID === $cache.paymentMethod.mbway) {
                createInstance('mbway');
            } else if (paymentMethodID === $cache.paymentMethod.iDeal) {
                createInstance('ideal');
            } else {
                disabledHipayCTA();
            }

        });

        // select credit card from list
        $('#creditCardList').on('change', function () {
            var cardUUID = $(this).val();

            if (!cardUUID) {
                $('#hipay-hostedfields-form').removeClass('d-none');
                $('.credit-card-cvn').addClass('d-none');
                $('.credit-card-save-card').removeClass('d-none');
                enabledHipayCTA();
            } else {
                $('#hipay-hostedfields-form').addClass('d-none');
                $('.credit-card-cvn').removeClass('d-none');
                $('.credit-card-save-card').addClass('d-none');
                $('input[name$=_saveCard]').prop({checked: false, value: false});
                disabledHipayCTA();
            }
        });

        // Fetch token.
        $('.hipay-submit-payment').on('click', function() {
            $cache.instance.getPaymentData().then(function (response) {
                $('button[name=dwfrm_billing_save]').removeAttr('disabled');

                /* Send token to your server to process payment */
                $('input[name=dwfrm_billing_paymentMethods_hipayTokenize]').val(JSON.stringify(response));
                $('button[name=dwfrm_billing_save]').trigger('click');
            }, function (errors) {
                /* Display first error */
                document.getElementById("hipay-error-message").innerHTML = errors[0].error;
            });
        });
    };

    $('body').ready(function () {
        initialize();
    });

}());
