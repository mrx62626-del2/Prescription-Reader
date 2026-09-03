import config from '../config/app.config.js'
import logger from './logger.js'

class GeminiKeyManager {
  constructor(keys = [], cooldownMs = 60000) {
    this.keys = new Map()
    this.cooldownMs = cooldownMs
    this.currentIndex = 0
    
    keys.forEach(k => this.addKey(k))
    
    // Start auto-recovery interval
    this.intervalId = setInterval(() => this._autoRecovery(), 10000)
    if (this.intervalId.unref) this.intervalId.unref()
  }

  addKey(key) {
    if (!this.keys.has(key)) {
      this.keys.set(key, {
        key,
        isExhausted: false,
        exhaustedAt: null,
        errorCount: 0,
        requestCount: 0
      })
    }
  }

  removeKey(key) {
    this.keys.delete(key)
  }

  getNextKey() {
    const keys = Array.from(this.keys.values())
    if (keys.length === 0) throw new Error('No API keys configured.')
    
    for (let i = 0; i < keys.length; i++) {
      const idx = (this.currentIndex + i) % keys.length
      const keyInfo = keys[idx]
      if (!keyInfo.isExhausted) {
        this.currentIndex = (idx + 1) % keys.length
        keyInfo.requestCount++
        return keyInfo.key
      }
    }
    
    throw new Error('ALL_KEYS_EXHAUSTED')
  }

  markExhausted(key) {
    const info = this.keys.get(key)
    if (info && !info.isExhausted) {
      info.isExhausted = true
      info.exhaustedAt = Date.now()
      logger.warn('Gemini API key marked as exhausted', { keyPrefix: key.substring(0, 8) + '...' })
    }
  }

  markError(key) {
    const info = this.keys.get(key)
    if (info) {
      info.errorCount++
    }
  }

  resetKey(key) {
    const info = this.keys.get(key)
    if (info && info.isExhausted) {
      info.isExhausted = false
      info.exhaustedAt = null
      logger.info('Gemini API key has been reset and is available again', { keyPrefix: key.substring(0, 8) + '...' })
    }
  }

  _autoRecovery() {
    const now = Date.now()
    for (const info of this.keys.values()) {
      if (info.isExhausted && info.exhaustedAt && (now - info.exhaustedAt >= this.cooldownMs)) {
        this.resetKey(info.key)
      }
    }
  }

  getStatus() {
    return Array.from(this.keys.values()).map(info => ({
      keyPrefix: info.key.substring(0, 8) + '...',
      isExhausted: info.isExhausted,
      exhaustedAt: info.exhaustedAt,
      errorCount: info.errorCount,
      requestCount: info.requestCount
    }))
  }

  getActiveKeyCount() {
    return Array.from(this.keys.values()).filter(k => !k.isExhausted).length
  }
}

const keyManager = new GeminiKeyManager(config.gemini.apiKeys || [], config.gemini.keyCooldownMs || 60000)

export default keyManager
