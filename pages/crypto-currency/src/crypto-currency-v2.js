var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
define(["require", "exports", "./crypto-currency-v1"], function (require, exports, crypto_currency_v1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NetworkV2 = (function (_super) {
        __extends(NetworkV2, _super);
        function NetworkV2() {
            return _super.call(this) || this;
        }
        // The Genesis transaction gives Alice for 50 coins to bootstrap the network
        // (More on bitcoin Genesis block here: https://en.bitcoin.it/wiki/Genesis_block)
        // V2: new Genesis transaction with hash
        NetworkV2.prototype.GenerateGenesisTransaction = function () {
            var previousGenesisTransllation = _super.prototype.GenerateGenesisTransaction.call(this);
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(previousGenesisTransllation.message));
            previousGenesisTransllation.hash = md.digest();
            return previousGenesisTransllation;
        };
        return NetworkV2;
    }(crypto_currency_v1_1.Network));
    exports.NetworkV2 = NetworkV2;
    var UserV2 = (function (_super) {
        __extends(UserV2, _super);
        function UserV2(name, privateKey, network) {
            return _super.call(this, name, privateKey, network) || this;
        }
        UserV2.prototype.GetSignedMessageWithSerialNumber = function (receiver, amount, date) {
            // Get previous signed message
            var signedMessage = this.GetSignedMessage(receiver, amount, date);
            // Add a hash to it
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(signedMessage.message));
            signedMessage.hash = md.digest();
            return signedMessage;
        };
        UserV2.prototype.VerifySignedMessage = function (signedMessage) {
            // All previous checks
            if (!_super.prototype.VerifySignedMessage.call(this, signedMessage))
                return false;
            // Verify that Hash match message
            if (!this.IsAValidHash(signedMessage.hash, signedMessage.message)) {
                console.error(this.name + ": Hash does not match message: " + signedMessage.hash);
                return false;
            }
            // Verify that there is no hash similarities
            if (this.localSignedMessages.findIndex(function (x) { return x.hash == signedMessage.hash; }) !== -1) {
                console.error(this.name + ": A message with a similar hash have been found: " + signedMessage.hash);
                return false;
            }
            return true;
        };
        UserV2.prototype.IsAValidHash = function (hash, message) {
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(message));
            return hash == md.digest();
        };
        // Malicious
        UserV2.prototype.BroadcastToSpecificUser = function (username, signedMessage) {
            this.network.BroadcastToUser(username, signedMessage);
        };
        return UserV2;
    }(crypto_currency_v1_1.User));
    exports.UserV2 = UserV2;
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV2 = function () {
        var network = new NetworkV2();
        var alice = new UserV2('Alice', "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgQDRhGF7X4A0ZVlEg594WmODVVUIiiPQs04aLmvfg8SborHss5gQ\n    Xu0aIdUT6nb5rTh5hD2yfpF2WIW6M8z0WxRhwicgXwi80H1aLPf6lEPPLvN29EhQ\n    NjBpkFkAJUbS8uuhJEeKw0cE49g80eBBF4BCqSL6PFQbP9/rByxdxEoAIQIDAQAB\n    AoGAA9/q3Zk6ib2GFRpKDLO/O2KMnAfR+b4XJ6zMGeoZ7Lbpi3MW0Nawk9ckVaX0\n    ZVGqxbSIX5Cvp/yjHHpww+QbUFrw/gCjLiiYjM9E8C3uAF5AKJ0r4GBPl4u8K4bp\n    bXeSxSB60/wPQFiQAJVcA5xhZVzqNuF3EjuKdHsw+dk+dPECQQDubX/lVGFgD/xY\n    uchz56Yc7VHX+58BUkNSewSzwJRbcueqknXRWwj97SXqpnYfKqZq78dnEF10SWsr\n    /NMKi+7XAkEA4PVqDv/OZAbWr4syXZNv/Mpl4r5suzYMMUD9U8B2JIRnrhmGZPzL\n    x23N9J4hEJ+Xh8tSKVc80jOkrvGlSv+BxwJAaTOtjA3YTV+gU7Hdza53sCnSw/8F\n    YLrgc6NOJtYhX9xqdevbyn1lkU0zPr8mPYg/F84m6MXixm2iuSz8HZoyzwJARi2p\n    aYZ5/5B2lwroqnKdZBJMGKFpUDn7Mb5hiSgocxnvMkv6NjT66Xsi3iYakJII9q8C\n    Ma1qZvT/cigmdbAh7wJAQNXyoizuGEltiSaBXx4H29EdXNYWDJ9SS5f070BRbAIl\n    dqRh3rcNvpY6BKJqFapda1DjdcncZECMizT/GMrc1w==\n    -----END RSA PRIVATE KEY-----", network);
        var bob = new UserV2('Bob', "-----BEGIN RSA PRIVATE KEY-----\n    MIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\n    gHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\n    sERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\n    gYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\n    B2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\n    sLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\n    ijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\n    nU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\n    g70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\n    A1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\n    GOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\n    N4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n    /tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n    -----END RSA PRIVATE KEY-----", network);
        var charlie = new UserV2('Charlie', "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgHNNh/YaZnvIr58+v1MagvNjOzEg18yLVAQeZWpnNzE0qxquB2w2\n    eM2Rk6V9fh4WS35fatAvPfVqF/y5oZGwQ3v2ebm/AXTzrI+XCxJDRiHqsuIFRl8Z\n    98f0zs/NNCHtCLGqdnu0zNdL4OyA+dCeexcch6TUQklkvJRuCTUJRt9TAgMBAAEC\n    gYByjMMXj9DjB1Ta+0autDcGwD3tJ/jcoEr+sIgGtrZRb0bSAbUkH9XSPN+XWN5z\n    26hyyy7d1yFR8G4WSQGoMJpJdJH3De4RrU7ZCyx8Ln1xgk1DwoJPvOmPNcUftR5f\n    p3+XuuH/w6CywOtUttNgIdQeR6sIUCvgyCDHHbF5S8iMSQJBAMHKkTs9GEzK3r1s\n    o7Wgl/Mk4sIiAxExkD3m27IVoCWDD2QZUwLCnbaQqHQNq5GtGRRxs3ciPu4P54XU\n    C4RuKD8CQQCYUOu0cW229v4HVCVKeN51vbLDxdch38k9TswrQ1p3EzQuQTdxAkr4\n    svQGSPvyChktlCrr7Qlv9OkmOAFFdSPtAkBzxkInouNOlXCmuC3Bx5Sf1SyHkGxG\n    rFahNLeR1+uaHYdnZN2762rvc9K/qp8SY9h050yxYss3zFakFD9hObJfAkEAlW31\n    /92z/GcOStRTjV9NKAfGJGioqVPqEtqGVP9L9jwB2ksjABx2vsyZuLzLZ+ZeUyfk\n    f/bZZlvIjDUvkhvc9QJATDAOITmhUk/1iADjP1vqdmfVXZRdxs/iJYChQIrck0fb\n    hNQeR4DcAUEsr+l+d1ihUflkp+EEyyNEnpgbY0dpsw==\n    -----END RSA PRIVATE KEY-----", network);
        var signedMessage;
        $(document).ready(function () {
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        });
        window.aliceSend1CoinToBob = function () {
            var message = alice.GetMessage("Bob", 1, Date.now());
            signedMessage = alice.GetSignedMessageWithSerialNumber("Bob", 1, Date.now());
            var isOk = bob.VerifySignedMessageAndAddToBlockChain(signedMessage);
            if (isOk)
                bob.BroadcastSignedMessage(signedMessage);
            $('#transaction-block').css("display", "block");
            $('.transaction').text(JSON.stringify(message, undefined, 2));
            $('.signed-message').text(JSON.stringify(signedMessage, undefined, 2));
            $('.verify-message').text(isOk ? "valid" : "invalid");
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        };
        window.broadcastSameMessage = function () {
            if (!signedMessage) {
                alert('First send a legit message to be able to replay it');
                return;
            }
            bob.BroadcastSignedMessage(signedMessage);
            // Refresh UI
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        };
        window.broadcastDifferentMessages = function () {
            if (!signedMessage) {
                alert('First send a legit message to be able to replay it with a different date');
                return;
            }
            var modifiedMessage = Object.assign({}, signedMessage);
            modifiedMessage.message.date = Date.now();
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(modifiedMessage));
            modifiedMessage.hash = md.digest();
            bob.BroadcastSignedMessage(modifiedMessage);
            // Refresh UI
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        };
        window.broadcastSimultaneousMessages = function () {
            bob.ComputeMoneyForKnownUsers(); // Update bob exact amount of money based on his local blockchain
            var signedMessage1 = bob.GetSignedMessageWithSerialNumber("Alice", bob.money, Date.now());
            var signedMessage2 = bob.GetSignedMessageWithSerialNumber("Charlie", bob.money, Date.now());
            bob.BroadcastToSpecificUser("Alice", signedMessage1);
            bob.BroadcastToSpecificUser("Charlie", signedMessage2);
            // Bob only add Alice transaction to his local blockchain
            bob.VerifySignedMessageAndAddToBlockChain(signedMessage1);
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
        };
    };
});
