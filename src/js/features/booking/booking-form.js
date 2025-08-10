// Booking Form UI Controller
// Handles form steps, calendar, service selection, and form validation

class BookingFormController {
  constructor() {
    this.currentStep = 1;
    this.totalSteps = 4;
    this.currentMonth = new Date();
    this.formData = {
      service: '',
      brand: '',
      model: '',
      film: '',
      addons: [],
      buildingImages: [],
      date: '',
      time: '',
      name: '',
      phone: '',
      email: '',
      line: '',
      latitude: '',
      longitude: '',
      address: '',
      addressDetail: '',
      note: ''
    };
    
    this.init();
  }

  // Initialize form controller
  async init() {
    console.log('📋 Initializing Booking Form Controller...');
    
    this.initializeEventListeners();
    await this.generateCalendar();
    this.initializeFormAbandonment();
    this.updateStepDisplay();
    this.setupAvailabilityListener();
    
    console.log('✅ Booking Form Controller initialized');
  }

  // Initialize all event listeners
  initializeEventListeners() {
    this.initServiceSelection();
    this.initCarBrandSelection();
    this.initFilmSelection();
    this.initAddonSelection();
    this.initTimeSlotSelection();
    this.initStepNavigation();
  }

  // Initialize service selection
  initServiceSelection() {
    document.querySelectorAll('.service-option[data-service]').forEach(option => {
      option.addEventListener('click', (e) => {
        // Remove selection from other options
        document.querySelectorAll('.service-option[data-service]').forEach(opt => {
          opt.classList.remove('selected');
        });
        
        // Select current option
        e.currentTarget.classList.add('selected');
        this.formData.service = e.currentTarget.dataset.service;
        
        // Show/hide relevant sections
        if (this.formData.service === 'car') {
          document.getElementById('carSection').style.display = 'block';
          document.getElementById('buildingImageSection').style.display = 'none';
        } else if (this.formData.service === 'building') {
          document.getElementById('carSection').style.display = 'none';
          document.getElementById('buildingImageSection').style.display = 'block';
        } else {
          document.getElementById('carSection').style.display = 'none';
          document.getElementById('buildingImageSection').style.display = 'none';
        }
        
        // Track service selection
        this.trackFormInteraction('service_selected', { service: this.formData.service });
      });
    });
  }

  // Initialize car brand selection
  initCarBrandSelection() {
    document.querySelectorAll('.car-brand').forEach(brand => {
      brand.addEventListener('click', (e) => {
        document.querySelectorAll('.car-brand').forEach(b => {
          b.classList.remove('selected');
        });
        
        e.currentTarget.classList.add('selected');
        this.formData.brand = e.currentTarget.dataset.brand;
        
        // Show/hide custom brand input
        const customBrandSection = document.getElementById('customBrandSection');
        if (this.formData.brand === 'Other') {
          customBrandSection.style.display = 'block';
        } else {
          customBrandSection.style.display = 'none';
          document.getElementById('customBrand').value = '';
          delete this.formData.customBrand;
        }
        
        // Track brand selection
        this.trackFormInteraction('brand_selected', { brand: this.formData.brand });
      });
    });

    // Custom brand input handler
    const customBrandInput = document.getElementById('customBrand');
    if (customBrandInput) {
      customBrandInput.addEventListener('input', (e) => {
        if (this.formData.brand === 'Other') {
          this.formData.customBrand = e.target.value;
        }
      });
    }

    // Car model input handler
    const carModelInput = document.getElementById('carModel');
    if (carModelInput) {
      carModelInput.addEventListener('input', (e) => {
        this.formData.model = e.target.value;
      });
    }
  }

