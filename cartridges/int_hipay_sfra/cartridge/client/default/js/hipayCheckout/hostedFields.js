'use strict';

(function () {
    var $cache = {
        body: $('body'),
        document: $(document),
        paymentMethod: {
            creditCard: 'HIPAY_CREDIT_CARD',
            iDeal: 'HIPAY_IDEAL',
            giropay: 'HIPAY_GIROPAY',
            mbway: 'HIPAY_MBWAY'
        },
        stage: {
            payment: 'payment'
        },
        hipayOperationMode: 'api'
    };

    function disabledHipayCTA() {
        $cache.hipayCTA.addClass('d-none');
        $cache.btnSubmitSFRA.removeClass('d-none');
    }

    function enabledHipayCTA() {
        $cache.hipayCTA.removeClass('d-none');
        $cache.btnSubmitSFRA.addClass('d-none');
    }

    function removeAllHostedfieldsForms() {
        $('#hipay-hostedfields-form').empty();
        $('#hipay-hostedfields-form-giropay').empty();
        $('#hipay-hostedfields-form-mbway').empty();
        $('#hipay-hostedfields-form-ideal').empty();
    }

    function getTokenize(instance) {
        $('#hipayCTA').on('click', function () {
            // /* Tokenize your card information when the submit button is clicked */
            instance.getPaymentData().then(
              function(response) {
                $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(response));

                $('button[value="submit-payment"]').trigger('click');
              },
              function(errors) {
                /* Display first error */
                document.getElementById("hipay-error-message").innerHTML = errors[0].error;
              }
            );
        });
    }

    function cardInstance (hipay) {
        var cardInstance = hipay.create('card', window.hipayCustomPreferences.cardConfig.config);
        cardInstance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=submit-payment]').disabled = !event.valid;

            if(!event.valid) {
                $('.submit-payment-hipay').addClass('disabled');
            } else {
                $('.submit-payment-hipay').removeClass('disabled');
            }
        });

        getTokenize(cardInstance);
    };

    function giropayInstance (hipay) {
        var giropayInstance = hipay.create('giropay', window.hipayCustomPreferences.giropayConfig.config);
        giropayInstance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=submit-payment]').disabled = !event.valid;

            if(!event.valid) {
                $('.submit-payment-hipay').addClass('disabled');
            } else {
                $('.submit-payment-hipay').removeClass('disabled');
            }
        });

        getTokenize(giropayInstance);
    };

    function mbwayInstance (hipay) {
        var mbwayInstance = hipay.create('mbway', window.hipayCustomPreferences.mbwayConfig.config);
        mbwayInstance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=submit-payment]').disabled = !event.valid;

            if(!event.valid) {
                $('.submit-payment-hipay').addClass('disabled');
            } else {
                $('.submit-payment-hipay').removeClass('disabled');
            }
        });

        getTokenize(mbwayInstance);
    };

    function idealInstance (hipay) {
        var idealInstance = hipay.create('ideal', window.hipayCustomPreferences.idealConfig.config);
        idealInstance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=submit-payment]').disabled = !event.valid;

            if(!event.valid) {
                $('.submit-payment-hipay').addClass('disabled');
            } else {
                $('.submit-payment-hipay').removeClass('disabled');
            }
        });

        getTokenize(idealInstance);
    };

    function initialize() {
        if (!window.hipayCustomPreferences.hipayEnabled ||
            window.hipayCustomPreferences.hipayOperationMode !== $cache.hipayOperationMode) {
            return;
        }

        var hipay = require('./globalVariable').getGlobalVariable();

        $cache.btnSubmitSFRA = $('.next-step-button .submit-payment');
        $cache.hipayCTA = $('<div/>')
            .addClass('btn btn-primary btn-block submit-payment-hipay disabled d-none')
            .attr('id', 'hipayCTA')
            .html($cache.btnSubmitSFRA.text())
            .appendTo($cache.btnSubmitSFRA.parent());

        if ($('.card.payment-form').is(':visible') && $('.user-payment-instruments.container').hasClass('checkout-hidden')) {
            enabledHipayCTA();
        }

         // Credit card form initialization first.
         cardInstance(hipay);

         // watch checkout-main element.
        var observer = new MutationObserver(function () {
            if ($('#checkout-main').attr("data-checkout-stage") === $cache.stage.payment) {
                enabledHipayCTA();
            } else {
                disabledHipayCTA();
            }

            if (!$('.user-payment-instruments').hasClass('checkout-hidden')) {
                disabledHipayCTA();
            }

        });

        observer.observe(document.getElementById('checkout-main'), {
            attributes: true
        });

        // Displays the form corresponding to the payment method;
        $('.payment-options .nav-item').on('click', function (e) {
            var methodID = $(this).data('method-id');

            if (methodID === $cache.paymentMethod.creditCard) {
                enabledHipayCTA();
                removeAllHostedfieldsForms();
                cardInstance(hipay);
            } else if (methodID === $cache.paymentMethod.giropay) {
                enabledHipayCTA();
                removeAllHostedfieldsForms();
                giropayInstance(hipay);
            } else if (methodID === $cache.paymentMethod.mbway) {
                enabledHipayCTA();
                removeAllHostedfieldsForms();
                mbwayInstance(hipay);
            } else if (methodID === $cache.paymentMethod.iDeal) {
                enabledHipayCTA();
                removeAllHostedfieldsForms();
                idealInstance(hipay);
            } else {
                disabledHipayCTA();
            }
        });

        // enabled HipayCTA.
        $('button.add-payment').on('click', function() {
            enabledHipayCTA();
        });

        // Disabled HipayCTA.
        $('button.cancel-new-payment').on('click', function() {
            disabledHipayCTA();
        });
    };

    $cache.document.ready(function () {
        initialize();
    });

}());