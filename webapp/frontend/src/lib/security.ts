// XSS Protection utilities
export class XSSProtection {
  // HTML entity encoding
  static encodeHTML(str: string): string {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }

  // Decode HTML entities
  static decodeHTML(str: string): string {
    const div = document.createElement('div')
    div.innerHTML = str
    return div.textContent || div.innerText || ''
  }

  // Remove potentially dangerous HTML tags and attributes
  static sanitizeHTML(html: string): string {
    const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li']
    const allowedAttributes: string[] = []

    // Create a temporary div to parse HTML
    const div = document.createElement('div')
    div.innerHTML = html

    // Remove script tags and event handlers
    const scripts = div.querySelectorAll('script')
    scripts.forEach(script => script.remove())

    // Remove dangerous attributes
    const allElements = div.querySelectorAll('*')
    allElements.forEach(element => {
      // Remove all attributes that start with 'on' (event handlers)
      Array.from(element.attributes).forEach(attr => {
        if (attr.name.startsWith('on') || 
            attr.name === 'javascript:' || 
            attr.value.includes('javascript:')) {
          element.removeAttribute(attr.name)
        }
      })

      // Remove elements not in allowed list
      if (!allowedTags.includes(element.tagName.toLowerCase())) {
        element.replaceWith(...Array.from(element.childNodes))
      }
    })

    return div.innerHTML
  }

  // Validate and sanitize user input
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/[<>]/g, '') // Remove angle brackets
  }
}

// CSRF Protection
export class CSRFProtection {
  private static token: string | null = null

  // Generate CSRF token
  static generateToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    this.token = token
    
    // Store in sessionStorage
    sessionStorage.setItem('csrf_token', token)
    
    return token
  }

  // Get current CSRF token
  static getToken(): string | null {
    if (!this.token) {
      this.token = sessionStorage.getItem('csrf_token')
    }
    return this.token
  }

  // Validate CSRF token
  static validateToken(token: string): boolean {
    const storedToken = this.getToken()
    return storedToken !== null && storedToken === token
  }

  // Add CSRF token to request headers
  static addToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const token = this.getToken()
    if (token) {
      headers['X-CSRF-Token'] = token
    }
    return headers
  }

  // Clear CSRF token
  static clearToken(): void {
    this.token = null
    sessionStorage.removeItem('csrf_token')
  }
}

// Content Security Policy helpers
export class CSPHelper {
  // Check if inline scripts are allowed
  static isInlineScriptAllowed(): boolean {
    // In a real app, this would check the CSP header
    return false
  }

  // Generate nonce for inline scripts (if needed)
  static generateNonce(): string {
    const array = new Uint8Array(16)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }
}

// Input validation and sanitization
export class InputValidator {
  // Validate file uploads
  static validateFile(file: File, options: {
    maxSize?: number
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}): { isValid: boolean; error?: string } {
    const {
      maxSize = 10 * 1024 * 1024, // 10MB default
      allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
      allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
    } = options

    // Check file size
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`
      }
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      }
    }

    // Check file extension
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension ${extension} is not allowed`
      }
    }

    return { isValid: true }
  }

  // Validate URL
  static validateURL(url: string): boolean {
    try {
      const urlObj = new URL(url)
      // Only allow http and https protocols
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  // Validate phone number (Indonesian format)
  static validatePhoneNumber(phone: string): boolean {
    const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
    return phoneRegex.test(phone.replace(/\s|-/g, ''))
  }

  // Validate email
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  }
}

// Session security
export class SessionSecurity {
  private static readonly SESSION_KEY = 'app_session'
  private static readonly MAX_IDLE_TIME = 30 * 60 * 1000 // 30 minutes

  // Check if session is valid
  static isSessionValid(): boolean {
    const sessionData = this.getSessionData()
    if (!sessionData) return false

    const now = Date.now()
    const lastActivity = sessionData.lastActivity || 0
    
    return (now - lastActivity) < this.MAX_IDLE_TIME
  }

  // Update session activity
  static updateActivity(): void {
    const sessionData = this.getSessionData() || {}
    sessionData.lastActivity = Date.now()
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
  }

  // Get session data
  static getSessionData(): any {
    try {
      const data = localStorage.getItem(this.SESSION_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  }

  // Clear session
  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY)
    sessionStorage.clear()
  }

  // Check for session hijacking (basic check)
  static validateSessionFingerprint(): boolean {
    const stored = this.getSessionData()?.fingerprint
    const current = this.generateFingerprint()
    
    return stored === current
  }

  // Generate browser fingerprint
  private static generateFingerprint(): string {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.textBaseline = 'top'
      ctx.font = '14px Arial'
      ctx.fillText('Browser fingerprint', 2, 2)
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|')
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString()
  }
}

// API request security
export class APIRequestSecurity {
  // Add security headers to requests
  static addSecurityHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...CSRFProtection.addToHeaders(headers)
    }
  }

  // Validate response
  static validateResponse(response: Response): boolean {
    // Check for suspicious redirects
    if (response.redirected && !response.url.startsWith(window.location.origin)) {
      return false
    }

    // Check content type
    const contentType = response.headers.get('content-type')
    if (contentType && !contentType.includes('application/json')) {
      return false
    }

    return true
  }
}
