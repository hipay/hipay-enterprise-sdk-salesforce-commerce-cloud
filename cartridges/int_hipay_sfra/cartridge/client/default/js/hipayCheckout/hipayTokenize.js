'use strict'

var cardInstance = require('./hipayCreate').cardInstance;

/* Add event listener on the submit button when clicked */
$('button[value="submit-payment"]').on('click', function () {
  /* Tokenize your card information when the submit button is clicked */
  cardInstance.getPaymentData().then(
    function(response) {
      $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify({
        payment_product: response.payment_product,
        token: response.token,
        browser_info: response.browser_info,
        device_fingerprint: response.device_fingerprint
      }));
    },
    function(errors) {
      /* Display first error */
      document.getElementById("hipay-error-message").innerHTML = errors[0].error;
    }
  );
});
