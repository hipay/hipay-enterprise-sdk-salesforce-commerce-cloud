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
        instance: null
    };

    function getPreferences() {
        return JSON.parse($('input[name="hipayPreferences"]').val());
    }

    var hipay = HiPay(getPreferences().globalVariable);

    var browserInfo = hipay.getBrowserInfo();
    $("#browserInfo").val(JSON.stringify(browserInfo));

    function removeAllHostedfieldsForms() {
        $('#hipay-hostedfields-form').empty();
        $('#hipay-hostedfields-form-giropay').empty();
        $('#hipay-hostedfields-form-mbway').empty();
        $('#hipay-hostedfields-form-ideal').empty();
    }

    function createInstance(type) {
        enabledHipayCTA();
        $cache.instance = hipay.create(type, getPreferences()[type + 'Config'].config);

        $cache.instance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=hipay-submit-payment]').disabled = !event.valid;

            $('.submit-payment-hipay').toggleClass('disabled', !event.valid);
        });
    }

    function enabledHipayCTA() {
        $('.button-fancy-large').addClass('d-none');
        $('.hipay-submit-payment').removeClass('d-none');
    }

    function disabledHipayCTA() {
        $('.button-fancy-large').removeClass('d-none');
        $('.hipay-submit-payment').addClass('d-none');

    }

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
            disabledHipayCTA();
        }
    });

    function initialize() {
        if (!getPreferences().hipayEnabled ||
            getPreferences().hipayOperationMode !== MODE_OPERATION) {
            return;
        }

        createInstance('card');

        // Create custom hipayCTA.
        $('.button-fancy-large').addClass('d-none');
        var hipayCTA = $('<div>').addClass('button-fancy-large hipay-submit-payment').text('VALIDER LA COMMANDE');
        $('.button-fancy-large').after(hipayCTA);

        // Fetch token.
        $('.hipay-submit-payment').on('click', function() {
            $cache.instance.getPaymentData().then(function (response) {
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
