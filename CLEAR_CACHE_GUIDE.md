# How to Clear Cache and See Changes in Production

If you don't see changes in public view after publishing, try these steps:

## 1. Browser Hard Refresh
- **Windows/Linux**: `Ctrl + F5` or `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`
- This clears browser cache and forces a fresh fetch

## 2. Clear Browser Cache Manually
1. Open DevTools (F12)
2. Right-click the refresh button
3. Select "Empty Cache and Hard Reload"

Or:
1. Open browser settings
2. Clear browsing data
3. Select "Cached images and files"
4. Clear data

## 3. Check Vercel CDN Cache
Vercel caches static files. After publishing:
1. Wait 1-2 minutes for Vercel to update
2. Try accessing the file directly: `https://dvashschool.vercel.app/content/texts.json?t=1234567890`
3. Check if the file has the latest content

## 4. Use Incognito/Private Mode
Open the site in incognito/private mode to bypass all caches:
- **Chrome/Edge**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- **Safari**: `Cmd + Shift + N`

## 5. Check Browser Console
Open DevTools (F12) → Console tab and look for:
```
[textService] Loading from /content/texts.json?t=...
```

If you see old data, the cache-busting query parameter should help.

## 6. Verify File Was Updated
Check the actual file in GitHub:
- Go to: `https://github.com/EladEk/DvashSchoolWeb/blob/main/content/texts.json`
- Verify the file has your latest changes
- Check the commit history to confirm it was published

## 7. Force Refresh in Code
The code now includes:
- Cache-busting query parameter (`?t=timestamp`)
- `cache: 'no-store'` header
- `Cache-Control: no-cache` headers

If still not working, the issue might be:
- Vercel CDN cache (wait a few minutes)
- Browser still caching (try incognito)
- File not actually updated (check GitHub)

## Quick Test
1. Open browser console (F12)
2. Run: `localStorage.clear()`
3. Hard refresh (Ctrl+F5)
4. Check if changes appear
