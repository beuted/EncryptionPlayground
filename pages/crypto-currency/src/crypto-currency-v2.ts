import { Network, User, hash, signature, ISignedMessage, IMessage } from "./crypto-currency-v1"

declare var KEYUTIL: any;
declare var RSAKey: any;
declare var KJUR: any;

export interface ISignedHashedMessage extends ISignedMessage { message: IMessage, signature: signature, hash: hash }

export class NetworkV2<TUser extends UserV2, TMessage extends ISignedHashedMessage> extends Network<TUser, TMessage> {
    constructor() {
        super();
    }

    // The Genesis transaction gives Alice for 50 coins to bootstrap the network
    // (More on bitcoin Genesis block here: https://en.bitcoin.it/wiki/Genesis_block)
    // V2: new Genesis transaction with hash
    protected GenerateGenesisTransaction(): TMessage {
        var genesisTranaction: TMessage = <TMessage>super.GenerateGenesisTransaction();

        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(genesisTranaction.message));


        genesisTranaction.hash = md.digest();
        return genesisTranaction;
    }

}

export class UserV2 extends User {
    public localSignedMessages: ISignedHashedMessage[];
    public network: NetworkV2<UserV2, ISignedHashedMessage>;

    constructor(name: string, privateKey: string, network: NetworkV2<UserV2, ISignedHashedMessage>) {
        super(name, privateKey, network);
    }

    public GetSignedMessageWithSerialNumber(receiver: string, amount: number, date: number): ISignedHashedMessage {
        // Get previous signed message
        let signedMessage = <ISignedHashedMessage>this.GetSignedMessage(receiver, amount, date);
        
        // Add a hash to it
        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(signedMessage.message));

        signedMessage.hash = md.digest();

        return signedMessage
    }

    public VerifySignedMessage(signedMessage: ISignedHashedMessage) {
        // All previous checks
        if (!super.VerifySignedMessage(signedMessage))
            return false;

        // Verify that the hash matchs the message
        if (!this.IsAValidHash(signedMessage.hash, signedMessage.message)) {
            console.error(`${this.name}: Hash does not match message: ${signedMessage.hash}`);
            return false;
        }

        // Verify that there is no hash similarities
        if (this.HashMatchAnotherHash(signedMessage.hash)) {
            console.error(`${this.name}: A message with a similar hash have been found: ${signedMessage.hash}`);
            return false;
        }

        return true;
    }

    protected HashMatchAnotherHash(hash: hash) {
        return (<any>this.localSignedMessages).findIndex((x: ISignedHashedMessage) => x.hash == hash) !== -1;
    }

    protected IsAValidHash(hash: hash, message: IMessage) {
        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(message));
        return hash == md.digest();
    }

    // Malicious
    public BroadcastToSpecificUser(username: string, signedMessage: ISignedHashedMessage) {
        this.network.BroadcastToUser(username, signedMessage);
    }
}

// UI Interactions ///////////////////////////////////////////////////////////////////

(<any>window).AddUiInteractionsV2 = function() {
    var network = new NetworkV2();
    var alice = new UserV2("Alice", `-----BEGIN RSA PRIVATE KEY-----
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
    var bob = new UserV2("Bob", `-----BEGIN RSA PRIVATE KEY-----
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
    var charlie = new UserV2("Charlie", `-----BEGIN RSA PRIVATE KEY-----
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

    var signedMessage: ISignedHashedMessage;
    $(document).ready(function() {
        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    });

    (<any>window).aliceSend1CoinToBob = function() {
        var message = alice.GetMessage("Bob", 1, Date.now());
        signedMessage = alice.GetSignedMessageWithSerialNumber("Bob", 1, Date.now());
        var isOk = bob.VerifySignedMessageAndAddToSignedMessageList(signedMessage);
        if (isOk)
            bob.BroadcastSignedMessage(signedMessage);

        $("#transaction-block>.card-block>ol").css("opacity", "1");

        $(".transaction").text(JSON.stringify(message, undefined, 2));
        $(".signed-message").text(JSON.stringify(signedMessage, undefined, 2));
        $(".verify-message").text(isOk ? "valid" : "invalid");

        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    };

    (<any>window).broadcastSameMessage = function() {
        if (!signedMessage) {
            alert("First send a legit message to be able to replay it");
            return;
        }

        bob.BroadcastSignedMessage(signedMessage);
        
        // Refresh UI
        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    };

    (<any>window).broadcastDifferentMessages = function() {
        if (!signedMessage) {
            console.warn("First send a legit message to be able to replay it with a different date");
            return;
        }

        let modifiedMessage = (<any>Object).assign({}, signedMessage);
        modifiedMessage.message.date = Date.now();

        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(modifiedMessage));

        modifiedMessage.hash = md.digest();
        bob.BroadcastSignedMessage(modifiedMessage);
        
        // Refresh UI
        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    };

    (<any>window).broadcastSimultaneousMessages = function() {
        bob.ComputeMoneyForKnownUsers(); // Update bob exact amount of money based on his local blockchain
        let signedMessage1 = bob.GetSignedMessageWithSerialNumber("Alice", bob.money, Date.now());
        let signedMessage2 = bob.GetSignedMessageWithSerialNumber("Charlie", bob.money, Date.now());

        bob.BroadcastToSpecificUser("Alice", signedMessage1);
        bob.BroadcastToSpecificUser("Charlie", signedMessage2);

        // Bob only add Alice transaction to his local blockchain
        bob.VerifySignedMessageAndAddToSignedMessageList(signedMessage1);

        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    };
};