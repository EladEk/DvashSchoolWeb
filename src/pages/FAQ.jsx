import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import DocumentHead from '../components/DocumentHead'
import FAQEditor from '../components/FAQEditor'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import './FAQ.css'

const FAQ = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [openIndex, setOpenIndex] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  const faqData = t('faq.questions') || []

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const handleEdit = (index, e) => {
    e.stopPropagation()
    setEditingIndex(index)
  }

  const handleDelete = async (index, e) => {
    e.stopPropagation()
    if (!confirm('האם אתה בטוח שברצונך למחוק שאלה זו?')) {
      return
    }

    try {
      const translations = await getTranslations(true)
      const faqQuestions = translations.he?.faq?.questions || []
      const faqQuestionsEn = translations.en?.faq?.questions || []

      faqQuestions.splice(index, 1)
      faqQuestionsEn.splice(index, 1)

      translations.he.faq.questions = faqQuestions
      translations.en.faq.questions = faqQuestionsEn

      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)

      clearTranslationsCache()
      await reloadTranslations()
    } catch (error) {
      console.error('Error deleting FAQ:', error)
      alert('שגיאה במחיקת השאלה')
    }
  }

  const handleAdd = () => {
    setShowAddModal(true)
  }

  const handleEditorClose = () => {
    setEditingIndex(null)
    setShowAddModal(false)
  }

  const handleEditorSave = () => {
    // Reload translations after save
    reloadTranslations()
  }

  return (
    <>
      <DocumentHead 
        title={t('meta.faqTitle')}
        description={t('meta.faqDescription')}
      />
      <section id="faq" className="faq-page">
        <div className="container">
          <h1 className="page-title">
            {t('faq.title')}
            {isAdminMode && (
              <button 
                className="faq-add-btn" 
                onClick={handleAdd}
                title="הוסף שאלה חדשה"
              >
                + הוסף שאלה
              </button>
            )}
          </h1>
          <div className="faq-list">
            {faqData.map((item, index) => (
              <div key={index} className="faq-item">
                <button
                  className={`faq-question ${openIndex === index ? 'open' : ''}`}
                  onClick={() => toggleQuestion(index)}
                  aria-expanded={openIndex === index}
                >
                  <span>{item.question}</span>
                  <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
                </button>
                {openIndex === index && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                    {isAdminMode && (
                      <div className="faq-actions">
                        <button 
                          className="faq-edit-btn" 
                          onClick={(e) => handleEdit(index, e)}
                          title="ערוך שאלה"
                        >
                          ✏️ ערוך
                        </button>
                        <button 
                          className="faq-delete-btn" 
                          onClick={(e) => handleDelete(index, e)}
                          title="מחק שאלה"
                        >
                          🗑️ מחק
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      {isAdminMode && (
        <>
          {editingIndex !== null && (
            <FAQEditor
              questionIndex={editingIndex}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
          {showAddModal && (
            <FAQEditor
              questionIndex={null}
              onClose={handleEditorClose}
              onSave={handleEditorSave}
            />
          )}
        </>
      )}
    </>
  )
}

export default FAQ
