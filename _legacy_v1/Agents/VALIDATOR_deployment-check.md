# Deployment Validierung: ho.nm-forum.de

**Validierungszeitpunkt:** 2025-12-21 18:00 CET
**Validator:** Claude Opus 4.5

---

## Status: KRITISCH - INSTABIL

---

## Executive Summary

Die Production-Deployment ist **ERREICHBAR** aber **INSTABIL**:

- Website ist unter https://ho.nm-forum.de erreichbar (HTTP 200)
- SSL-Zertifikat gültig (Let's Encrypt, läuft bis 21.03.2026)
- **KRITISCHES PROBLEM:** PM2-Prozess crasht kontinuierlich (312 Restarts in 2 Sekunden Uptime!)
- Der Service läuft NUR weil ein alter `next-router-worker` Process (PID 2937980) seit 03.12. auf Port 3001 läuft

---

## 1. Erreichbarkeit

| Test | Ergebnis | Details |
|------|----------|---------|
| HTTPS-Zugriff | ✅ PASS | HTTP 200 auf https://ho.nm-forum.de |
| HTTP-Redirect | ✅ PASS | HTTP 301 -> HTTPS korrekt konfiguriert |
| SSL-Zertifikat | ✅ PASS | Valid, Issuer: Let's Encrypt E8, Expires: 2026-03-21 |
| TLS-Version | ✅ PASS | TLSv1.3 mit AEAD-CHACHA20-POLY1305-SHA256 |
| HTTP/2 Support | ✅ PASS | ALPN negotiation erfolgreich |

**SSL-Zertifikat Details:**
```
Subject: CN=ho.nm-forum.de
Valid: 2025-12-21 15:57:30 GMT - 2026-03-21 15:57:29 GMT
Issuer: C=US; O=Let's Encrypt; CN=E8
SubjectAltName: ho.nm-forum.de
```

---

## 2. Server-Health

| Service | Status | Details |
|---------|--------|---------|
| PM2 | ❌ KRITISCH | Online, aber crasht kontinuierlich (312 Restarts!) |
| Nginx | ✅ PASS | Active, running mit 8 Worker-Prozessen |
| PostgreSQL | ✅ PASS | Active (exited) - Service läuft |
| Disk Space | ✅ PASS | 5% Nutzung (38GB / 774GB) |
| Memory | ✅ PASS | 5.6GB / 24GB genutzt (23% Auslastung) |
| Network Ports | ⚠️ WARNING | Port 3001 belegt durch alten Prozess |

### PM2 Status Details

```
┌────┬───────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name          │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │
├────┼───────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ growpi        │ N/A     │ fork    │ 2937955  │ 17D    │ 5    │ online    │ 0%       │ 60.3mb   │
│ 1  │ humansonly    │ N/A     │ fork    │ 2013810  │ 2s     │ 312  │ online    │ 0%       │ 62.2mb   │
└────┴───────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┘
```

**KRITISCHE WARNUNG:**
- humansonly hat **312 Restarts** mit nur **2 Sekunden Uptime**
- Der Prozess crasht kontinuierlich mit `EADDRINUSE` Error (Port 3000 bereits belegt)

### PM2 Logs (Last 50 Lines)

**Error Pattern:**
```
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1908:16)
    ...
    code: 'EADDRINUSE',
    errno: -98,
    syscall: 'listen',
    address: '::',
    port: 3000
```

**Root Cause:** 
Die PM2-gesteuerte Next.js-App versucht auf Port 3000 zu starten, aber Port 3000 ist bereits durch einen Docker-Proxy belegt.

### Listening Ports

```
Port 3000: docker-proxy (KONFLIKT!)
Port 3001: next-router-worker (PID 2937980) ← Eigentlicher Service
Port 80:   nginx
Port 443:  nginx
```

**Alter Prozess läuft seit 03.12.:**
```
root  2937980  0.0  0.6  44047972  154420  ?  Sl  Dec03  2:56  next-router-worker
```

**Problem:** Der PM2-Prozess sollte auf Port 3001 laufen (wie in nginx konfiguriert), startet aber fälschlicherweise auf Port 3000.

---

## 3. Nginx-Konfiguration

**Config Location:** `/etc/nginx/sites-available/humansonly`

```nginx
server {
    server_name ho.nm-forum.de;
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3001;  # ← Korrekt konfiguriert
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    location /storage/ {
        alias /var/www/humansonly/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /_next/static/ {
        alias /var/www/humansonly/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/ho.nm-forum.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ho.nm-forum.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name ho.nm-forum.de;
    if ($host = ho.nm-forum.de) {
        return 301 https://$host$request_uri;
    }
    return 404;
}
```

**Bewertung:**
- ✅ Proxy zu Port 3001 korrekt
- ✅ SSL/TLS korrekt konfiguriert
- ✅ HTTP -> HTTPS Redirect funktioniert
- ✅ Static File Caching optimiert
- ✅ Upload-Größe auf 20MB erhöht
- ✅ Websocket-Support konfiguriert

---

## 4. Datenbank-Status

| Check | Ergebnis | Details |
|-------|----------|---------|
| PostgreSQL | ✅ PASS | Service aktiv |
| DB Connection | ✅ PASS | Verbindung zu `humansonly_prod` erfolgreich |
| User Count | ⚠️ WARNING | 0 Benutzer in der Datenbank |

**Query Result:**
```sql
SELECT COUNT(*) FROM "User";
-- count: 0
```

**Warnung:** Die Datenbank ist leer. Entweder:
1. Fresh Installation ohne Seed-Daten
2. Migration noch nicht durchgeführt
3. Test-/Dev-Datenbank statt Production

---

## 5. Performance

| Metrik | Wert | Bewertung |
|--------|------|-----------|
| DNS Lookup | 0.002s | ✅ Excellent |
| TCP Connect | 0.027s | ✅ Excellent |
| TLS Handshake | 0.091s | ✅ Good (117ms - 27ms) |
| Time to First Byte (TTFB) | 0.147s | ✅ Good |
| Total Time | 0.147s | ✅ Good |

**Latency Breakdown:**
```
DNS Resolution:       1.7ms
TCP Connection:      24.8ms  (+ 23.1ms)
TLS Handshake:       90.9ms  (+ 66.1ms)
Request Preparation:  0.1ms
Server Processing:   29.2ms
Total:              146.7ms
```

**Bewertung:**
- ✅ Excellent: < 100ms
- ✅ Good: 100-300ms
- ⚠️ Fair: 300-500ms
- ❌ Poor: > 500ms

**Performance Rating: GOOD (146ms)**

---

## 6. HTTP Response Codes

| Endpoint | Status | Redirect | Final Status |
|----------|--------|----------|--------------|
| / (HTTPS) | 307 | -> /login | - |
| / (HTTP) | 301 | -> HTTPS | - |
| / (Follow Redirect) | 307 | -> /login | 200 |
| /api/users | 307 | - | - |

**Anmerkung:** 
- HTTP 307 (Temporary Redirect) wird für unauthentifizierte Root-Requests verwendet
- Redirects zu `/login` sind korrekt (Next.js Middleware)
- API-Endpoints ebenfalls geschützt (307 Redirect)

---

## 7. Security-Check

| Check | Status | Details |
|-------|--------|---------|
| HTTPS Enforced | ✅ PASS | HTTP -> HTTPS Redirect aktiv |
| SSL Certificate | ✅ PASS | Valid Let's Encrypt Zertifikat |
| TLS Version | ✅ PASS | TLSv1.3 (modern) |
| Security Headers | ⚠️ TODO | Keine Content-Security-Policy sichtbar |
| HSTS | ⚠️ TODO | Nicht in Response-Headers gesehen |

**Empfohlene Security Headers:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

## 8. Kritische Probleme & Root Cause

### PROBLEM 1: PM2 Crash-Loop (KRITISCH)

**Symptome:**
- 312 Restarts in 2 Sekunden Uptime
- Kontinuierlicher `EADDRINUSE` Error auf Port 3000

**Root Cause:**
1. PM2-Prozess startet mit falscher Port-Konfiguration (3000 statt 3001)
2. Port 3000 bereits durch Docker-Proxy belegt
3. Service funktioniert NUR weil alter `next-router-worker` (PID 2937980) noch läuft

**Location:**
- PM2 Config: Wahrscheinlich `/var/www/humansonly/ecosystem.config.js`
- Environment: `.env.production` fehlt `PORT=3001`

### PROBLEM 2: Zombie Process (WARNING)

**Symptome:**
- PID 2937980 läuft seit 03.12. (17+ Tage)
- Nicht unter PM2-Kontrolle
- Belegt Port 3001

**Risiko:**
- Wenn dieser Prozess crashed, geht die gesamte Website offline
- PM2-Prozess kann ihn nicht ersetzen (läuft auf falschem Port)

### PROBLEM 3: Leere Datenbank (WARNING)

**Symptome:**
- 0 Benutzer in `humansonly_prod`

**Mögliche Ursachen:**
- Migrations nicht ausgeführt
- Seed-Script nicht gelaufen
- Falsche DB-Verbindung in `.env.production`

---

## 9. Empfohlene Sofortmaßnahmen

### KRITISCH (Sofort)

**1. Port-Konfiguration korrigieren**
```bash
# Server: root@5.182.17.148

# 1. Check PM2 Ecosystem Config
cat /var/www/humansonly/ecosystem.config.js

# 2. Check .env.production
cat /var/www/humansonly/.env.production | grep PORT

# 3. Korrigiere Port in .env.production
echo "PORT=3001" >> /var/www/humansonly/.env.production

# 4. Oder setze in PM2 Config:
# env: {
#   PORT: 3001,
#   NODE_ENV: 'production'
# }
```

**2. PM2 Prozess neustarten**
```bash
pm2 stop humansonly
pm2 delete humansonly
pm2 start ecosystem.config.js --env production
pm2 save
```

**3. Alten Zombie-Prozess killen (NACH PM2 Fix!)**
```bash
# ACHTUNG: Erst NACH PM2-Fix, sonst geht Website offline!
kill 2937980
```

### HOCH (Binnen 24h)

**4. Datenbank initialisieren**
```bash
cd /var/www/humansonly
npx prisma migrate deploy
npx prisma db seed  # Falls Seed-Script vorhanden
```

**5. Security Headers hinzufügen**
```nginx
# /etc/nginx/sites-available/humansonly
location / {
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    proxy_pass http://localhost:3001;
    ...
}
```

```bash
nginx -t
systemctl reload nginx
```

### MITTEL (Binnen 7 Tagen)

**6. Monitoring einrichten**
```bash
# PM2 Monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# Uptime Monitoring (z.B. UptimeRobot)
# - Endpoint: https://ho.nm-forum.de
# - Interval: 5 Minuten
```

**7. Automated Backups**
```bash
# PostgreSQL Backup Cron
0 2 * * * /usr/bin/pg_dump -U postgres humansonly_prod > /backups/humansonly_$(date +\%Y\%m\%d).sql
```

**8. Rate Limiting**
```nginx
# /etc/nginx/sites-available/humansonly
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://localhost:3001;
    ...
}
```

---

## 10. Deployment-Checklist für nächstes Mal

**Pre-Deployment:**
- [ ] Environment-Variablen korrekt gesetzt (inkl. PORT=3001)
- [ ] PM2 Ecosystem Config validiert
- [ ] Database Migrations lokal getestet
- [ ] Build erfolgreich (`npm run build`)

**Deployment:**
- [ ] Code deployed (`git pull`)
- [ ] Dependencies installiert (`npm install --production`)
- [ ] Build erstellt (`npm run build`)
- [ ] Migrations ausgeführt (`npx prisma migrate deploy`)
- [ ] PM2 restart (`pm2 restart humansonly`)
- [ ] Health Check (curl https://ho.nm-forum.de)

**Post-Deployment:**
- [ ] PM2 Status prüfen (`pm2 status`)
- [ ] Logs prüfen (`pm2 logs humansonly --lines 100`)
- [ ] Keine Crash-Loops
- [ ] Response-Times < 500ms
- [ ] Datenbank-Verbindung OK
- [ ] SSL-Zertifikat gültig

---

## 11. Monitoring-URLs

**Public:**
- Website: https://ho.nm-forum.de
- Status: https://ho.nm-forum.de/api/health (TODO: Implementieren)

**Server (SSH):**
- PM2 Dashboard: `pm2 monit`
- Nginx Logs: `tail -f /var/log/nginx/access.log`
- App Logs: `pm2 logs humansonly`

---

## Zusammenfassung

**Status: KRITISCH - INSTABIL**

### Was funktioniert:
- ✅ Website ist erreichbar (HTTP 200)
- ✅ SSL/TLS korrekt konfiguriert
- ✅ Nginx läuft stabil
- ✅ Performance gut (146ms TTFB)
- ✅ PostgreSQL läuft

### Was NICHT funktioniert:
- ❌ PM2-Prozess crasht kontinuierlich (312 Restarts!)
- ❌ Falsche Port-Konfiguration (3000 statt 3001)
- ❌ Service läuft nur durch Zombie-Prozess (PID 2937980)
- ⚠️ Leere Datenbank (0 Users)
- ⚠️ Keine Security Headers
- ⚠️ Kein Health-Check-Endpoint

### Nächste Schritte:
1. **SOFORT:** Port-Konfiguration auf 3001 korrigieren
2. **SOFORT:** PM2 neu starten mit korrekter Config
3. **SOFORT:** Zombie-Prozess killen (NACH PM2-Fix!)
4. **24h:** Datenbank-Migrations ausführen
5. **24h:** Security Headers hinzufügen
6. **7 Tage:** Monitoring & Backups einrichten

---

**Validierung abgeschlossen:** 2025-12-21 18:00 CET
**Nächste Validierung empfohlen:** Nach Implementierung der Sofortmaßnahmen

