// test-publish.js
// Simple test script to verify text processing locally

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🧪 Testing text processing...\n')

// Read current texts
let texts
try {
  const contentPath = join(__dirname, 'content', 'texts.json')
  texts = JSON.parse(readFileSync(contentPath, 'utf-8'))
  console.log('✅ Loaded texts from content/texts.json')
} catch (error) {
  console.error('❌ Error loading texts:', error.message)
  process.exit(1)
}

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let texts
try {
  const contentPath = join(__dirname, 'content', 'texts.json')
  texts = JSON.parse(readFileSync(contentPath, 'utf-8'))
} catch (error) {
  console.error('❌ Error loading texts:', error.message)
  process.exit(1)
}
const hasParliamentKeys = (obj, path = '') => {
  const keys = []
  for (const key in obj) {
    const fullPath = path ? `${path}.${key}` : key
    if (key.toLowerCase().includes('parliament')) {
      keys.push(fullPath)
    }
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys.push(...hasParliamentKeys(obj[key], fullPath))
    }
  }
  return keys
}

const parliamentKeys = [
  ...hasParliamentKeys(texts.he || {}),
  ...hasParliamentKeys(texts.en || {})
]

if (parliamentKeys.length > 0) {
  parliamentKeys.forEach(key => console.log(`   - ${key}`))
} else {
}

const excludeParliament = (obj) => {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(excludeParliament)
  
  const cleaned = {}
  for (const key in obj) {
    if (key.toLowerCase().includes('parliament')) {
      continue
    }
    if (obj[key] && typeof obj[key] === 'object') {
      cleaned[key] = excludeParliament(obj[key])
    } else {
      cleaned[key] = obj[key]
    }
  }
  return cleaned
}

const cleaned = {
  he: excludeParliament(texts.he || {}),
  en: excludeParliament(texts.en || {})
}

// Verify exclusion worked
const remainingParliamentKeys = [
  ...hasParliamentKeys(cleaned.he),
  ...hasParliamentKeys(cleaned.en)
]

if (remainingParliamentKeys.length > 0) {
  remainingParliamentKeys.forEach(key => console.log(`   - ${key}`))
  process.exit(1)
} else {
}

try {
  const publicPath = join(__dirname, 'public', 'content', 'texts.json')
  const contentPath = join(__dirname, 'content', 'texts.json')
  
  const jsonContent = JSON.stringify(cleaned, null, 2)
  
  writeFileSync(publicPath, jsonContent, 'utf-8')
  writeFileSync(contentPath, jsonContent, 'utf-8')
  
  console.log(`   - ${publicPath}`)
  console.log(`   - ${contentPath}`)
} catch (error) {
  console.error('❌ Error writing files:', error.message)
  process.exit(1)
}
