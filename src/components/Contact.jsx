import { useFormState, useFormStatus } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { submitContactForm as submitToFirebase } from '../services/firebase'
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
  
  // Form action function (React 19 pattern) - ready for Firebase
  const submitContactForm = async (prevState, formData) => {
    const data = {
      firstName: formData.get('firstName'),
      lastName: formData.get('lastName'),
      email: formData.get('email'),
      message: formData.get('message')
    }
    
    try {
      // Submit to Firebase (will be connected when you provide API keys)
      const result = await submitToFirebase(data)
      
      if (result.success) {
        return { success: true, message: t('contact.success') }
      } else {
        return { success: false, message: t('contact.error') }
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
        <h2 className="section-title">{t('contact.title')}</h2>
        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-item">
              <h3>{t('contact.phone')}</h3>
              <p>08-6493193</p>
            </div>
            <div className="contact-item">
              <h3>{t('contact.email')}</h3>
              <p>Dvashschool@gmail.com</p>
            </div>
            <div className="contact-item">
              <h3>{t('contact.media')}</h3>
              <div className="social-links">
                <a href="#" target="_blank" rel="noopener noreferrer">Instagram</a>
                <a href="#" target="_blank" rel="noopener noreferrer">Facebook</a>
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
                    <label htmlFor="lastName">{t('contact.lastName')}</label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="firstName">{t('contact.firstName')}</label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="email">{t('contact.email')}</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="message">{t('contact.message')}</label>
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
        </div>
      </div>
    </section>
  )
}

export default Contact
