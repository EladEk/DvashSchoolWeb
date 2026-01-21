# ImageKit Authentication Server

This directory contains the authentication server for ImageKit uploads.

## Files

- `auth-server.js` - Simple Node.js HTTP server for local development

## Usage

### Local Development

1. Set the environment variable:
   ```bash
   export IMAGEKIT_PRIVATE_KEY=your_private_key_here
   ```

2. Run the server:
   ```bash
   npm run auth-server
   ```

3. The server will run on `http://localhost:3001/auth`

## Production

For production, use one of these options:
- Vercel: Use `/api/auth.js`
- Netlify: Use `/netlify/functions/auth.js`
- Firebase: Use `/functions/src/index.ts`
- Custom: Deploy `auth-server.js` to any Node.js hosting

See [IMAGEKIT_SETUP.md](../IMAGEKIT_SETUP.md) for detailed instructions.
