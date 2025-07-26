document.addEventListener('DOMContentLoaded', function() {
  const track = document.getElementById('testimonialTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const wrapper = document.querySelector('.testimonial-wrapper');
  
  let currentIndex = 0;

  // ===== USER TRACKING SYSTEM =====
  class UserTracker {
    constructor() {
      this.initTracking();
      this.setupEventTracking();
    }

    initTracking() {
      if (!localStorage.getItem('visitId')) {
        const visitId = 'visit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('visitId', visitId);
      }

      if (!sessionStorage.getItem('sessionId')) {
        const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        sessionStorage.setItem('sessionId', sessionId);
      }

      this.trackPageView();
      this.trackUTMParameters();
      this.updateVisitCount();
      this.trackFirstVisit();
      this.trackUserBehavior();
    }

    trackPageView() {
      const currentPage = window.location.pathname + window.location.search;
      
      if (!localStorage.getItem('landingPage')) {
        localStorage.setItem('landingPage', currentPage);
      }

      let pageViews = JSON.parse(sessionStorage.getItem('pageViews') || '[]');
      pageViews.push({
        page: currentPage,
        timestamp: new Date().toISOString(),
        title: document.title
      });
      sessionStorage.setItem('pageViews', JSON.stringify(pageViews));
    }

    trackUTMParameters() {
      const urlParams = new URLSearchParams(window.location.search);
      const utmParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      
      utmParams.forEach(param => {
        const value = urlParams.get(param);
        if (value && !localStorage.getItem(param)) {
          localStorage.setItem(param, value);
        }
      });
    }

    updateVisitCount() {
      let visitCount = parseInt(localStorage.getItem('visitCount') || '0');
      visitCount++;
      localStorage.setItem('visitCount', visitCount.toString());
    }

    trackFirstVisit() {
      if (!localStorage.getItem('firstVisit')) {
        localStorage.setItem('firstVisit', new Date().toISOString());
      }
    }

    trackUserBehavior() {
      let maxScroll = 0;
      window.addEventListener('scroll', () => {
        const currentScroll = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
        if (currentScroll > maxScroll) {
          maxScroll = currentScroll;
          sessionStorage.setItem('maxScrollDepth', maxScroll.toString());
        }
      });

      const startTime = Date.now();
      sessionStorage.setItem('sessionStartTime', startTime.toString());

      window.addEventListener('beforeunload', () => {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        sessionStorage.setItem('timeSpentOnPage', timeSpent.toString());
      });
    }

    setupEventTracking() {
      document.addEventListener('click', (e) => {
        const trackElement = e.target.closest('[data-track]');
        if (trackElement) {
          const trackData = {
            event: trackElement.dataset.track,
            timestamp: new Date().toISOString(),
            element: trackElement.tagName.toLowerCase(),
            text: trackElement.textContent?.trim().substring(0, 50) || '',
            url: trackElement.href || '',
            ...Object.fromEntries(
              Object.entries(trackElement.dataset).filter(([key]) => key.startsWith('track'))
            )
          };
          this.logEvent('click', trackData);
        }
      });

      document.addEventListener('submit', (e) => {
        const form = e.target;
        if (form.dataset.track) {
          const formData = new FormData(form);
          const trackData = {
            event: 'form_submit',
            formId: form.id,
            formTrack: form.dataset.track,
            timestamp: new Date().toISOString(),
            fields: Object.fromEntries(formData.entries())
          };
          this.logEvent('form_submit', trackData);
        }
      });
    }

    logEvent(type, data) {
      let events = JSON.parse(sessionStorage.getItem('userEvents') || '[]');
      events.push({
        type,
        data,
        timestamp: new Date().toISOString()
      });

      if (events.length > 100) {
        events = events.slice(-100);
      }

      sessionStorage.setItem('userEvents', JSON.stringify(events));
    }

    getAllTrackingData() {
      const sessionStartTime = parseInt(sessionStorage.getItem('sessionStartTime') || Date.now().toString());
      const currentTime = Date.now();
      const sessionDuration = Math.round((currentTime - sessionStartTime) / 1000);

      return {
        visitId: localStorage.getItem('visitId'),
        sessionId: sessionStorage.getItem('sessionId'),
        firstVisit: localStorage.getItem('firstVisit'),
        visitCount: parseInt(localStorage.getItem('visitCount') || '1'),
        landingPage: localStorage.getItem('landingPage'),
        utmSource: localStorage.getItem('utm_source'),
        utmMedium: localStorage.getItem('utm_medium'),
        utmCampaign: localStorage.getItem('utm_campaign'),
        utmTerm: localStorage.getItem('utm_term'),
        utmContent: localStorage.getItem('utm_content'),
        sessionDuration: sessionDuration,
        maxScrollDepth: parseInt(sessionStorage.getItem('maxScrollDepth') || '0'),
        timeSpentOnPage: parseInt(sessionStorage.getItem('timeSpentOnPage') || '0'),
        pageViews: JSON.parse(sessionStorage.getItem('pageViews') || '[]'),
        userEvents: JSON.parse(sessionStorage.getItem('userEvents') || '[]'),
        userAgent: navigator.userAgent,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${screen.width}x${screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        referrer: document.referrer,
        currentUrl: window.location.href,
        timestamp: new Date().toISOString()
      };
    }
  }

  // ===== DIRECT GOOGLE SHEETS MANAGER =====
  class DirectGoogleSheetsManager {
    constructor() {
      this.config = {
        // ✅ คงค่าจริงไว้ - ระบบจะทำงานกับค่าเหล่านี้
        apiKey: 'AIzaSyB1buHQFd88w-OtwjU8xUJeMbR7XDPGyy8',
        spreadsheetId: '1NBl8SIGkJqbCNq6l8R6ILjLTilvKhT9YGnskqPAh2jk',
        apiUrl: 'https://sheets.googleapis.com/v4/spreadsheets',
        // ✅ เพิ่มการระบุ sheet name ที่ชัดเจน
        sheetName: 'ลูกค้าให้ติดต่อกลับ' // ← เปลี่ยนเป็น Sheet1 ก่อน (ค่าเริ่มต้นของ Google Sheets)
      };
      
      // ✅ แก้ไข logic การเช็ค - ตอนนี้จะทำงานได้แล้ว
      if (!this.config.apiKey || !this.config.spreadsheetId) {
        console.warn('⚠️ Google Sheets configuration incomplete. Please set apiKey and spreadsheetId.');
        this.isConfigured = false;
        return;
      }
      
      this.isConfigured = true;
      console.log('✅ Google Sheets configuration loaded');
      console.log(`📊 Target sheet: ${this.config.sheetName}`);
      console.log(`📊 Spreadsheet ID: ${this.config.spreadsheetId}`);
      this.initializeSheet();
    }

    async initializeSheet() {
      try {
        const hasHeaders = await this.checkHeaders();
        if (!hasHeaders) {
          await this.createHeaders();
          console.log('✅ Headers created successfully');
        } else {
          console.log('✅ Sheet is ready');
        }
      } catch (error) {
        console.error('❌ Error initializing sheet:', error);
      }
    }

    async checkHeaders() {
      try {
        console.log(`🔍 Checking headers in sheet: ${this.config.sheetName}`);
        const response = await fetch(
          `${this.config.apiUrl}/${this.config.spreadsheetId}/values/${this.config.sheetName}!A1:A1?key=${this.config.apiKey}`
        );
        
        console.log(`📡 API Response status: ${response.status}`);
        
        if (!response.ok) {
          if (response.status === 400) {
            console.log('⚠️ Sheet might not exist, will create headers');
            return false;
          }
          if (response.status === 403) {
            console.error('❌ Permission denied - check API key and spreadsheet sharing');
            return false;
          }
          console.log('⚠️ Sheet not accessible, will create headers');
          return false;
        }
        
        const data = await response.json();
        const hasHeaders = data.values && data.values.length > 0 && data.values[0][0] === 'Timestamp';
        console.log(`📊 Headers found: ${hasHeaders}`);
        return hasHeaders;
      } catch (error) {
        console.error('❌ Error checking headers:', error);
        return false;
      }
    }

    async createHeaders() {
      console.log(`📝 Creating headers in sheet: ${this.config.sheetName}`);
      
      const headers = [
        'Timestamp', 'Customer ID', 'Name', 'Phone', 'Message', 'Visit ID', 'Session ID',
        'First Visit', 'Visit Count', 'Landing Page', 'Referrer', 'UTM Source',
        'UTM Medium', 'UTM Campaign', 'Session Duration (sec)', 'Max Scroll Depth (%)',
        'User Agent', 'Screen Resolution', 'Timezone', 'Language', 'Status',
        'Customer Type', 'Notes'
      ];

      const requestBody = {
        range: `${this.config.sheetName}!A1:W1`,
        majorDimension: 'ROWS',
        values: [headers]
      };

      try {
        const response = await fetch(
          `${this.config.apiUrl}/${this.config.spreadsheetId}/values/${this.config.sheetName}!A1:W1?valueInputOption=RAW&key=${this.config.apiKey}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
          }
        );

        console.log(`📡 Create headers response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Create headers error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to create headers: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Headers created successfully:', result);
        return true;
      } catch (error) {
        console.error('❌ Error creating headers:', error);
        throw error;
      }
    }

    normalizePhoneNumber(phone) {
      if (!phone) return '';
      
      const numbersOnly = phone.toString().replace(/[^\d]/g, '');
      
      if (numbersOnly.startsWith('0')) {
        return '+66' + numbersOnly.substring(1);
      }
      
      if (numbersOnly.startsWith('66')) {
        return '+' + numbersOnly;
      }
      
      if (numbersOnly.length >= 9 && numbersOnly.length <= 10) {
        return '+66' + (numbersOnly.startsWith('0') ? numbersOnly.substring(1) : numbersOnly);
      }
      
      return phone.toString();
    }

    async findExistingCustomer(phone) {
      try {
        const normalizedPhone = this.normalizePhoneNumber(phone);
        console.log(`🔍 Looking for existing customer with phone: ${normalizedPhone}`);
        
        const response = await fetch(
          `${this.config.apiUrl}/${this.config.spreadsheetId}/values/${this.config.sheetName}!D:D?key=${this.config.apiKey}`
        );

        if (!response.ok) {
          console.log(`⚠️ Could not search existing customers: ${response.status}`);
          return null;
        }

        const data = await response.json();
        
        if (!data.values || data.values.length <= 1) {
          console.log('ℹ️ No existing customers found in sheet');
          return null;
        }

        for (let i = 1; i < data.values.length; i++) {
          const existingPhone = this.normalizePhoneNumber(data.values[i][0] || '');
          if (existingPhone === normalizedPhone) {
            console.log(`✅ Found existing customer at row ${i + 1}`);
            return {
              rowIndex: i + 1,
              phone: existingPhone
            };
          }
        }

        console.log('ℹ️ No matching phone number found');
        return null;
      } catch (error) {
        console.error('❌ Error finding existing customer:', error);
        return null;
      }
    }

    async addNewCustomer(contactData, trackingData) {
      try {
        const timestamp = new Date().toISOString();
        
        const rowData = [
          timestamp, 
          contactData.customerId || '', 
          contactData.name || '', 
          contactData.phone || '', 
          contactData.message || '', 
          trackingData.visitId || '', 
          trackingData.sessionId || '',
          trackingData.firstVisit || '', 
          trackingData.visitCount || 1, 
          trackingData.landingPage || '',
          trackingData.referrer || '', 
          trackingData.utmSource || '', 
          trackingData.utmMedium || '',
          trackingData.utmCampaign || '', 
          trackingData.sessionDuration || 0, 
          trackingData.maxScrollDepth || 0,
          trackingData.userAgent || '', 
          trackingData.screenResolution || '', 
          trackingData.timezone || '',
          trackingData.language || '', 
          'New Lead', 
          'New Customer',
          contactData.message || 'ขอให้โทรกลับ - จากฟอร์มด่วน'
        ];

        console.log('📝 Adding new customer to sheets:', {
          name: contactData.name,
          phone: contactData.phone,
          customerId: contactData.customerId,
          sheetName: this.config.sheetName
        });

        const requestBody = {
          range: `${this.config.sheetName}!A:W`,
          majorDimension: 'ROWS',
          values: [rowData]
        };

        console.log('📡 Sending request to Google Sheets API...');
        const url = `${this.config.apiUrl}/${this.config.spreadsheetId}/values/${this.config.sheetName}!A:W:append?valueInputOption=RAW&key=${this.config.apiKey}`;
        console.log('📡 Request URL:', url);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        console.log(`📡 Response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ API Error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to add new customer: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ New customer added successfully to Google Sheets:', result);
        
        return { success: true, range: result.updates.updatedRange, isNewCustomer: true };

      } catch (error) {
        console.error('❌ Error adding new customer:', error);
        throw error;
      }
    }

    async updateExistingCustomer(existingCustomer, contactData, trackingData) {
      try {
        const timestamp = new Date().toISOString();
        const rowIndex = existingCustomer.rowIndex;

        console.log('📝 Updating existing customer in sheets:', {
          name: contactData.name,
          phone: contactData.phone,
          customerId: contactData.customerId,
          rowIndex: rowIndex,
          sheetName: this.config.sheetName
        });

        const updates = [
          {
            range: `${this.config.sheetName}!A${rowIndex}`,
            values: [[timestamp]]
          },
          {
            range: `${this.config.sheetName}!B${rowIndex}`,
            values: [[contactData.customerId || '']]
          },
          {
            range: `${this.config.sheetName}!I${rowIndex}`,
            values: [[trackingData.visitCount || 1]]
          },
          {
            range: `${this.config.sheetName}!V${rowIndex}`,
            values: [['Returning Customer']]
          },
          {
            range: `${this.config.sheetName}!W${rowIndex}`,
            values: [[`[${new Date().toLocaleString('th-TH')}] ${contactData.message || 'ขอให้โทรกลับ'}`]]
          }
        ];

        const batchUpdateBody = {
          valueInputOption: 'RAW',
          data: updates
        };

        console.log('📡 Sending batch update to Google Sheets...');
        const response = await fetch(
          `${this.config.apiUrl}/${this.config.spreadsheetId}/values:batchUpdate?key=${this.config.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchUpdateBody)
          }
        );

        console.log(`📡 Batch update response status: ${response.status}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Batch update error: ${response.status} - ${errorText}`);
          throw new Error(`Failed to update existing customer: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Existing customer updated successfully in Google Sheets');
        
        return { success: true, rowIndex: rowIndex, isNewCustomer: false };

      } catch (error) {
        console.error('❌ Error updating existing customer:', error);
        throw error;
      }
    }

    async saveCustomerData(contactData) {
      try {
        if (!this.isConfigured) {
          throw new Error('Google Sheets configuration incomplete. Please check apiKey and spreadsheetId.');
        }

        console.log('🔄 Saving customer data to Google Sheets...');
        const trackingData = window.userTracker ? window.userTracker.getAllTrackingData() : {};
        const existingCustomer = await this.findExistingCustomer(contactData.phone);

        let result;
        if (existingCustomer) {
          result = await this.updateExistingCustomer(existingCustomer, contactData, trackingData);
          console.log(`✅ Updated existing customer: ${contactData.name} (${contactData.phone})`);
        } else {
          result = await this.addNewCustomer(contactData, trackingData);
          console.log(`✅ Added new customer: ${contactData.name} (${contactData.phone})`);
        }

        return result;

      } catch (error) {
        console.error('❌ Error saving customer data:', error);
        
        let pendingSubmissions = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
        pendingSubmissions.push({
          contactData,
          timestamp: new Date().toISOString(),
          error: error.message
        });
        localStorage.setItem('pendingSubmissions', JSON.stringify(pendingSubmissions));
        
        throw error;
      }
    }
  }

  // ===== FIREBASE CONTACT SYSTEM WITH UID MANAGEMENT =====
  class FirebaseContactSystem {
    constructor() {
      this.isFirebaseReady = false;
      this.initializeFirebase();
    }

    initializeFirebase() {
      // เช็คว่า Firebase SDK ถูก load แล้วหรือไม่
      if (typeof firebase !== 'undefined') {
        try {
          this.db = firebase.firestore();
          this.isFirebaseReady = true;
          console.log('✅ Firebase initialized successfully');
          
          // ✅ Test Firebase connection
          this.testFirebaseConnection();
        } catch (error) {
          console.error('❌ Firebase initialization failed:', error);
          console.warn('⚠️ Please make sure Firebase is properly configured');
        }
      } else {
        console.warn('⚠️ Firebase SDK not found. Please include Firebase in your HTML.');
      }
    }

    // ✅ Test Firebase connection
    async testFirebaseConnection() {
      try {
        console.log('🔄 Testing Firebase connection...');
        await this.db.collection('test').doc('connection').set({
          test: true,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('✅ Firebase connection test successful');
      } catch (error) {
        console.error('❌ Firebase connection test failed:', error);
        console.warn('⚠️ Please check Firestore rules - they might be blocking writes');
      }
    }

    async handleContactFormSubmission(formData) {
      try {
        console.log('🔄 Handling contact form submission...');
        
        const contactData = {
          name: formData.name,
          phone: this.normalizePhoneNumber(formData.phone),
          message: formData.message || 'ขอให้โทรกลับ - จากฟอร์มด่วน'
        };

        console.log('📝 Contact data:', contactData);

        if (!contactData.name || !contactData.phone) {
          throw new Error('กรุณากรอกชื่อและเบอร์โทรศัพท์');
        }

        if (!this.isValidPhoneNumber(contactData.phone)) {
          throw new Error('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ไทย (08xxxxxxxx)');
        }

        // 1. จัดการ UID ใน Firebase
        console.log('🔄 Creating or updating customer in Firebase...');
        const customerRecord = await this.createOrUpdateCustomer(contactData);
        
        // 2. เพิ่ม UID เข้าไปใน contactData
        contactData.customerId = customerRecord.customerId;
        contactData.isNewCustomer = customerRecord.isNewCustomer;

        console.log('📝 Customer record:', customerRecord);

        // 3. ส่งข้อมูลไป Google Sheets (รวม UID)
        console.log('🔄 Saving to Google Sheets...');
        const sheetsResult = await window.googleSheetsManager.saveCustomerData(contactData);

        // Google Analytics Event (ถ้ามี)
        if (typeof gtag !== 'undefined') {
          gtag('event', 'contact_form_submit', {
            event_category: 'engagement',
            event_label: 'quick_contact',
            value: 1,
            custom_parameters: {
              customer_type: customerRecord.isNewCustomer ? 'new' : 'returning',
              customer_id: customerRecord.customerId
            }
          });
        }

        console.log('✅ Form submission completed successfully');

        return { 
          success: true, 
          isNewCustomer: customerRecord.isNewCustomer,
          customerId: customerRecord.customerId,
          method: 'firebase_and_sheets'
        };

      } catch (error) {
        console.error('❌ Error handling contact form:', error);
        throw error;
      }
    }

    async createOrUpdateCustomer(contactData) {
      if (!this.isFirebaseReady) {
        console.warn('⚠️ Firebase not ready, using fallback UID');
        return {
          customerId: 'local_' + Date.now(),
          isNewCustomer: true
        };
      }

      try {
        console.log('🔄 Looking for existing customer...');
        const trackingData = window.userTracker ? window.userTracker.getAllTrackingData() : {};
        
        const existingCustomer = await this.findCustomerByPhone(contactData.phone);

        if (existingCustomer) {
          console.log('👤 Found existing customer:', existingCustomer.id);
          await this.updateCustomerRecord(existingCustomer.id, contactData, trackingData);
          console.log(`✅ Updated existing customer: ${contactData.name} (ID: ${existingCustomer.id})`);
          
          return {
            customerId: existingCustomer.id,
            isNewCustomer: false
          };
        } else {
          console.log('👤 Creating new customer...');
          const newCustomerId = await this.createNewCustomer(contactData, trackingData);
          console.log(`✅ Created new customer: ${contactData.name} (ID: ${newCustomerId})`);
          
          return {
            customerId: newCustomerId,
            isNewCustomer: true
          };
        }

      } catch (error) {
        console.error('❌ Error in createOrUpdateCustomer:', error);
        return {
          customerId: 'fallback_' + Date.now(),
          isNewCustomer: true
        };
      }
    }

    async findCustomerByPhone(phone) {
      try {
        const normalizedPhone = this.normalizePhoneNumber(phone);
        console.log('🔍 Searching for phone:', normalizedPhone);
        
        const querySnapshot = await this.db.collection('customers')
          .where('phone', '==', normalizedPhone)
          .limit(1)
          .get();

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          console.log('✅ Found existing customer');
          return {
            id: doc.id,
            data: doc.data()
          };
        }

        console.log('ℹ️ No existing customer found');
        return null;
      } catch (error) {
        console.error('❌ Error finding customer by phone:', error);
        return null;
      }
    }

    async createNewCustomer(contactData, trackingData) {
      try {
        const customerData = {
          name: contactData.name,
          phone: contactData.phone,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          contactCount: 1,
          firstContact: {
            message: contactData.message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            trackingData: trackingData
          },
          latestContact: {
            message: contactData.message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          },
          status: 'new_lead',
          source: 'website_contact_form'
        };

        console.log('📝 Creating new customer in Firebase...');
        const docRef = await this.db.collection('customers').add(customerData);
        
        await this.addContactHistory(docRef.id, contactData.message, trackingData);
        
        console.log('✅ New customer created in Firebase:', docRef.id);
        return docRef.id;
      } catch (error) {
        console.error('❌ Error creating new customer:', error);
        throw error;
      }
    }

    async updateCustomerRecord(customerId, contactData, trackingData) {
      try {
        console.log('📝 Updating customer record in Firebase...');
        
        await this.db.collection('customers').doc(customerId).update({
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          contactCount: firebase.firestore.FieldValue.increment(1),
          latestContact: {
            message: contactData.message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
          },
          status: 'returning_contact'
        });

        await this.addContactHistory(customerId, contactData.message, trackingData);
        console.log('✅ Customer record updated in Firebase');
        
      } catch (error) {
        console.error('❌ Error updating customer record:', error);
        throw error;
      }
    }

    async addContactHistory(customerId, message, trackingData) {
      try {
        await this.db.collection('customers').doc(customerId).collection('contactHistory').add({
          message: message,
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          trackingData: trackingData,
          source: 'website_contact_form'
        });
        console.log('✅ Contact history added');
      } catch (error) {
        console.error('❌ Error adding contact history:', error);
      }
    }

    normalizePhoneNumber(phone) {
      if (!phone) return '';
      
      const numbersOnly = phone.toString().replace(/[^\d]/g, '');
      
      if (numbersOnly.startsWith('0')) {
        return '+66' + numbersOnly.substring(1);
      }
      
      if (numbersOnly.startsWith('66')) {
        return '+' + numbersOnly;
      }
      
      if (numbersOnly.length >= 9 && numbersOnly.length <= 10) {
        return '+66' + (numbersOnly.startsWith('0') ? numbersOnly.substring(1) : numbersOnly);
      }
      
      return phone.toString();
    }

    isValidPhoneNumber(phone) {
      const normalizedPhone = this.normalizePhoneNumber(phone);
      return /^\+66[0-9]{8,9}$/.test(normalizedPhone);
    }
  }

  // ===== INITIALIZATION =====
  console.log('🚀 Initializing YuJin Contact System...');
  
  const userTracker = new UserTracker();
  const googleSheetsManager = new DirectGoogleSheetsManager();
  const firebaseContactSystem = new FirebaseContactSystem();

  // Export to global scope
  window.userTracker = userTracker;
  window.googleSheetsManager = googleSheetsManager;
  window.firebaseContactSystem = firebaseContactSystem;

  console.log('✅ All systems initialized');

  // ===== TESTIMONIAL CAROUSEL =====
  function getCardWidth() {
    if (track && track.children.length > 0) {
      const firstCard = track.children[0];
      const trackStyle = window.getComputedStyle(track);
      
      const cardWidth = firstCard.offsetWidth;
      const gapValue = trackStyle.gap;
      
      let gap = 32;
      if (gapValue.includes('rem')) {
        const remValue = parseFloat(gapValue);
        const fontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        gap = remValue * fontSize;
      } else if (gapValue.includes('px')) {
        gap = parseInt(gapValue);
      }
      
      return cardWidth + gap;
    }
    return 382;
  }

  function getCardToShow() {
    if (!wrapper) return 1;
    const containerWidth = wrapper.clientWidth;
    const cardWidth = getCardWidth();
    const cardsToShow = Math.floor(containerWidth / cardWidth);
    
    const maxCards = window.innerWidth > 768 ? 3 : 1;
    return Math.min(Math.max(1, cardsToShow), maxCards);
  }

  function getMaxIndex() {
    if (!track) return 0;
    const totalCards = track.children.length;
    const cardToShow = getCardToShow();
    return Math.max(0, totalCards - cardToShow);
  }

  function updateCarousel() {
    if (!track) return;
    
    const currentMaxIndex = getMaxIndex();

    if (currentIndex >= currentMaxIndex) {
      currentIndex = currentMaxIndex;
    }
    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const cardWidth = getCardWidth();
    const translateX = -currentIndex * cardWidth;

    track.style.transform = `translateX(${translateX}px)`;

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex >= currentMaxIndex;
  }

  // Carousel event listeners
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const currentMaxIndex = getMaxIndex();
      if (currentIndex < currentMaxIndex) {
        currentIndex++;
        updateCarousel();
      }
    });
  }

  updateCarousel();

  window.addEventListener('resize', () => {
    currentIndex = 0;
    updateCarousel();
  });
});

// ===== AOS ANIMATION =====
if (typeof AOS !== 'undefined') {
  AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true
  });
}

// ===== HEADER SCROLL EFFECT =====
window.addEventListener('scroll', function() {
  const header = document.getElementById('header');
  if (header) {
    if (window.scrollY > 100) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
});

// ===== CONTACT FORM HANDLING =====
const quickContactForm = document.getElementById('quickContactForm');
if (quickContactForm) {
  quickContactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    console.log('📝 Form submitted');
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton ? submitButton.textContent : 'ส่งข้อมูล';
    
    try {
      if (submitButton) {
        submitButton.textContent = 'กำลังส่งข้อมูล...';
        submitButton.disabled = true;
      }

      const name = document.getElementById('quickName')?.value.trim();
      const phone = document.getElementById('quickPhone')?.value.trim();

      console.log('📝 Form data:', { name, phone });

      // ตรวจสอบ reCAPTCHA (ถ้ามี)
      if (typeof grecaptcha !== 'undefined') {
        const recaptchaResponse = grecaptcha.getResponse();
        if (!recaptchaResponse) {
          throw new Error('กรุณายืนยัน reCAPTCHA');
        }
      }

      if (!name || !phone) {
        throw new Error('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      }

      const contactData = {
        name: name,
        phone: phone,
        message: 'ขอให้โทรกลับ - จากฟอร์มด่วน'
      };

      console.log('🔄 Sending to Firebase contact system...');
      const result = await window.firebaseContactSystem.handleContactFormSubmission(contactData);

      if (result.success) {
        console.log('✅ Form submission successful:', result);
        
        const modal = document.getElementById('successModal');
        if (modal) {
          modal.style.display = 'flex';
        } else {
          alert(`✅ ส่งข้อมูลเรียบร้อยแล้ว! 
Customer ID: ${result.customerId}
${result.isNewCustomer ? 'ลูกค้าใหม่' : 'ลูกค้าเก่า'}
เราจะติดต่อกลับไปในเร็วๆ นี้`);
        }
        
        this.reset();
        
        // Reset reCAPTCHA (ถ้ามี)
        if (typeof grecaptcha !== 'undefined') {
          grecaptcha.reset();
        }
      }

    } catch (error) {
      console.error('❌ Error submitting contact form:', error);
      alert('❌ เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      if (submitButton) {
        submitButton.textContent = originalText;
        submitButton.disabled = false;
      }
    }
  });
}

// ===== MODAL FUNCTIONS =====
function closeSuccessModal() {
  const modal = document.getElementById('successModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function openChat() {
  window.open('https://line.me/ti/p/@yujinfilm', '_blank');
}

// ===== SMOOTH SCROLLING =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// Export global functions
window.closeSuccessModal = closeSuccessModal;
window.openChat = openChat;