exports.config = {
    tests: './tests/*_test.js',
    output: './output',
    helpers: {
        TestCafe: {
            url: '',
            browser: 'chrome',
            show: true
        }
    },
    include: {
        checkoutPage: './pages/sitegenesis/checkoutPage.js',
        loginPage: './pages/sitegenesis/loginPage.js'
    },
    bootstrap: null,
    mocha: {},
    name: 'acceptance',
    plugins: {
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
