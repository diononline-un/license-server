import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const KEYS_FILE = new URL('./keys.json', import.meta.url);
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // no 0/O/1/I — avoids misreads

function makeKey() {
	const bytes = randomBytes(16);
	const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
	return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4)).join('-');
}

// Usage: node generate-key.js [maxActivations] [durationYears]
const maxActivations = parseInt(process.argv[2] || '1', 10);
const durationYears = parseFloat(process.argv[3] || '1');
const expiresAt = Date.now() + durationYears * 365 * 86_400_000;

const keys = JSON.parse(readFileSync(KEYS_FILE, 'utf8'));
const key = makeKey();
keys.push({ key, maxActivations, expiresAt, activations: [], revoked: false });
writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));

console.log(key, '· läuft ab:', new Date(expiresAt).toISOString().slice(0, 10));
