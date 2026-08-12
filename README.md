# license-server

Minimaler, eigenständiger Server für den Shop-Baukasten: Instanz-Aktivierung,
Laufzeit/Ablauf-Tracking und verschlüsselte Backups. **Nicht Teil des an
Kunden ausgelieferten Repos** — dieses Projekt bleibt ausschließlich bei
dir (der Kunde hat unter dem Hosting-Modell ohnehin nie SSH-/Code-Zugriff,
das hier ist reines Ops-Tooling für dich). Kein Framework, keine
Datenbank, keine laufende Pflege nötig (macht nichts Kompliziertes, das
kaputtgehen könnte).

## Endpunkte

- `POST /activate` — vom Shop-Baukasten (`src/lib/server/activation.ts`)
  einmal beim ersten Start jeder Kunden-Instanz aufgerufen. Dient dir als
  Inventar, welche Instanz unter welcher Domain läuft — nicht mehr als
  Kopierschutz gedacht (Kunde hat ohnehin nie den Code), sondern als
  Registrierung.
- `GET /status?key=...` — vom Shop-Baukasten periodisch (max. 1x/Tag)
  abgefragt, zeigt im Admin-Panel einen Hinweis-Banner an, wenn die
  Laufzeit bald abläuft oder abgelaufen ist. Reine Anzeige — der Shop
  sperrt sich dadurch **nicht** selbst, das Abschalten bei
  Nichtverlängerung macht ihr manuell über die VPS.
- `POST /backup/upload` (Header `x-license-key`, Binärkörper) — nimmt die
  tägliche verschlüsselte Sicherung einer Kunden-Instanz entgegen, 60 Tage
  rollierend gespeichert unter `backups/<key>/backup-<0-59>.enc`.
- `GET /restore` — eigenständiges HTML-Tool zum Entschlüsseln einer
  Backup-Datei im Browser (Passwort verlässt den Browser nie). Funktioniert
  unabhängig davon, ob die Kunden-VPS noch läuft.

Keys liegen in `keys.json` (flache Datei, kein Server-Restart nötig, wird
pro Request neu eingelesen).

## Setup

```bash
npm install   # keine Runtime-Dependencies, nur zur Vollständigkeit
node server.js
# oder: docker build -t license-server . && docker run -p 8787:8787 \
#   -v $(pwd)/keys.json:/app/keys.json -v $(pwd)/backups:/app/backups license-server
```

**Wichtig bei Docker:** `keys.json` UND den `backups/`-Ordner als Volume
mounten, sonst gehen bei jedem Rebuild/Redeploy alle Keys und Sicherungen
verloren, weil sonst nur im Image-Layer.

Hinter einen Reverse Proxy mit TLS stellen (Caddy/nginx/Cloudflare) —
`server.js` selbst spricht nur plain HTTP.

In `src/lib/server/activation.ts` UND `src/lib/server/backup.ts` im
shop-baukasten-Repo muss `LICENSE_SERVER` auf die echte, öffentlich
erreichbare HTTPS-Adresse dieses Servers zeigen, bevor du an Kunden
ausliefernst.

## Key pro Verkauf erzeugen

```bash
node generate-key.js                # 1 Aktivierung, 1 Jahr Laufzeit (Standard)
node generate-key.js 1 2            # 1 Aktivierung, 2 Jahre Laufzeit
node generate-key.js 3 1            # 3 Aktivierungen, 1 Jahr (z.B. Dev+Live+Umzug)
```

Gibt den Key + Ablaufdatum auf stdout aus — den Key schickst du dem Kunden
für seine Instanz, das Ablaufdatum ist für dich als Erinnerung, wann ihr
selbst zwei Wochen vorher wegen Verlängerung anfragen wolltet.

## Laufzeit verlängern / ändern

```bash
node set-expiry.js XXXX-XXXX-XXXX-XXXX +1jahre    # verlängert ab aktuellem Ablauf (oder ab heute, falls schon abgelaufen)
node set-expiry.js XXXX-XXXX-XXXX-XXXX 2027-03-01 # setzt fest auf konkretes Datum
```

## Key sperren (z.B. bei Chargeback/Missbrauch)

```bash
node revoke-key.js XXXX-XXXX-XXXX-XXXX
```

Wirkt nur auf `/activate`, falls der Kunde seinen Shop noch nicht
aktiviert hat — nach erfolgreicher Erstaktivierung läuft der Shop
komplett offline weiter. Ein aktives Abschalten einer laufenden Instanz
läuft über eure eigene VPS-Verwaltung, nicht über dieses Tool.
