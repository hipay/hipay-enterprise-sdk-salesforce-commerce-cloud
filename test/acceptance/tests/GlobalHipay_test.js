Feature('Gloabl Hipay Test');

const Resource = require('../resource');

Before(async ({ I, loginPage, checkoutPage }) => {
    // waiting fo login process
    await loginPage.loginOrCreateAccount();
    // checkout
    checkoutPage.initCheckout();

    checkoutPage.submitCheckout();
});

Scenario('Commande avec HiPay Credit Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay Credit Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DS');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay Credit Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DSV2');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay Master Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard');
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay Master Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DS');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay Master Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DSV2');
    checkoutPage.placeOrderWithSecure(true);
}).tag('@hosted');

Scenario('Commande avec HiPay GiroPay OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_GIROPAY');
    checkoutPage.selectAndSubmitHiPayGriopayForm();
    checkoutPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay iDEAL OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_IDEAL');
    checkoutPage.submitHipayForm();
    checkoutPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec Hosted Sisal OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_SISAL');
    checkoutPage.submitHipayForm();
    checkoutPage.validateHostedSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec Hosted Sofort OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_SOFORT_UBERWEISUNG');
    checkoutPage.submitHipayForm();
    checkoutPage.validateHostedSofortPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@hosted');

Scenario('Commande avec HiPay Credit Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec HiPay Credit Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DS');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay Credit Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DSV2');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay Master Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec HiPay Master Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DS');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay Master Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_CREDIT_CARD');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DSV2');
    checkoutPage.leaveHipayIframe();
    checkoutPage.placeOrderWithSecure(true);
}).tag('@iframe');

Scenario('Commande avec HiPay GiroPay OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_GIROPAY');
    checkoutPage.switchToHipayIframe();
    checkoutPage.selectAndSubmitHiPayGriopayForm();
    checkoutPage.leaveHipayIframe();
    checkoutPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec HiPay iDEAL OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_IDEAL');
    checkoutPage.switchToHipayIframe();
    checkoutPage.submitHipayForm();
    checkoutPage.leaveHipayIframe();
    checkoutPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec Hosted Sisal OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_SISAL');
    checkoutPage.switchToHipayIframe();
    checkoutPage.submitHipayForm();
    checkoutPage.leaveHipayIframe();
    checkoutPage.validateHostedSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');

Scenario('Commande avec Hosted Sofort OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_HOSTED_SOFORT_UBERWEISUNG');
    checkoutPage.switchToHipayIframe();
    checkoutPage.submitHipayForm();
    checkoutPage.leaveHipayIframe();
    checkoutPage.validateHostedSofortPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@iframe');


Scenario('Commande avec HiPay Credit Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard', true);
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande avec HiPay Credit Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DS', true);
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay Credit Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DSV2', true);
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay Master Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard', true);
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande avec HiPay Master Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DS', true);
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay Master Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_CREDIT_CARD', true);
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DSV2', true);
    checkoutPage.placeOrderWithSecure(true);
}).tag('@api');

Scenario('Commande avec HiPay GiroPay OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_GIROPAY', true);
    checkoutPage.selectAndSubmitHiPayGriopayForm(true);
    checkoutPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande avec HiPay iDEAL OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_IDEAL', true);
    checkoutPage.validateIdealForm();
    checkoutPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande Sisal OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_SISAL', true);
    checkoutPage.validateSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');

Scenario('Commande Sofort OK', ({ I, checkoutPage }) => {
    checkoutPage.selectPaymentMethod('HIPAY_SOFORT_UBERWEISUNG', true);
    checkoutPage.validateSofortPayment();
    checkoutPage.validateHostedSofortPayment();
    checkoutPage.placeOrderWithSecure(false);
}).tag('@api');


After(({ I }) => {
    I.wait(3);
});
