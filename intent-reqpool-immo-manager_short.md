# Agentic Intent: ReqPOOL Immo Manager

## Mission
Baue eine B2B-Webanwendung zur Verwaltung eigener Immobilienbestände (Mietzinshäuser, Mietwohnungen, Geschäftsflächen) mit Hausverwaltungs-Services, Dienstleister-Beauftragung und Steuerberater-Export.

## Zielgruppen & Rollen
- **Eigentümer/Verwalter (Kernnutzer):** verwaltet Objekte, Einheiten, Mietverhältnisse, Vorschreibungen, Tickets und Aufträge.
- **Admin:** verwaltet Stammdaten und Beispieldaten (identisch mit dem Verwalter-Account).

## Kernfunktionen

### 1. Bestandsverwaltung
- Objekte mit Einheiten (Wohnung, Geschäftsfläche, Stellplatz): Stammdaten, Nutzfläche, Kategorie.
- Mietverhältnisse: Mieter (Name, Kontakt), Vertragsbeginn/-ende, Nettomiete, Betriebskosten-Akonto, Kaution.
- Leerstandsübersicht (Einheiten ohne aktives Mietverhältnis).

### 2. Finanzen
- Monatliche Mietvorschreibung je Mietverhältnis per Knopfdruck erzeugen (Miete + Akonto).
- Zahlungsstatus manuell setzen: offen / bezahlt; Überfällig-Kennzeichnung bei überschrittener Fälligkeit.
- Betriebskostenabrechnung je Objekt und Jahr: erfasste Kosten werden nach dem Verteilerschlüssel Nutzfläche auf die Einheiten umgelegt, Gegenüberstellung mit Akonto, Saldo je Mietverhältnis.

### 3. Services & Ticketing
- Schadensticket anlegen: Objekt/Einheit, Kategorie (Reinigung, Wartung, Reparatur, Winterdienst), Beschreibung, Priorität.
- Beauftragung an einen von 3 hinterlegten Dienstleistern; Statusverlauf angefragt → beauftragt → in Arbeit → abgeschlossen, weitergeschaltet per Klick oder simuliertem Timer.
- Die Dienstleister-Logik läuft im selben Backend; das Auftrags-Schema ist als internes REST/JSON-Modell so angelegt, dass später externe Dienstleister-APIs andocken können.

### 4. Steuerberater-Export
- CSV-Export: Einnahmen (Vorschreibungen) und Ausgaben (Betriebskosten, Aufträge) je Objekt und Jahr, per Knopfdruck herunterladbar.

## UI/UX
- Look & Feel angelehnt an Office 365 / Fluent Design; Schwarz-Weiß, Highlight-Farbe Schwarz.
- Ein Dashboard als Startseite: Portfolio-Kennzahlen (Objekte, Einheiten, Leerstand), offene Forderungen, offene Tickets – als Karten und einfache Charts.
- Responsive Webanwendung, Sprache: Deutsch.

## Authentifizierung
- Auto-Login: **florian@bingro.com** wird über die Umgebungsvariable `AUTO_LOGIN_USER` automatisch als Admin/Verwalter angemeldet – kein Login-Dialog.
- Die Auth-Schicht ist so gekapselt, dass Entra ID (OIDC) später ergänzt werden kann.

## Beispieldaten
- Beim ersten Start automatisch angelegt: **1 Objekt** (Mietzinshaus Wien, 8 Einheiten), 7 Mietverhältnisse (1 Einheit Leerstand), 6 Monate Vorschreibungshistorie mit gemischtem Zahlungsstatus, 2 offene Schadenstickets, 3 Dienstleister, Betriebskosten für ein abgeschlossenes Jahr.
- Beispieldaten per Admin-Funktion zurücksetzbar.

## Technische Leitplanken
- Quellcode-Repository: **https://github.com/FlorianSchnitzhofer/demo_immo_16726**
- Deployment auf Microsoft Azure:
  - Subscription: **f677fc3d-7384-4018-b5c4-204292ecadf6**
  - Resource Group: **rg_immo_manager_20260716** (neu anzulegen)
  - Region: **Sweden Central**
  - Compute: **eine** Azure Container App (Frontend + API + Dienstleister-Logik in einem Deployment)
  - Datenbank: Azure Database for PostgreSQL Flexible Server (kleinste Stufe)
  - Secrets: als Container-App-Secrets
  - Keine Datei-/Foto-Uploads, daher kein Blob Storage
  - Azure-Konto für Provisioning/Deployment: **florian@bingro.com**
  - Deployment direkt per `az` CLI aus dem Repository
- Single-Tenant, keine Mandantenfähigkeit.
- API-first: Kernfunktionen als REST-API, Frontend konsumiert dieselbe API.

## Explizit nicht enthalten (spätere Ausbaustufen)
Mieterportal, Entra-ID-SSO, SEPA/Zahlungsabgleich, Mahnwesen, VPI-Indexierung, Dokumentenablage, Foto-Upload, externe Dienstleister-APIs mit Webhooks, BMD-/DATEV-Formate, Mandantenfähigkeit, Englisch, CI/CD-Pipeline, Key Vault.

## Definition of Done
- Anwendung läuft öffentlich erreichbar auf Azure; florian@bingro.com ist automatisch eingeloggt.
- Beispieldaten sind sichtbar; das Dashboard zeigt die Kennzahlen des Objekts.
- Ein Verwalter kann eine Vorschreibung erzeugen, als bezahlt markieren und eine Betriebskostenabrechnung für das abgeschlossene Jahr durchführen.
- Ein Schadensticket kann angelegt, an einen Dienstleister beauftragt und bis „abgeschlossen" durchgeschaltet werden.
- Der Steuerberater-CSV-Export für das Objekt ist herunterladbar.
