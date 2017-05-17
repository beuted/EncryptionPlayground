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
define(["require", "exports", "./crypto-currency-v4"], function (require, exports, crypto_currency_v4_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NetworkV5 = (function (_super) {
        __extends(NetworkV5, _super);
        function NetworkV5() {
            return _super.call(this) || this;
        }
        return NetworkV5;
    }(crypto_currency_v4_1.NetworkV4));
    exports.NetworkV5 = NetworkV5;
    var UserV5 = (function (_super) {
        __extends(UserV5, _super);
        function UserV5(name, privateKey, network) {
            return _super.call(this, name, privateKey, network) || this;
        }
        UserV5.prototype.GetMessage = function (receiver, amount, date, isRewarded) {
            if (isRewarded === void 0) { isRewarded = false; }
            return { from: isRewarded ? "Root" : this.name, to: receiver, amount: amount, date: date };
        };
        UserV5.prototype.GetSignedMessageWithSerialNumber = function (receiver, amount, date, isRewarded) {
            if (isRewarded === void 0) { isRewarded = false; }
            var message = this.GetMessage(receiver, amount, date, isRewarded);
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(message));
            return {
                message: message,
                signature: this.Sign(JSON.stringify(message)),
                hash: md.digest()
            };
        };
        UserV5.prototype.ReceiveBlockValidation = function (block) {
            var _this = this;
            // Check that the proof-of-work is indeed a valid hash of the block
            if (!this.ValidateBlockHash(block)) {
                return false;
            }
            // Verify each messages in the block has a valid signature, unique hash and that user spending coins have these coins
            var isValid = true;
            block.transactions.forEach(function (signedMessage, i) {
                // Exception made for first transaction that is allowed to reward a user with 25 potato-coins
                if (i == 0) {
                    if (signedMessage.message.amount <= 25
                        && _this.IsAValidHash(signedMessage.hash, signedMessage.message)
                        && !_this.IsHashAlreadyInBlockChain(signedMessage.hash)) {
                        return false;
                    }
                    else {
                        console.error(_this.name + ": Invalid reward signedMessage: " + JSON.stringify(signedMessage));
                        isValid = false;
                        return true;
                    }
                }
                if (!_this.VerifySignedMessage(signedMessage)) {
                    isValid = false;
                    return true;
                }
            });
            if (!isValid) {
                return false;
            }
            // Add the block to local block-chain
            this.localBlockChain[block.proofOfWork] = block;
            // Remove validated transactions from the unvalidatedTransactions list
            this.RemoveValidatedTransactions(block.transactions);
        };
        UserV5.prototype.Mine = function () {
            if (this.unvalidatedTransactions.length >= 10) {
                var transactionList = this.unvalidatedTransactions.slice(0, 10);
                // Add a reward of 25 potato-coins at the beginning of the block
                transactionList.unshift(this.GetSignedMessageWithSerialNumber(this.name, 25, Date.now(), true));
                var beginTime = Date.now();
                var message = crypto_currency_v4_1.Helpers.FindValidHash(transactionList);
                var timeSpentMiningBlock = (Date.now() - beginTime) / 1000;
                console.info(this.name + ": Took " + timeSpentMiningBlock + "s to mine a block");
                if (message) {
                    var block = new crypto_currency_v4_1.Block(transactionList, message.hash, message.nonce);
                    this.BroadcastValidatedBlock(block);
                    this.ReceiveBlockValidation(block);
                    return true;
                }
            }
            else {
                console.info(this.name + ": Can't mine a block if less than 10 transactions are waiting.");
            }
            return false;
        };
        return UserV5;
    }(crypto_currency_v4_1.UserV4));
    exports.UserV5 = UserV5;
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV5 = function () {
        var network = new NetworkV5();
        var alice = new UserV5("Alice", "-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgQDRhGF7X4A0ZVlEg594WmODVVUIiiPQs04aLmvfg8SborHss5gQ\nXu0aIdUT6nb5rTh5hD2yfpF2WIW6M8z0WxRhwicgXwi80H1aLPf6lEPPLvN29EhQ\nNjBpkFkAJUbS8uuhJEeKw0cE49g80eBBF4BCqSL6PFQbP9/rByxdxEoAIQIDAQAB\nAoGAA9/q3Zk6ib2GFRpKDLO/O2KMnAfR+b4XJ6zMGeoZ7Lbpi3MW0Nawk9ckVaX0\nZVGqxbSIX5Cvp/yjHHpww+QbUFrw/gCjLiiYjM9E8C3uAF5AKJ0r4GBPl4u8K4bp\nbXeSxSB60/wPQFiQAJVcA5xhZVzqNuF3EjuKdHsw+dk+dPECQQDubX/lVGFgD/xY\nuchz56Yc7VHX+58BUkNSewSzwJRbcueqknXRWwj97SXqpnYfKqZq78dnEF10SWsr\n/NMKi+7XAkEA4PVqDv/OZAbWr4syXZNv/Mpl4r5suzYMMUD9U8B2JIRnrhmGZPzL\nx23N9J4hEJ+Xh8tSKVc80jOkrvGlSv+BxwJAaTOtjA3YTV+gU7Hdza53sCnSw/8F\nYLrgc6NOJtYhX9xqdevbyn1lkU0zPr8mPYg/F84m6MXixm2iuSz8HZoyzwJARi2p\naYZ5/5B2lwroqnKdZBJMGKFpUDn7Mb5hiSgocxnvMkv6NjT66Xsi3iYakJII9q8C\nMa1qZvT/cigmdbAh7wJAQNXyoizuGEltiSaBXx4H29EdXNYWDJ9SS5f070BRbAIl\ndqRh3rcNvpY6BKJqFapda1DjdcncZECMizT/GMrc1w==\n-----END RSA PRIVATE KEY-----", network);
        var bob = new UserV5("Bob", "-----BEGIN RSA PRIVATE KEY-----\nMIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\ngHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\nsERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\ngYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\nB2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\nsLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\nijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\nnU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\ng70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\nA1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\nGOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\nN4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n/tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n-----END RSA PRIVATE KEY-----", network);
        var charlie = new UserV5("Charlie", "-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgHNNh/YaZnvIr58+v1MagvNjOzEg18yLVAQeZWpnNzE0qxquB2w2\neM2Rk6V9fh4WS35fatAvPfVqF/y5oZGwQ3v2ebm/AXTzrI+XCxJDRiHqsuIFRl8Z\n98f0zs/NNCHtCLGqdnu0zNdL4OyA+dCeexcch6TUQklkvJRuCTUJRt9TAgMBAAEC\ngYByjMMXj9DjB1Ta+0autDcGwD3tJ/jcoEr+sIgGtrZRb0bSAbUkH9XSPN+XWN5z\n26hyyy7d1yFR8G4WSQGoMJpJdJH3De4RrU7ZCyx8Ln1xgk1DwoJPvOmPNcUftR5f\np3+XuuH/w6CywOtUttNgIdQeR6sIUCvgyCDHHbF5S8iMSQJBAMHKkTs9GEzK3r1s\no7Wgl/Mk4sIiAxExkD3m27IVoCWDD2QZUwLCnbaQqHQNq5GtGRRxs3ciPu4P54XU\nC4RuKD8CQQCYUOu0cW229v4HVCVKeN51vbLDxdch38k9TswrQ1p3EzQuQTdxAkr4\nsvQGSPvyChktlCrr7Qlv9OkmOAFFdSPtAkBzxkInouNOlXCmuC3Bx5Sf1SyHkGxG\nrFahNLeR1+uaHYdnZN2762rvc9K/qp8SY9h050yxYss3zFakFD9hObJfAkEAlW31\n/92z/GcOStRTjV9NKAfGJGioqVPqEtqGVP9L9jwB2ksjABx2vsyZuLzLZ+ZeUyfk\nf/bZZlvIjDUvkhvc9QJATDAOITmhUk/1iADjP1vqdmfVXZRdxs/iJYChQIrck0fb\nhNQeR4DcAUEsr+l+d1ihUflkp+EEyyNEnpgbY0dpsw==\n-----END RSA PRIVATE KEY-----", network);
        var dylan = new UserV5("Dylan", "-----BEGIN RSA PRIVATE KEY-----\nMIICWwIBAAKBgHoAhy90y1pqYuD+4v8Tg2eggd+/bk75xI3ATSC9ogZikOKNq5u3\ngI9vRaylJhrzqdpdTu5whBY1g2QoOIHcjPmqnsTmHhMU4fNAhvLW+ThfYrwgsYlQ\nYgipJBfwoZm+xc54tZbRhg89s9TXJk3H/d55WPEWN8F6V3nQukwldeqvAgMBAAEC\ngYAUkgY5IC4xXoKxgQhxDa84R73eJf7JXh+f7u6SOKcbAH+BU3W92aDZjl9nDqlw\nHeljohvu5BXBUOCIgKeWbcNvDrNNHfgOjrUjzLJ86IVw4zt5GeV/9XhPoH3rpfG6\nCMJ2FbqRGJYxcPks3FteqAGRPLmAUiHZh/PYlPniuANQ0QJBAPD+noxaKcjlgLX5\nzq2ljkBF+XhP9N9xdD74R1aDbpv5J8WH/UJUUCyoKsG4Iv7m2F7oa2bq1zPoaTWc\n03/95WUCQQCBmTQs4s3xCa/8KF9C5UMmYOlE7sP1T+lT8N+p+pV2j7OHv03GcSG7\nlv9CC6LCyID5/PBbJwVitmh768LUruiDAkB2zN31zGC600A+9PWIrotQbe5L/AZ3\nu+MVQ6lPIZ1+MDYF70LO1udrDD9/nblKtRvGtYZ0hqItyY1Ly5KLjurtAkAB32fc\nmi5lpEExwJeXzN5KiK32PAkC23PArcNdnmxYeT0b4gzKqEnXfxgTKT3h2KnccuY6\nOvcd9QrPd5mqHxjnAkEAydMa7DM1rmj90T7dHpUbyNcqbDgOg5mojEOPgQX2DClc\nxvM6Gba9b8Yz8rS08V0oPVLEUz4IwtX17Hv5y8IuPw==\n-----END RSA PRIVATE KEY-----", network);
        var signedMessage;
        $(document).ready(function () {
            $("#Alice").replaceWith(alice.GetMarkup());
            $("#Bob").replaceWith(bob.GetMarkup());
            $("#Charlie").replaceWith(charlie.GetMarkup());
            $("#Dylan").replaceWith(dylan.GetMarkup());
        });
        window.aliceSend1CoinToBob = function () {
            var message = alice.GetMessage("Bob", 1, Date.now());
            signedMessage = alice.GetSignedMessageWithSerialNumber("Bob", 1, Date.now());
            var sanityCheckOk = alice.VerifySignedMessageAndAddToUnvalidatedTransactions(signedMessage);
            if (sanityCheckOk)
                alice.BroadcastSignedMessage(signedMessage);
            $("#transaction-block").css("display", "block");
            $(".transaction").text(JSON.stringify(message, undefined, 2));
            $(".signed-message").text(JSON.stringify(signedMessage, undefined, 2));
            $(".verify-message").text(sanityCheckOk);
            $("#Alice").replaceWith(alice.GetMarkup());
            $("#Bob").replaceWith(bob.GetMarkup());
            $("#Charlie").replaceWith(charlie.GetMarkup());
            $("#Dylan").replaceWith(dylan.GetMarkup());
        };
        window.makeDylanMine = function () {
            dylan.Mine();
            $("#Alice").replaceWith(alice.GetMarkup());
            $("#Bob").replaceWith(bob.GetMarkup());
            $("#Charlie").replaceWith(charlie.GetMarkup());
            $("#Dylan").replaceWith(dylan.GetMarkup());
        };
    };
});
