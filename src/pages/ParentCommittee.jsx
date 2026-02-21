import { useFormState, useFormStatus } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import EditableText from '../components/EditableText'
import EditButton from '../components/EditButton'
import DocumentHead from '../components/DocumentHead'
import { sendEmail } from '../services/emailService'
import './ParentCommittee.css'

// Submit button component using useFormStatus (React 19)
function SubmitButton() {
  const { pending } = useFormStatus()
  const { t } = useTranslation()
  
  return (
    <button type="submit" className="submit-btn" disabled={pending}>
      {pending ? t('parentCommittee.sending') : t('parentCommittee.send')}
    </button>
  )
}

const ParentCommittee = () => {
  const { t } = useTranslation()
  const { isAdminMode } = useAdmin()
  
  // Get recipient email from translations (editable in admin mode)
  const recipientEmail = t('parentCommittee.recipientEmail') || 'Dvashschool@gmail.com'
  
  // Form action function (React 19 pattern) - sends email
  const submitParentCommitteeForm = async (prevState, formData) => {
    const data = {
      fullName: formData.get('fullName'),
      childClass: formData.get('childClass'),
      email: formData.get('email'),
      message: formData.get('message')
    }
    
    try {
      // Prepare data for email (using fullName as firstName and lastName)
      const nameParts = data.fullName.split(' ')
      const firstName = nameParts[0] || data.fullName
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const emailData = {
        firstName: firstName,
        lastName: lastName,
        email: data.email,
        message: `Child's Class: ${data.childClass}\n\n${data.message}`
      }
      
      // Send email
      const emailResult = await sendEmail(emailData, recipientEmail)
      
      if (emailResult.success) {
        return { success: true, message: t('parentCommittee.success') }
      } else {
        return { success: false, message: emailResult.error || t('parentCommittee.error') }
      }
    } catch (error) {
      console.error('Error submitting form:', error)
      return { success: false, message: t('parentCommittee.error') || 'An error occurred' }
    }
  }
  
  const [state, formAction] = useFormState(submitParentCommitteeForm, null)

  return (
    <>
      <DocumentHead 
        title={t('meta.parentCommitteeTitle')}
        description={t('meta.parentCommitteeDescription')}
        canonicalPath="/parent-committee"
      />
      <section id="parents" className="parent-committee-page">
        <div className="container">
          <h1 className="page-title">
            <EditableText translationKey="parentCommittee.title">
              {t('parentCommittee.title')}
            </EditableText>
          </h1>
          
          <div className="parent-committee-intro">
            <p>
              <EditableText translationKey="parentCommittee.intro1">
                {t('parentCommittee.intro1')}
              </EditableText>
            </p>
            <p>
              <EditableText translationKey="parentCommittee.intro2">
                {t('parentCommittee.intro2')}
              </EditableText>
            </p>
            <p>
              <EditableText translationKey="parentCommittee.intro3">
                {t('parentCommittee.intro3')}
              </EditableText>
            </p>
          </div>

          <div className="parent-committee-form-section">
            <h2 className="section-subtitle">
              <EditableText translationKey="parentCommittee.contactTitle">
                {t('parentCommittee.contactTitle')}
              </EditableText>
            </h2>
            
            <form className="parent-committee-form" action={formAction}>
              {state?.success ? (
                <div className="success-message">
                  {state.message}
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="fullName">
                      <EditableText translationKey="parentCommittee.fullName">
                        {t('parentCommittee.fullName')}
                      </EditableText>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="childClass">
                      <EditableText translationKey="parentCommittee.childClass">
                        {t('parentCommittee.childClass')}
                      </EditableText>
                    </label>
                    <input
                      type="text"
                      id="childClass"
                      name="childClass"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">
                      <EditableText translationKey="parentCommittee.email">
                        {t('parentCommittee.email')}
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
                      <EditableText translationKey="parentCommittee.message">
                        {t('parentCommittee.message')}
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
              <div className="parent-committee-email-config" style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(44, 95, 124, 0.1)', borderRadius: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                  <span>Email Recipient:</span>
                  <span className="editable-text">
                    {recipientEmail}
                    <EditButton translationKey="parentCommittee.recipientEmail" />
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  )
}

export default ParentCommittee
