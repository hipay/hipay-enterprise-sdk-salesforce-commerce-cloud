Feature('Gloabl Hipay Test');

const Resource = require('../resource');

Before(({ I, loginPage, checkoutPage }) => {
    // waiting fo login process
    loginPage.loginOrCreateAccount();
    // checkout
    checkoutPage.initCheckout();
    checkoutPage.submitShipping();
});

Scenario('Commande avec HiPay Credit Card', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCard');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay Credit Card 3DS', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCard3DS');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay Credit Card 3DS V2', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCard3DSV2');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay Master Card', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    hostedPage.fillAndSubmitHiPayCreditCardForm('masterCard');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay Master Card 3DS', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    hostedPage.fillAndSubmitHiPayCreditCardForm('masterCard3DS');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay Master Card 3DS V2', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    hostedPage.fillAndSubmitHiPayCreditCardForm('masterCard3DSV2');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay GiroPay', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_GIROPAY');
    hostedPage.fillAndSubmitHiPayGriopayForm();
    hostedPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay iDEAL', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_IDEAL');
    hostedPage.fillAndSubmitHiPayiDEALForm();
    hostedPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted').tag('@toto');

Scenario('Commande avec Hosted Sisal', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_SISAL');
    hostedPage.submitHipayForm();
    hostedPage.validateHostedSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay Credit Card', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCard');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec HiPay Credit Card 3DS', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCard3DS');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay Credit Card 3DS V2', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCard3DSV2');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay Credit Card Declined', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('creditCardDeclined');
    checkoutPage.leaveHipayIframe();
    checkoutPage.validateSecure();
    I.see('Payment was declined');
}).tag('@iframe');

Scenario('Commande avec HiPay Master Card', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('masterCard');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec HiPay Master Card 3DS', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('masterCard3DS');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay Master Card 3DS V2', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayCreditCardForm('masterCard3DSV2');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay GiroPay', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_GIROPAY');
    checkoutPage.switchToHipayIframe();
    hostedPage.fillAndSubmitHiPayGriopayForm();
    checkoutPage.leaveHipayIframe();
    hostedPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec HiPay iDEAL', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_IDEAL');
    checkoutPage.switchToHipayIframe();
    hostedPage.submitHipayForm();
    checkoutPage.leaveHipayIframe();
    hostedPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec Hosted Sisal', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_SISAL');
    checkoutPage.switchToHipayIframe();
    hostedPage.submitHipayForm();
    checkoutPage.leaveHipayIframe();
    hostedPage.validateHostedSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec Hosted Sofort', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_HOSTED_SOFORT_UBERWEISUNG');
    checkoutPage.switchToHipayIframe();
    hostedPage.submitHipayForm();
    checkoutPage.leaveHipayIframe();
    hostedPage.validateHostedSofortPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');


Scenario('Commande avec HiPay Credit Card', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande avec HiPay Credit Card 3DS', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DS');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay Credit Card 3DS V2', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DSV2');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec American Express', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('amex');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api').tag('@wip');

Scenario('Commande avec Ban', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('bancontact');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api').tag('@wip');

Scenario('Commande avec HiPay Master Card', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande avec HiPay Master Card 3DS', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DS');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay Master Card 3DS V2', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DSV2');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay GiroPay', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_GIROPAY', true);
    checkoutPage.selectAndSubmitHiPayGriopayForm();
    hostedPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api').tag('@wip');

Scenario('Commande avec HiPay iDEAL', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_IDEAL', true);
    checkoutPage.validateIdealForm();
    hostedPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api').tag('@wip');

Scenario('Commande Sisal', ({ I, checkoutPage, hostedPage }) => {
    checkoutPage.selectHostedPaymentMethod('HIPAY_SISAL', true);
    hostedPage.validateSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api').tag('@wip');

