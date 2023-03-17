'use strict';


function selectedCreditCardInWallet(req, paymentUUID, paymentInstruments) {
    var instrumentsIter = paymentInstruments.iterator();
    while (!empty(instrumentsIter) && instrumentsIter.hasNext()) {
        var creditCardInstrument = instrumentsIter.next();
        if (paymentUUID.equals(creditCardInstrument.UUID)) {
            return creditCardInstrument;
        }
    }

    return;
}

module.exports = {
    selectedCreditCardInWallet : selectedCreditCardInWallet
}