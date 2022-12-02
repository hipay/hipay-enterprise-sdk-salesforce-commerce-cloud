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
        useAsBillingAddress: '#dwfrm_singleshipping_shippingAddress_useAsBillingAddress',
        //saveBilling: 'button[name="dwfrm_billing_save"]',
        buttonPlaceOrder: '.submit-order button',
        buttonSaveBilling: 'button[name="dwfrm_billing_save"]',
        buttonCart: 'button[name="dwfrm_cart_checkoutCart"]'
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
        I.waitForNavigation();
    },

    addProductToCart() {
        I.click('.product-image');
        I.waitForNavigation();
        I.waitForVisible('.size .selectable', 3);
        I.click('.size .selectable');
        I.waitForInvisible('.loader');
        I.click('#add-to-cart');
        I.waitForInvisible('.loader');
    },

    goToCart() {
        I.waitForVisible('a.mini-cart-link')
        I.click('a.mini-cart-link');
        I.waitForNavigation();
    },

    goToCheckout() {
        I.waitForVisible(this.fields.buttonCart)
        I.click(this.fields.buttonCart);
        I.waitForNavigation();
    },

    selectPaymentMethod(paymentMethodId) {
        I.waitForVisible('button[name="dwfrm_billing_save"]', 3);
        I.checkOption('#is-' + paymentMethodId);
    },

    selectHostedPaymentMethod(paymentMethodId) {
        this.selectPaymentMethod(paymentMethodId);

        I.waitForVisible(this.fields.buttonSaveBilling);
        I.click(this.fields.buttonSaveBilling);
        //I.wait(2);
        //I.waitForNavigation();
        I.waitForVisible(this.fields.buttonPlaceOrder);
        I.click(this.fields.buttonPlaceOrder);
        I.waitForNavigation();
        //I.wait(2);
    },

    switchToHipayIframe() {
        I.waitForVisible('#hipay-iframe', 3);
        I.switchTo('#hipay-iframe');
    },

    leaveHipayIframe() {
        I.switchTo();
    },

    submitShipping() {
        I.waitForVisible(this.fields.firstName, 3);
        I.waitForVisible(this.fields.lastName, 3);
        I.waitForVisible(this.fields.adress1, 3);
        I.waitForVisible(this.fields.zipcode, 3);
        I.waitForVisible(this.fields.city, 3);
        I.waitForVisible(this.fields.country, 3);

        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.adress1, config.adress.address1);
        I.fillField(this.fields.zipcode, config.adress.zipCode);
        I.fillField(this.fields.city, config.adress.city);
        I.selectOption(this.fields.country, config.adress.country);
        I.fillField(this.fields.phone, config.user.phone);
        //tryTo(() => I.selectOption(this.fields.state, config.adress.state));
        I.checkOption(this.fields.useAsBillingAddress);

        I.click('.button-fancy-large');
        I.waitForNavigation();
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';

        //I.click('#cardNumber');
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_owner', [config.user.firstName, config.user.lastName].join(' '));
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_type', card.type);
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_number', card.cardNumber);
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_expiration_month', '3');
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_expiration_year', '2030');
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_cvn', card.cvc);

        I.click('.button-fancy-large');
        //I.wait(3);
        I.click('.button-fancy-large');
    },

    validateSecure() {
        I.waitForNavigation();
        I.waitInUrl('/challenge');
        I.waitForVisible('#continue-transaction', 15);
        I.click('#continue-transaction');
        I.waitForNavigation();
    },

    placeOrderWithSecure(secure) {
        if (secure) {
            this.validateSecure();
        }
        I.waitInUrl('COPlaceOrder-Submit', 20);
        //I.waitForVisible('.confirmation-message', 15);
        I.see(Resource.msg('thanks'));
    }
}
