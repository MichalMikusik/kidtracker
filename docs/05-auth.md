# 5. Authentication & Authorization

## Authentication Flow

### Guest Mode (No Sign-In)

- The app is fully functional without authentication.
- State is initialized from `localStorage` on app load.
- Profile limit: **2 profiles** maximum.
- No cloud sync, no AI insights.

### Signed-In Mode (Google)

- Users sign in via `signInWithRedirect` using Firebase's `GoogleAuthProvider`.
  - `signInWithPopup` was deprecated in favour of redirect due to Google enforcing `COOP: same-origin` on `accounts.google.com` (April 2026), which breaks the popup postMessage channel.
- On page load, `handleRedirectResult()` is called once to finalise the redirect flow before `onAuthStateChanged` fires.
- On successful login:
  1. `AccountProfile` is fetched (or created with defaults) from Firestore.
  2. The app subscribes to the user's `trackerState` document in Firestore.
  3. **Sync logic**: If cloud data exists → overwrite local. If cloud is empty → upload local data (guest-to-cloud migration).
- Profile limit: **4 profiles** (free), **unlimited** (premium).

### Auth State Listener

```typescript
auth.onAuthStateChanged(async (currentUser) => {
    setUser(currentUser);
    if (currentUser) {
        // Fetch account profile
        // Subscribe to Firestore data
    } else {
        // Guest mode — use localStorage only
    }
});
```

## Firestore Security Rules

The security rules in [firestore.rules](../firestore.rules) enforce:

### 1. Owner-Only Access
All user data is scoped to `users/{userId}/...`. Rules require `request.auth.uid == userId`.

### 2. Premium Escalation Prevention
The `isPremium` field on `AccountProfile` cannot be self-granted:

```
allow write: if ...
  && (
    !('isPremium' in request.resource.data)        // field not included
    || request.resource.data.isPremium == false     // downgrade is fine
    || (resource.data.isPremium == true             // preserving existing true
        && request.resource.data.isPremium == true)
  );
```

Only backend/admin operations can set `isPremium = true`.

### 3. Profile Limit Enforcement
Free users are limited to 4 profiles at the Firestore level:

```
allow write: if ...
  && (
    isPremium(userId)
    || !('profiles' in request.resource.data)
    || request.resource.data.profiles.size() <= 4
  );
```

### 4. Premium Helper Function
```
function isPremium(uid) {
  return get(/databases/$(database)/documents/users/$(uid)/account/profile)
         .data.isPremium == true;
}
```

## Premium Gating Summary

| Feature | Guest | Free (Signed In) | Premium |
|---|---|---|---|
| Basic tracking | Yes | Yes | Yes |
| Cloud sync | No | Yes | Yes |
| Max profiles | 2 | 4 | Unlimited |
| AI Insights | No | No | Yes |
| Backup/Restore | localStorage only | Yes | Yes |
