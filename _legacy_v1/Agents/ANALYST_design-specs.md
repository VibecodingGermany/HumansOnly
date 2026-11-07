# Design Specifications - Humans Only

**Analysiert am:** 2025-12-21
**Design-Dateien Quelle:** `/Users/denniswestermann/Desktop/Coding Projekte/HumansOnly/Context/artwork_and_mokups`

---

## Executive Summary

Das "Humans Only" Design folgt einem **Dark Theme mit Rebellions-Ästhetik**. Die Farbpalette ist stark kontrastreich mit leuchtend rotem Call-to-Action (#FF3D1F) auf dunklem Hintergrund. Der Stil erinnert an Punk/Anarchy-Bewegungen mit klaren, kantigen Elementen und einem starken visuellen Statement gegen KI/Bots.

---

## Farbpalette

| Name | HEX (geschätzt) | RGB (ca.) | Verwendung |
|------|-----------------|-----------|------------|
| **Primary Red** | `#FF3D1F` | rgb(255, 61, 31) | Hauptfarbe, CTA-Buttons, Logo-Faust, Highlights |
| **Dark Red Variant** | `#D63020` | rgb(214, 48, 32) | Hover-States, dunklere Akzente |
| **Background Black** | `#0A0A0A` | rgb(10, 10, 10) | Haupthintergrund der App |
| **Card Background** | `#1A1A1A` | rgb(26, 26, 26) | Karten, Panels, erhöhte Elemente |
| **Text Primary** | `#FFFFFF` | rgb(255, 255, 255) | Haupttext, Headlines |
| **Text Secondary** | `#B0B0B0` | rgb(176, 176, 176) | Sekundärtext, Metadaten, Timestamps |
| **Border/Outline** | `#333333` | rgb(51, 51, 51) | Trennlinien, Input-Borders |
| **Error/Alert Red** | `#FF0000` | rgb(255, 0, 0) | Fehler-Indikatoren (sichtbar in Input-Feldern) |
| **Accent Glow** | `#FF3D1F` mit Opacity | rgba(255, 61, 31, 0.3) | Glüheffekte, Schatten hinter Logo |

### Farb-Hierarchie
```css
/* Empfohlene CSS-Variablen */
:root {
  --color-primary: #FF3D1F;
  --color-primary-dark: #D63020;
  --color-primary-glow: rgba(255, 61, 31, 0.3);

  --color-bg-primary: #0A0A0A;
  --color-bg-secondary: #1A1A1A;
  --color-bg-tertiary: #252525;

  --color-text-primary: #FFFFFF;
  --color-text-secondary: #B0B0B0;
  --color-text-muted: #666666;

  --color-border: #333333;
  --color-error: #FF0000;

  --shadow-red-glow: 0 0 20px rgba(255, 61, 31, 0.4);
}
```

---

## Logo

### Haupt-Logo: `HO_LOGO_PNG.png`
- **Aufbau:** Erhobene Faust (Symbol des Widerstands) + Text "HUMANS-ONLY.de"
- **Farben:** Orangerot verlaufend (#FF4D1F → #FF3D1F), schwarze Outline
- **Stil:** Sticker-Optik mit weißem Rand/Schatten
- **Format:** PNG mit Transparenz
- **Einsatzbereiche:**
  - App-Header (alle Screens)
  - Login/SignUp Screen
  - Splash Screen
  - Social Media Assets

### Logo-Variationen (aus Mockups ersichtlich)
1. **Full Logo:** Faust + Text "HUMANS-ONLY.de" (verwendet in Header)
2. **Compact Version:** Nur Faust-Icon für kleine Spaces (nicht als separate Datei, aber verwendbar durch Cropping)

### Logo-Spezifikationen
- **Mindestgröße:** ca. 80px Breite für gute Lesbarkeit
- **Header-Größe (Mobile):** ca. 120px Breite
- **Hintergrund-Empfehlung:**
  - Auf dunklen Hintergründen: Leichter Glow-Effekt (`drop-shadow(0 0 10px rgba(255,61,31,0.5))`)
  - Auf hellen Hintergründen: Direkt verwendbar durch schwarze Outline

---

## Hintergründe

### 1. Website Background: `Website Background_1080.jpg`
**Beschreibung:**
- Futuristischer Tech/Cyberpunk-Hintergrund
- Dunkle Basis mit roten leuchtenden Akzenten
- Circuit-Board-Pattern, digitale Linien
- Vignetten-Effekt zu den Rändern

**Technische Details:**
- Auflösung: 1920×1080px (Full HD)
- Format: JPG
- Farbschema: Schwarz-Rot-Blau (Cyan-Akzente)
- Overlay-Elemente: Rote Tech-Frames an den Ecken

**Verwendung:**
- Login/SignUp Screen Hintergrund
- Website Hero-Section
- Landing Page
- Optional: Leicht gebluert als App-Hintergrund

**Implementierungs-Empfehlung:**
```css
.auth-background {
  background-image: url('Website_Background_1080.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}

/* Optional: Darkening Overlay */
.auth-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
}
```

### 2. Mobile App Hintergrund (aus Mockups)
- **Textur:** Dunkle Betonwand/Asphalt-Textur
- **Farbe:** Sehr dunkles Grau (#0A0A0A - #151515)
- **Stil:** Subtile Körnigkeit für rebellische Ästhetik
- **Verwendung:** Hintergrund aller App-Screens

---

## Mobile Design Analyse

### Geräte-Spezifikationen (aus Mockups)
- **Device:** iPhone-ähnliches Gerät
- **Viewport:** ca. 375×812px (iPhone X/11/12 Standard)
- **Status Bar:** Dark mit weißen Icons
- **Safe Areas:** Beachtet (Top Notch + Bottom Indicator)

---

## Screen-by-Screen Analyse

### 1. SignUp Screen (`SignUp Screen Mock-Up.png`)

**Layout:**
```
┌─────────────────────────┐
│   [Logo zentriert]      │
│                         │
│   JOIN THE              │
│   RESISTANCE.           │
│                         │
│   [Email Input]         │
│   [Username Input]      │
│   [Password Input] ✓    │  ← Validation Icon
│                         │
│   [SIGN UP Button]      │
│                         │
│   Already have account? │
│   Log In                │
└─────────────────────────┘
```

**Komponenten-Details:**

**Headline:**
- Text: "JOIN THE RESISTANCE."
- Schriftgröße: ca. 28px
- Font-Weight: Bold (700+)
- Farbe: #FFFFFF
- Letter-Spacing: Leicht erhöht (0.5px)

**Input-Felder:**
- Background: Transparent mit roter Border (`border: 1px solid #FF3D1F`)
- Padding: 12px 16px
- Border-Radius: 4px (minimal rounded)
- Text-Color: #FFFFFF
- Placeholder-Color: #666666
- Height: ca. 48px
- Margin-Bottom: 16px

**Validation Icons:**
- Grüner Checkmark bei valider Eingabe
- Roter Error-Indicator bei invalider Eingabe
- Position: Rechts im Input-Feld

**SIGN UP Button:**
- Background: #FF3D1F
- Text: "SIGN UP" (weiß, bold, uppercase)
- Border-Radius: 4px
- Padding: 14px
- Width: 100%
- Font-Size: 16px
- Font-Weight: 700
- Box-Shadow: Optional leichter Glow

**Footer-Link:**
- Text: "Already have an account? Log In"
- Farbe: #B0B0B0 (normal) / #FF3D1F (Link "Log In")
- Font-Size: 14px
- Alignment: Center

---

### 2. Discover Screen (`Discover Screen Mock-Up.png`)

**Layout:**
```
┌─────────────────────────┐
│ [Logo]    🔍 🔔 ⚙️      │
│                         │
│ Discover                │
│ ═══════                 │
│                         │
│ [Tag Pills Row]         │
│ #Art #Tech #Music...    │
│                         │
│ ┌─────────────────────┐ │
│ │ [@User Avatar]      │ │
│ │ Post Content        │ │
│ │ [Image]             │ │
│ │ ❤️ 💬 🔁 🔖         │ │
│ └─────────────────────┘ │
│                         │
│ [Navigation Bar]        │
└─────────────────────────┘
```

**Header:**
- Logo: Links, normale Größe
- Icons: Rechts (Search, Notifications, Settings)
- Icon-Color: #FFFFFF
- Icon-Size: 24px
- Spacing: 16px zwischen Icons

**Title "Discover":**
- Font-Size: 32px
- Font-Weight: Bold
- Color: #FFFFFF
- Underline: Rote Linie (`border-bottom: 3px solid #FF3D1F`, width: ca. 60% der Textbreite)

**Tag Pills (Hashtags):**
- Background: #FF3D1F
- Text: Weiß, Bold, mit # Präfix
- Border-Radius: 20px (vollständig rund)
- Padding: 8px 16px
- Font-Size: 13px
- Display: Inline mit Spacing
- Scroll: Horizontal scrollbar (wenn mehr Tags)

**Post Cards:**
- Background: #1A1A1A
- Border-Radius: 12px
- Padding: 16px
- Margin-Bottom: 16px
- Box-Shadow: Subtil

**Post Card Struktur:**
```
┌─────────────────────────┐
│ [Avatar] Username       │
│ @handle · 2h            │
│                         │
│ Post text content here  │
│ multiline possible      │
│                         │
│ [Featured Image]        │
│                         │
│ ❤️ 234  💬 12  🔁 5  🔖 │
└─────────────────────────┘
```

**Post-Header:**
- Avatar: 40px × 40px, kreisrund, roter Border (2px)
- Username: #FFFFFF, 15px, Bold
- Handle + Time: #B0B0B0, 13px

**Post-Text:**
- Color: #FFFFFF
- Font-Size: 15px
- Line-Height: 1.4
- Margin: 12px 0

**Post-Image:**
- Width: 100%
- Border-Radius: 8px
- Max-Height: 300px
- Object-Fit: Cover

**Interaction Icons:**
- Size: 20px
- Color: #B0B0B0 (inaktiv) / #FF3D1F (aktiv)
- Spacing: 24px horizontal
- Counter neben Icon: #B0B0B0, 13px

---

### 3. Profile Screen (`Profile Screen Mock-Up.png`)

**Layout:**
```
┌─────────────────────────┐
│ [Logo]         🔍 🔔 ⚙️ │
│                         │
│     [Profile Avatar]    │
│     Anarcho_Human       │
│     @anarcho_human      │
│     [FOLLOW Button]     │
│                         │
│  No bots, no AI,        │
│  just pure human expr.  │
│                         │
│ Posts  Followers  Foll. │
│  142      2.5K     847  │
│                         │
│ ┌───┬───┬───┐          │
│ │img│img│img│          │
│ ├───┼───┼───┤          │
│ │img│img│img│          │
│ └───┴───┴───┘          │
│                         │
│ [Navigation Bar]        │
└─────────────────────────┘
```

**Profile-Header:**
- Avatar: 80px × 80px, kreisrund
- Border: 3px solid #FF3D1F
- Position: Zentriert

**Username:**
- Display Name: #FFFFFF, 20px, Bold
- Handle: #B0B0B0, 15px, Regular
- Alignment: Center

**Follow Button:**
- Background: #FF3D1F
- Text: "FOLLOW" (weiß, bold, uppercase)
- Border-Radius: 20px (vollständig rund)
- Padding: 8px 32px
- Font-Size: 14px
- Width: Auto (nicht full-width)
- Margin: 16px auto

**Bio:**
- Text: #FFFFFF
- Font-Size: 14px
- Line-Height: 1.5
- Text-Align: Center
- Max-Width: 90%
- Margin: 16px auto

**Stats Row:**
- Layout: 3 Spalten (gleichmäßig verteilt)
- Label: #B0B0B0, 13px, uppercase
- Value: #FFFFFF, 18px, Bold
- Alignment: Center

**Image Grid:**
- Layout: 3 Spalten × n Reihen
- Gap: 4px
- Image: Square (1:1 Ratio)
- Border-Radius: 0
- Object-Fit: Cover

---

### 4. Post Creation Screen (`Post Creation Screen Mock-Up.png`)

**Layout:**
```
┌─────────────────────────┐
│ [Logo]                  │
│                         │
│                         │
│  What's on your mind?   │
│                         │
│  [Text Area]            │
│                         │
│                         │
│                         │
│                         │
│  [Icon] [Icon] [Icon]   │
│  Camera  Image  Location│
│                         │
│  [POST Button]          │
│                         │
│ [Navigation Bar]        │
└─────────────────────────┘
```

**Header:**
- Logo: Zentriert, kleinere Variante

**Prompt:**
- Text: "What's on your mind?"
- Color: #666666
- Font-Size: 16px
- Margin-Bottom: 16px

**Text Area:**
- Background: Transparent
- Border: None (oder sehr subtil)
- Color: #FFFFFF
- Font-Size: 16px
- Min-Height: 200px
- Placeholder: #666666
- Padding: 16px

**Media Icons:**
- Size: 48px × 48px
- Background: Transparent
- Border: 2px solid #FF3D1F
- Border-Radius: 50% (kreisrund)
- Icon-Color: #FF3D1F
- Icon-Size: 24px (innerhalb)
- Spacing: 16px horizontal
- Layout: Flexbox, zentriert

**Icon-Labels:**
- Text: Camera, Image, Location
- Color: #B0B0B0
- Font-Size: 12px
- Position: Unter Icon, zentriert

**POST Button:**
- Background: #FF3D1F
- Text: "POST" (weiß, bold, uppercase)
- Border-Radius: 4px
- Padding: 14px
- Width: 90%
- Margin: 0 auto
- Font-Size: 16px
- Position: Fixed unten (über Navigation Bar)

---

### 5. Notifications Screen (`Notifications Screen Mock-Up.png`)

**Layout:**
```
┌─────────────────────────┐
│ [Logo]         🔍 🔔 ⚙️ │
│                         │
│ ┌─────────────────────┐ │
│ │ ⭕ @user started    │ │
│ │    following you    │ │
│ ├─────────────────────┤ │
│ │ 👤 New User: @name  │ │
│ ├─────────────────────┤ │
│ │ ⭕ @user liked your │ │
│ │    post             │ │
│ ├─────────────────────┤ │
│ │ 👤 @user: Finally I │ │
│ │    just joined...   │ │
│ └─────────────────────┘ │
│                         │
│ [Navigation Bar]        │
└─────────────────────────┘
```

**Notification Items:**
- Background: #1A1A1A
- Border-Radius: 8px
- Padding: 16px
- Margin-Bottom: 8px

**Item-Struktur:**
```
[Avatar/Icon] Username/Text      [Time]
              Secondary text      [Action]
```

**Avatar in Notification:**
- Size: 40px × 40px
- Border: 2px solid #FF3D1F (bei wichtigen Notifications)
- Border-Radius: 50%

**Text-Hierarchie:**
- Primary: #FFFFFF, 15px, Bold (Username)
- Secondary: #B0B0B0, 14px, Regular (Action/Text)
- Timestamp: #666666, 12px, rechts oben

**Action Buttons:**
- "Follow Back": Kleiner roter Button (#FF3D1F, 8px padding, 12px font)
- Position: Rechts in der Notification

**Notification Types (erkennbar):**
1. **Follow:** Roter Avatar-Border
2. **Like:** Herz-Icon in #FF3D1F
3. **Comment:** Chat-Icon
4. **Mention:** @ Symbol

---

## Bottom Navigation Bar (Global)

**Erscheint auf:** Alle Screens außer Login/SignUp

**Layout:**
```
┌─────────────────────────┐
│  🏠   🔍   ➕   🔔   👤 │
│ Home Search Post Notif Profile
└─────────────────────────┘
```

**Spezifikationen:**
- Background: #1A1A1A
- Height: 60px + Safe Area Bottom
- Border-Top: 1px solid #333333
- Position: Fixed Bottom

**Icons:**
- Size: 24px
- Inactive Color: #666666
- Active Color: #FF3D1F
- Spacing: Gleichmäßig verteilt (justify-content: space-around)

**Icon-Mapping:**
- Home: Haus-Icon
- Search: Lupe
- Post: Plus im Kreis (größer, 32px, zentrales Element)
- Notifications: Glocke
- Profile: Person-Silhouette

**Active State:**
- Icon-Color: #FF3D1F
- Optional: Kleiner Punkt unter Icon (#FF3D1F, 4px diameter)

---

## Typography

### Schriftarten (Empfehlung basierend auf Mockups)

**Primary Font:** Sans-Serif, Bold/Black Weight
Ähnlich zu: **Bebas Neue**, **Oswald**, **Impact**, oder **DIN Condensed Bold**

**Secondary Font:** Sans-Serif, Regular/Medium
Ähnlich zu: **Inter**, **Roboto**, **SF Pro** (iOS Native)

### Schriftgrößen-System

```css
/* Empfohlene Type Scale */
--font-size-xs: 12px;    /* Timestamps, Meta-Info */
--font-size-sm: 13px;    /* Tags, Buttons */
--font-size-base: 15px;  /* Body Text, Posts */
--font-size-md: 16px;    /* Input Fields, Navigation */
--font-size-lg: 20px;    /* Usernames, Subheadings */
--font-size-xl: 28px;    /* Headlines (Join the Resistance) */
--font-size-2xl: 32px;   /* Page Titles (Discover) */

/* Font Weights */
--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-bold: 700;
--font-weight-black: 900;

/* Line Heights */
--line-height-tight: 1.2;
--line-height-normal: 1.4;
--line-height-relaxed: 1.6;

/* Letter Spacing */
--letter-spacing-tight: -0.5px;
--letter-spacing-normal: 0;
--letter-spacing-wide: 0.5px;
```

### Typography-Anwendung

**Headlines (H1):**
```css
.headline-primary {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-black);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
  color: var(--color-text-primary);
}
```

**Page Titles (H2):**
```css
.page-title {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-primary);
  border-bottom: 3px solid var(--color-primary);
  padding-bottom: 8px;
  width: fit-content;
}
```

**Body Text:**
```css
.body-text {
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}
```

**Meta Text:**
```css
.meta-text {
  font-size: var(--font-size-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}
```

---

## UI Components

### 1. Buttons

#### Primary Button (CTA)
```css
.btn-primary {
  background: #FF3D1F;
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 14px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  box-shadow: 0 4px 12px rgba(255, 61, 31, 0.3);
}

.btn-primary:hover {
  background: #D63020;
  box-shadow: 0 6px 16px rgba(255, 61, 31, 0.5);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(255, 61, 31, 0.4);
}
```

#### Secondary Button (Follow, etc.)
```css
.btn-secondary {
  background: transparent;
  color: #FF3D1F;
  border: 2px solid #FF3D1F;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 8px 32px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: #FF3D1F;
  color: #FFFFFF;
}
```

#### Icon Buttons
```css
.btn-icon {
  background: transparent;
  border: 2px solid #FF3D1F;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon svg {
  width: 24px;
  height: 24px;
  color: #FF3D1F;
}

.btn-icon:hover {
  background: rgba(255, 61, 31, 0.1);
  transform: scale(1.05);
}
```

---

### 2. Input Fields

```css
.input-field {
  background: transparent;
  border: 1px solid #FF3D1F;
  border-radius: 4px;
  padding: 12px 16px;
  font-size: 16px;
  color: #FFFFFF;
  width: 100%;
  height: 48px;
  transition: all 0.2s ease;
}

.input-field::placeholder {
  color: #666666;
  opacity: 1;
}

.input-field:focus {
  outline: none;
  border-color: #FF3D1F;
  box-shadow: 0 0 0 3px rgba(255, 61, 31, 0.1);
}

.input-field.error {
  border-color: #FF0000;
}

.input-field.success {
  border-color: #00FF00;
}

/* With Icon (Validation) */
.input-wrapper {
  position: relative;
}

.input-wrapper .validation-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
}
```

---

### 3. Cards (Posts, Notifications)

```css
.card {
  background: #1A1A1A;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
}

.card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  transform: translateY(-2px);
}

/* Post Card Specific */
.post-card .header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.post-card .avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #FF3D1F;
  object-fit: cover;
}

.post-card .username {
  font-size: 15px;
  font-weight: 700;
  color: #FFFFFF;
  margin: 0;
}

.post-card .handle {
  font-size: 13px;
  color: #B0B0B0;
}

.post-card .content {
  font-size: 15px;
  line-height: 1.4;
  color: #FFFFFF;
  margin: 12px 0;
}

.post-card .media {
  width: 100%;
  max-height: 300px;
  border-radius: 8px;
  object-fit: cover;
  margin: 12px 0;
}

.post-card .actions {
  display: flex;
  gap: 24px;
  margin-top: 12px;
}

.post-card .action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #B0B0B0;
  cursor: pointer;
  font-size: 13px;
  transition: color 0.2s ease;
}

.post-card .action-btn:hover,
.post-card .action-btn.active {
  color: #FF3D1F;
}
```

---

### 4. Tags/Pills

```css
.tag-pill {
  background: #FF3D1F;
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: 20px;
  display: inline-block;
  margin-right: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tag-pill:hover {
  background: #D63020;
  transform: scale(1.05);
}

/* Scrollable Container */
.tags-container {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  padding: 16px 0;
}

.tags-container::-webkit-scrollbar {
  display: none; /* Chrome/Safari */
}
```

---

### 5. Avatar Component

```css
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #FF3D1F;
  object-fit: cover;
  background: #1A1A1A;
}

.avatar-lg {
  width: 80px;
  height: 80px;
  border-width: 3px;
}

.avatar-sm {
  width: 32px;
  height: 32px;
  border-width: 1px;
}
```

---

### 6. Navigation Icons

```css
.nav-icon {
  width: 24px;
  height: 24px;
  color: #666666;
  transition: color 0.2s ease;
}

.nav-icon.active {
  color: #FF3D1F;
}

.nav-icon:hover {
  color: #FF3D1F;
}

/* Center Post Icon (Larger) */
.nav-icon-post {
  width: 32px;
  height: 32px;
  background: #FF3D1F;
  border-radius: 50%;
  padding: 8px;
  color: #FFFFFF;
}
```

---

### 7. Stats Component (Profile)

```css
.stats-container {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  border-top: 1px solid #333333;
  border-bottom: 1px solid #333333;
  margin: 16px 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: #FFFFFF;
  display: block;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #B0B0B0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

---

### 8. Image Grid (Profile)

```css
.image-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 16px;
}

.image-grid-item {
  aspect-ratio: 1 / 1;
  overflow: hidden;
  cursor: pointer;
}

.image-grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-grid-item:hover img {
  transform: scale(1.1);
}
```

---

## Responsive Breakpoints

Basierend auf den Mockups und Standard-Practices:

```css
/* Mobile First Approach */

/* Small Mobile */
@media (max-width: 374px) {
  /* Kleinere iPhones (SE, etc.) */
}

/* Standard Mobile (Base) */
@media (min-width: 375px) {
  /* iPhone 11/12/13/14 Standard */
  /* Dies ist die Basis der Mockups */
}

/* Large Mobile */
@media (min-width: 414px) {
  /* iPhone Plus/Pro Max Modelle */
}

/* Tablet Portrait */
@media (min-width: 768px) {
  /* iPad Portrait */
  /* Größere Schriften, 2-Spalten-Layouts */
}

/* Tablet Landscape / Small Desktop */
@media (min-width: 1024px) {
  /* iPad Landscape, kleine Laptops */
  /* Sidebar-Navigation möglich */
}

/* Desktop */
@media (min-width: 1440px) {
  /* Standard Desktop */
  /* Max-Width Container: 1200px */
}

/* Large Desktop */
@media (min-width: 1920px) {
  /* Full HD Monitore */
  /* Max-Width Container: 1400px */
}
```

### Container Max-Widths

```css
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 16px;
}

@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}

@media (min-width: 1024px) {
  .container {
    max-width: 960px;
  }
}

@media (min-width: 1440px) {
  .container {
    max-width: 1200px;
  }
}
```

---

## Animations & Transitions

### Standard Transitions
```css
/* Global */
* {
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Buttons */
button {
  transition: all 0.2s ease;
}

/* Hover Lift */
.hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* Fade In */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: fadeIn 0.3s ease forwards;
}

/* Glow Effect */
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 10px rgba(255, 61, 31, 0.3);
  }
  50% {
    box-shadow: 0 0 20px rgba(255, 61, 31, 0.6);
  }
}

