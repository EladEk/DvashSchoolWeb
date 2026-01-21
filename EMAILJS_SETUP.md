# EmailJS Setup Guide

This guide will help you set up EmailJS to send emails from the contact form.

## Step 1: Create EmailJS Account

1. Go to [EmailJS](https://www.emailjs.com/)
2. Sign up for a free account (200 emails/month free)
3. Verify your email address

## Step 2: Add Email Service

1. In EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions
5. **Copy the Service ID** (you'll need it later)

## Step 3: Create Email Template

1. In EmailJS dashboard, go to **Email Templates**
2. Click **Create New Template**
3. Use this template structure:

**Template Name:** Contact Form

**Subject:** `{{subject}}`

**Content:**
```
From: {{from_name}} ({{from_email}})
Reply To: {{reply_to}}

Message:
{{message}}
```

4. **Copy the Template ID** (you'll need it later)

## Step 4: Get Public Key

1. In EmailJS dashboard, go to **Account** > **General**
2. Find **Public Key**
3. **Copy the Public Key** (you'll need it later)

## Step 5: Configure Environment Variables

Create a `.env` file in the root of your project (or update existing one):

```env
VITE_EMAILJS_SERVICE_ID=your_service_id_here
VITE_EMAILJS_TEMPLATE_ID=your_template_id_here
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
```

**Important:** 
- Never commit `.env` file to git (it's already in `.gitignore`)
- For production, set these variables in your hosting platform (Vercel, Netlify, etc.)

## Step 6: Configure Recipient Email (Optional)

The recipient email can be edited in admin mode. By default, it's set to `Dvashschool@gmail.com` in the translations.

To change it:
1. Enter admin mode
2. Click the edit button next to "Email Recipient" in the contact form
3. Update the email address

## Testing

1. Fill out the contact form
2. Click "Send"
3. Check the recipient email inbox
4. You should receive the email with:
   - Subject: "Contact Form: [FirstName] [LastName] - [Email]"
   - Body: The message from the form
   - From: The sender's name and email

## Troubleshooting

- **Email not sending:** Check that all environment variables are set correctly
- **Template error:** Make sure template variables match: `{{subject}}`, `{{from_name}}`, `{{from_email}}`, `{{message}}`, `{{reply_to}}`
- **Service error:** Verify your email service is connected and active in EmailJS dashboard

## Free Tier Limits

- 200 emails per month
- For more emails, upgrade to a paid plan
