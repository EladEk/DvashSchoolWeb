#!/usr/bin/env node
/**
 * Reads a Firebase service account JSON file and prints a single line
 * (no leading/trailing whitespace, no newlines) for pasting into Vercel
 * FIREBASE_SERVICE_ACCOUNT.
 *
 * Usage: node scripts/env-oneline.js path/to/service-account.json
 * Then copy the output and paste as the env value in Vercel.
 */

const fs = require('fs')
const path = require('path')

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/env-oneline.js <path-to-service-account.json>')
  process.exit(1)
}

const raw = fs.readFileSync(path.resolve(file), 'utf8')
const parsed = JSON.parse(raw)
const oneLine = JSON.stringify(parsed)
console.log(oneLine)
