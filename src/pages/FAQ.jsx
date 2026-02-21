import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import { useAdmin } from '../contexts/AdminContext'
import DocumentHead from '../components/DocumentHead'
import FAQSchema from '../components/FAQSchema'
import FAQEditor from '../components/FAQEditor'
import { getTranslations, saveTranslations, clearTranslationsCache, getDefaultTranslations } from '../services/adminService'
import { saveAllTranslationsToDB, loadTranslationsFromDB } from '../services/firebaseDB'
import './FAQ.css'

const FAQ = () => {
  const { t, reloadTranslations } = useTranslation()
  const { isAdminMode } = useAdmin()
  const [openIndex, setOpenIndex] = useState(null)
  const [editingIndex, setEditingIndex] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [questionsFromCode, setQuestionsFromCode] = useState(new Set())

  // Get questions from translations
  const questions = t('faq.questions') || []
  
  // Create a stable key for memoization based on questions content
  const questionsKey = useMemo(() => {
    return questions.map((q, i) => `${i}-${q?.question?.substring(0, 20)}-${q?.index || 'no-index'}`).join('|')
  }, [questions])
  
  // Sort questions by index (if they have one), then by original order
  const faqData = useMemo(() => {
    return [...questions].sort((a, b) => {
      const indexA = a.index !== undefined ? a.index : 9999
      const indexB = b.index !== undefined ? b.index : 9999
      return indexA - indexB
    })
  }, [questionsKey])

  // Check which questions are from code (no index field)
  useEffect(() => {
    if (!isAdminMode) {
      setQuestionsFromCode(new Set())
      return
    }
    
    // Calculate which questions are from code based on sorted faqData
    const sorted = [...questions].sort((a, b) => {
      const indexA = a.index !== undefined ? a.index : 9999
      const indexB = b.index !== undefined ? b.index : 9999
      return indexA - indexB
    })
    
    const fromCode = new Set()
    sorted.forEach((item, index) => {
      // If question doesn't have an index field, it's from code
      if (item.index === undefined && item.index !== null) {
        fromCode.add(index)
      }
    })
    
    setQuestionsFromCode(fromCode)
  }, [isAdminMode, questionsKey])

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const handleEdit = async (index, e) => {
    e.stopPropagation()
    // Find the actual index in the translations array (not sorted)
    const question = faqData[index]
    const translations = await getTranslations(true)
    const faqQuestions = translations.he?.faq?.questions || []
    const questionText = question?.question?.trim()
    const actualIndex = faqQuestions.findIndex(q => q?.question?.trim() === questionText)
    setEditingIndex(actualIndex >= 0 ? actualIndex : index)
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

      const questionToDelete = faqData[index]
      const questionText = questionToDelete?.question?.trim()
      
      // Find the question in the translations array by matching text
      const questionIndex = faqQuestions.findIndex(q => q?.question?.trim() === questionText)
      
      if (questionIndex === -1) {
        alert('שגיאה: שאלה לא נמצאה')
        return
      }

      faqQuestions.splice(questionIndex, 1)
      faqQuestionsEn.splice(questionIndex, 1)

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

  const handleMoveToDB = async (index, e) => {
    e.stopPropagation()
    
    try {
      const defaultTranslations = await getDefaultTranslations()
      const translations = await getTranslations(true)
      
      if (index >= faqData.length) {
        alert('שגיאה: שאלה לא נמצאה')
        return
      }
      
      const currentQuestion = faqData[index]
      const questionText = currentQuestion?.question?.trim()
      
      // Find the question in default translations (code) to get both Hebrew and English
      const defaultQuestions = defaultTranslations.he?.faq?.questions || []
      const defaultQuestionsEn = defaultTranslations.en?.faq?.questions || []
      
      const defaultIndex = defaultQuestions.findIndex(q => q?.question?.trim() === questionText)
      
      if (defaultIndex === -1) {
        alert('שגיאה: שאלה לא נמצאה בקוד')
        return
      }
      
      // Get the question and answer from defaults (both languages)
      const hebrewQuestion = defaultQuestions[defaultIndex]
      const englishQuestion = defaultQuestionsEn[defaultIndex] || {}
      
      // Get DB questions
      const dbQuestions = translations.he?.faq?.questions || []
      const dbQuestionsEn = translations.en?.faq?.questions || []
      
      // Find the next available index
      const usedIndices = new Set()
      dbQuestions.forEach(q => {
        if (q.index !== undefined && q.index !== null) {
          usedIndices.add(q.index)
        }
      })
      
      // Find the first free index starting from 0
      let freeIndex = 0
      while (usedIndices.has(freeIndex)) {
        freeIndex++
      }
      
      // Create new question objects with index and both languages
      const newQuestion = {
        question: hebrewQuestion.question || questionText,
        answer: hebrewQuestion.answer || currentQuestion.answer || '',
        index: freeIndex
      }
      
      const newQuestionEn = {
        question: englishQuestion.question || '',
        answer: englishQuestion.answer || '',
        index: freeIndex
      }
      
      // Add to DB translations
      dbQuestions.push(newQuestion)
      dbQuestionsEn.push(newQuestionEn)
      
      translations.he.faq = translations.he.faq || {}
      translations.he.faq.questions = dbQuestions
      translations.en.faq = translations.en.faq || {}
      translations.en.faq.questions = dbQuestionsEn
      
      // Save to DB
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)
      
      clearTranslationsCache()
      await reloadTranslations()
      
      alert('השאלה הועברה למסד הנתונים בהצלחה')
    } catch (error) {
      console.error('Error moving question to DB:', error)
      alert('שגיאה בהעברת השאלה למסד הנתונים')
    }
  }

  const handleMoveUp = async (index, e) => {
    e.stopPropagation()
    
    if (index === 0) return
    
    try {
      const translations = await getTranslations(true)
      const faqQuestions = translations.he?.faq?.questions || []
      const faqQuestionsEn = translations.en?.faq?.questions || []
      
      const currentQuestion = faqData[index]
      const prevQuestion = faqData[index - 1]
      
      // Find questions in translations array
      const currentIndex = faqQuestions.findIndex(q => q?.question?.trim() === currentQuestion?.question?.trim())
      const prevIndex = faqQuestions.findIndex(q => q?.question?.trim() === prevQuestion?.question?.trim())
      
      if (currentIndex === -1 || prevIndex === -1) {
        alert('שגיאה: לא ניתן לשנות סדר')
        return
      }
      
      // Swap indices
      const currentIdx = faqQuestions[currentIndex].index
      const prevIdx = faqQuestions[prevIndex].index
      
      faqQuestions[currentIndex].index = prevIdx
      faqQuestions[prevIndex].index = currentIdx
      faqQuestionsEn[currentIndex].index = prevIdx
      faqQuestionsEn[prevIndex].index = currentIdx
      
      translations.he.faq.questions = faqQuestions
      translations.en.faq.questions = faqQuestionsEn
      
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)
      
      clearTranslationsCache()
      await reloadTranslations()
    } catch (error) {
      console.error('Error moving question up:', error)
      alert('שגיאה בשינוי סדר השאלה')
    }
  }

  const handleMoveDown = async (index, e) => {
    e.stopPropagation()
    
    if (index >= faqData.length - 1) return
    
    try {
      const translations = await getTranslations(true)
      const faqQuestions = translations.he?.faq?.questions || []
      const faqQuestionsEn = translations.en?.faq?.questions || []
      
      const currentQuestion = faqData[index]
      const nextQuestion = faqData[index + 1]
      
      // Find questions in translations array
      const currentIndex = faqQuestions.findIndex(q => q?.question?.trim() === currentQuestion?.question?.trim())
      const nextIndex = faqQuestions.findIndex(q => q?.question?.trim() === nextQuestion?.question?.trim())
      
      if (currentIndex === -1 || nextIndex === -1) {
        alert('שגיאה: לא ניתן לשנות סדר')
        return
      }
      
      // Swap indices
      const currentIdx = faqQuestions[currentIndex].index
      const nextIdx = faqQuestions[nextIndex].index
      
      faqQuestions[currentIndex].index = nextIdx
      faqQuestions[nextIndex].index = currentIdx
      faqQuestionsEn[currentIndex].index = nextIdx
      faqQuestionsEn[nextIndex].index = currentIdx
      
      translations.he.faq.questions = faqQuestions
      translations.en.faq.questions = faqQuestionsEn
      
      await saveTranslations(translations, false)
      await saveAllTranslationsToDB(translations)
      
      clearTranslationsCache()
      await reloadTranslations()
    } catch (error) {
      console.error('Error moving question down:', error)
      alert('שגיאה בשינוי סדר השאלה')
    }
  }

  return (
    <>
      <DocumentHead 
        title={t('meta.faqTitle')}
        description={t('meta.faqDescription')}
        canonicalPath="/FAQ"
      />
      <FAQSchema questions={faqData} />
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
                  className={`faq-question ${openIndex === index ? 'open' : ''} ${questionsFromCode.has(index) ? 'from-code' : ''}`}
                  onClick={() => toggleQuestion(index)}
                  aria-expanded={openIndex === index}
                >
                  <span>
                    {item.question}
                    {isAdminMode && questionsFromCode.has(index) && (
                      <span className="code-indicator" title="שאלה מקוד - לחץ להרחבה כדי להעביר ל-DB"> 📤</span>
                    )}
                  </span>
                  <span className="faq-icon">{openIndex === index ? '−' : '+'}</span>
                </button>
                {openIndex === index && (
                  <div className="faq-answer">
                    <p>{item.answer}</p>
                    {isAdminMode && (
                      <div className="faq-actions">
                        {questionsFromCode.has(index) && (
                          <button 
                            className="faq-move-to-db-btn" 
                            onClick={(e) => handleMoveToDB(index, e)}
                            title="העבר למסד הנתונים"
                          >
                            📤 העבר ל-DB
                          </button>
                        )}
                        {faqData[index]?.index !== undefined && (
                          <>
                            <button 
                              className="faq-move-up-btn" 
                              onClick={(e) => handleMoveUp(index, e)}
                              title="הזז למעלה"
                              disabled={index === 0}
                            >
                              ⬆️ למעלה
                            </button>
                            <button 
                              className="faq-move-down-btn" 
                              onClick={(e) => handleMoveDown(index, e)}
                              title="הזז למטה"
                              disabled={index >= faqData.length - 1}
                            >
                              ⬇️ למטה
                            </button>
                          </>
                        )}
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
