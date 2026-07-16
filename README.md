# Tech2Be Immo Manager

B2B-Webanwendung zur Verwaltung eigener Immobilienbestände (Mietzinshäuser, Mietwohnungen,
Geschäftsflächen) mit Hausverwaltungs-Services, Dienstleister-Beauftragung und Steuerberater-Export.

## Funktionen

- **Bestandsverwaltung:** Objekte mit Einheiten (Wohnung, Geschäftsfläche, Stellplatz),
  Mietverhältnisse mit Nettomiete, BK-Akonto und Kaution, Leerstandsübersicht.
- **Finanzen:** monatliche Mietvorschreibungen per Knopfdruck, Zahlungsstatus offen/bezahlt mit
  Überfällig-Kennzeichnung, Betriebskostenabrechnung je Objekt und Jahr nach dem
  Verteilerschlüssel Nutzfläche (Gegenüberstellung mit Akonto, Saldo je Mietverhältnis).
- **Services & Ticketing:** Schadenstickets (Reinigung, Wartung, Reparatur, Winterdienst),
  Beauftragung an hinterlegte Dienstleister, Statusverlauf angefragt → beauftragt → in Arbeit →
  abgeschlossen (per Klick oder simuliertem Timer).
- **Steuerberater-Export:** CSV mit Einnahmen (Vorschreibungen) und Ausgaben (Betriebskosten,
  Aufträge) je Objekt und Jahr.

## Architektur

- **Ein Deployment:** Express-API + Dienstleister-Logik + statisch ausgeliefertes React-Frontend
  in einem Container (API-first, das Frontend konsumiert dieselbe REST-API unter `/api`).
- **Datenbank:** PostgreSQL (Azure Database for PostgreSQL Flexible Server).
- **Auth:** Auto-Login über `AUTO_LOGIN_USER`; die Auth-Schicht ([server/auth.js](server/auth.js))
  ist gekapselt, sodass später Entra ID (OIDC) ergänzt werden kann.
- **Beispieldaten:** werden beim ersten Start automatisch angelegt und sind über die
  Admin-Seite zurücksetzbar.

## Lokale Entwicklung

```bash
npm install && (cd client && npm install)
# PostgreSQL bereitstellen, dann:
set DATABASE_URL=postgres://user:pass@host:5432/immo
set AUTO_LOGIN_USER=florian@bingro.com
npm start                 # API + statisches Frontend auf :8080
cd client && npm run dev  # optional: Vite-Dev-Server mit Proxy auf :5173
```

Umgebungsvariablen: `DATABASE_URL`, `PGSSL=require` (für Azure), `AUTO_LOGIN_USER`, `PORT`.

## Deployment (Azure)

Eine Azure Container App (Image aus `Dockerfile`, gebaut mit `az acr build`) plus
Azure Database for PostgreSQL Flexible Server, Region Sweden Central,
Resource Group `rg_immo_manager_20260716`. Secrets (`DATABASE_URL`) liegen als
Container-App-Secrets.
