// Passcode hashing for the Convex default runtime (WebCrypto PBKDF2).
// Stored format: "pbkdf2$<iterations>$<saltHex>$<hashHex>"
// Legacy format (pre-hardening, unsalted toy hash) is still verifiable and is
// transparently upgraded to PBKDF2 on the next successful login.

const ITERATIONS = 100_000;
const KEY_LEN_BITS = 256;
const SALT_BYTES = 16;
const DIGEST = 'SHA-256';
const PREFIX = 'pbkdf2';

function subtle(): SubtleCrypto {
  const s = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
  if (!s) throw new Error('WebCrypto unavailable in this runtime');
  return s;
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function pbkdf2(
  passcode: string,
  salt: Uint8Array,
  iterations: number,
  bits: number
): Promise<Uint8Array> {
  const key = await subtle().importKey(
    'raw',
    new TextEncoder().encode(passcode),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bitsBuf = await subtle().deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: DIGEST },
    key,
    bits
  );
  return new Uint8Array(bitsBuf);
}

export async function hashPasscode(passcode: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(passcode, salt, ITERATIONS, KEY_LEN_BITS);
  return `${PREFIX}$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPasscode(
  passcode: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 4 || parts[0] !== PREFIX) return false;
    const iterations = parseInt(parts[1], 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    const salt = fromHex(parts[2]);
    const expected = fromHex(parts[3]);
    const actual = await pbkdf2(passcode, salt, iterations, expected.length * 8);
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= actual[i] ^ expected[i];
    return diff === 0; // constant-time comparison
  } catch {
    return false;
  }
}

export function isModernHash(stored: string): boolean {
  return stored.startsWith(`${PREFIX}$`);
}

// ── Legacy hash (the original unsalted implementation) ──
// Kept ONLY so existing accounts can still log in; hashes are re-derived with
// PBKDF2 after a successful legacy login (see users.login).
// NOTE: the salt string below is a pinned historical constant — it must stay
// byte-identical forever or every pre-hardening account is locked out.
// Its "cove" prefix reflects the project's retired working name, not the brand.
export function hashLegacyPasscode(passcode: string): string {
  const salt = 'cove-salt-v1';
  const input = passcode + salt;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  let hash2 = 0;
  for (let i = 0; i < hex.length; i++) {
    const char = hex.charCodeAt(i);
    hash2 = ((hash2 << 5) - hash2 + char) | 0;
  }
  return hex + (hash2 >>> 0).toString(16).padStart(8, '0');
}
