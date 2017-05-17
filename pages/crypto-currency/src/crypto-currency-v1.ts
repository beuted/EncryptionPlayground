import "jsrsasign";
import "jquery";

declare var KEYUTIL: any;
declare var RSAKey: any;
declare var KJUR: any;

export type hash = string

export type signature = string

export interface ISignedMessage { message: IMessage, signature: signature }

export interface IMessage { from: string, to: string, amount: number, date: number }

export class Network<TUser extends User, TMessage extends ISignedMessage> {
    protected users: TUser[];
    private genesisTranslation: TMessage;
    
    constructor() {
        this.users = [];
        this.genesisTranslation = this.GenerateGenesisTransaction();
    }

    public Register(user: TUser) {
        this.users.forEach(u => {
            u.AddUserToLocalAddressBook(user);
            user.AddUserToLocalAddressBook(u);
        });

        this.users.push(user);

        return user;
    }

    public BroadcastToUser(name: string, signedMessage: TMessage) {
        let user = this.GetUser(name);
        user.VerifySignedMessageAndAddToBlockChain(signedMessage);
    }

    public GetGenesisTransaction() {
        return this.genesisTranslation;
    }

    // Private
    public GetUser(name: string): TUser {
        return (<any>this.users).find((u: User) => u.name == name);
    }

    // The Genesis transaction rewards Alice for 50 coins to bootstrap the network
    // (More on bitcoin Genesis block here: https://en.bitcoin.it/wiki/Genesis_block)
    protected GenerateGenesisTransaction(): TMessage {
        // -- All the following part should be executed and then destroy after just keeping the signedMessage
        // so that no-one can ever know the private key of Root
        var privateKey = `-----BEGIN RSA PRIVATE KEY-----
MIICWgIBAAKBgFIfldeOqEmzwGy/kD0Yatc0ym9NMxxsmu8Yyjum4xQYE0TUv/Yt
5BUIfaG2ao6RClDs4trRGWQNRehbo9LKDbXRwH0ZmlWazR6mE3cKVQ54ah+fpQbe
JTKSI1Im6PIIYOwmW40mRdB88ZEUD1HquOMWanQ+EP7+D7NSfZjI0HQbAgMBAAEC
gYAD0mh80azPUUhBR2EFFt/SCCjrqSIZzowfWH4A7LFgvAYZi/UrFdOpju2Z2w12
eRWL0pp0KIsP9vYr7CfhpXmh0RF/hMYvACIEEpO+VKZ6IqknVJQ+arYTaqpqBqFt
xV+lOUEMVGNA81WbidCWkuvc0zFMwy4m5yVs9sjpOWkJYQJBAJbdWLH3ouEmfDdN
Tdk5jUHeVIJrJJ+jN0D6Ya20KVjDzeLnjje62/vK2XcLNmn1SZVfXoAuOMdHEFRk
fb6QnnMCQQCLWp2VUiPXnTdzUmxOaqxChkEl/bQABOifELVLwm55Gvg/57FBgUY1
D09qTxy4H8fqSV44hW6lNr/ZLWrAMoG5AkBHoEF7BTJsqQPykZ4zUvKw4ijHXq0d
qbUTAY0cllvHC/eVEhDgfrPwwKcssMMd3VoZNBU+0DMe0at8FdXpgunnAkBEJJBw
RxVNxwwpcUGS6ujHMv1ChZfydnQF7Faq8C2zPLPuE+8CmCNrqMvtsTfa9Xd9oljX
jK/5TBduLJ5J06jJAkAXxbUaC/i8Jd3sjpKnI5zSwTri33sMCr5ko2ixHLAdPkvI
3JEmuTcyHcPocz1//pIDzLofwkYdmnCSyYpDBzoe
-----END RSA PRIVATE KEY-----`;

        var rsa = new RSAKey();
        rsa.readPrivateKeyFromPEMString(privateKey);
        var genesisTransaction = { from: "Root", to: "Alice", amount: 50, date: Date.now() };

        return <TMessage> {
            message: genesisTransaction,
            signature: rsa.signString(genesisTransaction, 'sha256')
        }
    }

}

export class User {
    public name: string; // Visible to other users through the Network class
    public publicKey: any; // Visible to other users through the Network class //TODO

    public money: number;
    public network: Network<User, ISignedMessage>;
    public privateKey: string;
    public localSignedMessages: ISignedMessage[];
    public localAddressBook: { [key: string]: { publicKey: any, money: number } };
    public rsa: any; // Used to sign transactions


