// Creates the two secret values for Vercel: TRAINER_PASSWORD_HASH and SESSION_SECRET.
// Usage: node tools/make-password-hash.mjs "your-trainer-password"
import crypto from "node:crypto";
const pw = process.argv[2];
if (!pw || pw.length < 10) {
  console.error('Please pass a password with at least 10 characters: node tools/make-password-hash.mjs "..."');
  process.exit(1);
}
const salt = crypto.randomBytes(16);
const hash = crypto.scryptSync(pw, salt, 64);
console.log("TRAINER_PASSWORD_HASH=" + ["scrypt", salt.toString("base64"), hash.toString("base64")].join("$"));
console.log("SESSION_SECRET=" + crypto.randomBytes(32).toString("base64url"));