.glow-animation {
  animation: glow 2s ease-in-out infinite;
}
```

### Loading States
```css
.loading-skeleton {
  background: linear-gradient(
    90deg,
    #1A1A1A 25%,
    #252525 50%,
    #1A1A1A 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
```

---

## Icon Library

Empfohlene Icon-Sets (basierend auf Mockup-Stil):

### Primär: **Heroicons** (Outline) oder **Lucide Icons**
- Stil passt perfekt: Minimalistisch, klare Linien
- Kostenlos & Open Source
- React/Vue/Vanilla JS Support

### Benötigte Icons:
- `home` - Home Navigation
- `search` - Search/Discover
- `plus-circle` - Post Creation
- `bell` - Notifications
- `user` - Profile
- `heart` - Like
- `chat-bubble` - Comment
- `arrow-path` - Repost/Share
- `bookmark` - Save
- `camera` - Camera Upload
- `photo` - Image Upload
- `map-pin` - Location
- `cog` - Settings
- `check` - Validation Success
- `x-mark` - Error/Close
- `ellipsis-horizontal` - More Options

---

## Accessibility Considerations

### WCAG 2.1 AA Compliance

**Kontrast-Ratios (gemessen):**
- `#FFFFFF` auf `#0A0A0A` → 19.8:1 ✅ (AAA)
- `#FF3D1F` auf `#0A0A0A` → 5.2:1 ✅ (AA)
- `#B0B0B0` auf `#0A0A0A` → 8.3:1 ✅ (AAA)

**Empfehlungen:**
1. **Keyboard Navigation:** Alle interaktiven Elemente müssen fokussierbar sein
2. **Focus States:** Klare visuelle Indikatoren
   ```css
   *:focus-visible {
     outline: 2px solid #FF3D1F;
     outline-offset: 2px;
   }
   ```
3. **ARIA Labels:** Für Icon-Buttons
   ```html
   <button aria-label="Like post">
     <HeartIcon />
   </button>
   ```
4. **Alt-Text:** Alle Bilder müssen beschreibenden Alt-Text haben
5. **Screen Reader:** Semantisches HTML verwenden (`<nav>`, `<main>`, `<article>`)

---

## Marketing Material

### Poster Mock-Up (`Poster Mock-Up.png`)

**Beschreibung:**
- Punk/Anarchy-Ästhetik mit Collage-Stil
- Schwarz-Weiß-Rot Farbschema
- Graffiti-artige Elemente
- Große Bold Typography: "ANARCHY & SOLIDARITY"
- Mehrere Faust-Symbole
- Distressed/Grunge-Textur

**Verwendung:**
- Social Media Marketing
- Print-Kampagnen
- Guerrilla Marketing
- Website Hero-Section Alternative
- Über-Uns-Seite

**Stil-Takeaways für Web-Design:**
- Bold, statement-orientierte Headlines
- Collage-ähnliche Layouts für Marketing-Seiten
- Grunge-Texturen als Hintergrund-Option
- Rebellische, aktivistische Anmutung

---

## Implementierungs-Empfehlungen

### 1. Technologie-Stack

**Frontend Framework:**
- **React** oder **Vue.js** (komponentenbasiert)
- **Next.js** (falls SEO wichtig)
- **React Native** (für native iOS/Android App)

**Styling:**
- **Tailwind CSS** mit Custom Theme
- **CSS Modules** für Component-spezifische Styles
- **Styled Components** (CSS-in-JS Alternative)

**Icons:**
- `@heroicons/react` oder `lucide-react`

**Image Handling:**
- `next/image` (Next.js)
- `react-lazy-load-image-component` (Lazy Loading)

---

### 2. Tailwind Config (Custom Theme)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF3D1F',
          dark: '#D63020',
          glow: 'rgba(255, 61, 31, 0.3)',
        },
        background: {
          primary: '#0A0A0A',
          secondary: '#1A1A1A',
          tertiary: '#252525',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#B0B0B0',
          muted: '#666666',
        },
        border: '#333333',
        error: '#FF0000',
      },
      fontFamily: {
        headline: ['Bebas Neue', 'Impact', 'sans-serif'],
        body: ['Inter', 'SF Pro', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        xs: '12px',
        sm: '13px',
        base: '15px',
        md: '16px',
        lg: '20px',
        xl: '28px',
        '2xl': '32px',
      },
      borderRadius: {
        DEFAULT: '4px',
        lg: '8px',
        xl: '12px',
        full: '9999px',
      },
      boxShadow: {
        'red-glow': '0 0 20px rgba(255, 61, 31, 0.4)',
        'red-glow-lg': '0 0 30px rgba(255, 61, 31, 0.6)',
        card: '0 2px 8px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
```

---

### 3. Component Library Struktur

```
src/
├── components/
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Input.jsx
│   │   ├── Card.jsx
│   │   ├── Avatar.jsx
│   │   ├── Tag.jsx
│   │   └── NavigationBar.jsx
│   ├── layout/
│   │   ├── Header.jsx
│   │   ├── Container.jsx
│   │   └── AuthLayout.jsx
│   ├── post/
│   │   ├── PostCard.jsx
│   │   ├── PostActions.jsx
│   │   └── PostGrid.jsx
│   ├── profile/
│   │   ├── ProfileHeader.jsx
│   │   ├── ProfileStats.jsx
│   │   └── ImageGrid.jsx
│   └── notifications/
│       └── NotificationItem.jsx
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   └── background.jpg
│   └── icons/
└── styles/
    ├── globals.css
    └── variables.css
```

---

### 4. Prioritäten für die Implementierung

**Phase 1: Foundation (Woche 1)**
- [ ] Farbschema & CSS-Variablen setup
- [ ] Typography-System
- [ ] Logo-Integration
- [ ] Button-Komponenten
- [ ] Input-Komponenten

**Phase 2: Layout (Woche 1-2)**
- [ ] Navigation Bar
- [ ] Container/Layout-Komponenten
- [ ] Auth-Screens (Login/SignUp)
- [ ] Background-Integration

**Phase 3: Core Features (Woche 2-3)**
- [ ] Post Card Component
- [ ] Profile Screen
- [ ] Discover Feed
- [ ] Post Creation

**Phase 4: Details (Woche 3-4)**
- [ ] Notifications
- [ ] Image Grid
- [ ] Tag System
- [ ] Animations & Transitions

**Phase 5: Polish (Woche 4)**
- [ ] Responsive Testing
- [ ] Accessibility Audit
- [ ] Performance Optimization
- [ ] Cross-Browser Testing

---

### 5. Design-to-Code Workflow

1. **Assets vorbereiten:**
   - Logo in verschiedenen Größen exportieren (1x, 2x, 3x)
   - Background-Bild optimieren (WebP-Format)
   - SVG-Icons sammeln

2. **Component-Driven Development:**
   - Starte mit kleinsten UI-Elementen (Buttons, Inputs)
   - Baue größere Komponenten daraus (Cards, Forms)
   - Kombiniere zu Screens

3. **Testing:**
   - Jede Komponente in Isolation testen
   - Responsive Breakpoints prüfen
   - Dark Mode Support (bereits gegeben)
   - Accessibility mit axe DevTools

4. **Dokumentation:**
   - Storybook für Component-Library
   - Props-Dokumentation
   - Usage-Beispiele

---

## Datei-Optimierungen

### Logo
```bash
# Original PNG optimieren
pngquant HO_LOGO_PNG.png --quality=80-95 --output logo-optimized.png

# Verschiedene Größen generieren
convert logo-optimized.png -resize 120x logo-120.png
convert logo-optimized.png -resize 240x logo-240@2x.png
convert logo-optimized.png -resize 360x logo-360@3x.png
```

### Background
```bash
# JPEG zu WebP konvertieren (bessere Kompression)
cwebp -q 85 "Website Background_1080.jpg" -o background-1080.webp

# Responsive Varianten
convert background-1080.webp -resize 768x background-768.webp
convert background-1080.webp -resize 1440x background-1440.webp
convert background-1080.webp -resize 1920x background-1920.webp
```

### Implementierung
```css
.auth-background {
  background-image:
    image-set(
      url('background-768.webp') 768w,
      url('background-1080.webp') 1080w,
      url('background-1440.webp') 1440w,
      url('background-1920.webp') 1920w
    );
  background-size: cover;
  background-position: center;
}
```

---

## Performance-Empfehlungen

### Critical Rendering Path
1. **Inline Critical CSS** für Above-the-Fold-Content
2. **Lazy Load** alle Bilder unterhalb des Viewports
3. **Font Loading Strategy:**
   ```css
   @font-face {
     font-family: 'Bebas Neue';
     src: url('bebas-neue.woff2') format('woff2');
     font-display: swap; /* Verhindert FOIT */
   }
   ```

### Image Optimization
- WebP-Format verwenden
- Responsive Images (`srcset`)
- Lazy Loading (`loading="lazy"`)
- Placeholder/Blur-Up Technik

### Bundle Size
- Code Splitting pro Route
- Tree Shaking aktivieren
- Icon-Library nur benötigte Icons importieren
- CSS-Purging (Tailwind)

---

## Design-System Dokumentation

### Spacing System (8px Grid)
```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;
```

### Z-Index Scale
```css
--z-base: 1;
--z-dropdown: 100;
--z-sticky: 200;
--z-fixed: 300;
--z-modal-backdrop: 400;
--z-modal: 500;
--z-popover: 600;
--z-tooltip: 700;
```

### Border Radius System
```css
--radius-none: 0;
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
```

---

## Brand Voice & Messaging (aus Designs abgeleitet)

**Tone of Voice:**
- Rebellisch, aber inklusiv
- Direkt und unverblümt
- Gemeinschaftsorientiert
- Anti-Establishment (vs. AI/Bots)

**Key Messages:**
- "JOIN THE RESISTANCE" - Aufruf zur Aktion
- "HUMAN RESISTANCE NETWORK" - Community-Fokus
- "No Bots. Just People." - Klares Value Proposition
- "ANARCHY & SOLIDARITY" - Paradoxe Vereinigung

**Anwendung im UI:**
- Empty States: "No bots here, just waiting for humans like you!"
- Error Messages: "Even humans make mistakes. Let's try again."
- Success Messages: "Hell yeah! You're in, human!"
- Loading States: "Gathering the resistance..."

---

## Mobile-Specific Considerations

### Touch Targets
- Minimum 44×44px (iOS Human Interface Guidelines)
- Spacing zwischen klickbaren Elementen: min. 8px
- Bottom Navigation Icons: 60px height gesamt

### Safe Areas (iOS)
```css
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-nav {
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
}
```

### Gesture Handling
- Swipe zum Löschen (Notifications)
- Pull-to-Refresh (Feeds)
- Swipe-Navigation zwischen Tabs
- Long-Press für Kontext-Menüs

### Keyboard Behavior
- Input-Felder: `autocomplete`, `autocapitalize`, `inputmode` Attribute
- Keyboard vermeidet: Fixed Elements adjustieren
- Return-Key-Label: `enterkeyhint="send"` bei Post-Creation

---

## Finaler Checklist für Builder

### Assets
- [ ] Logo (PNG, verschiedene Größen)
- [ ] Background (WebP, responsive)
- [ ] Icon Library installiert
- [ ] Font Files (falls Custom Fonts)

### Styles
- [ ] CSS-Variablen definiert
- [ ] Tailwind Config (falls verwendet)
- [ ] Typography System
- [ ] Color Palette
- [ ] Spacing/Grid System

### Components (Priorität)
- [ ] Button (Primary, Secondary, Icon)
- [ ] Input (mit Validation)
- [ ] Card
- [ ] Avatar
- [ ] Tag/Pill
- [ ] Navigation Bar
- [ ] Post Card
- [ ] Profile Header
- [ ] Notification Item

### Screens
- [ ] SignUp/Login
- [ ] Discover Feed
- [ ] Profile
- [ ] Post Creation
- [ ] Notifications

### Functionality
- [ ] Responsive (375px - 1920px)
- [ ] Dark Theme (bereits gegeben)
- [ ] Accessibility (Keyboard, Screen Reader)
- [ ] Animations (Hover, Focus, Loading)
- [ ] Form Validation
- [ ] Image Upload UI

### Testing
- [ ] Cross-Browser (Chrome, Safari, Firefox)
- [ ] iOS/Android (wenn PWA/Native)
- [ ] Lighthouse Audit (Performance, Accessibility)
- [ ] Manual Testing auf realen Geräten

---

## Zusätzliche Notizen

### Nicht in Mockups enthalten (zu klären):
1. **Settings Screen:** Layout/Optionen unklar
2. **Search Screen:** Nur Icon sichtbar, keine Search-Ergebnisse
3. **Direct Messages:** Falls geplant - kein Design vorhanden
4. **Onboarding Flow:** Nur SignUp, kein Multi-Step-Process
5. **Error States:** Keine 404/500-Seiten im Design
6. **Empty States:** Wie sehen leere Feeds aus?
7. **Post-Detail View:** Nur Feed-Ansicht, keine Detail-Seite

### Design-Variationen möglich:
- **Light Mode:** Falls gewünscht (aktuell nur Dark)
- **Alternative Color Schemes:** z.B. für Events/Kategorien
- **Desktop Layout:** Sidebar-Navigation statt Bottom-Nav?

---

## Kontakt & Feedback

Bei Unklarheiten oder zusätzlichen Design-Anforderungen:
1. Fehlende Screens nachliefern lassen
2. Edge Cases besprechen (leere States, Fehler, etc.)
3. Animation-Details abstimmen
4. Performance-Budget festlegen

---

**Dokument erstellt:** 2025-12-21
**Version:** 1.0
**Nächster Review:** Nach Implementierung Phase 1

---

## Quick Reference - Color Codes

```
Primary: #FF3D1F
Background: #0A0A0A
Card BG: #1A1A1A
Text: #FFFFFF
Text Secondary: #B0B0B0
Border: #333333
```

**HEX-Codes für Copy-Paste:**
```
#FF3D1F  #D63020  #0A0A0A  #1A1A1A  #252525
#FFFFFF  #B0B0B0  #666666  #333333  #FF0000
```

---

**END OF DESIGN SPECIFICATIONS**
