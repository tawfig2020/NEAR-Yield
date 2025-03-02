const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SecureKeyStore {
    constructor(encryptionKey) {
        if (!encryptionKey) {
            throw new Error('Encryption key is required for secure key storage');
        }
        this.encryptionKey = Buffer.from(encryptionKey, 'hex');
        this.algorithm = 'aes-256-gcm';
        this.keyDir = path.join(require('os').homedir(), '.near-credentials-encrypted');
        
        // Ensure key directory exists
        if (!fs.existsSync(this.keyDir)) {
            fs.mkdirSync(this.keyDir, { recursive: true });
        }
    }

    encrypt(data) {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    decrypt(encrypted, iv, authTag) {
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.encryptionKey,
            Buffer.from(iv, 'hex')
        );
        
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    async setKey(networkId, accountId, keyPair) {
        const keyFile = this._getKeyFilePath(networkId, accountId);
        
        // Encrypt the key data
        const keyData = JSON.stringify({
            account_id: accountId,
            public_key: keyPair.getPublicKey().toString(),
            private_key: keyPair.getSecretKey()
        });
        
        const encrypted = this.encrypt(keyData);
        
        // Save encrypted data
        fs.writeFileSync(keyFile, JSON.stringify(encrypted));
    }

    async getKey(networkId, accountId) {
        const keyFile = this._getKeyFilePath(networkId, accountId);
        
        if (!fs.existsSync(keyFile)) {
            return null;
        }
        
        try {
            const encryptedData = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
            const decrypted = this.decrypt(
                encryptedData.encrypted,
                encryptedData.iv,
                encryptedData.authTag
            );
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('Failed to decrypt key:', error);
            return null;
        }
    }

    async removeKey(networkId, accountId) {
        const keyFile = this._getKeyFilePath(networkId, accountId);
        if (fs.existsSync(keyFile)) {
            fs.unlinkSync(keyFile);
        }
    }

    async clear() {
        if (fs.existsSync(this.keyDir)) {
            fs.rmdirSync(this.keyDir, { recursive: true });
            fs.mkdirSync(this.keyDir);
        }
    }

    _getKeyFilePath(networkId, accountId) {
        return path.join(this.keyDir, `${networkId}_${accountId}.json`);
    }
}

module.exports = { SecureKeyStore };
