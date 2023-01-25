exports.config = {
    tests: './tests/*_test.js',
    output: './output',
    helpers: {
        Puppeteer: {
            url: 'http://localhost',
            show: true,
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
        checkoutPage: './pages/sfra/checkoutPage.js',
        hostedPage: './pages/hipay/hostedPagev2.js',
        loginPage: './pages/sfra/loginPage.js'
    },
    bootstrap: null,
    mocha: {},
    name: 'acceptance',
    plugins: {
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
