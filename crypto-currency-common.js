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

showErrorNotification = function(content) {
    $('body').append(`<div class="notification alert alert-danger alert-dismissable">
        <a href="#" class="close" data-dismiss="alert" aria-label="close">×</a>
        <strong>Error</strong> ${content}
    </div>`)
    consoleError(content);
}


console.error = showErrorNotification;