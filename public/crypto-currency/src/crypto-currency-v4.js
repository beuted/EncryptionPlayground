var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./crypto-currency-v3"], function (require, exports, crypto_currency_v3_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class NetworkV4 extends crypto_currency_v3_1.NetworkV3 {
        constructor() {
            super();
            this.genesisBlock = this.GenerateGenesisBlock();
        }
        BroadcastTransactionToUser(name, signedMessage) {
            let user = this.GetUser(name);
            user.VerifySignedMessageAndAddToUnvalidatedTransactions(signedMessage);
        }
        BroadcastBlockValidationToUser(name, block) {
            let user = this.GetUser(name);
            user.ReceiveBlockValidation(block);
        }
        GetGenesisBlock() {
            return this.genesisBlock;
        }
        GenerateGenesisBlock() {
            return __awaiter(this, void 0, void 0, function* () {
                var genesisTransactions = [this.GenerateGenesisTransaction()];
                var message = yield Helpers.FindValidHash(genesisTransactions);
                return new Block(genesisTransactions, message.hash, message.nonce);
            });
        }
    }
    exports.NetworkV4 = NetworkV4;
    class Block {
        constructor(transactions, proofOfWork, nonce) {
            this.proofOfWork = proofOfWork;
            this.transactions = transactions;
            this.nonce = nonce;
        }
    }
    exports.Block = Block;
    class UserV4 extends crypto_currency_v3_1.UserV3 {
        constructor(name, privateKey, network) {
            super(name, privateKey, network);
            this.localBlockChain = {};
            this.unvalidatedTransactions = [];
            // Init the local chain of transaction with genesis one
            this.genesisBlock = this.network.GetGenesisBlock();
            this.genesisBlock.then((genesisBlock) => {
                this.localBlockChain[genesisBlock.proofOfWork] = genesisBlock;
            });
        }
        GetMarkup() {
            this.ComputeMoneyForKnownUsers();
            return `<div class="user-container" id="${this.name}"><div class="card user"><div class="card-block">
            <h4>
                ${this.name}
                <label class="privateKey" data-container="body" data-placement="top" data-trigger="hover" data-toggle="popover" data-content="${this.privateKey.replace(/"/g, '\'')}"><i class="fa fa-key" aria-hidden="true"></i></label>
            </h4>
            <p><b>Money I think I Own</b>: ${this.money}\$</p>
            <p class="localBlockChain hover-to-see"><b>localBlockChain (${Object.keys(this.localBlockChain).length})</b>: <code>${JSON.stringify(this.localBlockChain, undefined, 2)}</code></p>
            <p class="localAddressBook hover-to-see"><b>localAddressBook (${Object.keys(this.localAddressBook).length})</b>: <code>${JSON.stringify(Object.keys(this.localAddressBook).map((key, index) => { return { name: key, publicKey: '[...]', money: this.localAddressBook[key].money }; }), undefined, 2)}</code></p>
            <p class="hover-to-see"><b>unvalidatedTransactions (${this.unvalidatedTransactions.length})</b>: <code>${JSON.stringify(this.unvalidatedTransactions, undefined, 2)}</code></p>    
        </div>`;
        }
        IterateOnBlockChain(callback) {
            Object.keys(this.localBlockChain).forEach((key, index) => {
                this.localBlockChain[key].transactions.forEach(transaction => {
                    if (callback(transaction))
                        return;
                });
            });
        }
        HashMatchAnotherHash(hash) {
            let hashFound = false;
            this.IterateOnBlockChain((transaction) => {
                if (transaction.hash == hash) {
                    hashFound = true;
                    return true;
                }
                return false;
            });
            return hashFound;
        }
        VerifySignedMessageAndAddToUnvalidatedTransactions(signedMessage) {
            // Signature, hash, amount of disponible money,... verification
            if (!this.VerifySignedMessage(signedMessage))
                return false;
            this.unvalidatedTransactions.push(signedMessage);
            return true;
        }
        BroadcastSignedMessage(signedMessage) {
            Object.keys(this.localAddressBook).forEach((name, value) => {
                this.network.BroadcastTransactionToUser(name, signedMessage);
            });
        }
        BroadcastValidatedBlock(block) {
            Object.keys(this.localAddressBook).forEach((name, value) => {
                this.network.BroadcastBlockValidationToUser(name, block);
            });
        }
        ReceiveBlockValidation(block) {
            // Check that the proof-of-work is indeed a valid hash of the block
            if (!this.ValidateBlockHash(block)) {
                return false;
            }
            // Verify each messages in the block has a valid signature, unique hash and that user spending coins have these coins
            var isValid = true;
            block.transactions.forEach(transaction => {
                if (!this.VerifySignedMessage(transaction)) {
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
        }
        // Check that at the moment user $username have AT LEAST $amount coins 
        VerifyUserHaveEnoughtCoins(username, amount) {
            let credit = 0;
            let hasEnoughMoney = false;
            this.IterateOnBlockChain((transaction) => {
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
        }
        ComputeMoneyForKnownUsers() {
            // Reset money for all known users
            this.money = 0;
            Object.keys(this.localAddressBook).forEach((key, index) => {
                this.localAddressBook[key].money = 0;
            });
            this.IterateOnBlockChain((transaction) => {
                if (transaction.message.from == this.name)
                    this.money -= transaction.message.amount;
                else if (this.localAddressBook[transaction.message.from])
                    this.localAddressBook[transaction.message.from].money -= transaction.message.amount;
                if (transaction.message.to == this.name)
                    this.money += transaction.message.amount;
                else if (this.localAddressBook[transaction.message.to])
                    this.localAddressBook[transaction.message.to].money += transaction.message.amount;
            });
        }
        Mine() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.unvalidatedTransactions.length >= 10) {
                    var transactionList = this.unvalidatedTransactions.slice(0, 10);
                    var beginTime = Date.now();
                    var message = yield Helpers.FindValidHash(transactionList);
                    var timeSpentMiningBlock = (Date.now() - beginTime) / 1000;
                    console.info(`${this.name}: Took ${timeSpentMiningBlock}s to mine a block`);
                    if (message) {
                        var block = new Block(transactionList, message.hash, message.nonce);
                        this.BroadcastValidatedBlock(block);
                        this.ReceiveBlockValidation(block);
                        return true;
                    }
                }
                else {
                    console.info(`${this.name}: Can't mine a block if less than 10 transactions are waiting.`);
                }
                return false;
            });
        }
        RemoveValidatedTransactions(transactions) {
            var done = false;
            while (!done) {
                done = true;
                this.unvalidatedTransactions.forEach((t, index) => {
                    if (transactions.findIndex((x) => x.hash == t.hash) !== -1) {
                        done = false;
                        this.unvalidatedTransactions.splice(index, 1);
                        return;
                    }
                });
            }
        }
        ValidateBlockHash(block) {
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
        }
    }
    exports.UserV4 = UserV4;
    class Helpers {
        static FindValidHash(transactionList) {
            return __awaiter(this, void 0, void 0, function* () {
                const maxTries = 100000;
                const stepSize = 100;
                var content = JSON.stringify(transactionList);
                for (var i = 0; i < maxTries / stepSize; i++) {
                    var res = yield Helpers.FindValidHashWithPrevBlockHashStep(content, stepSize);
                    if (res !== null)
                        return res;
                }
                console.warn(`${this.name}: Failed to find a valid hash after ${maxTries} tries.`);
                return null;
            });
        }
        // We need another function generating a "step" due to js engine asynchronisity that will run the all Promise before switching to another
        static FindValidHashWithPrevBlockHashStep(content, maxTries) {
            return __awaiter(this, void 0, void 0, function* () {
                return new Promise((successCb, errorCb) => {
                    for (var i = 0; i < maxTries; i++) {
                        var nonce = Helpers.Pad(Math.floor(Math.random() * 10000000000), 10);
                        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
                        md.updateString(content + nonce);
                        var h = md.digest();
                        if (h[0] == "0" && h[1] == "0" && h[2] == "0") {
                            successCb({ hash: h, nonce: nonce });
                            return;
                        }
                    }
                    successCb(null);
                });
            });
        }
        static Pad(str, max) {
            str = str.toString();
            return str.length < max ? Helpers.Pad("0" + str, max) : str;
        }
    }
    exports.Helpers = Helpers;
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV4 = function () {
        var network = new NetworkV4();
        var alice = new UserV4("Alice", `-----BEGIN RSA PRIVATE KEY-----
    MIICWwIBAAKBgQDRhGF7X4A0ZVlEg594WmODVVUIiiPQs04aLmvfg8SborHss5gQ
    Xu0aIdUT6nb5rTh5hD2yfpF2WIW6M8z0WxRhwicgXwi80H1aLPf6lEPPLvN29EhQ
    NjBpkFkAJUbS8uuhJEeKw0cE49g80eBBF4BCqSL6PFQbP9/rByxdxEoAIQIDAQAB
    AoGAA9/q3Zk6ib2GFRpKDLO/O2KMnAfR+b4XJ6zMGeoZ7Lbpi3MW0Nawk9ckVaX0
    ZVGqxbSIX5Cvp/yjHHpww+QbUFrw/gCjLiiYjM9E8C3uAF5AKJ0r4GBPl4u8K4bp
    bXeSxSB60/wPQFiQAJVcA5xhZVzqNuF3EjuKdHsw+dk+dPECQQDubX/lVGFgD/xY
    uchz56Yc7VHX+58BUkNSewSzwJRbcueqknXRWwj97SXqpnYfKqZq78dnEF10SWsr
    /NMKi+7XAkEA4PVqDv/OZAbWr4syXZNv/Mpl4r5suzYMMUD9U8B2JIRnrhmGZPzL
    x23N9J4hEJ+Xh8tSKVc80jOkrvGlSv+BxwJAaTOtjA3YTV+gU7Hdza53sCnSw/8F
    YLrgc6NOJtYhX9xqdevbyn1lkU0zPr8mPYg/F84m6MXixm2iuSz8HZoyzwJARi2p
    aYZ5/5B2lwroqnKdZBJMGKFpUDn7Mb5hiSgocxnvMkv6NjT66Xsi3iYakJII9q8C
    Ma1qZvT/cigmdbAh7wJAQNXyoizuGEltiSaBXx4H29EdXNYWDJ9SS5f070BRbAIl
    dqRh3rcNvpY6BKJqFapda1DjdcncZECMizT/GMrc1w==
    -----END RSA PRIVATE KEY-----`, network);
        var bob = new UserV4("Bob", `-----BEGIN RSA PRIVATE KEY-----
    MIICWgIBAAKBgHJNuOcdqshauCKFhxYHUNGuIyv6H7OLtUV+Ew3ra75hWWW2fMNl
    gHFwATEIg9xaDHaVmGXxdBmot78ZUeNpVYuymflwfBl06VUxSYpl7QfS5M4E9gOV
    sERX/ytzRl3uuTprk/LvGwcejsVpHLlxBuVPMy6u2yPE0+X59ayLX26/AgMBAAEC
    gYBI0esyklvzOJiGpbrh9dcvPll58uevYxohI6jP/WOu7iYd/pyNf2TM4CZiLqKT
    B2tZQQTOLX1hu3MUc/UPhFPSybbBh4aXPYU7cBPmXz910m7PwrQZcFUETKV2Mkug
    sLim1baAq++O6jUYM6RRnEcdtag3uIN/21VCevx9yTqYAQJBALSN6Nj7OFRcQfiw
    ijakun2H7ldNKOXH3c8DgRTDgBrfJDmOZlcIZmQ6G10ZsROk5beRkVgHGX8G3Dia
    nU2el4ECQQCiEOapzIZCLEpfG3Ay+X6FQfrkhkvrg9EECucx0GYQ6bAUgkwTiLn6
    g70sKXT2E2fYvEQDB0v1t6pAHHcMWyY/AkBjmJAj+NgGuOlvPDrRj6aLjkrr/1Ub
    A1gYVE+E256zs/kwgptzUN/iU6c6gOyL8H8C9ppdG3V1+5vI4Yj6AwyBAkBkCTSo
    GOPCkt4xSJmADXroPGrmhnL0ZAAvk59To0RtKiIS9r6IzDuoA4tQaCKXBjFymfsN
    N4LOoFkJi8h8KwM3AkBXjoieYoy6eNIKa6QRn+/6qRhO5kxdh+KFXp1svc+dg93f
    /tSfi+i2Pn1Z/v7CSW9oFmFcQAwwamYlbGaBK87V
    -----END RSA PRIVATE KEY-----`, network);
        var charlie = new UserV4("Charlie", `-----BEGIN RSA PRIVATE KEY-----
    MIICWwIBAAKBgHNNh/YaZnvIr58+v1MagvNjOzEg18yLVAQeZWpnNzE0qxquB2w2
    eM2Rk6V9fh4WS35fatAvPfVqF/y5oZGwQ3v2ebm/AXTzrI+XCxJDRiHqsuIFRl8Z
    98f0zs/NNCHtCLGqdnu0zNdL4OyA+dCeexcch6TUQklkvJRuCTUJRt9TAgMBAAEC
    gYByjMMXj9DjB1Ta+0autDcGwD3tJ/jcoEr+sIgGtrZRb0bSAbUkH9XSPN+XWN5z
    26hyyy7d1yFR8G4WSQGoMJpJdJH3De4RrU7ZCyx8Ln1xgk1DwoJPvOmPNcUftR5f
    p3+XuuH/w6CywOtUttNgIdQeR6sIUCvgyCDHHbF5S8iMSQJBAMHKkTs9GEzK3r1s
    o7Wgl/Mk4sIiAxExkD3m27IVoCWDD2QZUwLCnbaQqHQNq5GtGRRxs3ciPu4P54XU
    C4RuKD8CQQCYUOu0cW229v4HVCVKeN51vbLDxdch38k9TswrQ1p3EzQuQTdxAkr4
    svQGSPvyChktlCrr7Qlv9OkmOAFFdSPtAkBzxkInouNOlXCmuC3Bx5Sf1SyHkGxG
    rFahNLeR1+uaHYdnZN2762rvc9K/qp8SY9h050yxYss3zFakFD9hObJfAkEAlW31
    /92z/GcOStRTjV9NKAfGJGioqVPqEtqGVP9L9jwB2ksjABx2vsyZuLzLZ+ZeUyfk
    f/bZZlvIjDUvkhvc9QJATDAOITmhUk/1iADjP1vqdmfVXZRdxs/iJYChQIrck0fb
    hNQeR4DcAUEsr+l+d1ihUflkp+EEyyNEnpgbY0dpsw==
    -----END RSA PRIVATE KEY-----`, network);
        var dylan = new UserV4("Dylan", `-----BEGIN RSA PRIVATE KEY-----
    MIICWwIBAAKBgHoAhy90y1pqYuD+4v8Tg2eggd+/bk75xI3ATSC9ogZikOKNq5u3
    gI9vRaylJhrzqdpdTu5whBY1g2QoOIHcjPmqnsTmHhMU4fNAhvLW+ThfYrwgsYlQ
    YgipJBfwoZm+xc54tZbRhg89s9TXJk3H/d55WPEWN8F6V3nQukwldeqvAgMBAAEC
    gYAUkgY5IC4xXoKxgQhxDa84R73eJf7JXh+f7u6SOKcbAH+BU3W92aDZjl9nDqlw
    Heljohvu5BXBUOCIgKeWbcNvDrNNHfgOjrUjzLJ86IVw4zt5GeV/9XhPoH3rpfG6
    CMJ2FbqRGJYxcPks3FteqAGRPLmAUiHZh/PYlPniuANQ0QJBAPD+noxaKcjlgLX5
    zq2ljkBF+XhP9N9xdD74R1aDbpv5J8WH/UJUUCyoKsG4Iv7m2F7oa2bq1zPoaTWc
    03/95WUCQQCBmTQs4s3xCa/8KF9C5UMmYOlE7sP1T+lT8N+p+pV2j7OHv03GcSG7
    lv9CC6LCyID5/PBbJwVitmh768LUruiDAkB2zN31zGC600A+9PWIrotQbe5L/AZ3
    u+MVQ6lPIZ1+MDYF70LO1udrDD9/nblKtRvGtYZ0hqItyY1Ly5KLjurtAkAB32fc
    mi5lpEExwJeXzN5KiK32PAkC23PArcNdnmxYeT0b4gzKqEnXfxgTKT3h2KnccuY6
    Ovcd9QrPd5mqHxjnAkEAydMa7DM1rmj90T7dHpUbyNcqbDgOg5mojEOPgQX2DClc
    xvM6Gba9b8Yz8rS08V0oPVLEUz4IwtX17Hv5y8IuPw==
    -----END RSA PRIVATE KEY-----`, network);
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
            $("#transaction-block>.card-block>ol").css("opacity", "1");
            $(".transaction").text(JSON.stringify(message, undefined, 2));
            $(".signed-message").text(JSON.stringify(signedMessage, undefined, 2));
            $(".verify-message").text(sanityCheckOk);
            $("#Alice").replaceWith(alice.GetMarkup());
            $("#Bob").replaceWith(bob.GetMarkup());
            $("#Charlie").replaceWith(charlie.GetMarkup());
            $("#Dylan").replaceWith(dylan.GetMarkup());
        };
        window.makeDylanMine = function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield dylan.Mine();
                $("#Alice").replaceWith(alice.GetMarkup());
                $("#Bob").replaceWith(bob.GetMarkup());
                $("#Charlie").replaceWith(charlie.GetMarkup());
                $("#Dylan").replaceWith(dylan.GetMarkup());
            });
        };
    };
});
