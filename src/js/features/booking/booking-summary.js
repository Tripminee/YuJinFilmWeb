// Booking Summary and Submission Controller
// Handles price calculation, summary display, and form submission

class BookingSummaryController {
  constructor() {
    this.basePrice = 3500;
    this.filmPrices = {
      'ceramic-70': 2500,
      'ceramic-50': 3000,
      'ceramic-30': 3500,
      'ppf-full': 15000,
      'ppf-partial': 8000
    };
    
    this.init();
  }

  // Initialize summary controller
  init() {
    console.log('💰 Initializing Booking Summary Controller...');
    this.initializeEventListeners();
    console.log('✅ Booking Summary Controller initialized');
  }

  // Initialize event listeners
  initializeEventListeners() {
    // Submit button
    const submitButton = document.getElementById('submitBooking');
    if (submitButton) {
      submitButton.addEventListener('click', (e) => {
        e.preventDefault();
        this.submitForm();
      });
    }

    // Update summary when form changes
    document.addEventListener('formDataChanged', () => {
      this.updateSummary();
    });
  }

  // Calculate total price
  calculateTotal(formData) {
    let total = this.basePrice;
    
    // Add film prices
    if (formData.film) {
      const selectedFilms = formData.film.split(',').filter(f => f);
      selectedFilms.forEach(film => {
        if (this.filmPrices[film]) {
          total += this.filmPrices[film];
        }
      });
    }
    
    // Add addon prices
    if (formData.addons && formData.addons.length > 0) {
      formData.addons.forEach(addon => {
        total += addon.price || 0;
      });
    }
    
    return total;
  }

  // Update summary display
  updateSummary(formData = null) {
    try {
      // Get form data from booking form controller if not provided
      if (!formData && window.bookingFormController) {
        formData = window.bookingFormController.getFormData();
      }
      
      if (!formData) {
        console.warn('⚠️ No form data available for summary');
        return;
      }

      // Update service summary
      this.updateServiceSummary(formData);
      
      // Update customer summary
      this.updateCustomerSummary(formData);
      
      // Update total price
      this.updatePriceSummary(formData);
      
    } catch (error) {
      console.error('❌ Error updating summary:', error);
    }
  }

  // Update service summary section
  updateServiceSummary(formData) {
    const elements = {
      service: document.getElementById('summaryService'),
      vehicle: document.getElementById('summaryVehicle'),
      film: document.getElementById('summaryFilm'),
      addons: document.getElementById('summaryAddons'),
      date: document.getElementById('summaryDate'),
      time: document.getElementById('summaryTime')
    };

    // Service type
    if (elements.service) {
      elements.service.textContent = formData.service === 'car' ? 'ติดฟิล์มรถยนต์' : 'ติดฟิล์มอาคาร';
    }

    // Vehicle info
    if (elements.vehicle && formData.service === 'car') {
      const brand = formData.brand === 'Other' ? formData.customBrand : formData.brand;
      elements.vehicle.textContent = `${brand || ''} ${formData.model || ''}`.trim() || 'ไม่ระบุ';
    }

    // Film selection
    if (elements.film) {
      elements.film.textContent = formData.film || 'ไม่ระบุ';
    }

    // Addons
    if (elements.addons) {
      if (formData.addons && formData.addons.length > 0) {
        elements.addons.textContent = formData.addons.map(a => a.name).join(', ');
      } else {
        elements.addons.textContent = 'ไม่มี';
      }
    }

    // Date and time
    if (elements.date && formData.date) {
      const date = new Date(formData.date);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      elements.date.textContent = date.toLocaleDateString('th-TH', options);
    }

    if (elements.time) {
      elements.time.textContent = formData.time || 'ไม่ระบุ';
    }
  }

  // Update customer summary section
  updateCustomerSummary(formData) {
    const elements = {
      name: document.getElementById('summaryCustomer'),
      phone: document.getElementById('summaryPhone'),
      email: document.getElementById('summaryEmail'),
      location: document.getElementById('summaryLocation')
    };

    if (elements.name) {
      elements.name.textContent = formData.name || 'ไม่ระบุ';
    }

    if (elements.phone) {
      elements.phone.textContent = formData.phone || 'ไม่ระบุ';
    }

    if (elements.email) {
      elements.email.textContent = formData.email || 'ไม่ระบุ';
    }

    if (elements.location) {
      elements.location.textContent = formData.address || formData.addressDetail || 'รอการปักหมุดตำแหน่ง';
    }
  }

  // Update price summary
  updatePriceSummary(formData) {
    const total = this.calculateTotal(formData);
    
    const totalElement = document.getElementById('summaryTotal');
    if (totalElement) {
      totalElement.textContent = `฿${total.toLocaleString()}`;
    }

    // Track price calculation
    if (window.bookingTracker) {
      window.bookingTracker.trackUserAction('price_calculated', {
        total: total,
        base_price: this.basePrice,
        film_count: formData.film ? formData.film.split(',').filter(f => f).length : 0,
        addon_count: formData.addons ? formData.addons.length : 0
      });
    }
  }

