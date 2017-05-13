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