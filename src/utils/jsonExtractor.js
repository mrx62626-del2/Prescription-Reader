/**
 * @file jsonExtractor.js
 * @description Extracts a JSON object from arbitrary Gemini text output.
 *
 * Gemini frequently wraps JSON in markdown code fences, adds explanatory
 * prose before/after the JSON, or uses inconsistent quoting. This utility
 * tries several recovery strategies, in order, before giving up.
 *
 * Strategies (in order of attempt):
 *   1. Direct JSON.parse on the trimmed raw string
 *   2. Strip ```json ... ``` or ``` ... ``` code fences, then parse
 *   3. Locate the first '{' and last '}' and parse that substring
 *   4. Strip common AI prose prefixes ("Here is the JSON:", etc.) then retry
 *
 * Returns the parsed object, or throws a descriptive error if every
 * strategy fails — never returns silently malformed data.
 */

import logger from './logger.js'

/**
 * Removes markdown code fences (```json ... ``` or ``` ... ```) from a string.
 * @param {string} text
 * @returns {string}
 */
const stripCodeFences = (text) => {
  // Matches ```json\n...\n``` or ```\n...\n``` (case-insensitive language tag)
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = text.match(fenceRegex)
  return match ? match[1] : text
}

/**
 * Extracts the substring between the first '{' and the last '}'.
 * Useful when Gemini adds prose before/after the JSON object.
 * @param {string} text
 * @returns {string|null}
 */
const extractBraceSubstring = (text) => {
  const firstBrace = text.indexOf('{')
  const lastBrace  = text.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null
  }

  return text.slice(firstBrace, lastBrace + 1)
}

/**
 * Strips common conversational prefixes AI models add before JSON,
 * e.g. "Here is the extracted information:", "Sure, here's the JSON:".
 * @param {string} text
 * @returns {string}
 */
const stripProsePrefix = (text) => {
  const prefixPatterns = [
    /^[\s\S]*?here\s+is\s+the[\s\S]*?:\s*/i,
    /^[\s\S]*?here's\s+the[\s\S]*?:\s*/i,
    /^[\s\S]*?sure[,!]?\s*[\s\S]*?:\s*/i,
  ]

  for (const pattern of prefixPatterns) {
    if (pattern.test(text)) {
      const stripped = text.replace(pattern, '')
      // Only use the stripped version if it still contains a brace —
      // otherwise we may have stripped legitimate content
      if (stripped.includes('{')) return stripped
    }
  }

  return text
}

/**
 * Attempts to parse a string as JSON, returning null on failure
 * instead of throwing — allows the caller to try the next strategy.
 * @param {string} text
 * @returns {object|null}
 */
const tryParse = (text) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Extracts and parses a JSON object from raw Gemini text output.
 *
 * @param   {string} rawText - The raw text response from Gemini
 * @returns {object}         - Parsed JSON object
 * @throws  {Error}          - If no valid JSON can be extracted after all strategies
 */
const extractJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) {
    throw new Error('Cannot extract JSON from empty AI response.')
  }

  const trimmed = rawText.trim()

  // ── Strategy 1: direct parse ────────────────────────────────────────────────
  let result = tryParse(trimmed)
  if (result) return result

  // ── Strategy 2: strip code fences, then parse ───────────────────────────────
  const defenced = stripCodeFences(trimmed).trim()
  result = tryParse(defenced)
  if (result) {
    logger.info('JSON extracted after stripping markdown code fences')
    return result
  }

  // ── Strategy 3: extract brace substring, then parse ─────────────────────────
  const braceSubstring = extractBraceSubstring(defenced)
  if (braceSubstring) {
    result = tryParse(braceSubstring)
    if (result) {
      logger.info('JSON extracted via brace-substring isolation')
      return result
    }
  }

  // ── Strategy 4: strip prose prefix, then retry brace extraction ─────────────
  const deprosed = stripProsePrefix(defenced)
  const braceSubstringV2 = extractBraceSubstring(deprosed)
  if (braceSubstringV2) {
    result = tryParse(braceSubstringV2)
    if (result) {
      logger.info('JSON extracted after stripping prose prefix')
      return result
    }
  }

  // ── All strategies exhausted ─────────────────────────────────────────────────
  logger.error('Failed to extract JSON from AI response after all recovery strategies', {
    rawTextPreview: trimmed.slice(0, 200),
  })

  throw new Error('Unable to extract valid JSON from the AI response.')
}

export { extractJson }