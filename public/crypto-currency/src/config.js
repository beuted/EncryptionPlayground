// Hack because bootstrap 4 sucks: see http://stackoverflow.com/questions/34567939/how-to-fix-the-error-error-bootstrap-tooltips-require-tether-http-github-h
window.Tether = {};
requirejs.config({
    baseUrl: "./",
    paths: {
        'bootstrap': 'node_modules/bootstrap/dist/js/bootstrap',
        'tether': 'node_modules/tether/dist/js/tether',
        'jquery': 'node_modules/jquery/dist/jquery',
        'jsrsasign': 'vendors/jsrsasign/jsrsasign-all-min',
    },
    shim: {
        'bootstrap': {
            deps: ['tether', 'jquery']
        },
        'jquery': {
            exports: '$'
        }
    }
});
require(['src/index']);
//# sourceMappingURL=config.js.map