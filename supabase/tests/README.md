# Isolierter SQL-Vertragstest

Voraussetzungen: Python 3, PostgreSQL 14+ (`initdb`, `pg_ctl`, `psql`) im PATH. Als normaler Benutzer starten, nicht als root.

```sh
python3 supabase/tests/contract.py
```

Der Runner erzeugt einen neuen Cluster mit zufälligem Verzeichnis und freiem Loopback-Port unter `output/sql-validation/`. Er setzt seine eigenen Verbindungsvariablen; bestehende Datenbanken werden nicht verwendet. Supabase-Rollen, `auth.uid()` und Storage-Metadaten werden minimal emuliert, dann echte Migration, Seed und Bootstrap ausgeführt. Concurrency-Prüfungen verwenden getrennte psql-Verbindungen. Im `finally`-Block wird der eigene Server gestoppt. Temporäre Daten bleiben für Diagnose erhalten; `results.json` enthält das Ergebnis.

Die 111 Prüfungen decken RLS, Nichtmitglieder, verbotene Direktwrites, Drei-Ticket-Budget, parallele Einlösung, Fehler-Rollback, Stimmenwechsel/-zählung, Statuswechsel, private Medien, Warteliste, Profil-Einstellungen (Validierung, Avatare, öffentliches Profil, Konto löschen) und den Gastgeber-Bootstrap ab. Dies testet SQL-Policies, **nicht** gehostete GoTrue-E-Mails, Storage-HTTP oder Realtime-Auslieferung. Dafür die Abnahmeschritte in `docs/DEPLOYMENT.md` verwenden.
