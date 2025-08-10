// ===== UNIVERSAL TRACKING SYSTEM FOR YUJIN FILM SOLUTION =====
// Comprehensive user behavior tracking across all pages
// Version: 1.0
// Dependencies: common-utils.js, firebase-utils.js (optional)

class YuJinTracking {
  constructor(config = {}) {
    this.config = {
      page: config.page || 'unknown',
      enableFirebase: config.enableFirebase !== false,
      enableLocalStorage: config.enableLocalStorage !== false,
      enableConsoleLogging: config.enableConsoleLogging !== false,
      sessionTimeout: config.sessionTimeout || 30 * 60 * 1000, // 30 minutes
      batchSize: config.batchSize || 50,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.userId = window.getUserId ? window.getUserId() : this.generateUserId();
    this.startTime = Date.now();
    this.events = [];
    this.isActive = true;
    this.lastActivity = Date.now();
    
    this.init();
  }
  
  // Initialize tracking system
  init() {
    this.log('📊 Tracking system initialized for page:', this.config.page);
    
    // Track page load
    this.trackEvent('page_load', {
      page: this.config.page,
      user_agent: navigator.userAgent,
      referrer: document.referrer || 'direct',
      timestamp: new Date().toISOString(),
      ...this.getDeviceInfo(),
      ...this.getViewportInfo()
    });
    
    // Set up automatic tracking
    this.setupAutoTracking();
    
    // Set up session management
    this.setupSessionManagement();
    
    // Set up periodic data saving
    this.setupPeriodicSaving();
    
    console.log('✅ YuJin Tracking System ready');
  }
  
  // Generate unique session ID
  generateSessionId() {
    return 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }
  
  // Generate user ID (fallback if common-utils not loaded)
  generateUserId() {
    return 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // Get device information
  getDeviceInfo() {
    return {
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      device_type: window.isMobile ? window.isMobile() ? 'mobile' : 'desktop' : 'unknown',
      language: navigator.language,
      platform: navigator.platform,
      cookie_enabled: navigator.cookieEnabled,
      online_status: navigator.onLine
    };
  }
  
  // Get viewport information
  getViewportInfo() {
    return {
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      device_pixel_ratio: window.devicePixelRatio || 1
    };
  }
  
  // Track event
  trackEvent(eventName, data = {}) {
    const event = {
      event_name: eventName,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
      user_id: this.userId,
      page: this.config.page,
      time_on_page: Date.now() - this.startTime,
      sequence: this.events.length + 1,
      ...data
    };
    
    this.events.push(event);
    this.updateLastActivity();
    
    this.log('📊 Event tracked:', eventName, data);
    
    // Send to Firebase if available and enabled
    if (this.config.enableFirebase && window.yuJinFirebase) {
      this.sendToFirebase(event);
    }
    
    // Save to localStorage if enabled
    if (this.config.enableLocalStorage) {
      this.saveToLocalStorage();
    }
    
    // Auto-save if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.saveBatch();
    }
  }
  
  // Send event to Firebase
  async sendToFirebase(event) {
    try {
      if (window.yuJinFirebase && window.yuJinFirebase.isInitialized) {
        await window.yuJinFirebase.saveToCollection('user_tracking', event);
      }
    } catch (error) {
      console.error('❌ Failed to send event to Firebase:', error);
    }
  }
  
  // Save events to localStorage
  saveToLocalStorage() {
    try {
      const trackingData = {
        session_id: this.sessionId,
        user_id: this.userId,
        page: this.config.page,
        events: this.events,
        last_updated: new Date().toISOString(),
        session_start: new Date(this.startTime).toISOString()
      };
      
      localStorage.setItem(`yujin_tracking_${this.config.page}`, JSON.stringify(trackingData));
    } catch (error) {
      console.error('❌ Failed to save tracking data:', error);
    }
  }
  
  // Save batch and clear events
  saveBatch() {
    this.log('💾 Saving batch of', this.events.length, 'events');
    
    // Save current batch to a separate key
    const batchData = {
      session_id: this.sessionId,
      user_id: this.userId,
      page: this.config.page,
      events: [...this.events],
      batch_timestamp: new Date().toISOString()
    };
    
    const batchKey = `yujin_batch_${this.sessionId}_${Date.now()}`;
    localStorage.setItem(batchKey, JSON.stringify(batchData));
    
    // Clear current events
    this.events = [];
  }
  
  // Update last activity timestamp
  updateLastActivity() {
    this.lastActivity = Date.now();
  }
  
  // Check if session is active
  isSessionActive() {
    return (Date.now() - this.lastActivity) < this.config.sessionTimeout;
  }
  
  // Log message (if console logging enabled)
  log(...args) {
    if (this.config.enableConsoleLogging) {
      console.log('[YuJinTracking]', ...args);
    }
  }
  
  // ===== AUTO TRACKING SETUP =====
  
  setupAutoTracking() {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('page_visibility_change', {
        hidden: document.hidden,
        visibility_state: document.visibilityState
      });
    });
    
    // Track scroll behavior
    const scrollHandler = this.throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercentage = (scrollTop / (scrollHeight - clientHeight)) * 100;
      
