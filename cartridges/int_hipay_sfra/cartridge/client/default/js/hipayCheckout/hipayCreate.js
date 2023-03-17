'use strict'

if (window.hipayCustomPreferences.length === 0) {
  return false;
}

var customPreferences = window.hipayCustomPreferences[0];
var config = customPreferences.config;
var hipay = HiPay(customPreferences.globalVariable);

var cardInstance = hipay.create('card', config);

/* Listen to change event on card instance */
cardInstance.on('change', function(event){
  /* Display error(s), if any */
  $("#hipay-error-message").innerHTML = event.error;
  /* Enable / disable submit button */
  $('button[value=submit-payment]').disabled = !event.valid;
});

module.exports = {
 cardInstance: cardInstance
}
