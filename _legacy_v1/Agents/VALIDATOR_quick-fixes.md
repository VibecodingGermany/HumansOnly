# Quick Fix List - Remaining Twitter References

## KRITISCH - Sofort beheben

### 1. src/components/misc/Notification.tsx
**Zeile 154:**
```tsx
// AKTUELL:
Welcome to the Twitter! <br />

// ÄNDERN ZU:
Welcome to Humans Only! <br />
```

### 2. src/app/layout.tsx
**Zeile 8:**
```tsx
// AKTUELL:
title: "Fettan | Twitter",

// ÄNDERN ZU:
title: "Humans Only | Verified Human Platform",
```

### 3. src/app/page.tsx
**Zeile 62:**
```tsx
// AKTUELL:
<p>Join Twitter today.</p>

// ÄNDERN ZU:
<p>Join Humans Only today.</p>
```

**Zeile 71:**
```tsx
// AKTUELL:
title="You can log in as test account to get full user priviliges if you don't have time to sign up. You can ALSO just look around without even being logged in, just like real Twitter!"

// ÄNDERN ZU:
title="You can log in as test account to get full user priviliges if you don't have time to sign up. You can ALSO just look around without even being logged in, just like a real social platform!"
```

---

## MEDIUM - Sollte behoben werden

### 4. package.json
```json
// AKTUELL:
{
    "name": "twitter",
    "description": "Next.js 13 Full-stack Twitter clone",
    "keywords": [
        "twitter",
        "clone",
        ...
    ]
}

// ÄNDERN ZU:
{
    "name": "humansonly",
    "description": "Next.js 14 Full-stack Social Platform - Humans Only",
    "keywords": [
        "humansonly",
        "social-platform",
        "verified-humans",
        "nextjs",
        "react",
        "typescript",
        "supabase",
        "postgresql",
        "mui",
        "prisma",
        "tanstack"
    ]
}
```

Nach package.json Änderung:
```bash
cd /Users/denniswestermann/Desktop/Coding\ Projekte/HumansOnly/app
npm install  # Regeneriert package-lock.json
```

---

## Optional - Nice to have

### 5. next.config.js
Entferne deprecated Option:
```js
// ENTFERNEN:
experimental: {
    serverActions: true
}
```

---

## Verification Commands

Nach allen Änderungen:
```bash
# 1. Build Test
npm run build

# 2. TypeScript Check
npx tsc --noEmit

# 3. Search für verbleibende Twitter Refs (sollte nur Credits zeigen)
grep -r "Twitter" src/ --include="*.tsx" --exclude-dir=node_modules
```

---

## Commit Template

```bash
git add .
git commit -m "fix: remove remaining Twitter branding from UI texts and metadata

- Update welcome message to 'Humans Only'
- Change page title from 'Fettan | Twitter' to 'Humans Only'
- Update CTA from 'Join Twitter' to 'Join Humans Only'
- Update package.json metadata (name, description, keywords)
- Regenerate package-lock.json

All technical rebranding (DB, CSS, Components) was already completed.
This commit fixes the remaining user-facing text references."
```
