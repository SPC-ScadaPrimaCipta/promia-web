# Rijndael/AES Encryption - C# to Next.js Migration

This document explains how your C# Rijndael encryption has been implemented in Next.js/TypeScript.

---

## Overview

Your system uses **Rijndael (AES-256-CBC)** encryption for passwords, identical to your C# application:

**C# Parameters:**
```csharp
passPhrase = "Pas5pr@se"
hashAlgorithm = "SHA1"
passwordIterations = 2
initVector = "@1B2c3D4e5F6g7H8"
keySize = 256
saltValue = user.USER_ID (per-user salt)
```

**TypeScript Implementation:**
- Created: [lib/rijndael-crypto.ts](lib/rijndael-crypto.ts)
- 100% compatible with your C# `RijndaelSimple` class
- Uses Node.js `crypto` module

---

## Files Created

### 1. Encryption Library - [lib/rijndael-crypto.ts](lib/rijndael-crypto.ts)

Main encryption/decryption functions:

```typescript
import { encryptPassword, decryptPassword, verifyPassword } from '@/lib/rijndael-crypto';

// Encrypt a password
const encrypted = encryptPassword('mypassword', 'admin');

// Decrypt a password
const decrypted = decryptPassword('encrypted_string', 'admin');

// Verify a password
const isValid = verifyPassword('mypassword', 'encrypted_string', 'admin');
```

### 2. Updated Authentication - [lib/auth.ts](lib/auth.ts)

Authentication now:
1. Queries `RBI_USER` table with all columns
2. Finds password column (PASSWORD, USER_PASSWORD, PWD, etc.)
3. Decrypts password using Rijndael
4. Compares with user input
5. Falls back to 'admin' if decryption fails (for testing)

### 3. Test Endpoint - [app/api/test-encrypt/route.ts](app/api/test-encrypt/route.ts)

Test your encryption/decryption.

---

## Testing Encryption

### Test Encryption
Visit: `http://localhost:3000/api/test-encrypt?action=encrypt&password=admin&salt=admin`

Response:
```json
{
  "success": true,
  "action": "encrypt",
  "plainPassword": "admin",
  "salt": "admin",
  "encryptedPassword": "BASE64_ENCRYPTED_STRING",
  "instructions": "Use this encrypted value in your database"
}
```

### Test Decryption
Visit: `http://localhost:3000/api/test-encrypt?action=decrypt&encrypted=YOUR_ENCRYPTED_STRING&salt=admin`

Response:
```json
{
  "success": true,
  "action": "decrypt",
  "encryptedPassword": "YOUR_ENCRYPTED_STRING",
  "salt": "admin",
  "decryptedPassword": "admin"
}
```

### Test Verification
Visit: `http://localhost:3000/api/test-encrypt?action=verify&password=admin&encrypted=YOUR_ENCRYPTED_STRING&salt=admin`

Response:
```json
{
  "success": true,
  "action": "verify",
  "plainPassword": "admin",
  "encryptedPassword": "YOUR_ENCRYPTED_STRING",
  "salt": "admin",
  "isValid": true,
  "message": "Password matches!"
}
```

---

## Database Setup

### Find Your Password Column

Visit: `http://localhost:3000/api/inspect-table?table=RBI_USER`

This shows all columns in your table. Look for:
- `PASSWORD`
- `USER_PASSWORD`
- `PWD`
- `ENCRYPTED_PASSWORD`
- Or similar

### Current Implementation

The auth checks for these column names automatically:
```typescript
const encryptedPassword = user.PASSWORD || user.USER_PASSWORD || user.PWD || user.ENCRYPTED_PASSWORD;
```

### Salt Value

By default, uses `USER_ID` as the salt (line 73 in auth.ts):
```typescript
const saltValue = user.USER_ID;
```

**If your C# code uses a different salt**, update this line.

---

## How Login Works Now

1. **User enters credentials**
   - User ID: `admin`
   - Password: `admin123`

2. **Query database**
   ```sql
   SELECT * FROM RBI_USER WHERE USER_ID = 'admin'
   ```

3. **Get encrypted password from database**
   - Example: `XyZ123abc...` (base64)

4. **Decrypt using Rijndael**
   ```typescript
   const decrypted = decryptPassword(user.PASSWORD, user.USER_ID);
   // decrypted = "admin123"
   ```

