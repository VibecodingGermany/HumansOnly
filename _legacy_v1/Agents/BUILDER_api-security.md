# Builder Report: API Security - PhotoURL Sanitization

**Date:** 2025-12-22
**Agent:** @builder
**Task:** Add missing photoUrl/headerUrl sanitization in User Edit Route

---

## Executive Summary

**Security Fix implemented:** User Edit API endpoint now sanitizes photoUrl and headerUrl inputs to prevent injection of malicious URLs or unauthorized file paths.

**Status:** COMPLETED
**Build Status:** TypeScript validation PASSED
**Affected Routes:** 1 API endpoint

---

## Changes Overview

### 1. Security Sanitization Implementation

**File:** `/src/app/api/users/[username]/edit/route.ts`

**Problem:**
- User Edit endpoint accepted raw JSON data without validation
- photoUrl and headerUrl were directly passed to Prisma without sanitization
- Potential security vulnerability: malicious URLs could be injected

**Solution:**
Implemented URL sanitization logic matching the pattern from `tweets/create` route:

```typescript
// Sanitize photoUrl
const sanitizedPhotoUrl = photoUrl && typeof photoUrl === 'string'
    ? (photoUrl.startsWith('/uploads/') || photoUrl.startsWith('http://') || photoUrl.startsWith('https://'))
        ? photoUrl
        : null
    : null;

// Sanitize headerUrl
const sanitizedHeaderUrl = headerUrl && typeof headerUrl === 'string'
    ? (headerUrl.startsWith('/uploads/') || headerUrl.startsWith('http://') || headerUrl.startsWith('https://'))
        ? headerUrl
        : null
    : null;
```

**Validation Logic:**
1. Type check: Ensures value is a string
2. Prefix validation: Only allows:
   - Local uploads: `/uploads/*`
   - External HTTP: `http://`
   - External HTTPS: `https://`
3. Fallback: Returns `null` for invalid inputs

**Before:**
```typescript
const data = await request.json();
await prisma.user.update({
    where: { username },
    data: data, // ⚠️ Unsafe: direct data injection
});
```

**After:**
```typescript
const { name, description, location, website, photoUrl, headerUrl } = await request.json();
await prisma.user.update({
    where: { username },
    data: {
        name,
        description,
        location,
        website,
        photoUrl: sanitizedPhotoUrl,    // ✓ Safe: sanitized
        headerUrl: sanitizedHeaderUrl,  // ✓ Safe: sanitized
    },
});
```

---

### 2. .gitignore Update

**File:** `/app/.gitignore`

**Added:**
```gitignore
# Uploads
/public/uploads/*
!/public/uploads/.gitkeep
```

**Purpose:**
- Prevents user-uploaded files from being committed to repository
- Keeps `.gitkeep` file to preserve directory structure
- Follows security best practice: never commit user-generated content

---

## Security Impact

### Before Fix:
- User could inject arbitrary URLs into photoUrl/headerUrl
- Potential XSS if URLs were rendered without CSP
- Data integrity issues with invalid file paths

### After Fix:
- Only whitelisted URL patterns accepted
- Invalid URLs silently converted to `null`
- Consistent sanitization across all API endpoints (tweets + users)

---

## Consistency Check

**Sanitization now implemented in:**
1. `/api/tweets/create` - photoUrl sanitization ✓
2. `/api/users/[username]/edit` - photoUrl + headerUrl sanitization ✓

**Pattern Consistency:**
Both endpoints use identical sanitization logic, ensuring uniform security posture across the API surface.

---

## Validation Results

### TypeScript Build:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (28/28)
```

**No type errors introduced.**

---

## Affected Files

| File Path | Change Type | Lines Changed |
|-----------|-------------|---------------|
| `/src/app/api/users/[username]/edit/route.ts` | MODIFIED | +23 lines |
| `/app/.gitignore` | MODIFIED | +4 lines |

---

## Testing Recommendations

### Manual Testing:
1. **Valid URL Test:**
   - Send: `photoUrl: "/uploads/avatar.jpg"`
   - Expected: Saved successfully

2. **External URL Test:**
   - Send: `photoUrl: "https://example.com/image.jpg"`
   - Expected: Saved successfully

3. **Invalid URL Test:**
   - Send: `photoUrl: "javascript:alert('XSS')"`
   - Expected: Saved as `null`

4. **Type Mismatch Test:**
   - Send: `photoUrl: { malicious: "object" }`
   - Expected: Saved as `null`

### Automated Testing (TODO):
```typescript
describe('POST /api/users/[username]/edit', () => {
  it('should sanitize invalid photoUrl to null', async () => {
    const response = await fetch('/api/users/testuser/edit', {
      method: 'POST',
      body: JSON.stringify({ photoUrl: 'file://etc/passwd' })
    });
    const user = await db.user.findUnique({ where: { username: 'testuser' } });
    expect(user.photoUrl).toBeNull();
  });
});
```

---

## Code Quality Metrics

- **TypeScript Strict Mode:** PASS
- **ESLint:** No new warnings
- **Build Size Impact:** Negligible (+23 lines)
- **Performance Impact:** None (O(1) string operations)

---

## Next Steps

1. **Deploy to staging** for integration testing
2. **Monitor logs** for rejected URL patterns (could indicate attack attempts)
3. **Consider CSP headers** for additional XSS protection
4. **Add unit tests** for sanitization logic

---

## Notes

- Sanitization follows defensive programming: "reject invalid, don't fix"
- `null` fallback ensures database consistency (NULL-able columns)
- Pattern matches existing codebase style (tweet creation route)

---

**Implementation Complete.**
**Security posture improved.**
**No breaking changes introduced.**
