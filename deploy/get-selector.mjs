import { createHash } from 'crypto';
const methods = ['publicMint', 'transfer', 'balanceOf', 'increaseAllowance'];
for (const m of methods) {
  const h = createHash('sha256').update(m).digest();
  console.log(`${m}: 0x${h.subarray(0, 4).toString('hex')}`);
}
