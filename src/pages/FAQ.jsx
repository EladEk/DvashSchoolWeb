import { useState } from 'react'
import { useTranslation } from '../contexts/TranslationContext'
import DocumentHead from '../components/DocumentHead'
import './FAQ.css'

const FAQ = () => {
  const { t } = useTranslation()
  const [openIndex, setOpenIndex] = useState(null)

  const faqData = t('faq.questions') || []

  const toggleQuestion = (index) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <>
      <DocumentHead 
        title={t('meta.faqTitle')}
        description={t('meta.faqDescription')}
      />
      <section id="faq" className="faq-page">
        <div className="container">
          <h1 className="page-title">{t('faq.title')}</h1>
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
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export default FAQ
