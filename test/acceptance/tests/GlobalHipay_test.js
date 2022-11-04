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
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard');

    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec HiPay Credit Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DS');

    checkoutPage.placeOrderWithSecure(true);
});

Scenario('Commande avec HiPay Credit Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHiPayCreditCardForm('creditCard3DSV2');

    checkoutPage.placeOrderWithSecure(true);
});

Scenario('Commande avec HiPay Master Card OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard');

    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec HiPay Master Card 3DS OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DS');

    checkoutPage.placeOrderWithSecure(true);
});

Scenario('Commande avec HiPay Master Card 3DS V2 OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHiPayCreditCardForm('masterCard3DSV2');

    checkoutPage.placeOrderWithSecure(true);
});

Scenario('Commande avec HiPay GiroPay OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHiPayGriopayForm();

    checkoutPage.validateGiroPayPayment();
    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec HiPay Belfius OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitBelfiusForm();

    checkoutPage.validateBelfiusPayement();
    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec HiPay iDEAL OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitiDEALForm();

    checkoutPage.validateiDEALPayment();
    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec HiPay IBN OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitINGForm();

    checkoutPage.validateINGPayment();
    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec Hosted Sisal OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHostedSisalForm();

    checkoutPage.validateHostedSisalPayment();
    checkoutPage.placeOrderWithSecure(false);
});

Scenario('Commande avec Hosted Sofort OK', ({ I, checkoutPage }) => {
    checkoutPage.selectAndSubmitHostedSofortForm();

    checkoutPage.validateHostedSofortPayment();
    checkoutPage.placeOrderWithSecure(false);
});

After(({ I }) => {
    I.wait(3);
});
