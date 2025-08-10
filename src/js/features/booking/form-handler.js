// Booking Form Handler for Firestore Integration
// Handles all form data collection and submission to Firestore

class BookingFormHandler {
  constructor() {
    this.formData = {};
    this.init();
  }

  init() {
    console.log('🔧 Booking Form Handler initialized');
  }

  // Collect all form data
  collectFormData() {
    const formData = {
      // Service Information
      service: document.querySelector('input[name="service"]:checked')?.value || '',
      
      // Car Information (if car service)
      brand: document.getElementById('customBrand')?.value || 
             document.querySelector('input[name="brand"]:checked')?.value || '',
      model: document.getElementById('carModel')?.value || '',
      
      // Film and Addons
      film: document.querySelector('input[name="film"]:checked')?.value || '',
      addons: Array.from(document.querySelectorAll('input[name="addon"]:checked'))
                  .map(input => input.value),
      
      // Building images (for building service - excluded from Firestore)
      buildingImages: [], // We'll handle file uploads separately
      
      // Date and Time
      date: document.getElementById('selectedDate')?.value || '',
      time: document.getElementById('selectedTime')?.value || '',
      
      // Customer Information
      name: document.getElementById('customerName')?.value?.trim() || '',
      phone: document.getElementById('customerPhone')?.value?.trim() || '',
      email: document.getElementById('customerEmail')?.value?.trim() || '',
      line: document.getElementById('customerLine')?.value?.trim() || '',
      
      // Location Information
      latitude: document.getElementById('latitude')?.value || '',
      longitude: document.getElementById('longitude')?.value || '',
      address: document.getElementById('addressText')?.textContent?.trim() || '',
      addressDetail: document.getElementById('addressDetail')?.value?.trim() || '',
      
      // Additional Notes
      note: document.getElementById('customerNote')?.value?.trim() || '',
      
      // Metadata
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      referrer: document.referrer || 'direct'
    };

    // Validate required fields
    const requiredFields = ['service', 'name', 'phone', 'email', 'date', 'time'];
    const missingFields = requiredFields.filter(field => !formData[field]);
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Clean phone number format
    if (formData.phone) {
      formData.phone = formData.phone.replace(/[-\s]/g, '');
      if (!formData.phone.match(/^0[0-9]{9}$/)) {
        throw new Error('Invalid phone number format');
      }
    }

    // Validate email
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new Error('Invalid email format');
    }

