// Booking Page Main Script
// Handles page initialization, navigation, and core booking functionality

class BookingPageController {
  constructor() {
    this.currentUserId = null;
    this.bookingTracker = null;
    this.db = null;
    this.auth = null;
    this.init();
  }

  // Initialize booking page
  init() {
    console.log('🚀 Initializing YuJin Booking Page...');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializePage());
    } else {
      this.initializePage();
    }
  }

  // Initialize page components
  initializePage() {
    try {
      // Initialize User ID and tracking
      this.currentUserId = window.getUserId ? window.getUserId() : null;
      window.currentUserId = this.currentUserId;
      
      // Initialize Firebase references
      this.db = window.yuJinFirebase?.db || null;
      this.auth = window.yuJinFirebase?.auth || null;
      
      // Initialize tracking
      this.initializeTracking();
      
      // Initialize Google Maps if available
      if (window.GoogleMapsService && !window.googleMapsService) {
        window.googleMapsService = new GoogleMapsService();
      }
      
      // Test back button
      this.testBackButton();
      
      console.log('✅ YuJin Booking Page initialized');
      
    } catch (error) {
      console.error('❌ Error initializing booking page:', error);
    }
  }

  // Initialize tracking system
  initializeTracking() {
    if (window.createYuJinTracking) {
      this.bookingTracker = window.createYuJinTracking({
        page: 'booking',
        enableFirebase: true,
        enableLocalStorage: true,
        enableConsoleLogging: true
      });
      
      // Make tracker globally available
      window.bookingTracker = this.bookingTracker;
      console.log('✅ Booking tracker initialized');
    } else {
      console.warn('⚠️ Tracking system not available');
    }
  }

  // Test back button functionality
  testBackButton() {
    const backButton = document.getElementById('backButton');
    if (backButton) {
      console.log('✅ Back button found in DOM');
      console.log('✅ redirectToHome function available:', typeof window.redirectToHome === 'function');
    } else {
      console.error('❌ Back button not found');
    }
  }

  // Redirect to home page
  static redirectToHome() {
    console.log('🏠 Back button clicked - redirecting to home...');
    
    // Track back button click if tracker is available
    if (window.bookingTracker) {
      window.bookingTracker.trackUserAction('back_button_click', {
        current_step: window.bookingTracker.currentStep || 1,
        device_type: window.yuJinCommonUtils ? window.yuJinCommonUtils.getDeviceType() : 'unknown'
      });
    }
    
    // Use common utils redirect
    if (window.yuJinCommonUtils) {
      window.yuJinCommonUtils.redirectTo('index.html');
    } else {
      window.location.href = 'index.html';
    }
  }

  // Create Firebase user from booking form data
  async createFirebaseUserFromBookingForm(userData) {
    try {
      if (!this.auth || !this.db) {
        throw new Error('Firebase not initialized');
      }

      // Check for existing UID
      let existingUID = localStorage.getItem('yujin_firebase_uid');
      if (existingUID && !existingUID.startsWith('LOCAL_') && !existingUID.startsWith('PHONE_')) {
        console.log('📌 Using existing Firebase UID:', existingUID);
        return existingUID;
      }
      
      const email = userData.email;
      const cleanPhone = userData.phone.replace(/[-\s]/g, '');
      const password = 'PHONE_' + cleanPhone;
      const phoneNumber = userData.phone;
      
      console.log('🔥 Creating Firebase user from booking form with email:', email);
      
      try {
        // Try to create new user
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const firebaseUID = userCredential.user.uid;
        
        console.log('✅ Firebase User created from booking:', firebaseUID);
        
        // Save additional user data to Firestore
        await this.db.collection('users').doc(firebaseUID).set({
          uid: firebaseUID,
          email: email,
          phoneNumber: phoneNumber,
          name: userData.name,
          autoCreated: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          source: 'booking_form',
          service: userData.service || 'unknown',
          carBrand: userData.brand || null,
          carModel: userData.model || null
        });
        
        // Save to localStorage
        this.saveUserToStorage(firebaseUID, email, phoneNumber, userData.name);
        
        return firebaseUID;
        
      } catch (createError) {
        // If email exists, try to login
        if (createError.code === 'auth/email-already-in-use') {
          console.log('🔍 Email exists, trying to login from booking...');
          
          try {
            const loginCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const firebaseUID = loginCredential.user.uid;
            
            console.log('✅ Logged in with existing user from booking:', firebaseUID);
            
            // Update user document
            await this.db.collection('users').doc(firebaseUID).update({
              lastLoginAttempt: firebase.firestore.FieldValue.serverTimestamp(),
              loginSource: 'booking_form',
              service: userData.service || 'unknown',
              carBrand: userData.brand || null,
              carModel: userData.model || null
            });
            
            // Update localStorage
            this.saveUserToStorage(firebaseUID, email, phoneNumber, userData.name);
            
            return firebaseUID;
            
          } catch (loginError) {
            console.error('❌ Login failed from booking:', loginError);
            throw loginError;
          }
        } else {
          throw createError;
        }
      }
      
    } catch (error) {
      console.error('❌ Firebase Auth Error from booking:', error);
      
      // Fallback: Email-based UID
      const emailHash = btoa(userData.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      const fallbackUID = 'BOOKING_' + emailHash + '_' + Date.now();
      
      this.saveUserToStorage(fallbackUID, userData.email, userData.phone, userData.name, 'booking_fallback');
      
      console.log('⚠️ Using fallback UID from booking:', fallbackUID);
      return fallbackUID;
    }
  }

  // Save user data to localStorage
  saveUserToStorage(uid, email, phone, name, source = 'booking_form') {
    localStorage.setItem('yujin_firebase_uid', uid);
    localStorage.setItem('yujin_user_email', email);
    localStorage.setItem('yujin_user_phone', phone);
    localStorage.setItem('yujin_user_data', JSON.stringify({
      uid: uid,
      email: email,
      phone: phone,
      name: name,
      timestamp: new Date().toISOString(),
      source: source
    }));
  }

  // Get current booking page instance
  static getInstance() {
    if (!window.bookingPageController) {
      window.bookingPageController = new BookingPageController();
    }
    return window.bookingPageController;
  }
}

// Initialize booking page controller
const bookingPageController = new BookingPageController();

// Make functions globally available for backward compatibility
window.redirectToHome = BookingPageController.redirectToHome;
window.createFirebaseUserFromBookingForm = (userData) => {
  return bookingPageController.createFirebaseUserFromBookingForm(userData);
};

// Export for global use
window.BookingPageController = BookingPageController;
window.bookingPageController = bookingPageController;

console.log('✅ Booking Page Controller loaded');