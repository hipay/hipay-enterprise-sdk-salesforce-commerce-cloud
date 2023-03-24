'use strict'

var hipay = require('./globalVariable').getGlobalVariable();

var cardInstance = hipay.create('card', window.hipayCustomPreferences.cardConfig.config);

/* Listen to change event on card instance */
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

module.exports = {
 cardInstance: cardInstance
}
