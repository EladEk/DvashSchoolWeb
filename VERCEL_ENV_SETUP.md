# Vercel Environment Variable Setup

## FIREBASE_SERVICE_ACCOUNT

Copy this entire line and paste it into Vercel as the value for `FIREBASE_SERVICE_ACCOUNT`:

```
{"type":"service_account","project_id":"dvashschoolweb","private_key_id":"456c302031267db94d31b44e286649bc80f58104","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDHn5R4RDs4eaju\nit2VbgecbrNEVmtRgXYND8Thtq7t6qTBqephvHBQ2HXkacS0l+j92XdhjRPG7RbW\nl6JFVhHbNW6zWX2sjCBwyjWYbVKVoh08pxMN+z9c4qE+UfEtf6JvJrBd+HVx5N1/\nfs7kLWQX4ktXIUHEwM3n8tAiucUzc3mN8JBT85mPln1f+eG0OjmVu60Qe5y6XZBY\nAiIKw9xx2RIHMl4dsWrQIjsxq5zEwg2xCw2akkGCjURFwiHocurEDCm8l8bLXuOc\n33I3x0eRuuZB3zEL7JCJ0Z9+xob+PopJEW3QCaEGQDWifaYBJSoS9uav1C5Vn0tX\nSkWloZ+zAgMBAAECggEABDF14N22nr8BMhIj90kYL7D1mcPQYkqzGegjP6rQgANT\n213bkghvXq/zC7tR5WT2E0+TC5zk0T5Ea8KNOWs0EK0W3yIC5CjFFolw2KBU+LIc\nk0DMnr0QtHRt9s07/Fgu8KpZBxFxYPm69s5t5EYiY1Uw7KqwYw26ChtWaKDmfwzJ\nxeUnnggUbtEHmx/KcsWkmojR7OixuJX4x1WAMYGPiobR86jIHxidNB3df4GthF6v\nHi+ZkP2eDApWbi23MpcIAC1ZEihCfqICgtRK2+F7cDRO7SR15f6nUyV8lJVkf9Es\nXSIAae9nqvolbICO4x5AtutF2pKoWbN7lqFSsbm89QKBgQDox833/R4v9swuppgZ\nGjw58oo4cPdnlqGYtq2tvaNaqu8KeaOnCVgWy+ICTCPVo8xC50oV4W6546XxdcH5\neEIc3mvN6XpiZGYMWXGHu9U74V+5e/gpVxr+3MUJY5DC6bg6V3PLe830u/XAivpV\nm7L6EeVkrDLx09vYmq2u/mNgJQKBgQDbiRZfX9RNp9+MQu59CX9zGUPi5PoHV2iQ\nI9JUojxnx5B0QAxwJTNt/qjG0ihqf6tN5ol6bDXW+5zWvAyZteVvFdFutj4sK18D\nIG0BGWPOkQQU5lIAnyGhtKfLPOMUBGFnzyv9pZ/Hoollhfnv4IMTFQIdjulWJ96m\nldDSmlus9wKBgHog2h9R3ZSsl1OidAo3iYGdjocuPZ9LmFzW+yg8ZogbRm7ogsQQ\nUvci4ODzsZlU5sXzMxtnuwAsP9P/RFXukkEzMLxH0r3sjt3Lz5S3J5jTFbXrJLgL\ny04L5hSW+ExK8y0o1MfdnKDaPIVYZR6lIbGx0fiPn+rgjGeIP7egH+NBAoGAN5tJ\np27Gf8T9wrFRZyp4tda4c0g8bI+fVKM+K2HMmxzZYhi3DdDebgYLChFBW3hrE5hJ\nSlEOch3ZZCrNpkGEk9aa7cgLh3SU5F3aPmUH+tKQjhqouq+T/TmdJsWNXwyc/4Zi\nRiUli5OH6cc9v5zGlpbDqmkAgWon41ofQrkGb5ECgYBAv8daB/wKf+6dNlE6Z0/2\nmCmROiyEkfplVTMCZOsU9IZO0E4qZwxfccgEgWGUYHdhWpRzOcuZ/Bls1zpXMPr9\nW5QC6U6inpqklH4P6LeE/Ek4h/YLsWEy81Fl2J0C4XwTo3EEXoP0wygT/BIY/0Cu\nsLxSky/NGm2p7GlTzHAccw==\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@dvashschoolweb.iam.gserviceaccount.com","client_id":"103441036091394169215","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40dvashschoolweb.iam.gserviceaccount.com","universe_domain":"googleapis.com"}
```

## Complete Vercel Environment Variables Checklist

Make sure you have ALL of these set in Vercel:

1. **GITHUB_TOKEN** = `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`

2. **GITHUB_OWNER** = `EladEk`

3. **GITHUB_REPO** = `DvashSchoolWeb`

4. **GITHUB_FILE_PATH** = `content/texts.json`

5. **FIREBASE_SERVICE_ACCOUNT** = (paste the JSON above)

## Steps to Add in Vercel:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Click "Add New"
3. For each variable:
   - Enter the **Key** (e.g., `GITHUB_TOKEN`)
   - Paste the **Value** 
   - Select environments (Production, Preview, Development)
   - Click "Save"
4. **Important:** After adding FIREBASE_SERVICE_ACCOUNT, redeploy your project

## After Setting Variables:

1. Install firebase-admin locally:
   ```bash
   npm install firebase-admin
   ```

2. Commit and push:
   ```bash
   git add package.json package-lock.json
   git commit -m "Add firebase-admin dependency"
   git push
   ```

3. Vercel will automatically redeploy and install firebase-admin

4. Try publishing again!
