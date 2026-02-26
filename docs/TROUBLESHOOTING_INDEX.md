# Troubleshooting Index

Central index for troubleshooting guides and related references. Use this when something is not working (Firestore, deploy, env, cache, images).

---

## Project documentation

| Topic | Document | Description |
|-------|----------|-------------|
| **Architecture** | [HLD.md](HLD.md) | High-level design, data flow, auth, deployment |
| **Implementation** | [LLD.md](LLD.md) | Routes, collections, APIs, env vars, key files |
| **Environment variables** | [ENV_REFERENCE.md](ENV_REFERENCE.md) | All env vars, where used, how to get values |
| **API contracts** | [API_SPEC.md](API_SPEC.md) | Request/response for each serverless endpoint |
| **Firestore** | [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md) | Collections, fields, rules |
| **Rebuild from zero** | [REBUILD_CHECKLIST.md](REBUILD_CHECKLIST.md) | Ordered steps to recreate the site |
| **Setup (clone & run)** | [COMPLETE_SETUP_GUIDE.md](../COMPLETE_SETUP_GUIDE.md) | Prerequisites, Firebase, GitHub, Vercel, EmailJS, ImageKit, testing, deployment |

---

## Troubleshooting guides (root)

| Issue | Document | Summary |
|-------|----------|---------|
| **Firestore connection timeouts / "User not found"** | [FIRESTORE_CONNECTION_TROUBLESHOOTING.md](../FIRESTORE_CONNECTION_TROUBLESHOOTING.md) | Firestore API enabled, network, rules, indexes |
| **Changes not visible after publish** | [CLEAR_CACHE_GUIDE.md](../CLEAR_CACHE_GUIDE.md) | Browser cache, Vercel CDN, site cache |
| **Images not loading in production** | [FIX_IMAGES_PRODUCTION.md](../FIX_IMAGES_PRODUCTION.md) | Firestore rules for `images` (read: if true), ImageKit/auth |

---

## Common checks

1. **Env vars:** Missing or wrong env (e.g. `FIREBASE_SERVICE_ACCOUNT`, `GITHUB_TOKEN`) → see [ENV_REFERENCE.md](ENV_REFERENCE.md) and Vercel Project Settings.
2. **Firestore:** Connection/timeout or permission errors → [FIRESTORE_CONNECTION_TROUBLESHOOTING.md](../FIRESTORE_CONNECTION_TROUBLESHOOTING.md) and [FIRESTORE_DATA_MODEL.md](FIRESTORE_DATA_MODEL.md) (rules).
3. **API 500:** Check server logs (Vercel Functions); verify env and service account JSON format → [API_SPEC.md](API_SPEC.md), [ENV_REFERENCE.md](ENV_REFERENCE.md).
4. **Content/cache:** After publish, content or images not updating → [CLEAR_CACHE_GUIDE.md](../CLEAR_CACHE_GUIDE.md).
5. **Images in production:** Public read for `images` collection and ImageKit auth endpoint → [FIX_IMAGES_PRODUCTION.md](../FIX_IMAGES_PRODUCTION.md).
