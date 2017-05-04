const bits = 1024; // We choose to generate 512 bit rsa keys
const publicExponent = "65537"; // Public exponent

class Network {
    constructor() {
        this.users = [];
    }

    Register(user) {
        this.users.forEach(u => {
            u.AddUserToLocalAddresseBook(user);
            user.AddUserToLocalAddresseBook(u);
        });

        this.users.push(user);

        return user;
    }

    BroadcastToUser(name, signedMessage) {
        let user = this.GetUser(name);
        user.VerifySignedMessageAndAddToBlockChain(signedMessage);
    }

    // Private
    GetUser(name) {
        return this.users.find(u => u.name == name);
    }

}

class User {
    constructor(name, network) {
        this.name = name;
        this.network = network;
        this.money = 0;
        this.privateKey = `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`;
        this.publicKey = KEYUTIL.getKey(this.privateKey);

        this.GenrerateRsa();
        this.localBlockChain = [];
        this.localAddressBook = {};

        this.network.Register(this);
    }

    GetMarkup() {
        this.ComputeMoneyForKnownUsers();
        return `<div class="user" id="${this.name}">
    <h2>
        ${this.name}
    </h2>
    <p><b>Money I think I Own</b>: ${this.money}\$</p>
    <p class="publicKey hover-to-see"><b>publicKey</b>: ${JSON.stringify(this.publicKey)}</p>
    <p class="privateKey hover-to-see"><b>privateKey</b>: ${this.privateKey}</p>
    <p class="localBlockChain hover-to-see"><b>localBlockChain (${this.localBlockChain.length})</b>: ${JSON.stringify(this.localBlockChain)}</p>
    <p class="localAddressBook hover-to-see"><b>localAddressBook (${Object.keys(this.localAddressBook).length})</b>: ${JSON.stringify(Object.keys(this.localAddressBook).map((key, index) => { return { name: key, publicKey: '[...]', money: this.localAddressBook[key].money }; }))}</p>
</div>
`;
    }

    // Public
    GetMessage(receiver, amount) {
        return { "from": this.name, "to": receiver, amount: amount };
    }

    GetSignedMessage(receiver, amount) {
        let message = this.GetMessage(receiver, amount);

        return {
            message: message,
            signature: this.Sign(JSON.stringify(message))
        }
    }

    VerifySignedMessage(signedMessage) {
        // Find the public key in the adress book or in the current user
        let debitorEntry;
        if (signedMessage.message.from == this.name)
            debitorEntry = { publicKey: this.publicKey };
        else
            debitorEntry = this.localAddressBook[signedMessage.message.from];


        if (!debitorEntry || !debitorEntry.publicKey)
            throw `No debitor publicKey found for ${signedMessage.message.from}`;
        else
            return this.Verify(JSON.stringify(signedMessage.message), signedMessage.signature, debitorEntry.publicKey);
    }

    VerifySignedMessageAndAddToBlockChain(signedMessage) {
        let isSignatureValid = this.VerifySignedMessage(signedMessage)
        if (isSignatureValid) {
            this.localBlockChain.push(signedMessage);
        } else
            console.log(`SignedMessage rejected: ${signedMessage}`);
        return isSignatureValid;
    }

    GetBlockChain() {
        return this.localBlockChain;
    }

    AddUserToLocalAddresseBook(user) {
        this.localAddressBook[user.name] = { publicKey: user.publicKey, money: 0 };
    }

    BroadcastSignedMessage(signedMessage) {
        Object.keys(this.localAddressBook).forEach((name, value) => {
            network.BroadcastToUser(name, signedMessage);
        });
    }

    // Private

    GenrerateRsa() {
        this.rsa = new RSAKey();
        this.rsa.readPrivateKeyFromPEMString(this.privateKey);
    }

    Sign(message) {
        return this.rsa.signString(message, 'sha1');
    }

    Verify(message, signature, publicKey) {
        return publicKey.verifyString(message, signature);
    }

    ComputeMoneyForKnownUsers() {
        // Reset money for all known users
        this.money = 0;
        Object.keys(this.localAddressBook).forEach((key, index) => {
            this.localAddressBook[key].money = 0;
        });

        this.localBlockChain.forEach(b => {
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