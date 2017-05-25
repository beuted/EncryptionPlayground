let express = require('express');

function init() {
    let app = express();
    let instance = require('http').createServer(app);
    let port = process.env.PORT || 3000;

    // Serve client files
    app.use(express.static('public'));
    
    var server = app.listen(port, () => {
        console.log('EncryptionPlayground is running at localhost:' + port);
    });
};

init();