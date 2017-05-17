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
define(["require", "exports", "./crypto-currency-v3"], function (require, exports, crypto_currency_v3_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var NetworkV4 = (function (_super) {
        __extends(NetworkV4, _super);
        function NetworkV4() {
            var _this = _super.call(this) || this;
            _this.genesisBlock = _this.GenerateGenesisBlock();
            return _this;
        }
        NetworkV4.prototype.BroadcastTransactionToUser = function (name, signedMessage) {
            var user = this.GetUser(name);
            user.VerifySignedMessageAndAddToUnvalidatedTransactions(signedMessage);
        };
        NetworkV4.prototype.BroadcastBlockValidationToUser = function (name, block) {
            var user = this.GetUser(name);
            user.ReceiveBlockValidation(block);
        };
        NetworkV4.prototype.GetGenesisBlock = function () {
            return this.genesisBlock;
        };
        NetworkV4.prototype.GenerateGenesisBlock = function () {
            var genesisTransactions = [this.GenerateGenesisTransaction()];
            var message = Helpers.FindValidHash(genesisTransactions);
            return new Block(genesisTransactions, message.hash, message.nonce);
        };
        return NetworkV4;
    }(crypto_currency_v3_1.NetworkV3));
    exports.NetworkV4 = NetworkV4;
    var Block = (function () {
        function Block(transactions, proofOfWork, nonce) {
            this.proofOfWork = proofOfWork;
            this.transactions = transactions;
            this.nonce = nonce;
        }
        return Block;
    }());
    exports.Block = Block;
    var UserV4 = (function (_super) {
        __extends(UserV4, _super);
        function UserV4(name, privateKey, network) {
            var _this = _super.call(this, name, privateKey, network) || this;
            _this.localBlockChain = {};
            _this.unvalidatedTransactions = [];
            // Init the local chain of transaction with genesis one
            var genesisBlock = _this.network.GetGenesisBlock();
            _this.localBlockChain[genesisBlock.proofOfWork] = genesisBlock;
            return _this;
        }
        UserV4.prototype.GetMarkup = function () {
            var _this = this;
            this.ComputeMoneyForKnownUsers();
            return "<div class=\"user-container\" id=\"" + this.name + "\"><div class=\"card user\"><div class=\"card-block\">\n            <h4>\n                " + this.name + "\n                <label class=\"privateKey\" data-container=\"body\" data-placement=\"top\" data-trigger=\"hover\" data-toggle=\"popover\" data-content=\"" + this.privateKey.replace(/"/g, '\'') + "\">\uD83D\uDD11</label>\n            </h4>\n            <p><b>Money I think I Own</b>: " + this.money + "$</p>\n            <p class=\"localBlockChain hover-to-see\"><b>localBlockChain (" + Object.keys(this.localBlockChain).length + ")</b>: <code>" + JSON.stringify(this.localBlockChain, undefined, 2) + "</code></p>\n            <p class=\"localAddressBook hover-to-see\"><b>localAddressBook (" + Object.keys(this.localAddressBook).length + ")</b>: <code>" + JSON.stringify(Object.keys(this.localAddressBook).map(function (key, index) { return { name: key, publicKey: '[...]', money: _this.localAddressBook[key].money }; }), undefined, 2) + "</code></p>\n            <p class=\"hover-to-see\"><b>unvalidatedTransactions (" + this.unvalidatedTransactions.length + ")</b>: <code>" + JSON.stringify(this.unvalidatedTransactions, undefined, 2) + "</code></p>    \n        </div>";
        };
        UserV4.prototype.IterateOnBlockChain = function (callback) {
            var _this = this;
            var found = false;
            Object.keys(this.localBlockChain).forEach(function (key, index) {
                _this.localBlockChain[key].transactions.forEach(function (transaction) {
                    if (callback(transaction))
                        return;
                });
            });
            return !found;
        };
        UserV4.prototype.IsHashAlreadyInBlockChain = function (hash) {
            var found = false;
            this.IterateOnBlockChain(function (transaction) {
                if (transaction.hash == hash) {
                    found = true;
                    return true;
                }
                return false;
            });
            return found;
        };
        UserV4.prototype.VerifySignedMessageAndAddToUnvalidatedTransactions = function (signedMessage) {
            // Signature, hash, amount of disponible money,... verification
            if (!this.VerifySignedMessage(signedMessage))
                return false;
            this.unvalidatedTransactions.push(signedMessage);
            return true;
        };
        UserV4.prototype.BroadcastSignedMessage = function (signedMessage) {
            var _this = this;
            Object.keys(this.localAddressBook).forEach(function (name, value) {
                _this.network.BroadcastTransactionToUser(name, signedMessage);
            });
        };
        UserV4.prototype.BroadcastValidatedBlock = function (block) {
            var _this = this;
            Object.keys(this.localAddressBook).forEach(function (name, value) {
                _this.network.BroadcastBlockValidationToUser(name, block);
            });
        };
        UserV4.prototype.ReceiveBlockValidation = function (block) {
            var _this = this;
            // Check that the proof-of-work is indeed a valid hash of the block
            if (!this.ValidateBlockHash(block)) {
                return false;
            }
            // Verify each messages in the block has a valid signature, unique hash and that user spending coins have these coins
            var isValid = true;
            block.transactions.forEach(function (transaction) {
                if (!_this.VerifySignedMessage(transaction)) {
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
        // Check that at the moment user $username have AT LEAST $amount coins 
        UserV4.prototype.VerifyUserHaveEnoughtCoins = function (username, amount) {
            var credit = 0;
            var hasEnoughMoney = false;
            this.IterateOnBlockChain(function (transaction) {
                if (transaction.message.to == username)
                    credit += transaction.message.amount;
                if (transaction.message.from == username)
                    credit -= transaction.message.amount;
                if (credit >= amount) {
                    hasEnoughMoney = true;
                    return true;
                }
                return false;
            });
            return hasEnoughMoney;
        };
        UserV4.prototype.ComputeMoneyForKnownUsers = function () {
            var _this = this;
            // Reset money for all known users
            this.money = 0;
            Object.keys(this.localAddressBook).forEach(function (key, index) {
                _this.localAddressBook[key].money = 0;
            });
            this.IterateOnBlockChain(function (transaction) {
                if (transaction.message.from == _this.name)
                    _this.money -= transaction.message.amount;
                else if (_this.localAddressBook[transaction.message.from])
                    _this.localAddressBook[transaction.message.from].money -= transaction.message.amount;
                if (transaction.message.to == _this.name)
                    _this.money += transaction.message.amount;
                else if (_this.localAddressBook[transaction.message.to])
                    _this.localAddressBook[transaction.message.to].money += transaction.message.amount;
            });
        };
        UserV4.prototype.Mine = function () {
            if (this.unvalidatedTransactions.length >= 10) {
                var transactionList = this.unvalidatedTransactions.slice(0, 10);
                var beginTime = Date.now();
                var message = Helpers.FindValidHash(transactionList);
                var timeSpentMiningBlock = (Date.now() - beginTime) / 1000;
                console.info(this.name + ": Took " + timeSpentMiningBlock + "s to mine a block");
                if (message) {
                    var block = new Block(transactionList, message.hash, message.nonce);
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
        UserV4.prototype.RemoveValidatedTransactions = function (transactions) {
            var _this = this;
            var done = false;
            while (!done) {
                done = true;
                this.unvalidatedTransactions.forEach(function (t, index) {
                    if (transactions.findIndex(function (x) { return x.hash == t.hash; }) !== -1) {
                        done = false;
                        _this.unvalidatedTransactions.splice(index, 1);
                        return;
                    }
                });
            }
        };
        UserV4.prototype.ValidateBlockHash = function (block) {
            // Check that the proof-of-work (hash of the block) starts with three 0
            if (block.proofOfWork[0] != "0" || block.proofOfWork[1] != "0" || block.proofOfWork[2] != "0") {
                return false;
            }
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(block.transactions) + block.nonce);
            var proofOfWork = md.digest();
            if (block.proofOfWork != proofOfWork) {
                return false;
            }
            return true;
        };
        return UserV4;
    }(crypto_currency_v3_1.UserV3));
    exports.UserV4 = UserV4;
    var Helpers = (function () {
        function Helpers() {
        }
        Helpers.FindValidHash = function (transactionList) {
            var content = JSON.stringify(transactionList);
            for (var i = 0; i < 100000; i++) {
                var nonce = Helpers.Pad(i, 10);
                var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
                md.updateString(content + nonce);
                var h = md.digest();
                if (h[0] == "0" && h[1] == "0" && h[2] == "0")
                    return { hash: h, nonce: nonce };
            }
            return null;
        };
        Helpers.Pad = function (str, max) {
            str = str.toString();
            return str.length < max ? Helpers.Pad("0" + str, max) : str;
        };
        return Helpers;
    }());
    exports.Helpers = Helpers;
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV4 = function () {
        var network = new NetworkV4();
        var alice = new UserV4("Alice", "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgQDRhGF7X4A0ZVlEg594WmODVVUIiiPQs04aLmvfg8SborHss5gQ\n    Xu0aIdUT6nb5rTh5hD2yfpF2WIW6M8z0WxRhwicgXwi80H1aLPf6lEPPLvN29EhQ\n    NjBpkFkAJUbS8uuhJEeKw0cE49g80eBBF4BCqSL6PFQbP9/rByxdxEoAIQIDAQAB\n    AoGAA9/q3Zk6ib2GFRpKDLO/O2KMnAfR+b4XJ6zMGeoZ7Lbpi3MW0Nawk9ckVaX0\n    ZVGqxbSIX5Cvp/yjHHpww+QbUFrw/gCjLiiYjM9E8C3uAF5AKJ0r4GBPl4u8K4bp\n    bXeSxSB60/wPQFiQAJVcA5xhZVzqNuF3EjuKdHsw+dk+dPECQQDubX/lVGFgD/xY\n    uchz56Yc7VHX+58BUkNSewSzwJRbcueqknXRWwj97SXqpnYfKqZq78dnEF10SWsr\n    /NMKi+7XAkEA4PVqDv/OZAbWr4syXZNv/Mpl4r5suzYMMUD9U8B2JIRnrhmGZPzL\n    x23N9J4hEJ+Xh8tSKVc80jOkrvGlSv+BxwJAaTOtjA3YTV+gU7Hdza53sCnSw/8F\n    YLrgc6NOJtYhX9xqdevbyn1lkU0zPr8mPYg/F84m6MXixm2iuSz8HZoyzwJARi2p\n    aYZ5/5B2lwroqnKdZBJMGKFpUDn7Mb5hiSgocxnvMkv6NjT66Xsi3iYakJII9q8C\n    Ma1qZvT/cigmdbAh7wJAQNXyoizuGEltiSaBXx4H29EdXNYWDJ9SS5f070BRbAIl\n    dqRh3rcNvpY6BKJqFapda1DjdcncZECMizT/GMrc1w==\n    -----END RSA PRIVATE KEY-----", network);
        var bob = new UserV4("Bob", "-----BEGIN RSA PRIVATE KEY-----\n    MIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl\n    gHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV\n    sERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC\n    gYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT\n    B2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug\n    sLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw\n    ijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia\n    nU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6\n    g70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub\n    A1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo\n    GOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN\n    N4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f\n    /tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V\n    -----END RSA PRIVATE KEY-----", network);
        var charlie = new UserV4("Charlie", "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgHNNh/YaZnvIr58+v1MagvNjOzEg18yLVAQeZWpnNzE0qxquB2w2\n    eM2Rk6V9fh4WS35fatAvPfVqF/y5oZGwQ3v2ebm/AXTzrI+XCxJDRiHqsuIFRl8Z\n    98f0zs/NNCHtCLGqdnu0zNdL4OyA+dCeexcch6TUQklkvJRuCTUJRt9TAgMBAAEC\n    gYByjMMXj9DjB1Ta+0autDcGwD3tJ/jcoEr+sIgGtrZRb0bSAbUkH9XSPN+XWN5z\n    26hyyy7d1yFR8G4WSQGoMJpJdJH3De4RrU7ZCyx8Ln1xgk1DwoJPvOmPNcUftR5f\n    p3+XuuH/w6CywOtUttNgIdQeR6sIUCvgyCDHHbF5S8iMSQJBAMHKkTs9GEzK3r1s\n    o7Wgl/Mk4sIiAxExkD3m27IVoCWDD2QZUwLCnbaQqHQNq5GtGRRxs3ciPu4P54XU\n    C4RuKD8CQQCYUOu0cW229v4HVCVKeN51vbLDxdch38k9TswrQ1p3EzQuQTdxAkr4\n    svQGSPvyChktlCrr7Qlv9OkmOAFFdSPtAkBzxkInouNOlXCmuC3Bx5Sf1SyHkGxG\n    rFahNLeR1+uaHYdnZN2762rvc9K/qp8SY9h050yxYss3zFakFD9hObJfAkEAlW31\n    /92z/GcOStRTjV9NKAfGJGioqVPqEtqGVP9L9jwB2ksjABx2vsyZuLzLZ+ZeUyfk\n    f/bZZlvIjDUvkhvc9QJATDAOITmhUk/1iADjP1vqdmfVXZRdxs/iJYChQIrck0fb\n    hNQeR4DcAUEsr+l+d1ihUflkp+EEyyNEnpgbY0dpsw==\n    -----END RSA PRIVATE KEY-----", network);
        var dylan = new UserV4("Dylan", "-----BEGIN RSA PRIVATE KEY-----\n    MIICWwIBAAKBgHoAhy90y1pqYuD+4v8Tg2eggd+/bk75xI3ATSC9ogZikOKNq5u3\n    gI9vRaylJhrzqdpdTu5whBY1g2QoOIHcjPmqnsTmHhMU4fNAhvLW+ThfYrwgsYlQ\n    YgipJBfwoZm+xc54tZbRhg89s9TXJk3H/d55WPEWN8F6V3nQukwldeqvAgMBAAEC\n    gYAUkgY5IC4xXoKxgQhxDa84R73eJf7JXh+f7u6SOKcbAH+BU3W92aDZjl9nDqlw\n    Heljohvu5BXBUOCIgKeWbcNvDrNNHfgOjrUjzLJ86IVw4zt5GeV/9XhPoH3rpfG6\n    CMJ2FbqRGJYxcPks3FteqAGRPLmAUiHZh/PYlPniuANQ0QJBAPD+noxaKcjlgLX5\n    zq2ljkBF+XhP9N9xdD74R1aDbpv5J8WH/UJUUCyoKsG4Iv7m2F7oa2bq1zPoaTWc\n    03/95WUCQQCBmTQs4s3xCa/8KF9C5UMmYOlE7sP1T+lT8N+p+pV2j7OHv03GcSG7\n    lv9CC6LCyID5/PBbJwVitmh768LUruiDAkB2zN31zGC600A+9PWIrotQbe5L/AZ3\n    u+MVQ6lPIZ1+MDYF70LO1udrDD9/nblKtRvGtYZ0hqItyY1Ly5KLjurtAkAB32fc\n    mi5lpEExwJeXzN5KiK32PAkC23PArcNdnmxYeT0b4gzKqEnXfxgTKT3h2KnccuY6\n    Ovcd9QrPd5mqHxjnAkEAydMa7DM1rmj90T7dHpUbyNcqbDgOg5mojEOPgQX2DClc\n    xvM6Gba9b8Yz8rS08V0oPVLEUz4IwtX17Hv5y8IuPw==\n    -----END RSA PRIVATE KEY-----", network);
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
