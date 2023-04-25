'use strict';

var server = require('server');

var CustomerMgr = require('dw/customer/CustomerMgr');
var Transaction = require('dw/system/Transaction');

server.extend(module.superModule);

/**
 * Update customer's last password change date.
 *
 * @param {Customer} customer
 */
function updateCustomerLastPasswordChange(customer) {
    customer.profile.custom.datePasswordLastChange = new Date().toISOString().slice(0, 10).replace(/-/g, '');
}

// Save customer's last password change date on user creation.
//
server.append('SubmitRegistration', function (req, res, next) {
    var registrationForm = res.getViewData();

    if (registrationForm.validForm) {
        this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
            var viewData = res.getViewData();
            if (Object.hasOwnProperty.call(viewData, 'authenticatedCustomer')) {
                Transaction.wrap(function () {
                    updateCustomerLastPasswordChange(viewData.authenticatedCustomer);
                });
            }
        });
    }

    return next();
});

// Save customer's last password change date on password edit.
//
server.append('SavePassword', function (req, res, next) {
    this.on('route:BeforeComplete', function () { // eslint-disable-line no-shadow
        var viewData = res.getViewData();

        if (viewData.success) {
            var customer = CustomerMgr.getCustomerByCustomerNumber(
                req.currentCustomer.profile.customerNo
            );

            if (customer) {
                Transaction.wrap(function () {
                    updateCustomerLastPasswordChange(customer);
                });
            }
        }
    });

    return next();
});

// Save customer's last password change date on password reset.
server.append('SaveNewPassword', server.middleware.https, function (req, res, next) {
    var viewData = res.getViewData();

    // Load by token now, it will be deleted before the on:BeforeComplete
    var resettingCustomer = CustomerMgr.getCustomerByToken(viewData.token);
    viewData.customerNo = resettingCustomer.profile.customerNo;

    this.on('route:BeforeComplete', function (req, res) { // eslint-disable-line no-shadow
        var viewData = res.getViewData();
        var resettingCustomer = CustomerMgr.getCustomerByCustomerNumber(res.getViewData().customerNo);

        if (viewData.passwordForm.valid && viewData.passwordForm.newpassword.valid) {
            Transaction.wrap(function () {
                updateCustomerLastPasswordChange(resettingCustomer);
            });
        }
    });

    return next();
});

module.exports = server.exports();