  // Submit form
  async submitForm() {
    try {
      console.log('📤 Starting booking submission...');
      
      // Show loading
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) {
        loadingOverlay.classList.add('show');
      }
      
      // Use BookingFormHandler to submit
      const formHandler = new BookingFormHandler();
      const result = await formHandler.submitForm();
      
      if (result.success) {
        console.log('✅ Booking submitted successfully:', result.bookingId);
        this.handleSuccessfulSubmission(result, formHandler.formData);
      } else {
        console.warn('⚠️ Booking saved to fallback storage:', result.error);
        this.handleFallbackSubmission(result, formHandler.formData);
      }
      
    } catch (error) {
      console.error('❌ Error during booking submission:', error);
      this.handleSubmissionError(error);
    } finally {
      // Hide loading
      const loadingOverlay = document.getElementById('loadingOverlay');
      if (loadingOverlay) {
        loadingOverlay.classList.remove('show');
      }
    }
  }

  // Handle successful submission
  handleSuccessfulSubmission(result, formData) {
    // Generate booking number
    const bookingNumber = result.bookingId || this.generateBookingNumber();
    
    // Update success modal
    this.updateSuccessModal(bookingNumber, formData);
    
    // Show success modal
    const successModal = document.getElementById('successModal');
    if (successModal) {
      successModal.classList.add('show');
    }
    
    // Track successful submission
    if (window.bookingTracker) {
      window.bookingTracker.trackBusinessEvent('booking_completed', {
        booking_id: bookingNumber,
        firebase_uid: result.firebaseUID,
        service: formData.service,
        total_price: this.calculateTotal(formData)
      });
    }
  }

  // Handle fallback submission
  handleFallbackSubmission(result, formData) {
    // Generate fallback booking number
    const bookingNumber = this.generateBookingNumber();
    
    // Update success modal
    this.updateSuccessModal(bookingNumber, formData);
    
    // Show success modal (data is saved locally)
    const successModal = document.getElementById('successModal');
    if (successModal) {
      successModal.classList.add('show');
    }
    
    // Track fallback submission
    if (window.bookingTracker) {
      window.bookingTracker.trackBusinessEvent('booking_fallback', {
        booking_id: bookingNumber,
        error: result.error,
        service: formData.service
      });
    }
  }

  // Handle submission error
  handleSubmissionError(error) {
    // Hide loading
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.classList.remove('show');
    }
    
    // Show error message
    this.showError('เกิดข้อผิดพลาดในการส่งข้อมูล กรุณาลองใหม่อีกครั้ง');
    
    // Track submission error
    if (window.bookingTracker) {
      window.bookingTracker.trackError(error, 'booking_submission');
    }
  }

  // Update success modal
  updateSuccessModal(bookingNumber, formData) {
    // Booking number
    const bookingNumberElement = document.getElementById('bookingNumber');
    if (bookingNumberElement) {
      bookingNumberElement.textContent = bookingNumber;
    }
    
    // Booking date
    const bookingDateElement = document.getElementById('bookingDate');
    if (bookingDateElement && formData.date) {
      const date = new Date(formData.date);
      const options = { year: 'numeric', month: 'long', day: 'numeric' };
      bookingDateElement.textContent = date.toLocaleDateString('th-TH', options);
    }
    
    // Booking time
    const bookingTimeElement = document.getElementById('bookingTime');
    if (bookingTimeElement && formData.time) {
      bookingTimeElement.textContent = formData.time;
    }
  }

  // Generate booking number
  generateBookingNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000);
    return 'BK' + year + String(random).padStart(5, '0');
  }

  // Show error message
  showError(message) {
    console.error('❌ Booking Error:', message);
    alert(message); // You can enhance this with a proper error modal
  }

  // Get price breakdown
  getPriceBreakdown(formData) {
    const breakdown = {
      base: this.basePrice,
      films: [],
      addons: [],
      total: 0
    };
    
    // Film prices
    if (formData.film) {
      const selectedFilms = formData.film.split(',').filter(f => f);
      selectedFilms.forEach(film => {
        if (this.filmPrices[film]) {
          breakdown.films.push({
            name: film,
            price: this.filmPrices[film]
          });
        }
      });
    }
    
    // Addon prices
    if (formData.addons && formData.addons.length > 0) {
      breakdown.addons = [...formData.addons];
    }
    
    // Calculate total
    breakdown.total = this.calculateTotal(formData);
    
    return breakdown;
  }
}

// Global functions for backward compatibility
window.calculateTotal = (formData) => {
  if (window.bookingSummaryController) {
    return window.bookingSummaryController.calculateTotal(formData);
  }
  return 0;
};

window.updateSummary = (formData) => {
  if (window.bookingSummaryController) {
    window.bookingSummaryController.updateSummary(formData);
  }
};

window.submitForm = () => {
  if (window.bookingSummaryController) {
    window.bookingSummaryController.submitForm();
  }
};

// Export for global use
window.BookingSummaryController = BookingSummaryController;

console.log('✅ Booking Summary Controller loaded');