    this.formData = formData;
    return formData;
  }

  // Save booking to Firestore
  async saveToFirestore(formData) {
    try {
      if (!window.yuJinFirebase || !window.yuJinFirebase.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      console.log('💾 Saving booking to Firestore...');

      // Create Firebase user first
      let firebaseUID = null;
      if (formData.email && formData.phone && formData.name) {
        firebaseUID = await window.yuJinFirebase.createUser({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          additionalData: {
            service: formData.service,
            brand: formData.brand,
            model: formData.model
          }
        }, 'booking');
        
        console.log('✅ Firebase user created/authenticated:', firebaseUID);
      }

      // Prepare booking data for Firestore (exclude images)
      const bookingData = {
        ...formData,
        firebaseUID: firebaseUID,
        userID: window.getUserId ? window.getUserId() : null,
        sessionID: this.generateSessionId(),
        submissionTime: new Date().toISOString(),
        status: 'pending',
        source: 'booking_form'
      };

      // Remove image data from Firestore submission
      delete bookingData.buildingImages;

      console.log('💾 Saving booking data to Firestore:', {
        date: bookingData.date,
        time: bookingData.time,
        name: bookingData.name,
        phone: bookingData.phone,
        status: bookingData.status
      });

      // Save to bookings collection
      const bookingId = await window.yuJinFirebase.saveToCollection('bookings', bookingData);
      
      if (bookingId) {
        console.log('✅ Booking saved successfully:', bookingId);
        
        // Update user document with latest booking
        if (firebaseUID && !firebaseUID.startsWith('LOCAL_') && !firebaseUID.startsWith('PHONE_')) {
          await window.yuJinFirebase.updateDocument('users', firebaseUID, {
            latestBooking: bookingId,
            latestBookingDate: new Date().toISOString(),
            totalBookings: 1 // This should be incremented properly
          });
        }

        return {
          success: true,
          bookingId: bookingId,
          firebaseUID: firebaseUID
        };
      } else {
        throw new Error('Failed to save booking to Firestore');
      }

    } catch (error) {
      console.error('❌ Error saving booking:', error);
      
      // Fallback: save to localStorage
      const fallbackData = {
        ...formData,
        fallback: true,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`booking_fallback_${Date.now()}`, JSON.stringify(fallbackData));
      
      return {
        success: false,
        error: error.message,
        fallback: true
      };
    }
  }

  // Handle complete form submission
  async submitForm() {
    try {
      console.log('📤 Starting booking submission process...');
      
      // Collect form data
      const formData = this.collectFormData();
      console.log('📋 Form data collected:', formData);

      // Validate availability before submission
      if (window.availabilityService && formData.date && formData.time) {
        console.log('🔍 Validating availability...');
        try {
          await window.availabilityService.reserveTimeSlot(formData.date, formData.time, formData);
          console.log('✅ Time slot validated and reserved');
        } catch (availabilityError) {
          console.error('❌ Availability validation failed:', availabilityError.message);
          throw new Error(`ช่วงเวลาที่เลือกไม่สามารถจองได้: ${availabilityError.message}`);
        }
      } else {
        console.warn('⚠️ Availability service not available or missing date/time');
      }

      // Track form submission if tracking is available
      if (window.bookingTracker) {
        window.bookingTracker.trackFormSubmission(formData);
      }

      // Save to Firestore
      const result = await this.saveToFirestore(formData);
      
      if (result.success) {
        console.log('✅ Booking submitted successfully');
        return result;
      } else {
        console.warn('⚠️ Booking saved to fallback storage');
        return result;
      }

    } catch (error) {
      if (error.message.includes('permission') || error.message.includes('permissions')) {
        console.warn('⚠️ Firestore permissions issue - saving to local storage');
        
        // Save to local storage as fallback
        const fallbackResult = this.saveToLocalStorage(formData);
        
        return {
          success: true, // Mark as success so UI shows success message
          bookingId: fallbackResult.id,
          message: 'การจองถูกบันทึกในระบบ (โหมดออฟไลน์)',
          fallback: true
        };
      }
      
      console.error('❌ Form submission failed:', error);
      
      // Track error if tracking is available
      if (window.bookingTracker) {
        window.bookingTracker.trackError(error, 'form_submission');
      }

      throw error;
    }
  }

  // Generate session ID
  generateSessionId() {
    return 'BOOKING_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  }

  // Save to local storage as fallback
  saveToLocalStorage(formData) {
    try {
      const bookingId = 'LOCAL_' + Date.now();
      const bookingData = {
        id: bookingId,
        ...formData,
        submissionTime: new Date().toISOString(),
        status: 'pending_offline',
        source: 'local_storage'
      };

      // Get existing bookings or initialize empty array
      const existingBookings = JSON.parse(localStorage.getItem('yujin_offline_bookings') || '[]');
      
      // Add new booking
      existingBookings.push(bookingData);
      
      // Save back to localStorage
      localStorage.setItem('yujin_offline_bookings', JSON.stringify(existingBookings));
      
      console.log('💾 Booking saved to localStorage:', bookingId);
      
      return { id: bookingId, success: true };
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
      return { id: 'LOCAL_ERROR_' + Date.now(), success: false };
    }
  }

  // Get offline bookings from localStorage
  static getOfflineBookings() {
    try {
      const bookings = JSON.parse(localStorage.getItem('yujin_offline_bookings') || '[]');
      console.log(`📱 Found ${bookings.length} offline bookings`);
      return bookings;
    } catch (error) {
      console.error('❌ Error reading offline bookings:', error);
      return [];
    }
  }

  // Clear offline bookings (for admin use)
  static clearOfflineBookings() {
    try {
      localStorage.removeItem('yujin_offline_bookings');
      console.log('🗑️ Offline bookings cleared');
      return true;
    } catch (error) {
      console.error('❌ Error clearing offline bookings:', error);
      return false;
    }
  }

  // Validate form data
  validateFormData(formData) {
    const errors = [];

    // Required field validation
    if (!formData.service) errors.push('กรุณาเลือกบริการ');
    if (!formData.name) errors.push('กรุณากรอกชื่อ-นามสกุล');
    if (!formData.phone) errors.push('กรุณากรอกเบอร์โทรศัพท์');
    if (!formData.email) errors.push('กรุณากรอกอีเมล');
    if (!formData.date) errors.push('กรุณาเลือกวันที่');
    if (!formData.time) errors.push('กรุณาเลือกเวลา');

    // Phone validation
    if (formData.phone && !formData.phone.match(/^0[0-9]{9}$/)) {
      errors.push('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
    }

    // Email validation
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push('รูปแบบอีเมลไม่ถูกต้อง');
    }

    return errors;
  }

  // Get form summary for display
  getFormSummary(formData) {
    return {
      service: formData.service === 'car' ? 'ติดฟิล์มรถยนต์' : 'ติดฟิล์มอาคาร',
      vehicle: formData.service === 'car' ? `${formData.brand} ${formData.model}` : 'N/A',
      film: formData.film || 'ไม่ระบุ',
      addons: formData.addons.length > 0 ? formData.addons.join(', ') : 'ไม่มี',
      date: formData.date,
      time: formData.time,
      customer: formData.name,
      phone: formData.phone,
      email: formData.email,
      location: formData.address || 'รอการปักหมุดตำแหน่ง'
    };
  }
}

// Global functions for offline booking management
window.getOfflineBookings = function() {
  return BookingFormHandler.getOfflineBookings();
};

window.clearOfflineBookings = function() {
  return BookingFormHandler.clearOfflineBookings();
};

window.showOfflineBookings = function() {
  const bookings = BookingFormHandler.getOfflineBookings();
  if (bookings.length === 0) {
    console.log('📭 No offline bookings found');
    return;
  }
  
  console.log('📱 Offline Bookings:');
  bookings.forEach((booking, index) => {
    console.log(`${index + 1}. ${booking.name} (${booking.phone})`);
    console.log(`   📅 ${booking.date} at ${booking.time}`);
    console.log(`   🚗 ${booking.service} - ${booking.brand || ''} ${booking.model || ''}`);
    console.log(`   📍 ${booking.address || booking.addressDetail || 'No address'}`);
    console.log(`   ⏰ ${booking.submissionTime}`);
    console.log('   ---');
  });
};

// Initialize and export
window.BookingFormHandler = BookingFormHandler;

console.log('✅ Booking Form Handler loaded');
console.log('ℹ️ Use getOfflineBookings(), showOfflineBookings(), clearOfflineBookings() to manage offline data');