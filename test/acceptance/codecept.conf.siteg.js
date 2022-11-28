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
            url: "http://localhost",
            show: true,
            waitForAction: 1000
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
        autoDelay: {
            enabled: true
        },
        retryFailedStep: {
            enabled: true
        },
        screenshotOnFail: {
            enabled: true
        },
        tryTo: {
            enabled: true
        }
    }
};
