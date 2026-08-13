---
status: in-development
progress: 85
version: "1.0.0"
tags: [license, aktivierung, backups, ops-tooling]
scope: "Minimaler Lizenz-/Aktivierungsserver für den Shop-Baukasten mit Backup-Upload und Browser-Restore"
last_updated: "2026-08-13"
next_steps:
  - Docker-Stack anlegen (Port-Ring 2012, Volumes für keys.json und backups/)
  - Hinter Reverse Proxy mit TLS stellen und öffentliche URL vergeben
  - LICENSE_SERVER in shop-baukasten (activation.ts, backup.ts) auf echte URL setzen
  - End-to-End-Test: Key generieren, Instanz aktivieren, Backup hochladen, Restore prüfen
---

# Aktueller Stand
- Alle Endpunkte implementiert: POST /activate, GET /status, POST /backup/upload, GET /restore
- Key-Verwaltung über CLI-Skripte (generate-key, set-expiry, revoke-key) funktioniert ohne Restart
- Keine Runtime-Dependencies, kein Framework, Daten in flacher keys.json
- Noch nicht deployed: kein Docker-Container, keine TLS-Anbindung, keine Portvergabe
- Kein docker-compose.yml vorhanden, nur Dockerfile
