# Translation Guide

This project uses a custom translation system that supports multiple languages. Currently, Hebrew (he) and English (en) are supported.

## How It Works

### Translation Files

All translations are stored in JSON files in `src/translations/`:
- `he.json` - Hebrew translations
- `en.json` - English translations

### Using Translations in Components

1. Import the `useTranslation` hook:
```javascript
import { useTranslation } from '../contexts/TranslationContext'
```

2. Use the `t` function to get translated text:
```javascript
const { t } = useTranslation()
const title = t('about.title') // Gets 'עלינו' in Hebrew or 'About Us' in English
```

### Translation Keys

Translation keys use dot notation to access nested objects:
- `nav.home` → Navigation "Home" text
- `about.title` → About section title
- `contact.success` → Contact form success message

### Adding New Translations

1. Add the key-value pair to both `he.json` and `en.json`:
```json
// he.json
{
  "newSection": {
    "title": "כותרת חדשה",
    "text": "טקסט חדש"
  }
}

// en.json
{
  "newSection": {
    "title": "New Title",
    "text": "New Text"
  }
}
```

2. Use it in your component:
```javascript
const { t } = useTranslation()
<h2>{t('newSection.title')}</h2>
<p>{t('newSection.text')}</p>
```

### Language Switcher

The language switcher is automatically included in the header. Users can switch between Hebrew and English, and their preference is saved in localStorage.

### RTL/LTR Support

The system automatically handles text direction:
- Hebrew (he) → RTL (right-to-left)
- English (en) → LTR (left-to-right)

The HTML `dir` attribute is automatically updated when the language changes.

### FAQ Translations

FAQ questions and answers are stored in the translation files under `faq.questions` as an array. Each FAQ item has:
- `question` - The question text
- `answer` - The answer text

### Adding a New Language

1. Create a new JSON file in `src/translations/` (e.g., `ar.json` for Arabic)
2. Copy the structure from `he.json` and translate all values
3. Update `src/contexts/TranslationContext.jsx`:
```javascript
import arTranslations from '../translations/ar.json'

const translations = {
  he: heTranslations,
  en: enTranslations,
  ar: arTranslations  // Add new language
}
```

4. Add the language option to the LanguageSwitcher component

## Best Practices

1. **Keep keys descriptive**: Use clear, hierarchical keys like `contact.form.email.label` instead of `email`
2. **Maintain consistency**: Use the same key structure across all language files
3. **Handle missing translations**: The system falls back to the key name if a translation is missing
4. **Test both languages**: Always test your changes in both Hebrew and English
5. **Use pluralization carefully**: For complex pluralization, consider using a library like `i18next`

## Current Translation Structure

```
translations/
├── common/          - Common text (school name, etc.)
├── nav/            - Navigation menu items
├── hero/           - Hero section
├── about/          - About section
├── community/      - Community section
├── learning/       - Learning section
├── authorities/    - Authorities section
├── contact/        - Contact form
├── faq/            - FAQ questions and answers
├── footer/         - Footer text
└── meta/           - Page metadata (titles, descriptions)
```
