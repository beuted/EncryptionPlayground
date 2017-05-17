import { NetworkV2, UserV2, ISignedHashedMessage } from "./crypto-currency-v2";
import { hash, signature, IMessage } from "./crypto-currency-v1";

declare var KEYUTIL: any;
declare var RSAKey: any;
declare var KJUR: any;

export class NetworkV3<TUser extends UserV3, TMessage extends ISignedHashedMessage> extends NetworkV2<TUser, TMessage> {
    constructor() {
        super();
    }

    public BroadcastTransactionValidationToUser(name: string, validatorName: string, messageHash: hash, signedMessageHash: hash) {
        let user = this.GetUser(name);
        user.ReceiveTransactionValidation(validatorName, messageHash, signedMessageHash);
    }
}

export class UserV3 extends UserV2 {
    public localBlockValidators:{ [transactionHash: string]: hash[] };
    public network: NetworkV3<UserV3, ISignedHashedMessage>;
    
    constructor(name: string, privateKey: string, network: NetworkV3<UserV3, ISignedHashedMessage>) {
        super(name, privateKey, network)
        this.localBlockValidators = {};
    }

    // Public

    public VerifySignedMessageAndAddToBlockChain(signedMessage: ISignedHashedMessage) {
        var success = super.VerifySignedMessageAndAddToBlockChain(signedMessage);

        if (success) {
            // Broadcast that the message is valid to all users on the network
            Object.keys(this.localAddressBook).forEach((name, value) => {
                this.network.BroadcastTransactionValidationToUser(name, this.name, signedMessage.hash, this.Sign(signedMessage.hash));
            });
        }

        return success;
    }


    public ReceiveTransactionValidation(validatorName: string, messageHash: hash, signedMessageHash: hash) {
        // Find the public key in the adress book or in the current user
        let validatorEntry;
        if (validatorName == this.name)
            validatorEntry = { publicKey: this.publicKey };
        else
            validatorEntry = this.localAddressBook[validatorName];

        if (!validatorEntry || !validatorEntry.publicKey) {
            console.error(`${this.name}: No validator publicKey found for ${validatorName}`);
            return false;
        }

        // Message signature match user spending coins (the "from" property)
        if (!this.Verify(messageHash, signedMessageHash, validatorEntry.publicKey)) {
            console.error(`${this.name}: User ${validatorName} signature is not a valid`);
            return false;
        }

        // Add the name of the validator to the list of validators of the message (if not already here)
        if (!this.localBlockValidators[messageHash])
            this.localBlockValidators[messageHash] = [];
        if ((<any>this.localBlockValidators[messageHash]).findIndex((name: string) => name == validatorName) == -1)
            this.localBlockValidators[messageHash].push(validatorName)

        return true;
    }

    public IsMessageValidated(messageHash: hash) {
        if (this.network.GetGenesisTransaction().hash == messageHash)
            return true;

        if (!this.localBlockValidators[messageHash])
            return false;

        return this.localBlockValidators[messageHash].length / Object.keys(this.localAddressBook).length >= 0.5;
    }

    // Check that at the moment user $username have AT LEAST $amount coins 
    public VerifyUserHaveEnoughtCoins(username: string, amount: number) {
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
    }


    public ComputeMoneyForKnownUsers() {
        // Reset money for all known users
        this.money = 0;
        Object.keys(this.localAddressBook).forEach((key, index) => {
            this.localAddressBook[key].money = 0;
        });

        this.localSignedMessages.forEach(b => {
            if (!this.IsMessageValidated(b.hash))
                return;

            if (b.message.from == this.name)
                this.money -= b.message.amount;
            else if (this.localAddressBook[b.message.from])
                this.localAddressBook[b.message.from].money -= b.message.amount;

            if (b.message.to == this.name)
                this.money += b.message.amount;
            else if (this.localAddressBook[b.message.to])
                this.localAddressBook[b.message.to].money += b.message.amount;
        });
    }
}

class BobPuppetUser extends UserV3 {
    VerifySignedMessageAndAddToBlockChain(signedMessage: ISignedHashedMessage) {
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
        Object.keys(this.localAddressBook).forEach((name, value) => {
            this.network.BroadcastTransactionValidationToUser(name, this.name, signedMessage.hash, this.Sign(signedMessage.hash));
        });

        return true;
    }
}

// UI Interactions ///////////////////////////////////////////////////////////////////

(<any>window).AddUiInteractionsV3 = function() {
    var network = new NetworkV3();
    var alice = new UserV3("Alice", `-----BEGIN RSA PRIVATE KEY-----
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
    var bob = new UserV3("Bob", `-----BEGIN RSA PRIVATE KEY-----
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
    var charlie = new UserV3("Charlie", `-----BEGIN RSA PRIVATE KEY-----
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
    var dylan = new UserV3("Dylan", `-----BEGIN RSA PRIVATE KEY-----
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
    $(document).ready(function() {
        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
        $("#Dylan").replaceWith(dylan.GetMarkup());            
    });

    (<any>window).aliceSend1CoinToBob = function() {
        var message = alice.GetMessage("Bob", 1, Date.now());
        signedMessage = alice.GetSignedMessageWithSerialNumber("Bob", 1, Date.now());
        var sanityCheckOk = alice.VerifySignedMessageAndAddToBlockChain(signedMessage);
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

    (<any>window).broadcastSimultaneousMessages = function() {
        bob.ComputeMoneyForKnownUsers(); // Update bob exact amount of money based on his local blockchain
        let signedMessage1 = bob.GetSignedMessageWithSerialNumber("Alice", bob.money, Date.now());
        let signedMessage2 = bob.GetSignedMessageWithSerialNumber("Charlie", bob.money, Date.now());

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

        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
        $("#Dylan").replaceWith(dylan.GetMarkup());
    };

    var networkSwarmed = false;
    (<any>window).swarmNetworkWithBobPuppets = function() {
        if (networkSwarmed)
            return;

        var bobPuppet1 = new BobPuppetUser("BobPuppet1", `-----BEGIN RSA PRIVATE KEY-----
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

        var bobPuppet2 = new BobPuppetUser("BobPuppet2", `-----BEGIN RSA PRIVATE KEY-----
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

        var bobPuppet3 = new BobPuppetUser("BobPuppet3", `-----BEGIN RSA PRIVATE KEY-----
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

        var bobPuppet4 = new BobPuppetUser("BobPuppet4", `-----BEGIN RSA PRIVATE KEY-----
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

        $("#BobPuppet1").replaceWith(bobPuppet1.GetMarkup());
        $("#BobPuppet2").replaceWith(bobPuppet2.GetMarkup());
        $("#BobPuppet3").replaceWith(bobPuppet3.GetMarkup());
        $("#BobPuppet4").replaceWith(bobPuppet4.GetMarkup());
    };
}