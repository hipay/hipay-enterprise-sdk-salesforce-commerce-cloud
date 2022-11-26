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
        checkoutPage: './pages/sfra/checkoutPage.js',
        hostedPage: './pages/hipay/hostedPage.js',
        loginPage: './pages/sfra/loginPage.js'
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
