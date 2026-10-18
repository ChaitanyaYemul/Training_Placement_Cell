import argon2 from 'argon2';
const options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
export async function hashPassword(password) {
  return argon2.hash(password, options);
}
export async function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}
