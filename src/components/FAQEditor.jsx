import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../contexts/TranslationContext'
import { getTranslations, saveTranslations, clearTranslationsCache } from '../services/adminService'
import { saveAllTranslationsToDB } from '../services/firebaseDB'
import './FAQEditor.css'

const FAQEditor = ({ questionIndex, onClose, onSave }) => {
  const { t, reloadTranslations } = useTranslation()
  const [hebrewQuestion, setHebrewQuestion] = useState('')
  const [hebrewAnswer, setHebrewAnswer] = useState('')
  const [englishQuestion, setEnglishQuestion] = useState('')
  const [englishAnswer, setEnglishAnswer] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const modalRef = useRef(null)

  useEffect(() => {
    loadFAQData()
  }, [questionIndex])

  const loadFAQData = async () => {
    try {
      setLoading(true)
      const translations = await getTranslations(true)
      const faqQuestions = translations.he?.faq?.questions || []
      const faqQuestionsEn = translations.en?.faq?.questions || []

      if (questionIndex !== null && questionIndex >= 0 && questionIndex < faqQuestions.length) {
        // Editing existing question
        setHebrewQuestion(faqQuestions[questionIndex]?.question || '')
        setHebrewAnswer(faqQuestions[questionIndex]?.answer || '')
        setEnglishQuestion(faqQuestionsEn[questionIndex]?.question || '')
        setEnglishAnswer(faqQuestionsEn[questionIndex]?.answer || '')
      } else {
        // Adding new question
        setHebrewQuestion('')
        setHebrewAnswer('')
        setEnglishQuestion('')
        setEnglishAnswer('')
      }
    } catch (error) {
      console.error('Error loading FAQ data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaveMessage('')

      // Load current translations
      const translations = await getTranslations(true)
      const faqQuestions = translations.he?.faq?.questions || []
      const faqQuestionsEn = translations.en?.faq?.questions || []

      const newQuestion = {
        question: hebrewQuestion.trim(),
        answer: hebrewAnswer.trim()
      }

      const newQuestionEn = {
        question: englishQuestion.trim(),
        answer: englishAnswer.trim()
      }

      // Validate
      if (!newQuestion.question || !newQuestion.answer) {
        setSaveMessage('שגיאה: יש למלא שאלה ותשובה בעברית')
        setSaving(false)
        return
      }

      if (!newQuestionEn.question || !newQuestionEn.answer) {
        setSaveMessage('שגיאה: יש למלא שאלה ותשובה באנגלית')
        setSaving(false)
        return
      }

      // Update translations
      if (questionIndex !== null && questionIndex >= 0 && questionIndex < faqQuestions.length) {
        // Update existing
        faqQuestions[questionIndex] = newQuestion
        faqQuestionsEn[questionIndex] = newQuestionEn
      } else {
        // Add new
        faqQuestions.push(newQuestion)
        faqQuestionsEn.push(newQuestionEn)
      }

      // Update translations object
      translations.he.faq = translations.he.faq || {}
      translations.he.faq.questions = faqQuestions
      translations.en.faq = translations.en.faq || {}
      translations.en.faq.questions = faqQuestionsEn

      // Save to localStorage
      await saveTranslations(translations, false)

      // Save to Firebase
      try {
        await saveAllTranslationsToDB(translations)
        console.log('✅ FAQ saved to Firebase')
      } catch (firebaseError) {
        console.error('❌ Error saving FAQ to Firebase:', firebaseError)
        setSaveMessage('נשמר מקומית, אך שגיאה ב-Firebase: ' + (firebaseError.message || 'שגיאה לא ידועה'))
        setTimeout(() => {
          setSaveMessage('')
        }, 3000)
      }

      // Reload translations
      clearTranslationsCache()
      await reloadTranslations()

      if (onSave) {
        onSave()
      }

      onClose()
    } catch (error) {
      console.error('Error saving FAQ:', error)
      setSaveMessage('שגיאה בשמירה: ' + (error.message || 'שגיאה לא ידועה'))
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !saving) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [saving])

  const modalContent = (
    <div className="faq-editor-overlay" onClick={handleClose}>
      <div className="faq-editor-modal" ref={modalRef} onClick={(e) => e.stopPropagation()}>
        <div className="faq-editor-header">
          <h3>
            {questionIndex !== null ? 'עריכת שאלה' : 'הוספת שאלה חדשה'}
          </h3>
          <button className="close-btn" onClick={handleClose}>×</button>
        </div>
        <div className="faq-editor-content">
          {loading ? (
            <div className="loading">טוען...</div>
          ) : (
            <>
              <div className="faq-editor-field">
                <label>שאלה (עברית)</label>
                <textarea
                  value={hebrewQuestion}
                  onChange={(e) => setHebrewQuestion(e.target.value)}
                  rows={3}
                  dir="rtl"
                  placeholder="הזן שאלה בעברית"
                />
              </div>
              <div className="faq-editor-field">
                <label>תשובה (עברית)</label>
                <textarea
                  value={hebrewAnswer}
                  onChange={(e) => setHebrewAnswer(e.target.value)}
                  rows={8}
                  dir="rtl"
                  placeholder="הזן תשובה בעברית"
                />
              </div>
              <div className="faq-editor-field">
                <label>Question (English)</label>
                <textarea
                  value={englishQuestion}
                  onChange={(e) => setEnglishQuestion(e.target.value)}
                  rows={3}
                  dir="ltr"
                  placeholder="Enter question in English"
                />
              </div>
              <div className="faq-editor-field">
                <label>Answer (English)</label>
                <textarea
                  value={englishAnswer}
                  onChange={(e) => setEnglishAnswer(e.target.value)}
                  rows={8}
                  dir="ltr"
                  placeholder="Enter answer in English"
                />
              </div>
            </>
          )}
        </div>
        <div className="faq-editor-footer">
          <div className="faq-editor-actions">
            <button className="cancel-btn" onClick={handleClose} disabled={saving}>
              {t('common.cancel') || 'ביטול'}
            </button>
            <button 
              className="save-btn" 
              onClick={handleSave} 
              disabled={saving || loading}
            >
              {saving ? (t('common.saving') || 'שומר...') : (t('common.save') || 'שמור')}
            </button>
          </div>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('שגיאה') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default FAQEditor
