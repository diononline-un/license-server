import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 8787;
const ROOT = dirname(fileURLToPath(import.meta.url));
const KEYS_FILE = join(ROOT, 'keys.json');
const BACKUPS_DIR = join(ROOT, 'backups');
const BACKUP_RETENTION_DAYS = 60;
const MAX_BACKUP_BYTES = 200 * 1024 * 1024; // 200MB safety cap per upload

function loadKeys() {
	return JSON.parse(readFileSync(KEYS_FILE, 'utf8'));
}

function saveKeys(keys) {
	writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2));
}

function findKey(keys, key) {
	return keys.find((k) => k.key === key);
}

function handleActivate(body) {
	let payload;
	try {
		payload = JSON.parse(body);
	} catch {
		return { status: 400, data: { ok: false, reason: 'invalid json' } };
	}

	const { key, domain, installId } = payload;
	if (!key || typeof key !== 'string') return { status: 400, data: { ok: false, reason: 'missing key' } };

	const keys = loadKeys();
	const entry = findKey(keys, key);
	if (!entry) return { status: 200, data: { ok: false, reason: 'unknown key' } };
	if (entry.revoked) return { status: 200, data: { ok: false, reason: 'revoked' } };

	const alreadyActivatedHere = entry.activations.some((a) => a.installId === installId);
	if (!alreadyActivatedHere && entry.activations.length >= entry.maxActivations) {
		return { status: 200, data: { ok: false, reason: 'max activations reached' } };
	}

	if (!alreadyActivatedHere) {
		entry.activations.push({ domain: domain || '', installId: installId || '', at: Date.now() });
		saveKeys(keys);
	}

	return { status: 200, data: { ok: true } };
}

function handleStatus(url) {
	const key = url.searchParams.get('key');
	if (!key) return { status: 400, data: { valid: false, reason: 'missing key' } };

	const entry = findKey(loadKeys(), key);
	if (!entry) return { status: 200, data: { valid: false, reason: 'unknown key' } };
	if (entry.revoked) return { status: 200, data: { valid: false, reason: 'revoked' } };

	const expiresAt = entry.expiresAt ?? null;
	const valid = expiresAt === null || expiresAt > Date.now();
	return { status: 200, data: { valid, expiresAt } };
}

function dayIndex() {
	return Math.floor(Date.now() / 86_400_000) % BACKUP_RETENTION_DAYS;
}

function handleBackupUpload(key, body) {
	const entry = findKey(loadKeys(), key);
	if (!entry) return { status: 403, data: { ok: false, reason: 'unknown key' } };
	if (entry.revoked) return { status: 403, data: { ok: false, reason: 'revoked' } };
	if (body.length === 0) return { status: 400, data: { ok: false, reason: 'empty body' } };
	if (body.length > MAX_BACKUP_BYTES) return { status: 413, data: { ok: false, reason: 'too large' } };

	const dir = join(BACKUPS_DIR, key);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, `backup-${dayIndex()}.enc`), body);

	return { status: 200, data: { ok: true, dayIndex: dayIndex() } };
}

const server = createServer((req, res) => {
	const url = new URL(req.url, `http://${req.headers.host}`);

	if (req.method === 'POST' && url.pathname === '/activate') {
		let body = '';
		req.on('data', (chunk) => (body += chunk));
		req.on('end', () => {
			const { status, data } = handleActivate(body);
			res.writeHead(status, { 'content-type': 'application/json' });
			res.end(JSON.stringify(data));
		});
		return;
	}

	if (req.method === 'GET' && url.pathname === '/status') {
		const { status, data } = handleStatus(url);
		res.writeHead(status, { 'content-type': 'application/json' });
		res.end(JSON.stringify(data));
		return;
	}

	if (req.method === 'GET' && url.pathname === '/restore') {
		res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
		res.end(readFileSync(join(ROOT, 'restore.html')));
		return;
	}

	if (req.method === 'POST' && url.pathname === '/backup/upload') {
		const key = req.headers['x-license-key'];
		const chunks = [];
		let size = 0;
		req.on('data', (chunk) => {
			size += chunk.length;
			if (size > MAX_BACKUP_BYTES) {
				res.writeHead(413, { 'content-type': 'application/json' });
				res.end(JSON.stringify({ ok: false, reason: 'too large' }));
				req.destroy();
				return;
			}
			chunks.push(chunk);
		});
		req.on('end', () => {
			if (res.writableEnded) return;
			const { status, data } = handleBackupUpload(key, Buffer.concat(chunks));
			res.writeHead(status, { 'content-type': 'application/json' });
			res.end(JSON.stringify(data));
		});
		return;
	}

	res.writeHead(404, { 'content-type': 'application/json' });
	res.end(JSON.stringify({ ok: false, reason: 'not found' }));
});

server.listen(PORT, () => console.log(`license-server listening on :${PORT}`));