  // Initialize film selection (multiple, max 2)
  initFilmSelection() {
    document.querySelectorAll('.service-option[data-film]').forEach(option => {
      option.addEventListener('click', (e) => {
        const selectedFilms = document.querySelectorAll('.service-option[data-film].selected');
        
        if (e.currentTarget.classList.contains('selected')) {
          // Unselect if already selected
          e.currentTarget.classList.remove('selected');
          this.formData.film = this.formData.film.split(',').filter(f => f !== e.currentTarget.dataset.film).join(',');
        } else if (selectedFilms.length < 2) {
          // Select if less than 2 are selected
          e.currentTarget.classList.add('selected');
          if (this.formData.film) {
            this.formData.film += ',' + e.currentTarget.dataset.film;
          } else {
            this.formData.film = e.currentTarget.dataset.film;
          }
        } else {
          // Show message if trying to select more than 2
          this.showMessage('สามารถเลือกความเข้มของฟิล์มได้สูงสุด 2 อัน', 'warning');
          return;
        }
        
        // Track film selection
        this.trackFormInteraction('film_selected', { 
          films: this.formData.film,
          count: this.formData.film.split(',').filter(f => f).length
        });
      });
    });
  }

  // Initialize addon selection
  initAddonSelection() {
    document.querySelectorAll('.addon-item').forEach(addon => {
      addon.addEventListener('click', (e) => {
        e.currentTarget.classList.toggle('selected');
        const addonData = {
          name: e.currentTarget.dataset.addon,
          price: parseInt(e.currentTarget.dataset.price) || 0
        };
        
        if (e.currentTarget.classList.contains('selected')) {
          this.formData.addons.push(addonData);
        } else {
          this.formData.addons = this.formData.addons.filter(a => a.name !== addonData.name);
        }
        
        // Track addon selection
        this.trackFormInteraction('addon_toggled', { 
          addon: addonData.name,
          selected: e.currentTarget.classList.contains('selected'),
          total_addons: this.formData.addons.length
        });
      });
    });
  }

