class Network {
    constructor() {
        this.users = [];
        this.genesisBlock = this.GenerateGenesisBlock();
    }

    Register(user) {
        this.users.forEach(u => {
            u.AddUserToLocalAddressBook(user);
            user.AddUserToLocalAddressBook(u);
        });

        this.users.push(user);

        return user;
    }

    BroadcastTransactionToUser(name, signedMessage) {
        let user = this.GetUser(name);
        user.VerifySignedMessageAndAddToUnvalidatedBlocks(signedMessage);
    }

    BroadcastBlockToUser(name, block) {
        let user = this.GetUser(name);
        user.ReceiveValidation(block);
    }

    GetGenesisBlock() {
        return this.genesisBlock;
    }

    // Private
    GetUser(name) {
        return this.users.find(u => u.name == name);
    }

    GenerateGenesisBlock() {
        var genesisTransactions = [this.GenerateGenesisTransaction()];
        var message = findValidHash(genesisTransactions);

        return new Block(genesisTransactions, message.hash, message.nonce);
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

class Block {
    constructor(transactions, proofOfWork, nonce) {
        this.proofOfWork = proofOfWork;
        this.transactions = transactions;
        this.nonce = nonce;
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
        this.localBlockChain = {};

        var genesisBlock = this.network.GetGenesisBlock();
        this.localBlockChain[genesisBlock.proofOfWork] = genesisBlock; // Init the local chain of transaction with genesis one
        this.localAddressBook = {};
        this.unvalidatedBlocks = [];

        this.network.Register(this);
    }

    GetMarkup() {
        this.ComputeMoneyForKnownUsers();
        return `<div class="user-container" id="${this.name}"><div class="card user"><div class="card-block">
    <h4>
        ${this.name}
        <label class="privateKey" data-container="body" data-placement="top" data-trigger="hover" data-toggle="popover" data-content="${this.privateKey.replace(/"/g, '\'')}">🔑</label>
    </h4>
    <p><b>Money I think I Own</b>: ${this.money}\$</p>
    <p class="localBlockChain hover-to-see"><b>localBlockChain (${this.localBlockChain.length})</b>: <code>${JSON.stringify(this.localBlockChain, undefined, 2)}</code></p>
    <p class="localAddressBook hover-to-see"><b>localAddressBook (${Object.keys(this.localAddressBook).length})</b>: <code>${JSON.stringify(Object.keys(this.localAddressBook).map((key, index) => { return { name: key, publicKey: '[...]', money: this.localAddressBook[key].money }; }), undefined, 2)}</code></p>
    <p class="hover-to-see"><b>unvalidatedBlocks (${this.unvalidatedBlocks.length})</b>: <code>${JSON.stringify(this.unvalidatedBlocks, undefined, 2)}</code></p>    
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
            console.error(`${this.name}: No debitor publicKey found for ${signedMessage.message.from}`);
            return false;
        }

        // Hash match message
        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(signedMessage.message));        
        if (signedMessage.hash != md.digest()) {
            console.error(`${this.name}: Hash does not match message: ${signedMessage.hash}`);
            return false;
        }

        // No hash similarities
        if (this.IsHashAlreadyInBlockChain(signedMessage.hash)) {
            console.error(`${this.name}: A message with a similar hash have been found: ${signedMessage.hash}`);
            return false;
        }

        // Message signature match user spending coins (the "from" property)
        if (!this.Verify(JSON.stringify(signedMessage.message), signedMessage.signature, debitorEntry.publicKey)) {
            console.error(`${this.name}: User ${signedMessage.message.from} signature is not a valid`);
            return false;
        }

        // User have enough coins
        if (!this.VerifyUserHaveEnoughtCoins(signedMessage.message.from, signedMessage.message.amount)) {
            console.error(`${this.name}: User ${signedMessage.message.from}  don't have ${signedMessage.message.amount} to spend`);
            return false;
        }

        return true;
    }

    iterateOnBlockChain(callback) {
        var found = false;
        Object.keys(this.localBlockChain).forEach((key, index) => {
            this.localBlockChain[key].transactions.forEach(transaction => {
                if (callback(transaction))
                    return;
            });
        });

        return !found;
    }

    IsHashAlreadyInBlockChain(hash) {
        let found = false;
        this.iterateOnBlockChain(transaction => {
            if (transaction.hash == hash) {
                found = true;
                return true;
            }

            return false;
        });

        return found;
        /*var found = false;
        Object.keys(this.localBlockChain).forEach((key, index) => {
            if (this.localBlockChain[key].findIndex(x => x.hash == hash) !== -1) {
                found = true;
                return;
            }
        });

        return !found;*/
    }

    VerifySignedMessageAndAddToUnvalidatedBlocks(signedMessage) {
        // Signature, hash, amount of disponible money,... verification
        if (!this.VerifySignedMessageWithSerialNumber(signedMessage))
            return false;

        this.unvalidatedBlocks.push(signedMessage);

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
            network.BroadcastTransactionToUser(name, signedMessage);
        });
    }

    BroadcastValidatedBlock(block) {
        Object.keys(this.localAddressBook).forEach((name, value) => {
            network.BroadcastBlockToUser(name, block);
        });
    }

    ReceiveValidation(block) {
        if (block.proofOfWork[0] != "0" || block.proofOfWork[1] != "0" || block.proofOfWork[2] != "0") {
            return false;
        }

        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });
        md.updateString(JSON.stringify(block.transactions) + block.nonce); 
        var proofOfWork = md.digest();
        if (block.proofOfWork != proofOfWork) {
            return false;
        }

        var isValid = true;
        block.transactions.forEach(transaction => {
            if(!this.VerifySignedMessageWithSerialNumber(transaction)) {
                isValid = false;
                return true;
            }
        });

        if (!isValid) {
            return false;
        }

        this.localBlockChain[block.hash] = block;
    }

    // Malicious
    BroadcastToSpecificUser(username, signedMessage) {
        network.BroadcastTransactionToUser(username, signedMessage);
    }

    // Private
    GenrerateRsa() {
        this.rsa = new RSAKey();
        this.rsa.readPrivateKeyFromPEMString(this.privateKey);
    }

    // Check that at the moment user $username have AT LEAST $amount coins 
    VerifyUserHaveEnoughtCoins(username, amount) {
        let credit = 0;
        let hasEnoughMoney = false;
        this.iterateOnBlockChain(transaction => {
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

        this.iterateOnBlockChain(transaction => {
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
        if (this.unvalidatedBlocks.length >= 5) {
            var transactionList = this.unvalidatedBlocks.slice(0, 10);
            var message = findValidHash(transactionList)
            if (message)  {
                var block = new Block(transactionList, message.hash, message.nonce);
                this.BroadcastValidatedBlock(block);
                return true;
            } 
        }
        return false;
    }
}

function findValidHash(transactionList) {
    var content = JSON.stringify(transactionList);

    for (var i=0; i < 100000; i++) {
        var nonce = pad(i, 10);
        
        var md = new KJUR.crypto.MessageDigest({ alg: "sha256", prov: "cryptojs" });        
        md.updateString(content + nonce); 
        var h = md.digest();
        if (h[0] == "0" && h[1] == "0" && h[2] == "0")
            return { hash: h, nonce: nonce };
    }
    return null;
}

function pad (str, max) {
    str = str.toString();
    return str.length < max ? pad("0" + str, max) : str;
}