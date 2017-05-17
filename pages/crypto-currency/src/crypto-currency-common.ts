import * as $ from 'jquery';
import 'bootstrap';

// Hack because bootstrap 4 sucks: see http://stackoverflow.com/questions/34567939/how-to-fix-the-error-error-bootstrap-tooltips-require-tether-http-github-h
require(['tether'], function (Tether: any) {
  (<any>window).Tether = Tether;
});

$(document).ready(function() {
    $('.network').click(e => {
        e.stopPropagation();
        $('.network').addClass('selected');
        $('.close-network').addClass('selected');
    });
    $('.close-network').click(e => {
        e.stopPropagation();
        $('.network').removeClass('selected');
        $('.close-network').removeClass('selected');
    });
    $(() => $('[data-toggle="popover"]').popover());
});

var consoleError = console.error;
var showErrorNotification = function(content: string) {
    $('body').append(`<div class="notification alert alert-danger alert-dismissable">
        <a href="#" class="close" data-dismiss="alert" aria-label="close">×</a>
        <strong>Error</strong> ${content}
    </div>`)
    consoleError(content);
}
console.error = showErrorNotification;

var consoleInfo = console.info;
var showInfoNotification = function(content: string) {
    $('body').append(`<div class="notification alert alert-info alert-dismissable">
        <a href="#" class="close" data-dismiss="alert" aria-label="close">×</a>
        <strong>Info</strong> ${content}
    </div>`)
    consoleInfo(content);
}
console.info = showInfoNotification;