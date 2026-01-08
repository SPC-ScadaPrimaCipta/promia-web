import { NextRequest, NextResponse } from 'next/server';
import { encryptPassword, decryptPassword, verifyPassword } from '@/lib/rijndael-crypto';

/**
 * Test endpoint for Rijndael encryption/decryption
 * Compatible with your C# encryption
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action'); // encrypt, decrypt, verify
    const password = searchParams.get('password') || '';
    const encrypted = searchParams.get('encrypted') || '';
    const salt = searchParams.get('salt') || 'admin'; // default salt

    try {
        let result: any = {};

        switch (action) {
            case 'encrypt':
                const encryptedPassword = encryptPassword(password, salt);
                result = {
                    action: 'encrypt',
                    plainPassword: password,
                    salt: salt,
                    encryptedPassword: encryptedPassword,
                    instructions: 'Use this encrypted value in your database'
                };
                break;

            case 'decrypt':
                const decryptedPassword = decryptPassword(encrypted, salt);
                result = {
                    action: 'decrypt',
                    encryptedPassword: encrypted,
                    salt: salt,
                    decryptedPassword: decryptedPassword
                };
                break;

            case 'verify':
                const isValid = verifyPassword(password, encrypted, salt);
                result = {
                    action: 'verify',
                    plainPassword: password,
                    encryptedPassword: encrypted,
                    salt: salt,
                    isValid: isValid,
                    message: isValid ? 'Password matches!' : 'Password does not match'
                };
                break;

            default:
                return NextResponse.json({
                    error: 'Invalid action',
                    usage: {
                        encrypt: '/api/test-encrypt?action=encrypt&password=mypassword&salt=admin',
                        decrypt: '/api/test-encrypt?action=decrypt&encrypted=ENCRYPTED_STRING&salt=admin',
                        verify: '/api/test-encrypt?action=verify&password=mypassword&encrypted=ENCRYPTED_STRING&salt=admin'
                    }
                }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            ...result,
            compatibility: 'Compatible with C# RijndaelSimple encryption'
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error.toString()
        }, { status: 500 });
    }
}
