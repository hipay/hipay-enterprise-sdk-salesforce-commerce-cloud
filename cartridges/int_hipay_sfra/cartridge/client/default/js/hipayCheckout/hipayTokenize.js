'use strict'

var cardInstance = require('./hipayCreate').cardInstance;

/* Add event listener on the submit button when clicked */
$('.submit-payment-hipay').on('click', function () {
  /* Tokenize your card information when the submit button is clicked */
  cardInstance.getPaymentData().then(
    function(response) {
      console.log(response);
      $('input[name=dwfrm_billing_hipaytokenize]').val(JSON.stringify(response));

      $('button[value="submit-payment"]').trigger('click');
    },
    function(errors) {
      /* Display first error */
      document.getElementById("hipay-error-message").innerHTML = errors[0].error;
    }
  );
});