      this.trackEvent('scroll_behavior', {
        scroll_position: scrollTop,
        scroll_percentage: Math.round(scrollPercentage),
        page_height: scrollHeight,
        viewport_height: clientHeight
      });
    }, 1000);
    
    window.addEventListener('scroll', scrollHandler);
    
    // Track clicks on elements with data-track attribute
    document.addEventListener('click', (e) => {
      const trackData = e.target.closest('[data-track]');
      if (trackData) {
        const trackType = trackData.getAttribute('data-track');
        const additionalData = {};
        
        // Collect additional tracking data from attributes
        Array.from(trackData.attributes).forEach(attr => {
          if (attr.name.startsWith('data-track-')) {
            const key = attr.name.replace('data-track-', '');
            additionalData[key] = attr.value;
          }
        });
        
        this.trackEvent(`click_${trackType}`, {
          element_tag: e.target.tagName,
          element_class: e.target.className,
          element_id: e.target.id,
          element_text: e.target.textContent?.trim().substring(0, 100),
          ...additionalData
        });
      }
    });
    
    // Track form interactions
    this.setupFormTracking();
    
    // Track page unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('page_unload', {
        session_duration: Date.now() - this.startTime,
        total_events: this.events.length,
        final_scroll_position: window.pageYOffset
      });
      
      // Force save remaining events
      this.saveBatch();
    });
  }
  
  // Setup form tracking
  setupFormTracking() {
    // Track form field interactions
    document.addEventListener('focus', (e) => {
      if (e.target.matches('input, select, textarea')) {
        this.trackEvent('form_field_focus', {
          field_id: e.target.id,
          field_name: e.target.name,
          field_type: e.target.type || 'text',
          form_id: e.target.form?.id || 'unknown'
        });
      }
    }, true);
    
    document.addEventListener('blur', (e) => {
      if (e.target.matches('input, select, textarea')) {
        this.trackEvent('form_field_blur', {
          field_id: e.target.id,
          field_name: e.target.name,
          field_type: e.target.type || 'text',
          has_value: !!e.target.value,
          value_length: e.target.value ? e.target.value.length : 0,
          form_id: e.target.form?.id || 'unknown'
        });
      }
    }, true);
    
    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formData = new FormData(form);
      const fields = {};
      
      for (let [key, value] of formData.entries()) {
        fields[key] = typeof value === 'string' ? value.length : 'file';
      }
      
      this.trackEvent('form_submit', {
        form_id: form.id,
        form_action: form.action,
        form_method: form.method,
        fields_count: Object.keys(fields).length,
        fields: fields
      });
    });
  }
  
  // Setup session management
  setupSessionManagement() {
    // Check session activity periodically
    setInterval(() => {
      if (!this.isSessionActive() && this.isActive) {
        this.trackEvent('session_timeout', {
          session_duration: Date.now() - this.startTime,
          total_events: this.events.length
        });
        this.isActive = false;
        this.saveBatch();
      }
    }, 60000); // Check every minute
    
    // Track when user becomes active again
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        if (!this.isActive) {
          this.trackEvent('session_resumed', {
            inactive_duration: Date.now() - this.lastActivity
          });
          this.isActive = true;
        }
        this.updateLastActivity();
      }, { passive: true });
    });
  }
  
  // Setup periodic data saving
  setupPeriodicSaving() {
    // Save data every 5 minutes
    setInterval(() => {
      if (this.events.length > 0) {
        this.saveToLocalStorage();
      }
    }, 5 * 60 * 1000);
  }
  
  // ===== PUBLIC METHODS FOR CUSTOM TRACKING =====
  
  // Track custom user action
  trackUserAction(action, data = {}) {
    this.trackEvent('user_action', {
      action: action,
      ...data
    });
  }
  
  // Track business event (conversion, purchase, etc.)
  trackBusinessEvent(eventType, data = {}) {
    this.trackEvent('business_event', {
      event_type: eventType,
      ...data
    });
  }
  
  // Track error
  trackError(error, context = '') {
    this.trackEvent('error', {
      error_message: error.message || error,
      error_stack: error.stack || 'No stack trace',
      error_context: context,
      error_type: error.constructor.name || 'Unknown'
    });
  }
  
  // Track performance metric
  trackPerformance(metric, value, unit = 'ms') {
    this.trackEvent('performance', {
      metric: metric,
      value: value,
      unit: unit
    });
  }
  
  // Track A/B test
  trackABTest(testName, variant, data = {}) {
    this.trackEvent('ab_test', {
      test_name: testName,
      variant: variant,
      ...data
    });
  }
  
  // ===== UTILITY METHODS =====
  
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
  
  // Get all tracking data
  getAllTrackingData() {
    return {
      session_id: this.sessionId,
      user_id: this.userId,
      page: this.config.page,
      session_start: new Date(this.startTime).toISOString(),
      session_duration: Date.now() - this.startTime,
      events: this.events,
      is_active: this.isActive,
      config: this.config
    };
  }
  
  // Export tracking data
  exportData() {
    const data = this.getAllTrackingData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `yujin-tracking-${this.config.page}-${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  // Clear tracking data
  clearData() {
    this.events = [];
    localStorage.removeItem(`yujin_tracking_${this.config.page}`);
    this.log('🧹 Tracking data cleared');
  }
}

// Factory function to create tracking instance
window.createYuJinTracking = function(config) {
  return new YuJinTracking(config);
};

// Export classes
window.YuJinTracking = YuJinTracking;

console.log('✅ YuJin Tracking System loaded and ready');