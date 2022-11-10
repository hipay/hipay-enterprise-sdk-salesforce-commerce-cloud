'use strict';

const { I } = inject();
const config = require('../../config');
const Resource = require('../../resource');

module.exports = {
    fields: {
        firstName: '#dwfrm_singleshipping_shippingAddress_addressFields_firstName',
        lastName: '#dwfrm_singleshipping_shippingAddress_addressFields_lastName',
        adress1: '#dwfrm_singleshipping_shippingAddress_addressFields_address1',
        country: '#dwfrm_singleshipping_shippingAddress_addressFields_country',
        state: '#dwfrm_singleshipping_shippingAddress_addressFields_state',
        city: '#dwfrm_singleshipping_shippingAddress_addressFields_city',
        zipcode: '#dwfrm_singleshipping_shippingAddress_addressFields_postal',
        phone: '#dwfrm_singleshipping_shippingAddress_addressFields_phone',
        useAsBillingAddress: '#dwfrm_singleshipping_shippingAddress_useAsBillingAddress'
      },

    initCheckout() {
        this.goToMenCategory();
        this.addProductToCart();
        this.goToCart();
        this.goToCheckout();
    },

    goToTopSellerCategory() {
        I.click('#top-seller');
    },

    goToMenCategory() {
        I.click('.primary-logo');
    },

    addProductToCart() {
        I.click('.product-image');
        tryTo(() => I.click(locate('.size .selectable').first()));
        I.click('#add-to-cart');
    },

    goToCart() {
        I.click('a.mini-cart-link');
    },

    goToCheckout() {
        I.click(locate('button').withAttr({name: 'dwfrm_cart_checkoutCart'}));
    },

    submitCheckout() {
        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.adress1, config.adress.address1);
        I.fillField(this.fields.zipcode, config.adress.zipCode);
        I.fillField(this.fields.city, config.adress.city);
        I.selectOption(this.fields.country, config.adress.country);
        I.fillField(this.fields.phone, config.user.phone);
        tryTo(() => I.selectOption(this.fields.state, config.adress.state));
        I.checkOption(this.fields.useAsBillingAddress);
        I.click('.button-fancy-large');
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';
        I.checkOption('#is-HIPAY_HOSTED_CREDIT_CARD');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
        
        I.switchTo('#cardNumber>iframe');
        I.fillField('input[name="cardnumber"]', card.cardNumber);
        I.switchTo();
        
        I.switchTo('#cardHolder>iframe');
        I.fillField('input[name="ccname"]', `${config.user.firstName} ${config.user.lastName}`);
        I.switchTo();

        I.switchTo('#cardExpiryDate>iframe');
        I.fillField('input[name="cc-exp"]', `${card.expMonth}/${card.expYear.slice(-2)}`);
        I.switchTo();

        I.switchTo('#cardSecurityCode>iframe');
        I.fillField('input[name="cvc"]', card.cvc);
        I.switchTo();

        I.click('#submit-button');

        // New Hosted Page.
        // I.wait(2);

        // I.switchTo('#hipay-card-field-cardNumber>iframe');
        // I.fillField('input[name="cardnumber"]', card.cardNumber);
        // I.switchTo();

        // I.wait(3);

        // I.switchTo('#hipay-card-field-cardHolder>iframe');
        // I.fillField('input[name="ccname"]', `${config.user.firstName} ${config.user.lastName}`);
        // I.switchTo();

        // I.wait(2);

        // I.switchTo('#hipay-card-field-expiryDate>iframe');
        // I.fillField('input[name="cc-exp"]', `${card.expMonth}/${card.expYear.slice(-2)}`);
        // I.switchTo();

        // I.wait(5);

        // I.switchTo('#hipay-card-field-cvc>iframe');
        // I.fillField('input[name="cvc"]', card.cvc);
        // I.switchTo();

        // I.wait(1);

        // I.click('button[aria-label="pay-button"]');
    },

    selectAndSubmitHiPayGriopayForm() {
        I.checkOption('#is-HIPAY_HOSTED_GIROPAY');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
        I.fillField('#issuer_bank_id', config.giropay.code);
        I.seeElement('.submit-button');
        I.click('#submit-button');
    },

    validateGiroPayPayment() {
        I.fillField('input[name="account/addition[@name=benutzerkennung]"]', config.giropay.account);
        I.fillField('input[name="ticket/pin"]', config.giropay.PIN);
        I.pressKey('Enter');
        I.checkOption('input[name="aumethod"]');
        I.pressKey('Enter');
        I.fillField('input[name="ticket/tan"]', config.giropay.TAN);
        I.pressKey('Enter');
        I.click('.btn-primary[name="weiterButton"]');
        I.fillField('input[name="ticket/tan"]', config.giropay.TAN);
        I.pressKey('Enter');
    },

    selectAndSubmitBelfiusForm() {
        I.checkOption('#is-HIPAY_HOSTED_DEXIA_DIRECTNET');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    validateBelfiusPayement() {
        I.click('#submit-button');
        I.click('#submit1');
        I.click('#btn_Accept');
    },

    selectAndSubmitiDEALForm() {
        I.checkOption('#is-HIPAY_HOSTED_IDEAL');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    validateiDEALPayment() {
        I.click('#submit-button');
        I.fillField('input[name="bic"]', config.iDEAL.BIC);
        I.click('.btn-primary');
        I.click('.btn-primary');
        I.fillField('input[name="tan"]', config.iDEAL.TAN);
        I.click('.btn-primary');
        I.click('.btn-primary');
    },
    
    selectAndSubmitINGForm() {
        I.checkOption('#is-HIPAY_HOSTED_ING_HOMEPAY');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    validateINGPayment() {
        I.click('#submit-button');
    },

    selectAndSubmitHostedSisalForm() {
        I.checkOption('#is-HIPAY_HOSTED_SISAL');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    validateHostedSisalPayment() {
        I.click('#submit-button');
        I.click('#submit-button');
    },
    
    selectAndSubmitHostedSofortForm() {
        I.checkOption('#is-HIPAY_HOSTED_SOFORT_UBERWEISUNG');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    validateHostedSofortPayment() {
        I.click('#submit-button');
        I.click('.cookie-modal-accept-all');
        I.fillField('#SenderBank', config.sofort.bank);
        I.click('.button-right');
        I.fillField('#BackendFormLOGINNAMEUSERID', config.sofort.id);
        I.fillField('#BackendFormUSERPIN', config.sofort.password);
        I.click('.button-right');
        I.click('.button-right');
        I.fillField('#BackendFormTAN', config.sofort.confirmCode);
        I.click('.button-right');
    },

    selectAndSubmitHipayHostedCreditCardForm() {
        I.checkOption('#is-HIPAY_CREDIT_CARD');
        I.click('.button-fancy-large');
        I.click('.button-fancy-large');
    },

    validateHipayHostedCreditCard() {

    },

    validateSecure() {
        I.wait(1);
        I.seeElement('#continue-transaction');
        I.click('#continue-transaction');
        I.wait(1);
    },

    placeOrderWithSecure(secure) {
        if (secure) {
            this.validateSecure();
        }
        I.see(Resource.msg('thanks'));
    }
}
