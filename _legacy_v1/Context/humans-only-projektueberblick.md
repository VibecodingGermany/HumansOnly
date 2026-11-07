# Humans Only – Projektüberblick

## Vision

"Humans Only" ist eine Anti-AI Social Media Plattform. Keine KI-generierten
Bilder, Videos, Audios oder Texte. Nur authentische, von Menschen erstellte
Inhalte.

Zielgruppe: Künstler, Musiker, Creator – Menschen, die ihre echten Werke
präsentieren und dafür unterstützt werden wollen.

## Domain

```
ho.nm-forum.de
```

## Basis-Repository

Fork von: https://github.com/fatiharapoglu/twitter

Lizenz: MIT (kommerzielle Nutzung erlaubt)

## Tech-Stack (aus Basis-Repo)

- **Framework:** Next.js 14+ (App Router)
- **Sprache:** TypeScript
- **Datenbank:** PostgreSQL
- **ORM:** Prisma
- **UI:** Material UI, SCSS
- **State:** React Query (TanStack)
- **Auth:** Custom JWT mit bcrypt
- **Formulare:** Formik + Yup
- **Animationen:** Framer Motion

## Vorhandene Features (Basis-Repo)

- User-Profile (Name, Bio, Profilbild, Header)
- Posts mit Text und Bildern
- Replies (verschachtelt)
- Following/Followers
- Likes und Reposts
- Benachrichtigungen
- Direktnachrichten
- Suche (User und Posts)
- Infinite Scroll
- Dark/Light Mode
- Responsive Design

## Datenbank-Schema (Prisma)

```prisma
model User {
    id               String         @id @default(uuid())
    name             String?
    description      String?
    location         String?
    website          String?
    photoUrl         String?
    headerUrl        String?
    username         String         @unique
    password         String
    isPremium        Boolean        @default(false)
    createdAt        DateTime       @default(now())
    updatedAt        DateTime       @updatedAt
    createdTweets    Tweet[]
    retweets         Tweet[]
    likedTweets      Tweet[]
    following        User[]
    followers        User[]
    sentMessages     Message[]
    receivedMessages Message[]
    notifications    Notification[]
}

model Tweet {
    id          String   @id @default(uuid())
    text        String
    createdAt   DateTime @default(now())
    author      User
    authorId    String
    photoUrl    String?
    likedBy     User[]
    retweetedBy User[]
    replies     Tweet[]
    isRetweet   Boolean  @default(false)
    isReply     Boolean  @default(false)
}

model Message {
    id          String   @id @default(uuid())
    text        String
    createdAt   DateTime @default(now())
    sender      User
    senderId    String
    recipient   User
    recipientId String
    photoUrl    String?
}

model Notification {
    id        String   @id @default(uuid())
    type      String
    content   String
    createdAt DateTime @default(now())
    isRead    Boolean  @default(false)
    user      User
    userId    String
}
```

## Projekt-Struktur

```
src/
├── app/              # Next.js App Router (Pages, API Routes)
├── components/       # React Komponenten
├── hooks/            # Custom React Hooks
├── prisma/           # Datenbank-Schema und Migrations
├── styles/           # SCSS Styles
├── types/            # TypeScript Types
├── utilities/        # Helper Functions
└── middleware.ts     # Auth Middleware
```

## Erweiterungen für Humans Only

### Phase 1: Rebranding + Basis-Anpassungen

- [ ] Rebranding: "Twitter" → "Humans Only"
- [ ] Logo und Farbschema anpassen
- [ ] "Tweet" → "Post" umbenennen
- [ ] "Retweet" → "Repost" umbenennen
- [ ] isPremium → isVerifiedHuman umwandeln
- [ ] Storage auf eigenen Server umstellen (aktuell externes Object Storage)
- [ ] Deployment auf eigenem VPS konfigurieren

### Phase 2: AI-Detection System

- [ ] Neues Prisma-Model: `AIDetectionResult`
- [ ] Upload-Pipeline erweitern: Medien vor Veröffentlichung prüfen
- [ ] AI-Detection-Score pro Post speichern
- [ ] Moderation-Queue für verdächtige Inhalte
- [ ] Admin-Dashboard für Moderation

**Neues Schema-Element:**

