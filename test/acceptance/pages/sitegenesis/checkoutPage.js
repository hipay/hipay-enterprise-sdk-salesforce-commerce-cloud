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

        billing: {
            giropay: '#dwfrm_billing_paymentMethods_hipaymethods_giropay_bic',
            ideal: '#dwfrm_billing_paymentMethods_hipaymethods_issuer__bank__id'
        },

        buttonSaveShipping: 'button[name="dwfrm_singleshipping_shippingAddress_save"]',
        buttonSaveBilling: 'button[name="dwfrm_billing_save"]',
        buttonPlaceOrder: '.submit-order button',
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
        this.submitPayment();
        this.placeOrder();
    },

    switchToHipayIframe() {
        I.waitForVisible('#hipay-iframe', 10);
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

        I.click(this.fields.buttonSaveShipping);
        I.waitForNavigation();
    },

    submitPayment() {
        I.waitForVisible(this.fields.buttonSaveBilling);
        I.click(this.fields.buttonSaveBilling);
        I.waitForNavigation();
    },

    placeOrder() {
        I.waitForVisible(this.fields.buttonPlaceOrder);
        I.click(this.fields.buttonPlaceOrder);
        //I.waitForNavigation();
    },

    selectAndSubmitHiPayCreditCardForm(cardType) {
        const card = config[cardType] || 'creditCard';

        I.fillField('#dwfrm_billing_paymentMethods_creditCard_owner', [config.user.firstName, config.user.lastName].join(' '));
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_type', card.type);
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_number', card.cardNumber);
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_expiration_month', '3');
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_expiration_year', '2030');
        I.fillField('#dwfrm_billing_paymentMethods_creditCard_cvn', card.cvc);

        this.submitPayment();
        this.placeOrder();
    },

    selectAndSubmitHiPayGriopayForm() {
        I.fillField(this.fields.billing.giropay, config.giropay.code);
        this.submitPayment();
        this.placeOrder();
    },

    validateIdealForm() {
        I.fillField(this.fields.billing.ideal, config.ideal.bank);
        this.submitPayment();
        this.placeOrder();
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
        //I.waitInUrl('COPlaceOrder-Submit', 20);
        https://bdjt-008.sandbox.us01.dx.commercecloud.salesforce.com/on/demandware.store/Sites-SiteGenesisGlobal-Site/fr_FR/COPlaceOrder-Submit?order_id=00002711&order_token=vF31Fm-LblWh7ZxYQBSRsQ2QKShPeX2jhIA9764cO-k&csrf_token=Z3FuzXj-d9ZQuRgse3ll6LMWLR7X0yZ-51Jm2JDanEFMvxmZ_x4ysEHaxCsaGHTahL6rinoH6Dnil9dIF6IfcqOKJeelMCQ11d79Kg1uE4T_nWTSh61jWCH9eMKWHu7QhdFxR3qPjTugGpmxMyL0ksjGmCnBRyL-sNnFzY8xvayazTHSe4s%3d
        //I.waitInUrl('COSummary-Submit', 20);
        //I.waitForVisible('.confirmation-message', 15);
        //I.see(Resource.msg('thanks'));
        I.waitForText(Resource.msg('thanks'), 20);
    }
}