    constructor(name: string, privateKey: string, network: Network<User, ISignedMessage>) {
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

    public GetMarkup(): string {
        this.ComputeMoneyForKnownUsers();

        return `<div class="user-container" id="${this.name}"><div class="card user"><div class="card-block">
            <h4>
                ${this.name}
                <label class="privateKey" data-container="body" data-placement="top" data-trigger="hover" data-toggle="popover" data-content="${this.privateKey.replace(/"/g, '\'')}">🔑</label>
            </h4>
            <ul>
                <li>Money I think I Own: <b>${this.money}\$</b></li>
                <li class="localBlockChain hover-to-see">localBlockChain (${this.localSignedMessages.length}): <code>${JSON.stringify(this.localSignedMessages, undefined, 2)}</code></li>
                <li class="localAddressBook hover-to-see">localAddressBook (${Object.keys(this.localAddressBook).length}): <code>${JSON.stringify(Object.keys(this.localAddressBook).map((key, index) => { return { name: key, publicKey: '[...]', money: this.localAddressBook[key].money }; }), undefined, 2)}</code></li>
            </ul>
        </div></div></div>`;
    }

    public GetMessage(receiver: string, amount: number, date: number): IMessage {
        return { from: this.name, to: receiver, amount: amount, date: date };
    }

    public GetSignedMessage(receiver: string, amount: number, date: number): ISignedMessage {
        let message = this.GetMessage(receiver, amount, date);

        return {
            message: message,
            signature: this.Sign(JSON.stringify(message))
        }
    }

    public VerifySignedMessage(signedMessage: ISignedMessage) {
        // Find the public key in the adress book or in the current user
        let debitorEntry;
        if (signedMessage.message.from == this.name)
            debitorEntry = { publicKey: this.publicKey };
        else
            debitorEntry = this.localAddressBook[signedMessage.message.from];

        if (!debitorEntry || !debitorEntry.publicKey) {
            console.error(`${this.name} : No debitor publicKey found for ${signedMessage.message.from}`);
            return false;
        }

        // Message signature match user spending coins (the "from" property)
        if (!this.Verify(JSON.stringify(signedMessage.message), signedMessage.signature, debitorEntry.publicKey)) {
            console.error(`${this.name} : User ${signedMessage.message.from} signature is not a valid`);
            return false;
        }

        // Verification that user have enougth coins
        if (!this.VerifyUserHaveEnoughtCoins(signedMessage.message.from, signedMessage.message.amount)) {
            console.error(`${this.name} : User ${signedMessage.message.from} don't have ${signedMessage.message.amount} to spend`);
            return false;
        }

        return true;
    }

    public BroadcastSignedMessage(signedMessage: ISignedMessage) {
        Object.keys(this.localAddressBook).forEach((name, value) => {
            this.network.BroadcastToUser(name, signedMessage);
        });
    }

    public ComputeMoneyForKnownUsers() {
        // Reset money for all known users
        this.money = 0;
        Object.keys(this.localAddressBook).forEach((key, index) => {
            this.localAddressBook[key].money = 0;
        });

        this.localSignedMessages.forEach(b => {
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

    public VerifySignedMessageAndAddToBlockChain(signedMessage: ISignedMessage) {
        // Signature, amount of disponible money,... verification
        if (!this.VerifySignedMessage(signedMessage)) {
            return false;
        }
 
        this.localSignedMessages.push(signedMessage);

        return true;
    }

    public AddUserToLocalAddressBook(user: User) {
        this.localAddressBook[user.name] = { publicKey: user.publicKey, money: 0 };
    }

    public GenrerateRsa() {
        this.rsa = new RSAKey();
        this.rsa.readPrivateKeyFromPEMString(this.privateKey);
    }

    // Check that at the moment user $username have AT LEAST $amount coins 
    public VerifyUserHaveEnoughtCoins(username: string, amount: number) {
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
    }

    public Sign(message: string): signature {
        return this.rsa.signString(message, 'sha256');
    }

    public Verify(message: string, signature: signature, publicKey: any) {
        return publicKey.verifyString(message, signature);
    }
}


// UI Interactions ///////////////////////////////////////////////////////////////////

(<any>window).AddUiInteractionsV1 = function() {
    // UI interactions
    var network = new Network();
    var alice = new User("Alice", `-----BEGIN RSA PRIVATE KEY-----
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
    var bob = new User("Bob", `-----BEGIN RSA PRIVATE KEY-----
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
    var charlie = new User("Charlie", `-----BEGIN RSA PRIVATE KEY-----
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

    var signedMessage: ISignedMessage;
    $(document).ready(function() {
        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    });

    (<any>window).aliceSend1CoinToBob = function() {
        var now = Date.now();
        var message = alice.GetMessage("Bob", 1, now);
        signedMessage = alice.GetSignedMessage("Bob", 1, now);
        var isOk = bob.VerifySignedMessageAndAddToBlockChain(signedMessage);
        if (isOk) {
            bob.BroadcastSignedMessage(signedMessage);
        }


        $("#transaction-block").css("display", "block");
        $(".transaction").text(JSON.stringify(message, undefined, 2));
        $(".signed-message").text(JSON.stringify(signedMessage, undefined, 2));
        $(".verify-message").text(isOk ? "valid" : "invalid");

        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());


    };

    (<any>window).broadcastMessage10Times = function() {
        if (!signedMessage) {
            console.warn("First send a legit message to be able to replay it");
            return;
        }

        for (var i = 0; i < 10; i++) {
            bob.VerifySignedMessageAndAddToBlockChain(signedMessage);
            bob.BroadcastSignedMessage(signedMessage);
        }
        
        // Refresh UI
        $("#Alice").replaceWith(alice.GetMarkup());
        $("#Bob").replaceWith(bob.GetMarkup());
        $("#Charlie").replaceWith(charlie.GetMarkup());
    };
}