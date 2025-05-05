'use strict';

(function () {

    var hipay = require('./globalVariable').getGlobalVariable();

    const MODE_OPERATION = 'hostedFields';

    var $cache = {
        body: $('body'),
        document: $(document),
        paymentMethod: {
            creditCard: 'CREDIT_CARD',
            hipayCreditCard: 'HIPAY_CREDIT_CARD',
            iDeal: 'HIPAY_IDEAL',
            giropay: 'HIPAY_GIROPAY',
            mbway: 'HIPAY_MBWAY'
        },
        stage: {
            payment: 'payment'
        },
        instance: null
    };

    function disableHipayCTA() {
        $cache.hipayCTA.addClass('d-none');
        $cache.btnSubmitSFRA.removeClass('d-none');
    }

    function enableHipayCTA() {
        $cache.hipayCTA.removeClass('d-none');
        $cache.btnSubmitSFRA.addClass('d-none');
    }

    function initializeHipayCreditCard() {
        if (window.hipayCustomPreferences && window.hipayCustomPreferences.hipayEnableOneClick) {
            try {
                $.ajax({
                    url: $('#hipay-hostedfields-form').data('payment-instruments-list-url'),
                    method: "GET",
                    data: {
                        'csrf_token': $('#hipay-hostedfields-form').data('csrf-token')
                    },
                    success: function (data) {
                        createInstance('card', data.paymentInstruments, data.registeredUser);
                    }
                });
            } catch (error) {
                console.error('ERROR : ', error);
            }
        } else {
            createInstance('card');
        }
        $('.credit-card-form').removeClass('checkout-hidden');
    }

    function removeAllHostedfieldsForms() {
        $('#hipay-hostedfields-form').empty();
        $('#hipay-hostedfields-form-giropay').empty();
        $('#hipay-hostedfields-form-mbway').empty();
        $('#hipay-hostedfields-form-ideal').empty();
    }

    function createInstance(type, paymentInstruments, registeredUser) {
        enableHipayCTA();

        removeAllHostedfieldsForms();

        var config = window.hipayCustomPreferences[type + 'Config'].config;

        if (type === 'card') {
            // If payment type is card, set full name to credit card form.
            setFullnameToCreditCardForm();

            if (registeredUser) {
                config.one_click = {
                    enabled: window.hipayCustomPreferences.hipayEnableOneClick
                };

                if (paymentInstruments) {
                    config.one_click.cards = paymentInstruments;
                    config.one_click.cards_display_count = window.hipayCustomPreferences.cardsDisplayCount;
                }
            }
        }

        $cache.instance = hipay.create(type, config);
        $cache.instance.on('change', function(event){
            /* Display error(s), if any */
            $("#hipay-error-message").innerHTML = event.error;
            /* Enable / disable submit button */
            $('button[value=submit-payment]').disabled = !event.valid;

            $('.submit-payment-hipay').toggleClass('disabled', !event.valid);
        });
    }

    function toggleHipayCTA() {
        if ($('#checkout-main').attr("data-checkout-stage") === $cache.stage.payment) {
            // Credit card form initialization first.
            initializeHipayCreditCard()

            enableHipayCTA();
        } else {
            disableHipayCTA();
        }
    }

    /**
     * Hosted fields payment method?
     * @param {String} methodID
     * @returns {Boolean}
     */
    function isHostedFields(methodID) {
        return Object.values($cache.paymentMethod).indexOf(methodID) !== -1;
    }
    /**
     * Set full name to credit card form.
     */
    function setFullnameToCreditCardForm() {

        var firstname = $('input[id="billingFirstName"]').val();
        var lastname = $('input[id="billingLastName"]').val();
        if (firstname && lastname) {
            window.hipayCustomPreferences.cardConfig.config.fields.cardHolder.uppercase = true;
            window.hipayCustomPreferences.cardConfig.config.fields.cardHolder.defaultFirstname = firstname;
            window.hipayCustomPreferences.cardConfig.config.fields.cardHolder.defaultLastname = lastname;
        }

    }

    function initialize() {
        if (!window.hipayCustomPreferences.hipayEnabled ||
            window.hipayCustomPreferences.hipayOperationMode !== MODE_OPERATION) {
            return;
        }

        $cache.btnSubmitSFRA = $('.next-step-button .submit-payment');
        $cache.hipayCTA = $('<div/>')
            .addClass('btn btn-primary btn-block submit-payment-hipay disabled d-none')
            .attr('id', 'hipayCTA')
            .html($cache.btnSubmitSFRA.text())
            .appendTo($cache.btnSubmitSFRA.parent());


        $cache.hipayCTA.on('click', function () {
            var methodID = $('.payment-information').data('payment-method-id');

            // Trigger directly original submit if using non Hosted fields method,
            // or when using saved payment method.
            if (!isHostedFields(methodID)) {
                $('button[value="submit-payment"]').trigger('click');
            }

            // /* Tokenize your card information when the submit button is clicked */
            $cache.instance.getPaymentData().then(
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

        // watch checkout-main element.
        var observer = new MutationObserver(toggleHipayCTA);
        observer.observe(document.getElementById('checkout-main'), {
            attributes: true
        });

        toggleHipayCTA();

        // Displays form corresponding to the payment method.
        $('.payment-options .nav-item').on('click', function (e) {
            var methodID = $(this).data('method-id');

            if (methodID === $cache.paymentMethod.hipayCreditCard) {
                initializeHipayCreditCard();
            } else if (methodID === $cache.paymentMethod.giropay) {
                createInstance('giropay');
            } else if (methodID === $cache.paymentMethod.mbway) {
                createInstance('mbway');
            } else if (methodID === $cache.paymentMethod.iDeal) {
                createInstance('ideal');
            } else {
                disableHipayCTA();
            }
        });

        // enabled HipayCTA.
        $('button.add-payment').on('click', function() {
            toggleHipayCTA();
        });

        // Disabled HipayCTA.
        $('button.cancel-new-payment').on('click', function() {
            toggleHipayCTA();
        });
    }

    $cache.document.ready(function () {
        initialize();
    });

}());
