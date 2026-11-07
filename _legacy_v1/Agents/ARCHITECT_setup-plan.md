# ARCHITECT SETUP-PLAN: Humans Only Repository Setup

**Datum:** 2025-12-21
**Projekt:** Humans Only - Anti-AI Social Media Platform
**Basis-Repository:** https://github.com/fatiharapoglu/twitter
**Ziel-Domain:** ho.nm-forum.de
**Server:** Ubuntu 24.04 @ 5.182.17.148

---

## Entscheidung: Fork vs. Clone

### Gewählte Lösung: **Clone + neues Repository**

**Begründung:**
1. **Brand Identity**: "Humans Only" soll als eigenständige Plattform wahrgenommen werden
2. **Entwicklungsfreiheit**: Erhebliche Änderungen geplant (AI-Detection, Monetarisierung)
3. **Lizenz-Compliance**: MIT-Lizenz erlaubt dies mit Attribution
4. **Deployment-Strategie**: Eigener VPS erfordert eigenständige CI/CD-Pipeline

**Attribution-Plan:**
```markdown
## Credits
This project is built upon the excellent work of Fatih Arapoglu's Twitter Clone:
https://github.com/fatiharapoglu/twitter
Original project is licensed under MIT License.
```

---

## Voraussetzungen

### Lokal (macOS)

| Tool | Min. Version | Prüfbefehl |
|------|-------------|------------|
| Node.js | 18.x+ | `node --version` |
| npm | 9.x+ | `npm --version` |
| Git | 2.x | `git --version` |
| PostgreSQL | 14.x+ | `psql --version` |

### Server (Ubuntu 24.04)

| Tool | Installation |
|------|--------------|
| Node.js 20.x | `curl -fsSL https://deb.nodesource.com/setup_20.x \| sudo -E bash -` |
| PostgreSQL 16 | `sudo apt install postgresql-16` |
| Nginx | `sudo apt install nginx` |
| PM2 | `npm install -g pm2` |
| Certbot | `sudo apt install certbot python3-certbot-nginx` |

---

## Schritt-für-Schritt Setup

### Phase 1: Repository clonen

```bash
cd "/Users/denniswestermann/Desktop/Coding Projekte/HumansOnly"

# Original clonen
git clone https://github.com/fatiharapoglu/twitter.git app

# In Projekt-Ordner
cd app

# Neues Git initialisieren
rm -rf .git
git init
git add .
git commit -m "chore: Initial commit - Base from fatiharapoglu/twitter (MIT License)"
```

### Phase 2: Dependencies installieren

```bash
npm install

# Potenzielle Fixes:
# npm rebuild bcrypt (bei Build-Fehlern)
```

### Phase 3: PostgreSQL einrichten

```bash
# macOS Homebrew
brew services start postgresql@16
createdb humansonly_dev

# ODER Docker:
docker run --name humansonly-postgres \
  -e POSTGRES_PASSWORD=dev_password_2024 \
  -e POSTGRES_DB=humansonly_dev \
  -p 5432:5432 \
  -d postgres:16-alpine
```

### Phase 4: Environment Variables

**`.env` erstellen:**
```env
# DATABASE
DATABASE_URL="postgresql://[USER]@localhost:5432/humansonly_dev?schema=public"

# AUTHENTICATION
JWT_SECRET_KEY="humansonly_jwt_secret_dev_2024"
CREATION_SECRET_KEY="humansonly_creation_secret_dev_2024"
BLUE_SECRET_KEY="thanksforcaring"

# SUPABASE (TEMPORÄR)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_KEY="[ANON-KEY]"
NEXT_PUBLIC_STORAGE_URL="https://[PROJECT].supabase.co/storage/v1/object/public/twitter-clone/"

# APPLICATION
NEXT_PUBLIC_HOST_URL="http://localhost:3000"
NODE_ENV="development"
```

### Phase 5: Prisma Migration

```bash
cd src
npx prisma migrate dev --name init
npx prisma generate
```

### Phase 6: Development Server starten

```bash
npm run dev
# Browser: http://localhost:3000
```

---

## Datenbank-Schema Erweiterungen (für später)

### AI-Detection Model
```prisma
model AIDetectionResult {
  id        String   @id @default(uuid())
  postId    String
  post      Tweet    @relation(fields: [postId], references: [id], onDelete: Cascade)
  mediaType String
  score     Float
  provider  String
  rawResult Json
  status    String   @default("pending")
  createdAt DateTime @default(now())
}
```

### Report Model
```prisma
model Report {
  id          String   @id @default(uuid())
  postId      String
  post        Tweet    @relation(fields: [postId], references: [id], onDelete: Cascade)
  reporterId  String
  reporter    User     @relation(fields: [reporterId], references: [id])
  category    String
  description String?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
}
```

---

## Potenzielle Probleme & Lösungen

| Problem | Lösung |
|---------|--------|
| bcrypt Build-Fehler | `npm rebuild bcrypt` |
| Port 3000 belegt | `lsof -ti:3000 \| xargs kill -9` |
| Prisma Migration Fehler | DB-Connection prüfen: `psql $DATABASE_URL -c "SELECT 1"` |
| Supabase Storage Error | Temporär Supabase-Projekt erstellen |

---

## Server Deployment (Ubuntu 24.04)

### Nginx Config
```nginx
server {
    listen 80;
    server_name ho.nm-forum.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /storage/ {
        alias /var/www/humansonly/public/uploads/;
        expires 1y;
    }
}
```

### SSL einrichten
```bash
certbot --nginx -d ho.nm-forum.de
```

---

## Checkliste: Setup Complete

- [ ] Repository gecloned
- [ ] Dependencies installiert
- [ ] PostgreSQL läuft
- [ ] `.env` erstellt
- [ ] Prisma Migration durchgeführt
- [ ] Dev-Server startet
- [ ] Registration/Login funktioniert
- [ ] Posts können erstellt werden

---

**Nächster Schritt:** Builder-Agent für Implementierung
