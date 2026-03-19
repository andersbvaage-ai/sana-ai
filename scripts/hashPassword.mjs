// Bruk: node scripts/hashPassword.mjs <passord>
// Genererer bcrypt-hash for bruk i USERS_JSON

import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Bruk: node scripts/hashPassword.mjs <passord>');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log('\nHash:');
console.log(hash);
console.log('\nLegg til i USERS_JSON:');
console.log(JSON.stringify({ email: 'bruker@eksempel.no', passwordHash: hash, name: 'Fullt Navn', role: 'lege' }, null, 2));
