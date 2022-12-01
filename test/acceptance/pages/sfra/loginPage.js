'use strict';

const { I } = inject();
const config = require('../../config');
const Resource = require('../../resource');
const pageUrl = `${config.storefront.sfra.url}/${config.currentLocale}`;

module.exports = {
    fields: {
        consentTracking: '#consent-tracking',
        loginEmail: '#login-form-email',
        loginPassword: '#login-form-password',
        firstName: '#registration-form-fname',
        lastName: '#registration-form-lname',
        phone: '#registration-form-phone',
        email: '#registration-form-email',
        confirmEmail: '#registration-form-email-confirm',
        password: '#registration-form-password',
        confirmPassword: '#registration-form-password-confirm',
        buttonLogin: 'form.login button'
    },

    async loginOrCreateAccount() {
        I.amOnPage(pageUrl)
        this.confirmTrackingConsent();
        I.waitForVisible('.nav-item span[class="user-message"]');
        I.click('.nav-item span[class="user-message"]');
        I.waitForNavigation();
        /*const iAmLogged = await tryTo(() => this.loginAccount());
        if (!iAmLogged) {
            this.createAccout();
        }*/
        this.loginAccount();
    },

    createAccout() {
        I.click('.nav-link[href="#register"]');
        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.phone, config.user.phone.replace(/\s/g, ''));
        I.fillField(this.fields.email, config.user.email);
        I.fillField(this.fields.confirmEmail, config.user.email);
        I.fillField(this.fields.password, config.user.password);
        I.fillField(this.fields.confirmPassword, config.user.password);
        I.click(locate('button').withText(Resource.msg('createAccount')));
        I.waitForNavigation();
        I.see(Resource.msg('dashboard'));
    },

    loginAccount() {
        //I.click('.nav-link[href="#login"]');
        //I.waitForNavigation();
        I.fillField(this.fields.loginEmail, config.user.email);
        I.fillField(this.fields.loginPassword, config.user.password);
        I.click(this.fields.buttonLogin);
        //I.click(locate('button').withTexxt(Resource.msg('login')));
        I.waitForNavigation();
        I.see(Resource.msg('dashboard'));
    },

    confirmTrackingConsent() {
        //tryTo(() => I.click('.affirm'));
        I.waitForVisible('.affirm');
        I.click('.affirm');
        I.waitForInvisible(this.fields.consentTracking);
    },
};