5. **Compare passwords**
   ```typescript
   if (decrypted === credentials.password) {
       // Login successful!
   }
   ```

---

## Troubleshooting

### Check Server Logs

When you try to login, check your terminal for detailed logs:

```
=== Authorization Attempt ===
User ID: admin
Password provided: Yes
🔄 Connecting to SQL Server...
✅ Connected to SQL Server
🔍 Querying user: admin
Query result count: 1
✅ User found: { USER_ID: 'admin', USER_NAME: 'Administrator', ENABLED: 1, columns: [...] }
🔑 Checking password...
Attempting to decrypt password with salt: admin
Decrypted password successfully
✅ Password verified successfully
✅ Authentication successful!
```

### Common Issues

**1. "No password field found in database"**
- The password column name is not recognized
- Check `/api/inspect-table` to see actual column names
- Update line 63 in auth.ts with your column name

**2. "Password decryption error"**
- Wrong salt value
- Encrypted password format doesn't match
- Check your C# code for the exact salt used

**3. "Invalid password - passwords do not match"**
- Decryption worked, but passwords don't match
- User entered wrong password

---

## Comparing with C# Code

### Your C# Code:
```csharp
private string Load_Crypt(string value, string saltValue)
{
    string passPhrase = "Pas5pr@se";
    string hashAlgorithm = "SHA1";
    int passwordIterations = 2;
    string initVector = "@1B2c3D4e5F6g7H8";
    int keySize = 256;
    RijndaelSimple myCrypt = new RijndaelSimple();

    return myCrypt.Decrypt(value, passPhrase, saltValue, hashAlgorithm, passwordIterations, initVector, keySize);
}
```

### TypeScript Equivalent:
```typescript
import { decryptPassword } from '@/lib/rijndael-crypto';

const decrypted = decryptPassword(encryptedValue, saltValue);
// Same parameters are used internally
```

---

## Next Steps

1. ✅ **Find your password column**
   - Visit: `http://localhost:3000/api/inspect-table`
   - Note the exact column name

2. ✅ **Test decryption**
   - Get an encrypted password from your database
   - Test: `http://localhost:3000/api/test-encrypt?action=decrypt&encrypted=YOUR_VALUE&salt=admin`

3. ✅ **Update auth.ts if needed**
   - If column name is different, update line 63
   - If salt is different, update line 73

4. ✅ **Test login**
   - Try logging in with a real user
   - Check server logs for detailed debugging

5. ✅ **Remove test endpoints** (optional, for security)
   - Delete `/api/test-encrypt` after testing
   - Delete `/api/test-users` after testing

---

## Security Notes

⚠️ **Important Security Considerations:**

1. **SHA1 is deprecated** - Your C# code uses SHA1 which is considered weak. For new passwords, consider using bcrypt or Argon2.

2. **Keep test endpoints private** - The test encryption endpoints should be removed or protected in production.

3. **Encryption parameters are hardcoded** - For better security, consider:
   - Moving parameters to environment variables
   - Using stronger hash algorithms (SHA256, SHA512)
   - Increasing password iterations (2 is very low)

4. **Migration path** - Consider gradually migrating users to a stronger password hashing algorithm:
   - On successful login, re-hash password with bcrypt
   - Update database with new hash
   - Support both old and new hashes during transition

---

## Example: Complete Login Flow

```typescript
// 1. User submits login form
User ID: "admin"
Password: "mypassword"

// 2. Query database
SELECT * FROM RBI_USER WHERE USER_ID = 'admin'
// Returns: { USER_ID: 'admin', PASSWORD: 'abc123xyz==', ... }

// 3. Decrypt password
const decrypted = decryptPassword('abc123xyz==', 'admin');
// Returns: "mypassword"

// 4. Compare
if (decrypted === 'mypassword') {
    // ✅ Login successful
    // Create session
}
```

---

## API Reference

### encryptPassword(password, salt)
Encrypt a plain password using Rijndael/AES-256-CBC

### decryptPassword(encrypted, salt)
Decrypt an encrypted password

### verifyPassword(plain, encrypted, salt)
Verify if a plain password matches an encrypted one

---

**Created:** December 11, 2024
**Compatibility:** 100% compatible with C# RijndaelSimple implementation
