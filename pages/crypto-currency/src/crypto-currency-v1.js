define(["require", "exports", "jsrsasign", "jquery"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var Network = (function () {
        function Network() {
            this.users = [];
            this.genesisTranslation = this.GenerateGenesisTransaction();
        }
        Network.prototype.Register = function (user) {
            this.users.forEach(function (u) {
                u.AddUserToLocalAddressBook(user);
                user.AddUserToLocalAddressBook(u);
            });
            this.users.push(user);
            return user;
        };
        Network.prototype.BroadcastToUser = function (name, signedMessage) {
            var user = this.GetUser(name);
            user.VerifySignedMessageAndAddToBlockChain(signedMessage);
        };
        Network.prototype.GetGenesisTransaction = function () {
            return this.genesisTranslation;
        };
        // Private
        Network.prototype.GetUser = function (name) {
            return this.users.find(function (u) { return u.name == name; });
        };
        // The Genesis transaction rewards Alice for 50 coins to bootstrap the network
        // (More on bitcoin Genesis block here: https://en.bitcoin.it/wiki/Genesis_block)
        Network.prototype.GenerateGenesisTransaction = function () {
            // -- All the following part should be executed and then destroy after just keeping the signedMessage
            // so that no-one can ever know the private key of Root
            var privateKey = "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgFIfldeOqEmzwGy/kD0Yatc0ym9NMxxsmu8Yyjum4xQYE0TUv/Yt\n5BUIfaG2ao6RClDs4trRGWQNRehbo9LKDbXRwH0ZmlWazR6mE3cKVQ54ah+fpQbe\nJTKSI1Im6PIIYOwmW40mRdB88ZEUD1HquOMWanQ+EP7+D7NSfZjI0HQbAgMBAAEC\ngYAD0mh80azPUUhBR2EFFt/SCCjrqSIZzowfWH4A7LFgvAYZi/UrFdOpju2Z2w12\neRWL0pp0KIsP9vYr7CfhpXmh0RF/hMYvACIEEpO+VKZ6IqknVJQ+arYTaqpqBqFt\nxV+lOUEMVGNA81WbidCWkuvc0zFMwy4m5yVs9sjpOWkJYQJBAJbdWLH3ouEmfDdN\nTdk5jUHeVIJrJJ+jN0D6Ya20KVjDzeLnjje62/vK2XcLNmn1SZVfXoAuOMdHEFRk\nfb6QnnMCQQCLWp2VUiPXnTdzUmxOaqxChkEl/bQABOifELVLwm55Gvg/57FBgUY1\nD09qTxy4H8fqSV44hW6lNr/ZLWrAMoG5AkBHoEF7BTJsqQPykZ4zUvKw4ijHXq0d\nqbUTAY0cllvHC/eVEhDgfrPwwKcssMMd3VoZNBU+0DMe0at8FdXpgunnAkBEJJBw\nRxVNxwwpcUGS6ujHMv1ChZfydnQF7Faq8C2zPLPuE+8CmCNrqMvtsTfa9Xd9oljX\njK/5TBduLJ5J06jJAkAXxbUaC/i8Jd3sjpKnI5zSwTri33sMCr5ko2ixHLAdPkvI\n3JEmuTcyHcPocz1//pIDzLofwkYdmnCSyYpDBzoe\n-----END RSA PRIVATE KEY-----";
            var rsa = new RSAKey();
            rsa.readPrivateKeyFromPEMString(privateKey);
            var genesisTransaction = { from: "Root", to: "Alice", amount: 50, date: Date.now() };
            return {
                message: genesisTransaction,
                signature: rsa.signString(genesisTransaction, 'sha256')
            };
        };
        return Network;
    }());
    exports.Network = Network;
    var User = (function () {
        function User(name, privateKey, network) {
            this.name = name;
            this.network = network;
            this.money = 0;
            this.privateKey = privateKey;
            this.publicKey = KEYUTIL.getKey(this.privateKey);
            this.GenrerateRsa();
            this.localSignedMessages = [];
            this.localSignedMessages.push(this.network.GetGenesisTransaction()); // Init the local chain of transaction with genesis one
            this.localAddressBook = {};
            this.network.Register(this);
        }
        User.prototype.GetMarkup = function () {
            var _this = this;
            this.ComputeMoneyForKnownUsers();
            return "<div class=\"user-container\" id=\"" + this.name + "\"><div class=\"card user\"><div class=\"card-block\">\n            <h4>\n                " + this.name + "\n                <label class=\"privateKey\" data-container=\"body\" data-placement=\"top\" data-trigger=\"hover\" data-toggle=\"popover\" data-content=\"" + this.privateKey.replace(/"/g, '\'') + "\">\uD83D\uDD11</label>\n            </h4>\n            <ul>\n                <li>Money I think I Own: <b>" + this.money + "$</b></li>\n                <li class=\"localBlockChain hover-to-see\">localBlockChain (" + this.localSignedMessages.length + "): <code>" + JSON.stringify(this.localSignedMessages, undefined, 2) + "</code></li>\n                <li class=\"localAddressBook hover-to-see\">localAddressBook (" + Object.keys(this.localAddressBook).length + "): <code>" + JSON.stringify(Object.keys(this.localAddressBook).map(function (key, index) { return { name: key, publicKey: '[...]', money: _this.localAddressBook[key].money }; }), undefined, 2) + "</code></li>\n            </ul>\n        </div></div></div>";
        };
        User.prototype.GetMessage = function (receiver, amount, date) {
            return { from: this.name, to: receiver, amount: amount, date: date };
        };
        User.prototype.GetSignedMessage = function (receiver, amount, date) {
            var message = this.GetMessage(receiver, amount, date);
            return {
                message: message,
                signature: this.Sign(JSON.stringify(message))
            };
        };
        User.prototype.VerifySignedMessage = function (signedMessage) {
            // Find the public key in the adress book or in the current user
            var debitorEntry;
            if (signedMessage.message.from == this.name)
                debitorEntry = { publicKey: this.publicKey };
            else
                debitorEntry = this.localAddressBook[signedMessage.message.from];
            if (!debitorEntry || !debitorEntry.publicKey) {
                console.error(this.name + " : No debitor publicKey found for " + signedMessage.message.from);
                return false;
            }
            // Message signature match user spending coins (the "from" property)
            if (!this.Verify(JSON.stringify(signedMessage.message), signedMessage.signature, debitorEntry.publicKey)) {
                console.error(this.name + " : User " + signedMessage.message.from + " signature is not a valid");
                return false;
            }
            // Verification that user have enougth coins
            if (!this.VerifyUserHaveEnoughtCoins(signedMessage.message.from, signedMessage.message.amount)) {
                console.error(this.name + " : User " + signedMessage.message.from + " don't have " + signedMessage.message.amount + " to spend");
                return false;
            }
            return true;
        };
        User.prototype.BroadcastSignedMessage = function (signedMessage) {
            var _this = this;
            Object.keys(this.localAddressBook).forEach(function (name, value) {
                _this.network.BroadcastToUser(name, signedMessage);
            });
        };
        User.prototype.ComputeMoneyForKnownUsers = function () {
            var _this = this;
            // Reset money for all known users
            this.money = 0;
            Object.keys(this.localAddressBook).forEach(function (key, index) {
                _this.localAddressBook[key].money = 0;
            });
            this.localSignedMessages.forEach(function (b) {
                if (b.message.from == _this.name)
                    _this.money -= b.message.amount;
                else if (_this.localAddressBook[b.message.from])
                    _this.localAddressBook[b.message.from].money -= b.message.amount;
                if (b.message.to == _this.name)
                    _this.money += b.message.amount;
                else if (_this.localAddressBook[b.message.to])
                    _this.localAddressBook[b.message.to].money += b.message.amount;
            });
        };
        User.prototype.VerifySignedMessageAndAddToBlockChain = function (signedMessage) {
            // Signature, amount of disponible money,... verification
            if (!this.VerifySignedMessage(signedMessage)) {
                return false;
            }
            this.localSignedMessages.push(signedMessage);
            return true;
        };
        User.prototype.AddUserToLocalAddressBook = function (user) {
            this.localAddressBook[user.name] = { publicKey: user.publicKey, money: 0 };
        };
        User.prototype.GenrerateRsa = function () {
            this.rsa = new RSAKey();
            this.rsa.readPrivateKeyFromPEMString(this.privateKey);
        };
        // Check that at the moment user $username have AT LEAST $amount coins 
        User.prototype.VerifyUserHaveEnoughtCoins = function (username, amount) {
            var credit = 0;
            for (var i = this.localSignedMessages.length - 1; i >= 0; i--) {
                if (this.localSignedMessages[i].message.to == username)
                    credit += this.localSignedMessages[i].message.amount;
                if (this.localSignedMessages[i].message.from == username)
                    credit -= this.localSignedMessages[i].message.amount;
                if (credit >= amount)
                    return true;
            }
            return false;
        };
        User.prototype.Sign = function (message) {
            return this.rsa.signString(message, 'sha256');
        };
        User.prototype.Verify = function (message, signature, publicKey) {
            return publicKey.verifyString(message, signature);
        };
        return User;
    }());
    exports.User = User;
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV1 = function () {
        // UI interactions
        var network = new Network();
        var alice = new User('Alice', "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgQDRhGF7X4A0ZVlEg594WmODVVUIiiPQs04aLmvfg8SborHss5gQ\n    Xu0aIdUT6nb5rTh5hD2yfpF2WIW6M8z0WxRhwicgXwi80H1aLPf6lEPPLvN29EhQ\n    NjBpkFkAJUbS8uuhJEeKw0cE49g80eBBF4BCqSL6PFQbP9/rByxdxEoAIQIDAQAB\n    AoGAA9/q3Zk6ib2GFRpKDLO/O2KMnAfR+b4XJ6zMGeoZ7Lbpi3MW0Nawk9ckVaX0\n    ZVGqxbSIX5Cvp/yjHHpww+QbUFrw/gCjLiiYjM9E8C3uAF5AKJ0r4GBPl4u8K4bp\n    bXeSxSB60/wPQFiQAJVcA5xhZVzqNuF3EjuKdHsw+dk+dPECQQDubX/lVGFgD/xY\n    uchz56Yc7VHX+58BUkNSewSzwJRbcueqknXRWwj97SXqpnYfKqZq78dnEF10SWsr\n    /NMKi+7XAkEA4PVqDv/OZAbWr4syXZNv/Mpl4r5suzYMMUD9U8B2JIRnrhmGZPzL\n    x23N9J4hEJ+Xh8tSKVc80jOkrvGlSv+BxwJAaTOtjA3YTV+gU7Hdza53sCnSw/8F\n    YLrgc6NOJtYhX9xqdevbyn1lkU0zPr8mPYg/F84m6MXixm2iuSz8HZoyzwJARi2p\n    aYZ5/5B2lwroqnKdZBJMGKFpUDn7Mb5hiSgocxnvMkv6NjT66Xsi3iYakJII9q8C\n    Ma1qZvT/cigmdbAh7wJAQNXyoizuGEltiSaBXx4H29EdXNYWDJ9SS5f070BRbAIl\n    dqRh3rcNvpY6BKJqFapda1DjdcncZECMizT/GMrc1w==\n    -----END RSA PRIVATE KEY-----", network);
        var bob = new User('Bob', "-----BEGIN RSA PRIVATE KEY-----\n    MIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\n    gHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\n    sERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\n    gYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\n    B2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\n    sLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\n    ijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\n    nU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\n    g70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\n    A1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\n    GOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\n    N4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n    /tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n    -----END RSA PRIVATE KEY-----", network);
        var charlie = new User('Charlie', "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgHNNh/YaZnvIr58+v1MagvNjOzEg18yLVAQeZWpnNzE0qxquB2w2\n    eM2Rk6V9fh4WS35fatAvPfVqF/y5oZGwQ3v2ebm/AXTzrI+XCxJDRiHqsuIFRl8Z\n    98f0zs/NNCHtCLGqdnu0zNdL4OyA+dCeexcch6TUQklkvJRuCTUJRt9TAgMBAAEC\n    gYByjMMXj9DjB1Ta+0autDcGwD3tJ/jcoEr+sIgGtrZRb0bSAbUkH9XSPN+XWN5z\n    26hyyy7d1yFR8G4WSQGoMJpJdJH3De4RrU7ZCyx8Ln1xgk1DwoJPvOmPNcUftR5f\n    p3+XuuH/w6CywOtUttNgIdQeR6sIUCvgyCDHHbF5S8iMSQJBAMHKkTs9GEzK3r1s\n    o7Wgl/Mk4sIiAxExkD3m27IVoCWDD2QZUwLCnbaQqHQNq5GtGRRxs3ciPu4P54XU\n    C4RuKD8CQQCYUOu0cW229v4HVCVKeN51vbLDxdch38k9TswrQ1p3EzQuQTdxAkr4\n    svQGSPvyChktlCrr7Qlv9OkmOAFFdSPtAkBzxkInouNOlXCmuC3Bx5Sf1SyHkGxG\n    rFahNLeR1+uaHYdnZN2762rvc9K/qp8SY9h050yxYss3zFakFD9hObJfAkEAlW31\n    /92z/GcOStRTjV9NKAfGJGioqVPqEtqGVP9L9jwB2ksjABx2vsyZuLzLZ+ZeUyfk\n    f/bZZlvIjDUvkhvc9QJATDAOITmhUk/1iADjP1vqdmfVXZRdxs/iJYChQIrck0fb\n    hNQeR4DcAUEsr+l+d1ihUflkp+EEyyNEnpgbY0dpsw==\n    -----END RSA PRIVATE KEY-----", network);
        var signedMessage;
        $(document).ready(function () {
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        });
        window.aliceSend1CoinToBob = function () {
            var now = Date.now();
            var message = alice.GetMessage("Bob", 1, now);
            signedMessage = alice.GetSignedMessage("Bob", 1, now);
            var isOk = bob.VerifySignedMessageAndAddToBlockChain(signedMessage);
            if (isOk) {
                bob.BroadcastSignedMessage(signedMessage);
            }
            $('#transaction-block').css("display", "block");
            $('.transaction').text(JSON.stringify(message, undefined, 2));
            $('.signed-message').text(JSON.stringify(signedMessage, undefined, 2));
            $('.verify-message').text(isOk ? "valid" : "invalid");
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        };
        window.broadcastMessage10Times = function () {
            if (!signedMessage) {
                alert('First send a legit message to be able to replay it');
                return;
            }
            for (var i = 0; i < 10; i++) {
                bob.VerifySignedMessageAndAddToBlockChain(signedMessage);
                bob.BroadcastSignedMessage(signedMessage);
            }
            // Refresh UI
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        };
    };
});
