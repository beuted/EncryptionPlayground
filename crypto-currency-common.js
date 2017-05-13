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

/*function pad (str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
}
var t = "[{ \"from\": \"Bob\", \"to\": \"Alice\", \"amount\": 1, \"date\": 1234567 }, { \"from\": \"Charlie\", \"to\": \"Bob\", \"amount\": 1, \"date\": 3456789 }, { \"from\": \"Alice\", \"to\": \"Bob\", \"amount\": 1, \"date\": 7890123 }]"
var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });

for (var i=0; i < 100000; i++) {
    //  console.log(i)
    md.updateString(t+pad(i, 10)); 
    var l = md.digest();
    if (l[0] == "0" && l[1] == "0" && l[2] == "0")
        console.log(l, i)
}*/


console.error = showErrorNotification;