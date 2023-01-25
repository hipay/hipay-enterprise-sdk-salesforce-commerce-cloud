exports.config = {
    tests: './tests/*_test.js',
    output: './output',
    helpers: {
        Puppeteer: {
            url: 'http://localhost',
            show: true,
            waitForNavigation: ['networkidle0', 'domcontentloaded'],
            windowSize: "1280x960",
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
        screenshotOnFail: {
            enabled: true
        },
        // tryTo: {
        //     enabled: true
        // },
        // stepByStepReport: {
        //     enabled: true
        // }
    }
};
