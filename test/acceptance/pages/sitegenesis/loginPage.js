'use strict';

const { I } = inject();
const config = require('../../config');
const Resource = require('../../resource');
const pageUrl = `${config.storefront.siteg.url}/${config.currentLocale}`;

module.exports = {
    fields: {
        //loginEmail: 'dwfrm_login_username',
        //loginEmail: {xpath: "//input[starts-with(@id, 'dwfrm_login_username')]"},
        loginEmail: 'input[id^=dwfrm_login_username]',
        //loginPassword: 'dwfrm_login_password',
        //loginPassword: {xpath: "//input[starts-with(@id, 'dwfrm_login_password')]"},
        loginPassword: 'input[id^=dwfrm_login_password]',
        firstName: '#dwfrm_profile_customer_firstname',
        lastName: '#dwfrm_profile_customer_lastname',
        email: '#dwfrm_profile_customer_email',
        confirmEmail: '#dwfrm_profile_customer_emailconfirm',
        password: 'dwfrm_profile_login_password',
        confirmPassword: 'dwfrm_profile_login_passwordconfirm'
    },
    button: {
        login: "button[name='dwfrm_login_login']"
    },

    loginOrCreateAccount() {
        I.amOnPage(pageUrl);
        this.confirmTrackingConsent();
        I.click('.fa-user');
        // const iAmLogged = await tryTo(() => this.loginAccount());
        // if (!iAmLogged) {
        //     this.createAccout();
        // }
        this.loginAccount();
    },

    createAccout() {
        I.click(locate('button').withAttr({value: Resource.msg('createAccount')}));
        I.fillField(this.fields.firstName, config.user.firstName);
        I.fillField(this.fields.lastName, config.user.lastName);
        I.fillField(this.fields.email, config.user.email);
        I.fillField(this.fields.confirmEmail, config.user.email);
        I.fillField({xpath: `//input[starts-with(@id, '${this.fields.password}')]`}, config.user.password);
        I.fillField({xpath: `//input[starts-with(@id, '${this.fields.confirmPassword}')]`}, config.user.password);
        I.click(locate('button').withText(Resource.msg('apply')));
    },

    loginAccount() {
        I.click(locate('.user-links a').withText(Resource.msg('login')));
        I.waitForNavigation();
        I.waitForVisible(this.fields.loginEmail, 3);
        I.waitForVisible(this.fields.loginPassword, 3);
        I.fillField(this.fields.loginEmail, config.user.email);
        I.fillField(this.fields.loginPassword, config.user.password);
        I.click(this.button.login);
        I.waitForNavigation();
        //I.click(locate('button').withText(Resource.msg('login')));
        I.seeInCurrentUrl('Account-Show');
        //I.dontSeeElement('.error  -form');
    },

    confirmTrackingConsent() {
        //tryTo(() => I.click(locate('.ui-dialog-buttonset .ui-button').withText('Yes')));
        I.waitForVisible(locate('.ui-dialog-buttonset .ui-button').withText('Yes'))
        I.click(locate('.ui-dialog-buttonset .ui-button').withText('Yes'))
        I.waitForInvisible('.ui-widget-overlay');
    },
};
