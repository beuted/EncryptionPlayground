var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
define(["require", "exports", "./crypto-currency-v4"], function (require, exports, crypto_currency_v4_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class NetworkV5 extends crypto_currency_v4_1.NetworkV4 {
        constructor() {
            super();
        }
    }
    exports.NetworkV5 = NetworkV5;
    class UserV5 extends crypto_currency_v4_1.UserV4 {
        constructor(name, privateKey, network) {
            super(name, privateKey, network);
        }
        GetMessage(receiver, amount, date, isRewarded = false) {
            return { from: isRewarded ? "Root" : this.name, to: receiver, amount: amount, date: date };
        }
        GetSignedMessageWithSerialNumber(receiver, amount, date, isRewarded = false) {
            let message = this.GetMessage(receiver, amount, date, isRewarded);
            var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
            md.updateString(JSON.stringify(message));
            return {
                message: message,
                signature: this.Sign(JSON.stringify(message)),
                hash: md.digest()
            };
        }
        ReceiveBlockValidation(block) {
            // Check that the proof-of-work is indeed a valid hash of the block
            if (!this.ValidateBlockHash(block)) {
                console.error(`${this.name} [Invalid block]: Invalid hash: ${JSON.stringify(block)}`);
                return false;
            }
            // Verify each messages in the block has a valid signature, unique hash and that user spending coins have these coins
            var isValid = true;
            for (var i = 0; i < block.transactions.length; i++) {
                var signedMessage = block.transactions[i];
                // Exception made for first transaction that is allowed to reward a user with 25 potato-coins
                if (i == 0) {
                    if (signedMessage.message.amount <= 25
                        && this.IsAValidHash(signedMessage.hash, signedMessage.message)
                        && !this.HashMatchAnotherHash(signedMessage.hash)) {
                        continue;
                    }
                    else {
                        console.error(`${this.name} [Invalid block]: Invalid reward signedMessage: ${JSON.stringify(signedMessage)}`);
                        isValid = false;
                        break;
                    }
                }
                if (!this.VerifySignedMessage(signedMessage)) {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) {
                return false;
            }
            // Add the block to local block-chain
            this.localBlockChain[block.proofOfWork] = block;
            // Remove validated transactions from the unvalidatedTransactions list
            this.RemoveValidatedTransactions(block.transactions);
        }
        Mine() {
            return __awaiter(this, void 0, void 0, function* () {
                if (this.unvalidatedTransactions.length >= 10) {
                    var transactionList = this.unvalidatedTransactions.slice(0, 10);
                    // Add a reward of 25 potato-coins at the beginning of the block
                    transactionList.unshift(this.GetSignedMessageWithSerialNumber(this.name, 25, Date.now(), true));
                    var beginTime = Date.now();
                    var message = yield crypto_currency_v4_1.Helpers.FindValidHash(transactionList);
                    var timeSpentMiningBlock = (Date.now() - beginTime) / 1000;
                    console.info(`${this.name}: Took ${timeSpentMiningBlock}s to mine a block`);
                    if (message) {
                        var block = new crypto_currency_v4_1.Block(transactionList, message.hash, message.nonce);
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
    }
    exports.UserV5 = UserV5;
    // UI Interactions ///////////////////////////////////////////////////////////////////
    window.AddUiInteractionsV5 = function () {
        var network = new NetworkV5();
        var alice = new UserV5("Alice", `-----BEGIN RSA PRIVATE KEY-----
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
        var bob = new UserV5("Bob", `-----BEGIN RSA PRIVATE KEY-----
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
        var charlie = new UserV5("Charlie", `-----BEGIN RSA PRIVATE KEY-----
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
        var dylan = new UserV5("Dylan", `-----BEGIN RSA PRIVATE KEY-----
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
        window.makeDylanAndCharlieMine = function () {
            return __awaiter(this, void 0, void 0, function* () {
                yield Promise.all([charlie.Mine(), dylan.Mine()]);
                $("#Alice").replaceWith(alice.GetMarkup());
                $("#Bob").replaceWith(bob.GetMarkup());
                $("#Charlie").replaceWith(charlie.GetMarkup());
                $("#Dylan").replaceWith(dylan.GetMarkup());
            });
        };
    };
});
//# sourceMappingURL=crypto-currency-v5.js.map