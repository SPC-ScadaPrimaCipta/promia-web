import crypto from 'crypto';

/**
 * Rijndael/AES encryption compatible with C# RijndaelSimple
 * Matches the encryption used in your legacy C# application
 */
export class RijndaelCrypto {
    /**
     * Encrypt plaintext using Rijndael/AES-256-CBC
     * Compatible with C# RijndaelSimple.Encrypt
     */
    encrypt(
        plainText: string,
        passPhrase: string,
        saltValue: string,
        hashAlgorithm: string,
        passwordIterations: number,
        initVector: string,
        keySize: number
    ): string {
        // Convert strings to buffers using ASCII/UTF8 encoding
        const initVectorBytes = Buffer.from(initVector, 'ascii');
        const saltValueBytes = Buffer.from(saltValue, 'ascii');
        const plainTextBytes = Buffer.from(plainText, 'utf8');

        // Derive key using PBKDF1 (PasswordDeriveBytes equivalent)
        const keyBytes = this.deriveKeyPBKDF1(
            passPhrase,
            saltValueBytes,
            hashAlgorithm,
            passwordIterations,
            keySize / 8
        );

        // Create cipher using AES-CBC mode
        const cipher = crypto.createCipheriv(
            this.getCipherAlgorithm(keySize),
            keyBytes,
            initVectorBytes
        );

        // Encrypt the data
        let encrypted = cipher.update(plainTextBytes);
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Return base64-encoded string
        return encrypted.toString('base64');
    }

    /**
     * Decrypt ciphertext using Rijndael/AES-256-CBC
     * Compatible with C# RijndaelSimple.Decrypt
     */
    decrypt(
        cipherText: string | Buffer,
        passPhrase: string,
        saltValue: string,
        hashAlgorithm: string,
        passwordIterations: number,
        initVector: string,
        keySize: number
    ): string {
        // Convert strings to buffers
        const initVectorBytes = Buffer.from(initVector, 'ascii');
        const saltValueBytes = Buffer.from(saltValue, 'ascii');

        // Handle both base64 string and Buffer input
        let cipherTextBytes: Buffer;
        if (Buffer.isBuffer(cipherText)) {
            cipherTextBytes = cipherText;
        } else if (typeof cipherText === 'string') {
            cipherTextBytes = Buffer.from(cipherText, 'base64');
        } else {
            throw new Error('cipherText must be a string or Buffer');
        }

        // Derive key using PBKDF1
        const keyBytes = this.deriveKeyPBKDF1(
            passPhrase,
            saltValueBytes,
            hashAlgorithm,
            passwordIterations,
            keySize / 8
        );

        // Create decipher using AES-CBC mode
        const decipher = crypto.createDecipheriv(
            this.getCipherAlgorithm(keySize),
            keyBytes,
            initVectorBytes
        );

        // Decrypt the data
        let decrypted = decipher.update(cipherTextBytes);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        // Return UTF8 string
        return decrypted.toString('utf8');
    }

    /**
     * Derive key using PBKDF1 (compatible with C# PasswordDeriveBytes)
     * This mimics the .NET PasswordDeriveBytes behavior
     */
    private deriveKeyPBKDF1(
        password: string,
        salt: Buffer,
        hashAlgorithm: string,
        iterations: number,
        keyLength: number
    ): Buffer {
        // Convert password to bytes
        const passwordBytes = Buffer.from(password, 'utf8');

        // Hash algorithm (SHA1 or MD5)
        const algo = hashAlgorithm.toLowerCase();

        // Initial hash: hash(password + salt)
        let hash = crypto
            .createHash(algo)
            .update(Buffer.concat([passwordBytes, salt]))
            .digest();

        // Perform iterations (iteration 1 is already done above)
        for (let i = 1; i < iterations; i++) {
            hash = crypto.createHash(algo).update(hash).digest();
        }

        // If we need more bytes than one hash provides, keep hashing
        let keyBytes = Buffer.alloc(0);
        let currentHash = hash;

        while (keyBytes.length < keyLength) {
            keyBytes = Buffer.concat([keyBytes, currentHash]);

            // Generate next block if needed
            if (keyBytes.length < keyLength) {
                currentHash = crypto
                    .createHash(algo)
                    .update(Buffer.concat([currentHash, passwordBytes, salt]))
                    .digest();
            }
        }

        // Return exactly the number of bytes needed
        return keyBytes.slice(0, keyLength);
    }

    /**
     * Get cipher algorithm name based on key size
     */
    private getCipherAlgorithm(keySize: number): string {
        switch (keySize) {
            case 128:
                return 'aes-128-cbc';
            case 192:
                return 'aes-192-cbc';
            case 256:
                return 'aes-256-cbc';
            default:
                throw new Error(`Unsupported key size: ${keySize}`);
        }
    }
}

/**
 * Helper functions matching your C# code
 */
export function encryptPassword(password: string, saltValue: string): string {
    const passPhrase = 'Pas5pr@se';
    const hashAlgorithm = 'SHA1';
    const passwordIterations = 2;
    const initVector = '@1B2c3D4e5F6g7H8';
    const keySize = 256;

    const crypto = new RijndaelCrypto();
    return crypto.encrypt(
        password,
        passPhrase,
        saltValue,
        hashAlgorithm,
        passwordIterations,
        initVector,
        keySize
    );
}

export function decryptPassword(encryptedPassword: string | Buffer, saltValue: string): string {
    const passPhrase = 'Pas5pr@se';
    const hashAlgorithm = 'SHA1';
    const passwordIterations = 2;
    const initVector = '@1B2c3D4e5F6g7H8';
    const keySize = 256;

    const crypto = new RijndaelCrypto();
    return crypto.decrypt(
        encryptedPassword,
        passPhrase,
        saltValue,
        hashAlgorithm,
        passwordIterations,
        initVector,
        keySize
    );
}

/**
 * Verify if a plain password matches an encrypted password
 */
export function verifyPassword(
    plainPassword: string,
    encryptedPassword: string | Buffer,
    saltValue: string
): boolean {
    try {
        const decrypted = decryptPassword(encryptedPassword, saltValue);
        return decrypted === plainPassword;
    } catch (error) {
        console.error('Password verification error:', error);
        return false;
    }
}
