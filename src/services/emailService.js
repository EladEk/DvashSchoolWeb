import emailjs from '@emailjs/browser'

/**
 * Send email using EmailJS
 * @param {object} formData - {firstName, lastName, email, message}
 * @param {string} recipientEmail - Email address to send to
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendEmail = async (formData, recipientEmail) => {
  try {
    // Get EmailJS configuration from environment or translations
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || ''
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || ''
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || ''

    if (!serviceId || !templateId || !publicKey) {
      console.error('EmailJS configuration missing. Please set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, and VITE_EMAILJS_PUBLIC_KEY')
      return { success: false, error: 'Email service not configured' }
    }

    // Initialize EmailJS with public key
    emailjs.init(publicKey)

    // Prepare email template parameters
    const templateParams = {
      to_email: recipientEmail,
      from_name: `${formData.firstName} ${formData.lastName}`,
      from_email: formData.email,
      subject: `Contact Form: ${formData.firstName} ${formData.lastName} - ${formData.email}`,
      message: formData.message,
      reply_to: formData.email,
    }

    // Send email
    const response = await emailjs.send(serviceId, templateId, templateParams)

    if (response.status === 200) {
      return { success: true }
    } else {
      return { success: false, error: 'Failed to send email' }
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}
