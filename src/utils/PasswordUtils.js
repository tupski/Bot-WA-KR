import bcrypt from 'react-native-bcrypt';

/**
 * Utility class untuk password hashing dan verification
 */
class PasswordUtils {
  /**
   * Hash password menggunakan bcrypt
   * @param {string} password - Password yang akan di-hash
   * @returns {Promise<string>} - Hashed password
   */
  static async hashPassword(password) {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      return hashedPassword;
    } catch (error) {
      console.error('Error hashing password:', error);
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verify password dengan hash
   * @param {string} password - Password plain text
   * @param {string} hashedPassword - Hashed password dari database
   * @returns {Promise<boolean>} - True jika password cocok
   */
  static async verifyPassword(password, hashedPassword) {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      return isMatch;
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate random password
   * @param {number} length - Panjang password (default: 8)
   * @returns {string} - Random password
   */
  static generateRandomPassword(length = 8) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} - Validation result
   */
  static validatePasswordStrength(password) {
    const result = {
      isValid: false,
      score: 0,
      feedback: []
    };

    if (!password) {
      result.feedback.push('Password tidak boleh kosong');
      return result;
    }

    // Minimum length
    if (password.length < 6) {
      result.feedback.push('Password minimal 6 karakter');
    } else {
      result.score += 1;
    }

    // Has uppercase
    if (/[A-Z]/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('Gunakan minimal 1 huruf besar');
    }

    // Has lowercase
    if (/[a-z]/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('Gunakan minimal 1 huruf kecil');
    }

    // Has number
    if (/\d/.test(password)) {
      result.score += 1;
    } else {
      result.feedback.push('Gunakan minimal 1 angka');
    }

    // Has special character
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      result.score += 1;
    }

    result.isValid = result.score >= 3;
    
    if (result.isValid && result.feedback.length === 0) {
      result.feedback.push('Password cukup kuat');
    }

    return result;
  }

  /**
   * Check if password is already hashed (bcrypt format)
   * @param {string} password - Password to check
   * @returns {boolean} - True if already hashed
   */
  static isPasswordHashed(password) {
    // Bcrypt hash format: $2a$10$... or $2b$10$...
    return /^\$2[ab]\$\d{2}\$.{53}$/.test(password);
  }
}

export default PasswordUtils;
