import { useFormState, useFormStatus } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from './EditableText'
import EditableLink from './EditableLink'
import EditButton from './EditButton'
import { submitContactForm as submitToFirebase } from '../services/firebase'
import { sendEmail } from '../services/emailService'
import './Contact.css'

// Submit button component using useFormStatus (React 19)
function SubmitButton() {
  const { pending } = useFormStatus()
  const { t } = useTranslation()
  
  return (
    <button type="submit" className="submit-btn" disabled={pending}>
      {pending ? t('contact.sending') : t('contact.send')}
    </button>
  )
}

const Contact = () => {
  const { t } = useTranslation()
  const { isAdminMode } = useAdmin()
  
  // Get recipient email from translations (editable in admin mode)
  const recipientEmail = t('contact.recipientEmail') || 'Dvashschool@gmail.com'
  
  // Form action function (React 19 pattern) - sends email and saves to Firebase
  const submitContactForm = async (prevState, formData) => {
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      message: formData.get('message')
    }
    
    try {
      // Send email
      const emailResult = await sendEmail(data, recipientEmail)
      
      // Also save to Firebase (optional, for backup)
      try {
        await submitToFirebase(data)
      } catch (firebaseError) {
        console.warn('Firebase save failed, but email was sent:', firebaseError)
      }
      
      if (emailResult.success) {
        return { success: true, message: t('contact.success') }
      } else {
        return { success: false, message: emailResult.error || t('contact.error') }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      return { success: false, message: t('contact.error') }
    }
  }
  
  const [state, formAction] = useFormState(submitContactForm, null)

  return (
    <section id="contact" className="contact">
      <div className="container">
        <h2 className="section-title">
          <EditableText translationKey="contact.title">
            {t('contact.title')}
          </EditableText>
        </h2>
        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <h3>
                <EditableText translationKey="contact.phone">
                  {t('contact.phone')}
                </EditableText>
              </h3>
              <p>08-6493193</p>
            </div>
            <div className="contact-item">
              <h3>
                <EditableText translationKey="contact.email">
                  {t('contact.email')}
                </EditableText>
              </h3>
              <p>Dvashschool@gmail.com</p>
            </div>
            <div className="contact-item">
              <h3>
                <EditableText translationKey="contact.media">
                  {t('contact.media')}
                </EditableText>
              </h3>
              <div className="social-links">
                <EditableLink translationKey="contact.instagramUrl" iconType="instagram">
                  {t('contact.instagram')}
                </EditableLink>
                <EditableLink translationKey="contact.facebookUrl" iconType="facebook">
                  {t('contact.facebook')}
                </EditableLink>
                <EditableLink translationKey="contact.whatsappUrl" iconType="whatsapp">
                  {t('contact.whatsapp')}
                </EditableLink>
              </div>
            </div>
          </div>
          <form className="contact-form" action={formAction}>
            {state?.success ? (
              <div className="success-message">
                {state.message}
              </div>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="lastName">
                      <EditableText translationKey="contact.lastName">
                        {t('contact.lastName')}
                      </EditableText>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="firstName">
                      <EditableText translationKey="contact.firstName">
                        {t('contact.firstName')}
                      </EditableText>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    <EditableText translationKey="contact.email">
                      {t('contact.email')}
                    </EditableText>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="message">
                    <EditableText translationKey="contact.message">
                      {t('contact.message')}
                    </EditableText>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    required
                  ></textarea>
                </div>
                <SubmitButton />
              </>
            )}
          </form>
          {isAdminMode && (
            <div className="contact-email-config" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(44, 95, 124, 0.1)', borderRadius: '5px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                <span>Email Recipient:</span>
                <span className="editable-text">
                  {recipientEmail}
                  <EditButton translationKey="contact.recipientEmail" />
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Contact
