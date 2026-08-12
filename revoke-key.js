import { readFileSync, writeFileSync } from 'node:fs';

const KEYS_FILE = new URL('./keys.json', import.meta.url);
const target = process.argv[2];

if (!target) {
	console.error('Usage: node revoke-key.js <KEY>');
	process.exit(1);
}

const keys = JSON.parse(readFileSync(KEYS_FILE, 'utf8'));
const entry = keys.find((k) => k.key === target);

if (!entry) {
	console.error('Key nicht gefunden:', target);
	process.exit(1);
}

entry.revoked = true;
writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
console.log('Gesperrt:', target);
