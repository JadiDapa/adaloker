import { customAlphabet } from "nanoid";

// Uppercase alphanumeric, no ambiguous chars (0/O, 1/I/L) — easy to read/type aloud.
const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const generate = customAlphabet(alphabet, 8);

export function generateInviteCode() {
  return generate();
}
