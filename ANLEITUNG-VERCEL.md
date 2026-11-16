# AI Learning Studio – auf Vercel veröffentlichen

Dieses Paket ist sofort auf Vercel lauffähig. Es braucht keinen Build-Schritt: Vercel liefert den Ordner `public/` aus und startet `api/handler.js` als Serverfunktion (Trainer-Login, Trainerdokumente).

## Inhalt

| Ordner / Datei | Zweck |
|---|---|
| `public/` | Die fertige Website (Teilnehmerbereich, Downloads, Grid Lab, Pitch) |
| `api/handler.js` | Serverfunktion für Trainer-Login und geschützte Dokumente |
| `lib/` | Trainerinhalte (werden nur nach Login ausgeliefert) |
| `vercel.json` | Ausgabeordner, API-Weiterleitung, Sicherheits-Header |
| `package.json` | Node 24, keine Abhängigkeiten |
| `tools/make-password-hash.mjs` | Erzeugt Trainerpasswort-Hash und Sitzungsschlüssel |
| `.env.example` | Liste der Umgebungsvariablen |
| `website-einbau/` | Fertige Seite und Code-Schnipsel für die KARDI.-Website |

## Umgebungsvariablen

Pflicht (Vercel → Projekt → Settings → Environment Variables, für „Production“):

| Name | Wert |
|---|---|
| `TRAINER_PASSWORD_HASH` | Ausgabe von `node tools/make-password-hash.mjs "IhrPasswort"` |
| `SESSION_SECRET` | ebenfalls aus diesem Befehl |

Optional, nur für Datei-Uploads im Trainerbereich: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PA_FILES_SECRET`. Ohne diese Werte läuft alles, nur der Upload ist ausgeschaltet.

Wenn Sie das bestehende Projekt `power-academy-ai-learning-studio-2` aktualisieren, sind diese Werte dort schon gesetzt – nichts ändern, sonst gilt ein neues Passwort.

## Einbetten erlaubt

`vercel.json` erlaubt das Einbetten per iframe nur auf der eigenen Domain und auf `https://kardi-website-mit-atlas.vercel.app`. Bei einer eigenen Domain (z. B. `https://www.kardi.de`) diese im Header `Content-Security-Policy` hinter `frame-ancestors` ergänzen, durch Leerzeichen getrennt.

## Quellskripte

Die Python-Skripte, die Arbeitsblätter, Druckkits und `lib/project-docs.js` erzeugen, sind nicht Teil dieses Pakets; sie liegen im Arbeitsrepository. Für den Betrieb werden sie nicht gebraucht.

## Sprachumschalter DE/EN

Oben rechts in jeder Seite (Teilnehmer- und Trainerbereich, Grid Ops Lab) gibt es den Schalter DE/EN. Die Wahl wird im Browser gespeichert. Direktlink auf Deutsch: `?lang=de` an die URL hängen, z. B. `https://IHRE-DOMAIN/?lang=de#/curriculum`.

- Übersetzungen: `public/i18n-de.js` (erzeugt aus `content/i18n/`). Korrekturen in `content/i18n/overrides.json` eintragen und `node content/i18n/build_dict.mjs` ausführen.
- Video-Untertitel: `public/media/*.de.vtt`.
- Downloads gibt es auf Englisch und Deutsch (Buttons „EN · …“ / „DE · …“): Arbeitsheft, Arbeitsblätter, Folien (Teilnehmerausgabe), Baseline-Toolkit und Auswertungsvorlage. Im Trainerbereich stehen zusätzlich deutsche Foliensätze, Arbeitsblätter, Druckkits, das Rollensimulations-Kit, das Follow-up sowie die Kick-off-Unterlagen (Vorbereitungspapier und Folien) bereit. Die deutschen Fassungen sind maschinell übersetzt und KI-gestützt geprüft; der Bericht „Fachprüfung Übersetzung DE“ im Trainerbereich listet alle Korrekturen und 8 offene Stellen zur fachlichen Entscheidung.
