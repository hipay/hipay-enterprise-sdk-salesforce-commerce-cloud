'use strict';

(function () {

    var hipay = HiPay({
        username: '94693232.stage-secure-gateway.hipay-tpp.com',
        password: 'Test_qFjxCqVtSIugffvfWwSRHITA',
        environment: 'stage',
        lang: 'fr'
    });

    var browserInfo = hipay.getBrowserInfo();
    $("#browserInfo").val(JSON.stringify(browserInfo));


    var config = {
        template: 'auto',
        selector: 'hipay-hostedfields-form',
        styles: {
          base: {
            // default field styling
            color: '#000000',
            fontSize: '15px',
            fontWeight: 400,
            placeholderColor: '#999999',
            iconColor: '#00ADE9',
            caretColor: '#00ADE9'
          },
          invalid: {
            // invalid field styling
            color: '#D50000',
            caretColor: '#D50000'
          }
        }
    };
    var cardInstance = hipay.create('card', config);

    cardInstance.on('change', function (event) {
        /* Display error(s), if any */
        document.getElementById("hipay-error-message").innerHTML = event.error; /* Enable / disable submit button */
    });
    // const MODE_OPERATION = 'hostedFields';

    // var $cache = {
    //     body: $('body'),
    //     document: $(document),
    //     paymentMethod: {
    //         creditCard: 'CREDIT_CARD',
    //         hipayCreditCard: 'HIPAY_CREDIT_CARD',
    //         iDeal: 'HIPAY_IDEAL',
    //         giropay: 'HIPAY_GIROPAY',
    //         mbway: 'HIPAY_MBWAY'
    //     },
    //     stage: {
    //         payment: 'payment'
    //     },
    //     instance: null
    // };

    // function disableHipayCTA() {
    //     $cache.hipayCTA.addClass('d-none');
    //     $cache.btnSubmitSFRA.removeClass('d-none');
    // }

    // function enableHipayCTA() {
    //     $cache.hipayCTA.removeClass('d-none');
    //     $cache.btnSubmitSFRA.addClass('d-none');
    // }

    // function removeAllHostedfieldsForms() {
    //     $('#hipay-hostedfields-form').empty();
    //     $('#hipay-hostedfields-form-giropay').empty();
    //     $('#hipay-hostedfields-form-mbway').empty();
    //     $('#hipay-hostedfields-form-ideal').empty();
    // }

    // function createInstance(type) {
    //     enableHipayCTA();

    //     // If the customer uses the oneClick, disable hipayCTA.
    //     if (isOneClickPayment()) {
    //         disableHipayCTA();
    //     }

    //     removeAllHostedfieldsForms();

    //     $cache.instance = hipay.create(type, window.hipayCustomPreferences[type + 'Config'].config);
    //     $cache.instance.on('change', function(event){
    //         /* Display error(s), if any */
    //         $("#hipay-error-message").innerHTML = event.error;
    //         /* Enable / disable submit button */
    //         $('button[value=submit-payment]').disabled = !event.valid;

    //         $('.submit-payment-hipay').toggleClass('disabled', !event.valid);
    //     });
    // }

    // function toggleHipayCTA() {
    //     // Check that we are at payment stage, and not using a saved payment instrument.
    //     if ($('#checkout-main').attr("data-checkout-stage") === $cache.stage.payment &&
    //         (!$('.user-payment-instruments').length || $('.user-payment-instruments').hasClass('checkout-hidden'))) {
    //         enableHipayCTA();
    //     } else {
    //         disableHipayCTA();
    //     }
    // }

    // /**
    //  * Hosted fields payment method?
    //  * @param {String} methodID
    //  * @returns {Boolean}
    //  */
    // function isHostedFields(methodID) {
    //     return Object.values($cache.paymentMethod).indexOf(methodID) !== -1;
    // }

    // /**
    //  * Customer using one click payment?
    //  * @param {String} methodID
    //  * @returns {Boolean}
    //  */
    // function isOneClickPayment() {
    //     return $('#checkout-main').attr('data-customer-type') !== 'guest'
    //         && $(this).data('method-id') === $cache.paymentMethod.hipayCreditCard
    //         && !$('.user-payment-instruments').hasClass('checkout-hidden');
    // }

    // function initialize() {
    //     if (!window.hipayCustomPreferences.hipayEnabled ||
    //         window.hipayCustomPreferences.hipayOperationMode !== MODE_OPERATION) {
    //         return;
    //     }

    //     $cache.btnSubmitSFRA = $('.next-step-button .submit-payment');
    //     $cache.hipayCTA = $('<div/>')
    //         .addClass('btn btn-primary btn-block submit-payment-hipay disabled d-none')
    //         .attr('id', 'hipayCTA')
    //         .html($cache.btnSubmitSFRA.text())
    //         .appendTo($cache.btnSubmitSFRA.parent());


    //     $cache.hipayCTA.on('click', function () {
    //         var methodID = $('.payment-information').data('payment-method-id');

    //         // Trigger directly original submit if using non Hosted fields method,
    //         // or when using saved payment method.
    //         if (!isHostedFields(methodID) || isOneClickPayment()) {
    //             $('button[value="submit-payment"]').trigger('click');
    //         }

    //         // /* Tokenize your card information when the submit button is clicked */
    //         $cache.instance.getPaymentData().then(
    //             function(response) {
    //                 $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(response));
    //                 $('button[value="submit-payment"]').trigger('click');
    //             },
    //             function(errors) {
    //                 /* Display first error */
    //                 document.getElementById("hipay-error-message").innerHTML = errors[0].error;
    //             }
    //         );
    //     });

    //     // watch checkout-main element.
    //     var observer = new MutationObserver(toggleHipayCTA);
    //     observer.observe(document.getElementById('checkout-main'), {
    //         attributes: true
    //     });

    //     // Credit card form initialization first.
    //     createInstance('card');

    //     toggleHipayCTA();

    //     // Displays form corresponding to the payment method.
    //     $('.payment-options .nav-item').on('click', function (e) {
    //         var methodID = $(this).data('method-id');

    //         if (methodID === $cache.paymentMethod.hipayCreditCard) {
    //             createInstance('card');
    //         } else if (methodID === $cache.paymentMethod.giropay) {
    //             createInstance('giropay');
    //         } else if (methodID === $cache.paymentMethod.mbway) {
    //             createInstance('mbway');
    //         } else if (methodID === $cache.paymentMethod.iDeal) {
    //             createInstance('ideal');
    //         } else {
    //             disableHipayCTA();
    //         }
    //     });

    //     // enabled HipayCTA.
    //     $('button.add-payment').on('click', function() {
    //         enableHipayCTA();
    //     });

    //     // Disabled HipayCTA.
    //     $('button.cancel-new-payment').on('click', function() {
    //         disableHipayCTA();
    //     });
    // };

    // $cache.document.ready(function () {
    //     initialize();
    // });

}());
