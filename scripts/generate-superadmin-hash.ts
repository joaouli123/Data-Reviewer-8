import bcrypt from 'bcryptjs';

const password = 'superadmin';
const hash = await bcrypt.hash(password, 10);

console.log('==============================================');
console.log('HASH GERADO PARA SUPERADMIN');
console.log('==============================================');
console.log('Username: superadmin');
console.log('Password: superadmin');
console.log('Hash:', hash);
console.log('==============================================');
console.log('\nUse este hash no SQL:\n');
console.log(`'${hash}'`);
console.log('==============================================');
