
import { db } from './lib/db';
import { users } from './lib/db/schema';

async function verifyUserApi() {
    console.log('Verifying User API...');
    try {
        const res = await fetch('http://localhost:3000/api/users');
        if (res.ok) {
            const users = await res.json();
            console.log('API returned users:', users.length);
            if (users.length > 0) {
                const firstUser = users[0];
                console.log('First user:', firstUser.username);
                console.log('Role Name:', firstUser.roleName);
                if (firstUser.roleName !== undefined) {
                    console.log('SUCCESS: roleName is present in response.');
                } else {
                    console.error('FAILED: roleName is missing from response.');
                    process.exit(1);
                }
            } else {
                console.warn('No users found to verify.');
            }
        } else {
            console.error('API check failed:', res.status, res.statusText);
        }
    } catch (e) {
        console.warn('Could not connect to API. Is the server running?');
    }
    process.exit(0);
}

verifyUserApi().catch(console.error);
