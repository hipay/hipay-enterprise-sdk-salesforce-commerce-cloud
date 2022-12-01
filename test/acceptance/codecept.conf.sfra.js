exports.config = {
    tests: './tests/*_test.js',
    output: './output',
    helpers: {
        // TestCafe: {
        //     url: 'https://bdjt-008.sandbox.us01.dx.commercecloud.salesforce.com',
        //     browser: 'chrome',
        //     show: true
        // },
        Puppeteer: {
            url: "http://localhost",
            show: true,
            waitForNavigation: ['networkidle0', 'domcontentloaded'],
            "chrome": {
                "defaultViewport": {
                    "width": 900,
                    "height": 960
                }
            }
        }
    },
    include: {
        checkoutPage: './pages/sfra/checkoutPage.js',
        hostedPage: './pages/hipay/hostedPage.js',
        loginPage: './pages/sfra/loginPage.js'
    },
    bootstrap: null,
    mocha: {},
    name: 'acceptance',
    plugins: {
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
