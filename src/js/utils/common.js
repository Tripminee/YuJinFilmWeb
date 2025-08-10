// ===== COMMON UTILITIES FOR YUJIN FILM SOLUTION =====
// Universal functions and utilities that can be used across all pages
// Version: 1.0
// Dependencies: None (standalone)

class YuJinCommonUtils {
  constructor() {
    this.init();
  }
  
  init() {
    console.log('🛠️ Common utilities initialized');
  }
  
  // ===== USER MANAGEMENT =====
  
  // Generate unique user ID
  generateUserId() {
    return 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get or create user ID
  getUserId() {
    let userId = localStorage.getItem('yujin_user_id');
    
    if (!userId) {
      userId = this.generateUserId();
      localStorage.setItem('yujin_user_id', userId);
      localStorage.setItem('yujin_first_visit', new Date().toISOString());
      console.log('🆕 New user created:', userId);
    } else {
      console.log('👤 Returning user:', userId);
    }
    
    // Update last visit time
    localStorage.setItem('yujin_last_visit', new Date().toISOString());
    return userId;
  }
  
  // ===== FORM UTILITIES =====
  
  // Format phone number (Thai format)
  formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned;
    }
    return cleaned.substr(0, 10);
  }
  
  // Validate Thai phone number
  validatePhoneNumber(phone) {
    const phoneRegex = /^0[0-9]{9}$/;
    return phoneRegex.test(phone);
  }
  
  // Validate email
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  // Clean and validate form data
  cleanFormData(formData) {
    const cleaned = {};
    
    Object.keys(formData).forEach(key => {
      let value = formData[key];
      
      // Clean strings
      if (typeof value === 'string') {
        value = value.trim();
      }
      
      // Special handling for phone
      if (key === 'phone' || key === 'phoneNumber') {
        value = this.formatPhoneNumber(value);
      }
      
      cleaned[key] = value;
    });
    
    return cleaned;
  }
  
  // ===== DATE AND TIME UTILITIES =====
  
  // Format date to Thai format
  formatDateThai(date) {
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = thaiMonths[dateObj.getMonth()];
    const year = dateObj.getFullYear() + 543; // Convert to Thai year
    
    return `${day} ${month} ${year}`;
  }
  
  // Get current timestamp
  getCurrentTimestamp() {
    return new Date().toISOString();
  }
  
  // Generate booking number
  generateBookingNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000);
    return 'BK' + year + String(random).padStart(5, '0');
  }
  
  // ===== UI UTILITIES =====
  
  // Show loading overlay
  showLoading(elementId = 'loadingOverlay') {
    const loading = document.getElementById(elementId);
    if (loading) {
      loading.classList.add('show');
    }
  }
  
  // Hide loading overlay
  hideLoading(elementId = 'loadingOverlay') {
    const loading = document.getElementById(elementId);
    if (loading) {
      loading.classList.remove('show');
    }
  }
  
  // Show success modal
  showSuccessModal(elementId = 'successModal') {
    const modal = document.getElementById(elementId);
    if (modal) {
      modal.classList.add('show');
    }
  }
  
  // Hide modal
  hideModal(elementId) {
    const modal = document.getElementById(elementId);
    if (modal) {
      modal.classList.remove('show');
    }
  }
  
  // Show form error
  showFormError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.classList.add('error');
      const errorElement = field.parentElement.querySelector('.error-message');
      if (errorElement) {
        errorElement.textContent = message || errorElement.textContent;
        errorElement.classList.add('show');
      }
    }
  }
  
  // Clear form errors
  clearFormErrors(containerId = null) {
    const container = containerId ? document.getElementById(containerId) : document;
    
    container.querySelectorAll('.form-input.error').forEach(input => {
      input.classList.remove('error');
    });
    
    container.querySelectorAll('.error-message.show').forEach(error => {
      error.classList.remove('show');
    });
  }
  
  // ===== NAVIGATION UTILITIES =====
  
  // Redirect to page
  redirectTo(url) {
    console.log('🔗 Redirecting to:', url);
    window.location.href = url;
  }
  
  // Smooth scroll to element
  scrollToElement(selector, offset = 0) {
    const element = document.querySelector(selector);
    if (element) {
      const elementTop = element.offsetTop - offset;
      window.scrollTo({
        top: elementTop,
        behavior: 'smooth'
      });
    }
  }
  
  // ===== STORAGE UTILITIES =====
  
  // Save to localStorage with error handling
  saveToStorage(key, data) {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      localStorage.setItem(key, dataString);
      return true;
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
      return false;
    }
  }
  
  // Get from localStorage with error handling
  getFromStorage(key, parseJson = true) {
    try {
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      return parseJson ? JSON.parse(data) : data;
    } catch (error) {
      console.error('❌ Error reading from localStorage:', error);
      return null;
    }
  }
  
  // Remove from localStorage
  removeFromStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('❌ Error removing from localStorage:', error);
      return false;
    }
  }
  
  // ===== DEVICE AND BROWSER DETECTION =====
  
  // Check if mobile device
  isMobile() {
    return window.innerWidth <= 480;
  }
  
  // Check if tablet
  isTablet() {
    return window.innerWidth > 480 && window.innerWidth <= 768;
  }
  
  // Check if desktop
  isDesktop() {
    return window.innerWidth > 768;
  }
  
  // Get device type
  getDeviceType() {
    if (this.isMobile()) return 'mobile';
    if (this.isTablet()) return 'tablet';
    return 'desktop';
  }
  
  // Get browser info
  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }
  
  // Get viewport info
  getViewportInfo() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }
  
  // ===== ANIMATION UTILITIES =====
  
  // Add shake animation to element
  addShakeAnimation(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
      element.classList.add('shake');
      setTimeout(() => {
        element.classList.remove('shake');
      }, 500);
    }
  }
  
  // Fade in element
  fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.display = 'block';
    
    let opacity = 0;
    const timer = setInterval(() => {
      opacity += 50 / duration;
      element.style.opacity = opacity;
      if (opacity >= 1) {
        clearInterval(timer);
        element.style.opacity = '1';
      }
    }, 50);
  }
  
  // Fade out element
  fadeOut(element, duration = 300) {
    let opacity = 1;
    const timer = setInterval(() => {
      opacity -= 50 / duration;
      element.style.opacity = opacity;
      if (opacity <= 0) {
        clearInterval(timer);
        element.style.display = 'none';
        element.style.opacity = '0';
      }
    }, 50);
  }
  
  // ===== UTILITY FUNCTIONS =====
  
  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  // Throttle function
  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Generate random string
  generateRandomString(length = 10) {
    return Math.random().toString(36).substring(2, length + 2);
  }
  
  // Copy text to clipboard
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textArea);
        return result;
      }
    } catch (error) {
      console.error('❌ Error copying to clipboard:', error);
      return false;
    }
  }
  
  // Format number with commas
  formatNumber(number) {
    return new Intl.NumberFormat('th-TH').format(number);
  }
  
  // Format currency (Thai Baht)
  formatCurrency(amount) {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  }
}

// Initialize common utilities
const yuJinCommonUtils = new YuJinCommonUtils();

// Export to window for global access
window.yuJinCommonUtils = yuJinCommonUtils;
window.YuJinCommonUtils = YuJinCommonUtils;

// Export common functions to global scope for easy access
window.getUserId = () => yuJinCommonUtils.getUserId();
window.redirectTo = (url) => yuJinCommonUtils.redirectTo(url);
window.showLoading = (id) => yuJinCommonUtils.showLoading(id);
window.hideLoading = (id) => yuJinCommonUtils.hideLoading(id);
window.isMobile = () => yuJinCommonUtils.isMobile();

console.log('✅ Common utilities loaded and ready');