  // Initialize time slot selection with availability validation
  initTimeSlotSelection() {
    console.log('🕐 Initializing time slot selection...');
    const slots = document.querySelectorAll('.time-slot');
    console.log(`Found ${slots.length} time slots to initialize`);
    
    slots.forEach((slot, index) => {
      console.log(`Setting up listener for slot ${index + 1}: ${slot.dataset.time}`);
      
      slot.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🖱️ Time slot clicked:', e.currentTarget.dataset.time);
        
        if (e.currentTarget.classList.contains('disabled') || e.currentTarget.classList.contains('full')) {
          console.log('⚠️ Slot is disabled or full');
          return;
        }
        
        // Additional availability check before selection
        const timeSlot = e.currentTarget.dataset.time;
        if (this.formData.date && window.availabilityService) {
          try {
            const count = await window.availabilityService.getBookingCount(this.formData.date, timeSlot);
            if (count >= window.availabilityService.maxBookingsPerSlot) {
              this.showMessage('ช่วงเวลานี้เต็มแล้ว กรุณาเลือกช่วงเวลาอื่น', 'warning');
              return;
            }
          } catch (error) {
            console.error('❌ Error checking availability:', error);
          }
        }
        
        // Remove selection from other slots
        document.querySelectorAll('.time-slot').forEach(s => {
          s.classList.remove('selected');
        });
        
        // Select current slot
        e.currentTarget.classList.add('selected');
        this.formData.time = timeSlot;
        
        const selectedTimeInput = document.getElementById('selectedTime');
        if (selectedTimeInput) {
          selectedTimeInput.value = this.formData.time;
        }
        
        console.log('✅ Time selected:', this.formData.time);
        
        // Track time selection
        this.trackFormInteraction('time_selected', { time: this.formData.time });
      });
    });
    
    console.log('✅ Time slot selection initialized');
  }

  // Initialize step navigation
  initStepNavigation() {
    // Next step button
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextStep();
      });
    }

    // Previous step button
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prevStep();
      });
    }

    // Also handle any buttons with onclick attributes (for backward compatibility)
    document.querySelectorAll('[onclick*="nextStep"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.nextStep();
      });
    });

    document.querySelectorAll('[onclick*="prevStep"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.prevStep();
      });
    });
  }

  // Calendar generation with availability checking
  async generateCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 
                       'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
    const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
    
    const currentMonthElement = document.getElementById('currentMonth');
    if (currentMonthElement) {
      currentMonthElement.textContent = `${monthNames[month]} ${year + 543}`;
    }
    
    // Prepare dates for availability checking
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast = date < today && date.toDateString() !== today.toDateString();
      if (!isPast) {
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push(dateString);
      }
    }
    
    // Get availability for all valid dates
    let availability = {};
    try {
      if (window.availabilityService && dates.length > 0) {
        availability = await window.availabilityService.getMultipleDateAvailability(dates);
      }
    } catch (error) {
      console.error('❌ Error getting calendar availability:', error);
    }
    
    let html = '';
    
    // Day labels
    dayNames.forEach(day => {
      html += `<div class="day-label">${day}</div>`;
    });
    
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      html += `<div></div>`;
    }
    
    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      const isPast = date < today && !isToday;
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      let classes = 'calendar-day';
      if (isToday) classes += ' today';
      if (isPast) classes += ' disabled';
      
      // All future dates (including today) can be booked
      if (!isPast) {
        // Check availability
        const hasAvailability = availability[dateString] !== false;
        if (hasAvailability) {
          classes += ' has-slots';
        } else {
          classes += ' full-day';
        }
      }
      
      const isClickable = !isPast;
      const clickHandler = isClickable ? `onclick="window.bookingFormController.selectDate(this)"` : '';
      
      html += `<div class="${classes}" data-date="${dateString}" ${clickHandler}>
                ${day}
              </div>`;
    }
    
    const calendarGrid = document.getElementById('calendarGrid');
    if (calendarGrid) {
      calendarGrid.innerHTML = html;
    }
    
    console.log('📅 Calendar generated with availability data');
  }

  // Change month
  async changeMonth(direction) {
    this.currentMonth.setMonth(this.currentMonth.getMonth() + direction);
    await this.generateCalendar();
    
    // Track month navigation
    this.trackFormInteraction('calendar_month_changed', { 
      direction: direction > 0 ? 'next' : 'prev',
      month: this.currentMonth.getMonth() + 1,
      year: this.currentMonth.getFullYear()
    });
  }

  // Select date
  async selectDate(element) {
    if (element.classList.contains('disabled')) return;
    
    document.querySelectorAll('.calendar-day').forEach(day => {
      day.classList.remove('selected');
    });
    
    element.classList.add('selected');
    this.formData.date = element.dataset.date;
    
    const selectedDateInput = document.getElementById('selectedDate');
    if (selectedDateInput) {
      selectedDateInput.value = this.formData.date;
    }
    
    console.log('📅 Date selected:', this.formData.date);
    
    // Update available time slots with real-time data
    await this.updateTimeSlots();
    
    // Track date selection
    this.trackFormInteraction('date_selected', { date: this.formData.date });
  }

  // Update time slots availability with real-time data
  async updateTimeSlots() {
    if (!this.formData.date) {
      console.log('⚠️ No date selected, skipping time slot update');
      return;
    }
    
    const slots = document.querySelectorAll('.time-slot');
    console.log(`🕐 Updating ${slots.length} time slots for date: ${this.formData.date}`);
    
    try {
      // Get availability data for the selected date
      if (window.availabilityService) {
        const availability = await window.availabilityService.getDateAvailability(this.formData.date);
        console.log('📊 Availability data received:', availability);
        
        slots.forEach(slot => {
          const timeSlot = slot.dataset.time;
          const slotData = availability[timeSlot];
          
          // Reset all classes first
          slot.classList.remove('available', 'almost-full', 'full', 'disabled');
          
          if (slotData) {
            // Update status text
            const statusElement = slot.querySelector('.slot-status');
            if (statusElement) {
              statusElement.textContent = window.availabilityService.getTimeSlotStatusText(slotData);
            }
            
            // Update visual status
            const statusClass = window.availabilityService.getTimeSlotStatusClass(slotData);
            slot.classList.add(statusClass);
            
            // Disable if full
            if (!slotData.available) {
              slot.classList.add('disabled');
            }
          } else {
            // Default to available if no data
            slot.classList.add('available');
            const statusElement = slot.querySelector('.slot-status');
            if (statusElement) {
              statusElement.textContent = 'ว่าง';
            }
          }
        });
        
        console.log('✅ Time slots updated with availability data');
      } else {
        console.warn('⚠️ AvailabilityService not available - showing all as available');
        // Fallback to showing all slots as available
        slots.forEach(slot => {
          slot.classList.remove('disabled', 'full', 'almost-full');
          slot.classList.add('available');
          const statusElement = slot.querySelector('.slot-status');
          if (statusElement) {
            statusElement.textContent = 'ว่าง';
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error updating time slots:', error);
      // Fallback to showing all slots as available
      slots.forEach(slot => {
        slot.classList.remove('disabled', 'full', 'almost-full');
        slot.classList.add('available');
        const statusElement = slot.querySelector('.slot-status');
        if (statusElement) {
          statusElement.textContent = 'ว่าง';
        }
      });
    }
  }

  // Step navigation
  nextStep() {
    if (this.currentStep < this.totalSteps) {
      // Validate current step before proceeding
      if (this.validateStep(this.currentStep)) {
        this.currentStep++;
        this.updateStepDisplay();
        
        // Update summary when moving to step 4
        if (this.currentStep === 4) {
          this.updateBookingSummary();
        }
        
        this.trackFormInteraction('step_completed', { step: this.currentStep - 1 });
      }
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateStepDisplay();
      this.trackFormInteraction('step_back', { step: this.currentStep });
    }
  }

  // Update step display
  updateStepDisplay() {
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
      step.classList.toggle('active', index + 1 === this.currentStep);
      step.classList.toggle('completed', index + 1 < this.currentStep);
    });
    
    // Show/hide step content (use form-section class)
    document.querySelectorAll('.form-section').forEach((section, index) => {
      section.classList.toggle('active', index + 1 === this.currentStep);
    });

    // Update navigation buttons visibility
    this.updateNavigationButtons();
  }

  // Update navigation buttons
  updateNavigationButtons() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    
    // Show/hide previous button
    if (prevBtn) {
      prevBtn.style.display = this.currentStep > 1 ? 'inline-flex' : 'none';
    }
    
    // Update next button text/action
    if (nextBtn) {
      if (this.currentStep === this.totalSteps) {
        nextBtn.innerHTML = 'ส่งข้อมูล <i class="fas fa-check"></i>';
        nextBtn.onclick = () => this.submitFormFromButton();
      } else {
        nextBtn.innerHTML = 'ถัดไป <i class="fas fa-arrow-right"></i>';
        nextBtn.onclick = null; // Remove any existing onclick
      }
    }
  }

  // Submit form when final button is clicked
  submitFormFromButton() {
    if (window.bookingSummaryController) {
      window.bookingSummaryController.submitForm();
    }
  }

  // Validate step
  validateStep(step) {
    // Collect current form data before validation
    this.collectCurrentFormData();
    
    switch (step) {
      case 1:
        if (!this.formData.service) {
          this.showMessage('กรุณาเลือกบริการ', 'error');
          return false;
        }
        if (this.formData.service === 'car' && !this.formData.brand) {
          this.showMessage('กรุณาเลือกยี่ห้อรถ', 'error');
          return false;
        }
        break;
      case 2:
        if (!this.formData.date) {
          this.showMessage('กรุณาเลือกวันที่', 'error');
          return false;
        }
        if (!this.formData.time) {
          this.showMessage('กรุณาเลือกเวลา', 'error');
          return false;
        }
        break;
      case 3:
        if (!this.formData.name || this.formData.name.trim() === '') {
          this.showMessage('กรุณากรอกชื่อ-นามสกุล', 'error');
          return false;
        }
        if (!this.formData.phone || this.formData.phone.trim() === '') {
          this.showMessage('กรุณากรอกเบอร์โทรศัพท์', 'error');
          return false;
        }
        if (!this.formData.email || this.formData.email.trim() === '') {
          this.showMessage('กรุณากรอกอีเมล', 'error');
          return false;
        }
        // Validate phone format
        if (!this.formData.phone.match(/^0[0-9]{9}$/)) {
          this.showMessage('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง', 'error');
          return false;
        }
        // Validate email format
        if (!this.formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          this.showMessage('รูปแบบอีเมลไม่ถูกต้อง', 'error');
          return false;
        }
        break;
    }
    return true;
  }

  // Show message
  showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can enhance this to show actual UI messages
    if (type === 'error') {
      alert(message);
    }
  }

  // Update booking summary
  updateBookingSummary() {
    console.log('📋 Updating booking summary...');
    
    // Collect latest form data
    this.collectCurrentFormData();
    
    // Update summary through summary controller
    if (window.bookingSummaryController) {
      window.bookingSummaryController.updateSummary(this.formData);
      console.log('✅ Summary updated with data:', this.getFormSummary());
    } else {
      console.warn('⚠️ Booking summary controller not found');
    }
  }

  // Initialize form abandonment tracking
  initializeFormAbandonment() {
    window.addEventListener('beforeunload', () => {
      if (window.bookingTracker && this.currentStep > 1) {
        window.bookingTracker.trackFormAbandonment();
      }
    });
  }

  // Track form interactions
  trackFormInteraction(action, data = {}) {
    if (window.bookingTracker) {
      window.bookingTracker.trackUserAction(action, {
        ...data,
        current_step: this.currentStep,
        form_data: this.getFormSummary()
      });
    }
  }

  // Setup real-time availability listener
  setupAvailabilityListener() {
    if (!window.availabilityService) return;
    
    // Listen for availability updates on the selected date
    this.availabilityListener = null;
    console.log('🔗 Availability listener setup completed');
  }

  // Get form summary for tracking
  getFormSummary() {
    return {
      service: this.formData.service,
      has_date: !!this.formData.date,
      has_time: !!this.formData.time,
      has_customer_info: !!(this.formData.name && this.formData.phone && this.formData.email),
      addons_count: this.formData.addons.length
    };
  }

  // Get form data
  getFormData() {
    // Collect current form values
    this.collectCurrentFormData();
    return this.formData;
  }

  // Collect current form data from DOM
  collectCurrentFormData() {
    // Customer information
    const nameField = document.getElementById('customerName');
    const phoneField = document.getElementById('customerPhone');
    const emailField = document.getElementById('customerEmail');
    const lineField = document.getElementById('customerLine');
    const addressDetailField = document.getElementById('addressDetail');
    const noteField = document.getElementById('customerNote');
    const latField = document.getElementById('latitude');
    const lngField = document.getElementById('longitude');

    if (nameField) this.formData.name = nameField.value.trim();
    if (phoneField) this.formData.phone = phoneField.value.trim();
    if (emailField) this.formData.email = emailField.value.trim();
    if (lineField) this.formData.line = lineField.value.trim();
    if (addressDetailField) this.formData.addressDetail = addressDetailField.value.trim();
    if (noteField) this.formData.note = noteField.value.trim();
    if (latField) this.formData.latitude = latField.value;
    if (lngField) this.formData.longitude = lngField.value;

    // Address from search
    const searchAddressField = document.getElementById('searchAddress');
    if (searchAddressField) {
      this.formData.address = searchAddressField.value.trim();
    }
  }
}

// Global functions for backward compatibility
window.changeMonth = (direction) => {
  if (window.bookingFormController) {
    window.bookingFormController.changeMonth(direction);
  }
};

window.selectDate = (element) => {
  if (window.bookingFormController) {
    window.bookingFormController.selectDate(element);
  }
};

window.nextStep = () => {
  if (window.bookingFormController) {
    window.bookingFormController.nextStep();
  }
};

window.prevStep = () => {
  if (window.bookingFormController) {
    window.bookingFormController.prevStep();
  }
};

// Export for global use
window.BookingFormController = BookingFormController;

console.log('✅ Booking Form Controller loaded');