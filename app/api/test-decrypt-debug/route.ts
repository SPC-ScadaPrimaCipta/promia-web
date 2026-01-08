import { NextRequest, NextResponse } from 'next/server';
import { getConnection, sql } from '@/lib/db';
import { decryptPassword } from '@/lib/rijndael-crypto';

/**
 * Debug endpoint to test decryption with actual database values
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const userid = searchParams.get('userid') || 'admin';

    try {
        const pool = await getConnection();

        // Get user with password
        const result = await pool
            .request()
            .input('userid', sql.VarChar, userid)
            .query('SELECT * FROM RBI_USER WHERE USER_ID = @userid');

        if (result.recordset.length === 0) {
            return NextResponse.json({
                success: false,
                error: 'User not found',
                userid: userid
            }, { status: 404 });
        }

        const user = result.recordset[0];

        // SQL Server returns lowercase column names
        const userId = user.user_id || user.USER_ID;
        const userName = user.user_name || user.USER_NAME;

        // Find password field (check lowercase first since that's what SQL Server returns)
        const passwordField = user.user_password || user.PASSWORD || user.USER_PASSWORD || user.PWD || user.ENCRYPTED_PASSWORD || user.USER_PWD;

        if (!passwordField) {
            return NextResponse.json({
                success: false,
                error: 'No password field found',
                availableColumns: Object.keys(user),
                hint: 'Check which column contains the encrypted password'
            });
        }

        // Try to decrypt
        let decryptionResult: any = {
            found: true,
            passwordFieldType: Buffer.isBuffer(passwordField) ? 'Buffer' : typeof passwordField,
            passwordLength: passwordField.length,
            isBuffer: Buffer.isBuffer(passwordField),
        };

        try {
            const saltValue = userId;
            console.log('Decrypting with salt:', saltValue);
            const decrypted = decryptPassword(passwordField, saltValue);
            console.log('Decrypted password:', decrypted);

            decryptionResult.success = true;
            decryptionResult.decryptedPassword = decrypted;
            decryptionResult.salt = saltValue;
        } catch (error: any) {
            decryptionResult.success = false;
            decryptionResult.error = error.message;
            decryptionResult.errorType = error.constructor.name;
            decryptionResult.stack = error.stack;
        }

        return NextResponse.json({
            success: true,
            user: {
                user_id: userId,
                user_name: userName,
                columns: Object.keys(user)
            },
            decryption: decryptionResult,
            instructions: decryptionResult.success
                ? `Login with User ID: ${userId} and Password: ${decryptionResult.decryptedPassword}`
                : 'Decryption failed - check error details'
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
}

function isValidBase64(str: string): boolean {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
        return false;
    }
}
