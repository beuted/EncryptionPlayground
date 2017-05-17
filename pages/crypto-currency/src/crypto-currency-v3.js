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
define(["require", "exports", "./crypto-currency-v2"], function (require, exports, crypto_currency_v2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NetworkV3 = (function (_super) {
        __extends(NetworkV3, _super);
        function NetworkV3() {
            return _super.call(this) || this;
        }
        NetworkV3.prototype.BroadcastTransactionValidationToUser = function (name, validatorName, messageHash, signedMessageHash) {
            var user = this.GetUser(name);
            user.ReceiveTransactionValidation(validatorName, messageHash, signedMessageHash);
        };
        return NetworkV3;
    }(crypto_currency_v2_1.NetworkV2));
    exports.NetworkV3 = NetworkV3;
    var UserV3 = (function (_super) {
        __extends(UserV3, _super);
        function UserV3(name, privateKey, network) {
            var _this = _super.call(this, name, privateKey, network) || this;
            _this.localBlockValidators = {};
            return _this;
        }
        // Public
        UserV3.prototype.VerifySignedMessageAndAddToBlockChain = function (signedMessage) {
            var _this = this;
            var success = _super.prototype.VerifySignedMessageAndAddToBlockChain.call(this, signedMessage);
            if (success) {
                // Broadcast that the message is valid to all users on the network
                Object.keys(this.localAddressBook).forEach(function (name, value) {
                    _this.network.BroadcastTransactionValidationToUser(name, _this.name, signedMessage.hash, _this.Sign(signedMessage.hash));
                });
            }
            return success;
        };
        UserV3.prototype.ReceiveTransactionValidation = function (validatorName, messageHash, signedMessageHash) {
            // Find the public key in the adress book or in the current user
            var validatorEntry;
            if (validatorName == this.name)
                validatorEntry = { publicKey: this.publicKey };
            else
                validatorEntry = this.localAddressBook[validatorName];
            if (!validatorEntry || !validatorEntry.publicKey) {
                console.error(this.name + ": No validator publicKey found for " + validatorName);
                return false;
            }
            // Message signature match user spending coins (the "from" property)
            if (!this.Verify(messageHash, signedMessageHash, validatorEntry.publicKey)) {
                console.error(this.name + ": User " + validatorName + " signature is not a valid");
                return false;
            }
            // Add the name of the validator to the list of validators of the message (if not already here)
            if (!this.localBlockValidators[messageHash])
                this.localBlockValidators[messageHash] = [];
            if (this.localBlockValidators[messageHash].findIndex(function (name) { return name == validatorName; }) == -1)
                this.localBlockValidators[messageHash].push(validatorName);
            return true;
        };
        UserV3.prototype.IsMessageValidated = function (messageHash) {
            if (this.network.GetGenesisTransaction().hash == messageHash)
                return true;
            if (!this.localBlockValidators[messageHash])
                return false;
            return this.localBlockValidators[messageHash].length / Object.keys(this.localAddressBook).length >= 0.5;
        };
        // Check that at the moment user $username have AT LEAST $amount coins 
        UserV3.prototype.VerifyUserHaveEnoughtCoins = function (username, amount) {
            var credit = 0;
            for (var i = this.localSignedMessages.length - 1; i >= 0; i--) {
                if (!this.IsMessageValidated(this.localSignedMessages[i].hash))
                    continue;
                if (this.localSignedMessages[i].message.to == username)
                    credit += this.localSignedMessages[i].message.amount;
                if (this.localSignedMessages[i].message.from == username)
                    credit -= this.localSignedMessages[i].message.amount;
                if (credit >= amount)
                    return true;
            }
            return false;
        };
        UserV3.prototype.ComputeMoneyForKnownUsers = function () {
            var _this = this;
            // Reset money for all known users
            this.money = 0;
            Object.keys(this.localAddressBook).forEach(function (key, index) {
                _this.localAddressBook[key].money = 0;
            });
            this.localSignedMessages.forEach(function (b) {
                if (!_this.IsMessageValidated(b.hash))
                    return;
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
        return UserV3;
    }(crypto_currency_v2_1.UserV2));
    exports.UserV3 = UserV3;
    var BobPuppetUser = (function (_super) {
        __extends(BobPuppetUser, _super);
        function BobPuppetUser() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        BobPuppetUser.prototype.VerifySignedMessageAndAddToBlockChain = function (signedMessage) {
            var _this = this;
            // !!!!!!!!!!!!!!!! MALICIOUS BEHAVIOR HERE !!!!!!!!!!!!! //              
            if (signedMessage.message.from === "Bob") {
                this.localSignedMessages.push(signedMessage);
                this.network.BroadcastTransactionValidationToUser(signedMessage.message.to, this.name, signedMessage.hash, this.Sign(signedMessage.hash));
                return true;
            }
            // Signature, hash, amount of disponible money,... verification        
            if (!this.VerifySignedMessage(signedMessage))
                return false;
            this.localSignedMessages.push(signedMessage);
            // Broadcast that the message is valid to all users on the network
            Object.keys(this.localAddressBook).forEach(function (name, value) {
                _this.network.BroadcastTransactionValidationToUser(name, _this.name, signedMessage.hash, _this.Sign(signedMessage.hash));
            });
            return true;
        };
        return BobPuppetUser;
    }(UserV3));
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV3 = function () {
        var network = new NetworkV3();
        var alice = new UserV3('Alice', "-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQDRhGF7X4A0ZVlEg594WmODVVUIiiPQs04aLmvfg8SborHss5gQ\nXu0aIdUT6nb5rTh5hD2yfpF2WIW6M8z0WxRhwicgXwi80H1aLPf6lEPPLvN29EhQ\nNjBpkFkAJUbS8uuhJEeKw0cE49g80eBBF4BCqSL6PFQbP9/rByxdxEoAIQIDAQAB\nAoGAA9/q3Zk6ib2GFRpKDLO/O2KMnAfR+b4XJ6zMGeoZ7Lbpi3MW0Nawk9ckVaX0\nZVGqxbSIX5Cvp/yjHHpww+QbUFrw/gCjLiiYjM9E8C3uAF5AKJ0r4GBPl4u8K4bp\nbXeSxSB60/wPQFiQAJVcA5xhZVzqNuF3EjuKdHsw+dk+dPECQQDubX/lVGFgD/xY\nuchz56Yc7VHX+58BUkNSewSzwJRbcueqknXRWwj97SXqpnYfKqZq78dnEF10SWsr\n/NMKi+7XAkEA4PVqDv/OZAbWr4syXZNv/Mpl4r5suzYMMUD9U8B2JIRnrhmGZPzL\nx23N9J4hEJ+Xh8tSKVc80jOkrvGlSv+BxwJAaTOtjA3YTV+gU7Hdza53sCnSw/8F\nYLrgc6NOJtYhX9xqdevbyn1lkU0zPr8mPYg/F84m6MXixm2iuSz8HZoyzwJARi2p\naYZ5/5B2lwroqnKdZBJMGKFpUDn7Mb5hiSgocxnvMkv6NjT66Xsi3iYakJII9q8C\nMa1qZvT/cigmdbAh7wJAQNXyoizuGEltiSaBXx4H29EdXNYWDJ9SS5f070BRbAIl\ndqRh3rcNvpY6BKJqFapda1DjdcncZECMizT/GMrc1w==\n-----END RSA PRIVATE KEY-----", network);
        var bob = new UserV3('Bob', "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\ngHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\nsERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\ngYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\nB2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\nsLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\nijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\nnU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\ng70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\nA1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\nGOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\nN4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n/tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n-----END RSA PRIVATE KEY-----", network);
        var charlie = new UserV3('Charlie', "-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgHNNh/YaZnvIr58+v1MagvNjOzEg18yLVAQeZWpnNzE0qxquB2w2\neM2Rk6V9fh4WS35fatAvPfVqF/y5oZGwQ3v2ebm/AXTzrI+XCxJDRiHqsuIFRl8Z\n98f0zs/NNCHtCLGqdnu0zNdL4OyA+dCeexcch6TUQklkvJRuCTUJRt9TAgMBAAEC\ngYByjMMXj9DjB1Ta+0autDcGwD3tJ/jcoEr+sIgGtrZRb0bSAbUkH9XSPN+XWN5z\n26hyyy7d1yFR8G4WSQGoMJpJdJH3De4RrU7ZCyx8Ln1xgk1DwoJPvOmPNcUftR5f\np3+XuuH/w6CywOtUttNgIdQeR6sIUCvgyCDHHbF5S8iMSQJBAMHKkTs9GEzK3r1s\no7Wgl/Mk4sIiAxExkD3m27IVoCWDD2QZUwLCnbaQqHQNq5GtGRRxs3ciPu4P54XU\nC4RuKD8CQQCYUOu0cW229v4HVCVKeN51vbLDxdch38k9TswrQ1p3EzQuQTdxAkr4\nsvQGSPvyChktlCrr7Qlv9OkmOAFFdSPtAkBzxkInouNOlXCmuC3Bx5Sf1SyHkGxG\nrFahNLeR1+uaHYdnZN2762rvc9K/qp8SY9h050yxYss3zFakFD9hObJfAkEAlW31\n/92z/GcOStRTjV9NKAfGJGioqVPqEtqGVP9L9jwB2ksjABx2vsyZuLzLZ+ZeUyfk\nf/bZZlvIjDUvkhvc9QJATDAOITmhUk/1iADjP1vqdmfVXZRdxs/iJYChQIrck0fb\nhNQeR4DcAUEsr+l+d1ihUflkp+EEyyNEnpgbY0dpsw==\n-----END RSA PRIVATE KEY-----", network);
        var dylan = new UserV3('Dylan', "-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgHoAhy90y1pqYuD+4v8Tg2eggd+/bk75xI3ATSC9ogZikOKNq5u3\ngI9vRaylJhrzqdpdTu5whBY1g2QoOIHcjPmqnsTmHhMU4fNAhvLW+ThfYrwgsYlQ\nYgipJBfwoZm+xc54tZbRhg89s9TXJk3H/d55WPEWN8F6V3nQukwldeqvAgMBAAEC\ngYAUkgY5IC4xXoKxgQhxDa84R73eJf7JXh+f7u6SOKcbAH+BU3W92aDZjl9nDqlw\nHeljohvu5BXBUOCIgKeWbcNvDrNNHfgOjrUjzLJ86IVw4zt5GeV/9XhPoH3rpfG6\nCMJ2FbqRGJYxcPks3FteqAGRPLmAUiHZh/PYlPniuANQ0QJBAPD+noxaKcjlgLX5\nzq2ljkBF+XhP9N9xdD74R1aDbpv5J8WH/UJUUCyoKsG4Iv7m2F7oa2bq1zPoaTWc\n03/95WUCQQCBmTQs4s3xCa/8KF9C5UMmYOlE7sP1T+lT8N+p+pV2j7OHv03GcSG7\nlv9CC6LCyID5/PBbJwVitmh768LUruiDAkB2zN31zGC600A+9PWIrotQbe5L/AZ3\nu+MVQ6lPIZ1+MDYF70LO1udrDD9/nblKtRvGtYZ0hqItyY1Ly5KLjurtAkAB32fc\nmi5lpEExwJeXzN5KiK32PAkC23PArcNdnmxYeT0b4gzKqEnXfxgTKT3h2KnccuY6\nOvcd9QrPd5mqHxjnAkEAydMa7DM1rmj90T7dHpUbyNcqbDgOg5mojEOPgQX2DClc\nxvM6Gba9b8Yz8rS08V0oPVLEUz4IwtX17Hv5y8IuPw==\n-----END RSA PRIVATE KEY-----", network);
        var signedMessage;
        $(document).ready(function () {
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
            $('#Dylan').replaceWith(dylan.GetMarkup());
        });
        window.aliceSend1CoinToBob = function () {
            var message = alice.GetMessage("Bob", 1, Date.now());
            signedMessage = alice.GetSignedMessageWithSerialNumber("Bob", 1, Date.now());
            var sanityCheckOk = alice.VerifySignedMessageAndAddToBlockChain(signedMessage);
            if (sanityCheckOk)
                alice.BroadcastSignedMessage(signedMessage);
            $('#transaction-block').css("display", "block");
            $('.transaction').text(JSON.stringify(message, undefined, 2));
            $('.signed-message').text(JSON.stringify(signedMessage, undefined, 2));
            $('.verify-message').text(sanityCheckOk);
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
            $('#Dylan').replaceWith(dylan.GetMarkup());
        };
        window.broadcastSimultaneousMessages = function () {
            bob.ComputeMoneyForKnownUsers(); // Update bob exact amount of money based on his local blockchain
            var signedMessage1 = bob.GetSignedMessageWithSerialNumber("Alice", bob.money, Date.now());
            var signedMessage2 = bob.GetSignedMessageWithSerialNumber("Charlie", bob.money, Date.now());
            bob.BroadcastToSpecificUser("Alice", signedMessage1);
            bob.BroadcastToSpecificUser("Charlie", signedMessage2);
            bob.BroadcastToSpecificUser("Dylan", signedMessage2);
            if (bob.localAddressBook["BobPuppet1"]) {
                bob.BroadcastToSpecificUser("BobPuppet1", signedMessage1);
                bob.BroadcastToSpecificUser("BobPuppet2", signedMessage1);
                bob.BroadcastToSpecificUser("BobPuppet3", signedMessage1);
                bob.BroadcastToSpecificUser("BobPuppet4", signedMessage1);
                bob.BroadcastToSpecificUser("BobPuppet1", signedMessage2);
                bob.BroadcastToSpecificUser("BobPuppet2", signedMessage2);
                bob.BroadcastToSpecificUser("BobPuppet3", signedMessage2);
                bob.BroadcastToSpecificUser("BobPuppet4", signedMessage2);
            }
            // Bob only add Charlie transaction to his local blockchain
            bob.VerifySignedMessageAndAddToBlockChain(signedMessage2);
            $('#Alice').replaceWith(alice.GetMarkup());
            $('#Bob').replaceWith(bob.GetMarkup());
            $('#Charlie').replaceWith(charlie.GetMarkup());
            $('#Dylan').replaceWith(dylan.GetMarkup());
        };
        var networkSwarmed = false;
        window.swarmNetworkWithBobPuppets = function () {
            if (networkSwarmed)
                return;
            var bobPuppet1 = new BobPuppetUser('BobPuppet1', "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\ngHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\nsERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\ngYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\nB2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\nsLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\nijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\nnU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\ng70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\nA1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\nGOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\nN4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n/tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n-----END RSA PRIVATE KEY-----", network);
            var bobPuppet2 = new BobPuppetUser('BobPuppet2', "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\ngHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\nsERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\ngYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\nB2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\nsLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\nijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\nnU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\ng70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\nA1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\nGOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\nN4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n/tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n-----END RSA PRIVATE KEY-----", network);
            var bobPuppet3 = new BobPuppetUser('BobPuppet3', "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\ngHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\nsERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\ngYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\nB2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\nsLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\nijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\nnU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\ng70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\nA1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\nGOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\nN4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n/tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n-----END RSA PRIVATE KEY-----", network);
            var bobPuppet4 = new BobPuppetUser('BobPuppet4', "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\ngHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\nsERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\ngYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\nB2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\nsLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\nijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\nnU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\ng70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\nA1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\nGOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\nN4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n/tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n-----END RSA PRIVATE KEY-----", network);
            $('#BobPuppet1').replaceWith(bobPuppet1.GetMarkup());
            $('#BobPuppet2').replaceWith(bobPuppet2.GetMarkup());
            $('#BobPuppet3').replaceWith(bobPuppet3.GetMarkup());
            $('#BobPuppet4').replaceWith(bobPuppet4.GetMarkup());
        };
    };
});