```prisma
model AIDetectionResult {
    id            String   @id @default(uuid())
    postId        String
    post          Tweet    @relation(fields: [postId], references: [id])
    mediaType     String   // image, video, audio
    score         Float    // 0.0 - 1.0 (Wahrscheinlichkeit für AI)
    provider      String   // welcher Detector genutzt wurde
    rawResult     Json     // vollständige API-Antwort
    status        String   // pending, approved, rejected, review
    createdAt     DateTime @default(now())
}
```

### Phase 3: Melde-System

- [ ] "AI-Content melden" Button an jedem Post
- [ ] Neues Prisma-Model: `Report`
- [ ] Report-Kategorien: AI-generiert, Spam, Belästigung, etc.
- [ ] Community-Voting für Reports (optional)
- [ ] Eskalations-Logik für Moderatoren

**Neues Schema-Element:**

```prisma
model Report {
    id          String   @id @default(uuid())
    postId      String
    post        Tweet    @relation(fields: [postId], references: [id])
    reporterId  String
    reporter    User     @relation(fields: [reporterId], references: [id])
    category    String   // ai_content, spam, harassment, other
    description String?
    status      String   @default("pending") // pending, reviewed, resolved
    createdAt   DateTime @default(now())
}
```

### Phase 4: Human Verification

- [ ] Verifizierungs-Stufen implementieren
- [ ] Badge-System für verifizierte Menschen
- [ ] Portfolio-Linking (externe Künstler-Profile)
- [ ] Optional: ID-Verifizierung für Creator

**Schema-Erweiterung User:**

```prisma
model User {
    // ... bestehende Felder
    verificationTier    String   @default("basic") // basic, verified, creator
    verificationDate    DateTime?
    linkedPortfolios    String[] // URLs zu externen Profilen
}
```

### Phase 5: Creator-Monetarisierung

- [ ] Tip/Spenden-Funktion
- [ ] Subscription-Tiers pro Creator
- [ ] Payment-Integration (Provider-agnostisch)
- [ ] Payout-Dashboard für Creator

**Neue Schema-Elemente:**

```prisma
model Subscription {
    id            String   @id @default(uuid())
    subscriberId  String
    subscriber    User     @relation("subscriber", fields: [subscriberId], references: [id])
    creatorId     String
    creator       User     @relation("creator", fields: [creatorId], references: [id])
    tierId        String
    tier          SubscriptionTier @relation(fields: [tierId], references: [id])
    status        String   @default("active")
    startsAt      DateTime @default(now())
    endsAt        DateTime?
}

model SubscriptionTier {
    id          String   @id @default(uuid())
    creatorId   String
    creator     User     @relation(fields: [creatorId], references: [id])
    name        String
    price       Decimal
    currency    String   @default("EUR")
    benefits    String[]
}

model Tip {
    id          String   @id @default(uuid())
    senderId    String
    sender      User     @relation("tipSender", fields: [senderId], references: [id])
    recipientId String
    recipient   User     @relation("tipRecipient", fields: [recipientId], references: [id])
    amount      Decimal
    currency    String   @default("EUR")
    message     String?
    createdAt   DateTime @default(now())
}
```

## Deployment

- **Server:** Eigener VPS
- **Datenbank:** PostgreSQL (lokal auf VPS)
- **Media Storage:** Lokales Filesystem oder eigener Object Storage
- **Reverse Proxy:** Nach Bedarf konfigurieren
- **SSL:** Für ho.nm-forum.de einrichten

## Prioritäten

1. Repository forken und lokal zum Laufen bringen
2. Rebranding durchführen
3. Storage auf eigenen Server umstellen
4. Deployment auf VPS
5. AI-Detection Grundgerüst implementieren
6. Melde-System einbauen
7. Verification-System
8. Monetarisierung (später)

## Offene Entscheidungen

- [ ] Welcher AI-Detection-Ansatz? (API vs. Self-Hosted)
- [ ] Audio/Video-Upload: FFmpeg-Pipeline nötig?
- [ ] Real-Time Notifications: WebSocket hinzufügen?
- [ ] Welcher Payment-Provider für Monetarisierung?

---

**Basis-Repo:** https://github.com/fatiharapoglu/twitter\
**Ziel-Domain:** ho.nm-forum.de\
**Lizenz:** MIT
