class Network {
    constructor() {
        this.users = [];
        this.genesisTranslation = this.GenerateGenesisTransaction();
    }

    Register(user) {
        this.users.forEach(u => {
            u.AddUserToLocalAddressBook(user);
            user.AddUserToLocalAddressBook(u);
        });

        this.users.push(user);

        return user;
    }

    BroadcastToUser(name, signedMessage) {
        let user = this.GetUser(name);
        user.VerifySignedMessageAndAddToBlockChain(signedMessage);
    }

    GetGenesisTranslation() {
        return this.genesisTranslation;
    }

    // Private
    GetUser(name) {
        return this.users.find(u => u.name == name);
    }

    // The Genesis transaction rewards Alice for 50 coins to bootstrap the network
    // (More on bitcoin Genesis block here: https://en.bitcoin.it/wiki/Genesis_block)
    GenerateGenesisTransaction() {
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
        return {
            message: genesisTransaction,
            signature: rsa.signString(genesisTransaction, 'sha256')
        }
    }

}

class User {
    constructor(name, privateKey, network) {
        this.name = name;
        this.network = network;
        this.money = 0;
        this.privateKey = privateKey;
        this.publicKey = KEYUTIL.getKey(this.privateKey);

        this.GenrerateRsa();
        this.localBlockChain = [];
        this.localBlockChain.push(this.network.GetGenesisTranslation()); // Init the local chain of transaction with genesis one
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
    <p class="publicKey hover-to-see"><b>publicKey</b>: <code>${JSON.stringify(this.publicKey, undefined, 2)}</code></p>
    <p class="privateKey hover-to-see"><b>privateKey</b>: <code>${this.privateKey}</code></p>
    <p class="localBlockChain hover-to-see"><b>localBlockChain (${this.localBlockChain.length})</b>: <code>${JSON.stringify(this.localBlockChain, undefined, 2)}</code></p>
    <p class="localAddressBook hover-to-see"><b>localAddressBook (${Object.keys(this.localAddressBook).length})</b>: <code>${JSON.stringify(Object.keys(this.localAddressBook).map((key, index) => { return { name: key, publicKey: '[...]', money: this.localAddressBook[key].money }; }), undefined, 2)}</code></p>
</div>
`;
    }

    // Public
    GetMessage(receiver, amount, date) {
        return { "from": this.name, "to": receiver, "amount": amount, "date": date };
    }

    GetSignedMessage(receiver, amount, date) {
        let message = this.GetMessage(receiver, amount, date);

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
        // Signature verification
        let isSignatureValid = this.VerifySignedMessage(signedMessage)
        if (!isSignatureValid) {
            console.error(this.name, `: SignedMessage rejected: ${signedMessage}`);
            return false;
        }

        // Verification that user have enougth coins
        if (!this.VerifyUserHaveEnoughtCoins(signedMessage.message.from, signedMessage.message.amount)) {
            console.error(this.name, ": User", signedMessage.message.from, "don't have", signedMessage.message.amount, "to spend");
            return false;
        }
 
        this.localBlockChain.push(signedMessage);
        return true;
    }

    GetBlockChain() {
        return this.localBlockChain;
    }

    AddUserToLocalAddressBook(user) {
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

    // Check that at the moment user $username have AT LEAST $amount coins 
    VerifyUserHaveEnoughtCoins(username, amount) {
        var credit = 0;
        for (var i = this.localBlockChain.length - 1; i >= 0; i--) {
            if (this.localBlockChain[i].message.to == username)
                credit += this.localBlockChain[i].message.amount;

            if (this.localBlockChain[i].message.from == username)
                credit -= this.localBlockChain[i].message.amount;

            if (credit >= amount)
                return true;
        }
        return false;
    }

    Sign(message) {
        return this.rsa.signString(message, 'sha256');
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