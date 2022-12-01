exports.config = {
    tests: './tests/*_test.js',
    output: './output',
    helpers: {
        // TestCafe: {
        //     url: 'https://bdjt-008.sandbox.us01.dx.commercecloud.salesforce.com',
        //     browser: 'chrome',
        //     show: true
        // }
        Puppeteer: {
            url: 'http://localhost',
            show: false,
            // waitForAction: 1000,
            // waitForNavigation: "networkidle0",
            waitForNavigation: ['networkidle0', 'domcontentloaded'],
            'chrome': {
                'defaultViewport': {
                    'width': 900,
                    'height': 960
                }
            }

        }
    },
    include: {
        checkoutPage: './pages/sitegenesis/checkoutPage.js',
        hostedPage: './pages/hipay/hostedPagev2.js',
        loginPage: './pages/sitegenesis/loginPage.js'
    },
    bootstrap: null,
    mocha: {},
    name: 'acceptance',
    plugins: {
        // autoLogin: {
        //     enabled: true,
        //     saveToFile: false,
        //     inject: 'login',
        //     users: {
        //       user: {
        //         // loginAdmin function is defined in `steps_file.js`
        //         login: (I, loginPage) => I.loginAdmin(),
        //         // if we see `Admin` on page, we assume we are logged in
        //         check: (I) => {
        //            I.amOnPage('/');
        //            I.see('Admin');
        //         }
        //       }
        //     }
        // },
        // autoDelay: {
        //     enabled: true
        // },
        // pauseOnFail: {
        //     enabled: true
        // },
        // retryFailedStep: {
        //     enabled: true
        // },
        screenshotOnFail: {
            enabled: true
        },
        // tryTo: {
        //     enabled: true
        // },
        stepByStepReport: {
            enabled: true
        }
    }
};
