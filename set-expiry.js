import { readFileSync, writeFileSync } from 'node:fs';

const KEYS_FILE = new URL('./keys.json', import.meta.url);
const [key, dateOrYears] = process.argv.slice(2);

if (!key || !dateOrYears) {
	console.error('Usage: node set-expiry.js <KEY> <YYYY-MM-DD | +Njahre>');
	process.exit(1);
}

const keys = JSON.parse(readFileSync(KEYS_FILE, 'utf8'));
const entry = keys.find((k) => k.key === key);
if (!entry) {
	console.error('Key nicht gefunden:', key);
	process.exit(1);
}

let expiresAt;
if (dateOrYears.startsWith('+')) {
	const years = parseFloat(dateOrYears.slice(1));
	const base = entry.expiresAt && entry.expiresAt > Date.now() ? entry.expiresAt : Date.now();
	expiresAt = base + years * 365 * 86_400_000;
} else {
	expiresAt = new Date(dateOrYears).getTime();
	if (Number.isNaN(expiresAt)) {
		console.error('Ungültiges Datum:', dateOrYears);
		process.exit(1);
	}
}

entry.expiresAt = expiresAt;
writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
console.log(key, '· läuft jetzt ab:', new Date(expiresAt).toISOString().slice(0, 10));
