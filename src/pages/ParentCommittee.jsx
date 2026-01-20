import { useFormState, useFormStatus } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import EditableText from '../components/EditableText'
import DocumentHead from '../components/DocumentHead'
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
  
  // Form action function (React 19 pattern) - not saving to database yet
  const submitParentCommitteeForm = async (prevState, formData) => {
    const data = {
      fullName: formData.get('fullName'),
      childClass: formData.get('childClass'),
      email: formData.get('email'),
      message: formData.get('message')
    }
    
    // Simulate API call (not saving to database for now)
    await new Promise(resolve => setTimeout(resolve, 500))
    
    return { success: true, message: t('parentCommittee.success') }
  }
  
  const [state, formAction] = useFormState(submitParentCommitteeForm, null)

  return (
    <>
      <DocumentHead 
        title={t('meta.parentCommitteeTitle')}
        description={t('meta.parentCommitteeDescription')}
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
          </div>

          <div className="contact-section">
            <h2 className="section-subtitle">
              <EditableText translationKey="contact.title">
                {t('contact.title')}
              </EditableText>
            </h2>
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
                  <a href="#" target="_blank" rel="noopener noreferrer">Instagram</a>
                  <a href="#" target="_blank" rel="noopener noreferrer">Facebook</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default ParentCommittee
