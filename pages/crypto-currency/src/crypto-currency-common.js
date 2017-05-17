define(["require", "exports", "jquery", "bootstrap"], function (require, exports, $) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    // Hack because bootstrap 4 sucks: see http://stackoverflow.com/questions/34567939/how-to-fix-the-error-error-bootstrap-tooltips-require-tether-http-github-h
    require(['tether'], function (Tether) {
        window.Tether = Tether;
    });
    $(document).ready(function () {
        $('.network').click(function (e) {
            e.stopPropagation();
            $('.network').addClass('selected');
            $('.close-network').addClass('selected');
        });
        $('.close-network').click(function (e) {
            e.stopPropagation();
            $('.network').removeClass('selected');
            $('.close-network').removeClass('selected');
        });
        $(function () { return $('[data-toggle="popover"]').popover(); });
    });
    // Add a popup for each console.error/info/warning
    var consoleError = console.error;
    var showErrorNotification = function (content) {
        $('body').append("<div class=\"notification alert alert-danger alert-dismissable\">\n        <a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">\u00D7</a>\n        <strong>Error</strong> " + content + "\n    </div>");
        consoleError(content);
    };
    console.error = showErrorNotification;
    var consoleWarn = console.warn;
    var showErrorNotification = function (content) {
        $('body').append("<div class=\"notification alert alert-warning alert-dismissable\">\n        <a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">\u00D7</a>\n        <strong>Error</strong> " + content + "\n    </div>");
        consoleWarn(content);
    };
    console.warn = showErrorNotification;
    var consoleInfo = console.info;
    var showInfoNotification = function (content) {
        $('body').append("<div class=\"notification alert alert-info alert-dismissable\">\n        <a href=\"#\" class=\"close\" data-dismiss=\"alert\" aria-label=\"close\">\u00D7</a>\n        <strong>Info</strong> " + content + "\n    </div>");
        consoleInfo(content);
    };
    console.info = showInfoNotification;
});
