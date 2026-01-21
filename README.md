# בית ספר דב״ש - Website

React + Vite website for בית ספר דב״ש (Democratic School in Be'er Sheva)

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The website will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Features

- **Internationalization (i18n)**: Full translation support for Hebrew and English with easy language switching
- RTL (Right-to-Left) support for Hebrew content, automatically switches to LTR for English
- Responsive design
- React 19 with modern features (useFormState, useFormStatus)
- Fast development with Vite
- React Router for navigation
- Contact form with Firebase integration (ready to configure)
- FAQ page with accordion interface
- Firebase SDK included and ready for configuration
- All text content externalized to translation files

## Firebase Setup

This project is prepared for Firebase integration. See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed instructions on configuring Firebase for contact form submissions.

## ImageKit Setup

This project uses ImageKit for image uploads. See [IMAGEKIT_SETUP.md](./IMAGEKIT_SETUP.md) for detailed instructions.

### Quick Start (Local Development)

1. Get your ImageKit Private Key from [ImageKit Dashboard](https://imagekit.io/dashboard) > Settings > API Keys
2. Set environment variable:
   ```bash
   export IMAGEKIT_PRIVATE_KEY=your_private_key_here
   ```
3. Start the authentication server:
   ```bash
   npm run auth-server
   ```
4. The server will run on `http://localhost:3001/auth`
5. The React app is already configured to use this endpoint

## Project Structure

```
src/
  components/
    Header.jsx            - Navigation header with React Router
    Hero.jsx              - Hero section
    About.jsx             - About section
    Community.jsx         - Community section
    Learning.jsx          - Learning section
    Authorities.jsx       - Authorities section
    Contact.jsx           - Contact form (Firebase ready)
    Footer.jsx            - Footer
    DocumentHead.jsx      - Document metadata component
    LanguageSwitcher.jsx  - Language selection component
  pages/
    Home.jsx              - Home page with all sections
    FAQ.jsx                - FAQ page with accordion
    ContactPage.jsx        - Contact page
  contexts/
    TranslationContext.jsx - Translation context and provider
  services/
    firebase.js           - Firebase configuration and services
  translations/
    he.json               - Hebrew translations
    en.json               - English translations
  App.jsx                 - Main app with routing
  main.jsx                - Entry point
  index.css               - Global styles
```

## Translation System

All text content is externalized to translation files. See [TRANSLATION_GUIDE.md](./TRANSLATION_GUIDE.md) for details on:
- How to use translations in components
- Adding new translations
- Adding new languages
- Translation key structure

## Routes

- `/` - Home page
- `/שאלות-תשובות` - FAQ page
- `/contact-8` or `/contact` - Contact page
