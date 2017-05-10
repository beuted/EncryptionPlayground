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

    BroadcastValidationToUser(name, validatorName, messageHash, signedMessageHash) {
        let user = this.GetUser(name);
        user.ReceiveValidation(validatorName, messageHash, signedMessageHash);
    }

    GetGenesisTransaction() {
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

        var genesisTransaction = { from: "Root", to: "Alice", amount: 50, date: Date.now() };

        var rsa = new RSAKey();
        rsa.readPrivateKeyFromPEMString(privateKey);

        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(genesisTransaction));

        return {
            message: genesisTransaction,
            signature: rsa.signString(genesisTransaction, 'sha256'),
            hash: md.digest()
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
        this.localBlockChain.push(this.network.GetGenesisTransaction()); // Init the local chain of transaction with genesis one
        this.localAddressBook = {};
        this.localBlockValidators = {}; // { [transactionHash: string]: validatorHashes: string[] }

        this.network.Register(this);
    }

    GetMarkup() {
        this.ComputeMoneyForKnownUsers();
        return `<div class="user-container col-sm-4" id="${this.name}"><div class="card user"><div class="card-block">
    <h4>
        ${this.name}
    </h4>
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

    GetSignedMessageWithSerialNumber(receiver, amount, date) {
        let message = this.GetMessage(receiver, amount, date);
        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(message));

        return {
            message: message,
            signature: this.Sign(JSON.stringify(message)),
            hash: md.digest()
        }
    }

    VerifySignedMessageWithSerialNumber(signedMessage) {
        // Find the public key in the adress book or in the current user
        let debitorEntry;
        if (signedMessage.message.from == this.name)
            debitorEntry = { publicKey: this.publicKey };
        else
            debitorEntry = this.localAddressBook[signedMessage.message.from];

        if (!debitorEntry || !debitorEntry.publicKey) {
            console.error(this.name, `: No debitor publicKey found for ${signedMessage.message.from}`);
            return false;
        }

        // Hash match message
        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(signedMessage.message));        
        if (signedMessage.hash != md.digest()) {
            console.error(this.name, ": Hash does not match message:", signedMessage.hash);
            return false;
        }

        // No hash similarities
        if (this.localBlockChain.findIndex(x => x.hash == signedMessage.hash) !== -1) {
            console.error(this.name, ": A message with a similar hash have been found:", signedMessage.hash);
            return false;
        }

        // Message signature match user spending coins (the "from" property)
        if (!this.Verify(JSON.stringify(signedMessage.message), signedMessage.signature, debitorEntry.publicKey)) {
            console.error(this.name, ": User", signedMessage.message.from, "signature is not a valid");
            return false;
        }

        // User have enough coins
        if (!this.VerifyUserHaveEnoughtCoins(signedMessage.message.from, signedMessage.message.amount)) {
            console.error(this.name, ": User", signedMessage.message.from, "don't have", signedMessage.message.amount, "to spend");
            return false;
        }

        return true;
    }

    VerifySignedMessageAndAddToBlockChain(signedMessage) {
        // Signature, hash, amount of disponible money,... verification
        let isValid = this.VerifySignedMessageWithSerialNumber(signedMessage)
        if (!isValid)
            return false;

        this.localBlockChain.push(signedMessage);

        // Broadcast that the message is valid to all users on the network
        Object.keys(this.localAddressBook).forEach((name, value) => {
            this.network.BroadcastValidationToUser(name, this.name, signedMessage.hash, this.Sign(signedMessage.hash));
        });

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

    ReceiveValidation(validatorName, messageHash, signedMessageHash) {
        // Find the public key in the adress book or in the current user
        let validatorEntry;
        if (validatorName == this.name)
            validatorEntry = { publicKey: this.publicKey };
        else
            validatorEntry = this.localAddressBook[validatorName];

        if (!validatorEntry || !validatorEntry.publicKey) {
            console.error(this.name, `: No validator publicKey found for ${validatorName}`);
            return false;
        }

        // Message signature match user spending coins (the "from" property)
        if (!this.Verify(messageHash, signedMessageHash, validatorEntry.publicKey)) {
            console.error(this.name, ": User", validatorName, "signature is not a valid");
            return false;
        }

        // Add the name of the validator to the list of validators of the message (if not already here)
        if (!this.localBlockValidators[messageHash])
            this.localBlockValidators[messageHash] = [];
        if (this.localBlockValidators[messageHash].findIndex(name => name == validatorName) == -1)
            this.localBlockValidators[messageHash].push(validatorName)

        return true;
    }

    // Malicious
    BroadcastToSpecificUser(username, signedMessage) {
        network.BroadcastToUser(username, signedMessage);
    }

    // Private
    GenrerateRsa() {
        this.rsa = new RSAKey();
        this.rsa.readPrivateKeyFromPEMString(this.privateKey);
    }

    IsMessageValidated(messageHash) {
        if (this.network.GetGenesisTransaction().hash == messageHash)
            return true;

        if (!this.localBlockValidators[messageHash])
            return false;

        return this.localBlockValidators[messageHash].length / Object.keys(this.localAddressBook).length >= 0.5;
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