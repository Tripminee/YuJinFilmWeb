// Booking Availability Management Service
// Manages real-time availability checking with Firestore

class AvailabilityService {
  constructor() {
    this.db = null;
    this.availabilityCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.maxBookingsPerSlot = 2; // Maximum bookings per time slot
    this.timeSlots = [
      '09:00', '10:00', '11:00', '12:00', 
      '13:00', '14:00', '15:00', '16:00', '17:00'
    ];
    
    this.init();
  }

  // Initialize service
  init() {
    console.log('🕒 Initializing Availability Service...');
    
    // Get Firebase instance
    this.db = window.yuJinFirebase?.db || null;
    
    if (!this.db) {
      console.warn('⚠️ Firebase not available, using mock data');
      console.info('ℹ️ System will work in offline mode - bookings will be saved locally');
    } else {
      console.log('✅ Firebase Firestore connected');
      // Test connection
      this.testFirestoreConnection();
    }
    
    console.log('✅ Availability Service initialized');
  }

  // Test Firestore connection
  async testFirestoreConnection() {
    try {
      console.log('🔥 Testing Firestore connection...');
      const testRef = this.db.collection('bookings').limit(1);
      const snapshot = await testRef.get();
      console.log(`✅ Firestore connected - found ${snapshot.size} booking(s) in collection`);
      
      // Log existing bookings for debugging
      if (!snapshot.empty) {
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log('📋 Sample booking:', {
            id: doc.id,
            date: data.date,
            time: data.time,
            status: data.status
          });
        });
      }
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Firestore permissions denied - availability system will use fallback mode');
        console.info('ℹ️ Bookings will still work but availability checking will use mock data');
      } else {
        console.error('❌ Firestore connection test failed:', error);
      }
    }
  }

  // Get cache key for date and time
  getCacheKey(date, time = null) {
    return time ? `${date}_${time}` : date;
  }

  // Check if cache is valid
  isCacheValid(cacheEntry) {
    return cacheEntry && (Date.now() - cacheEntry.timestamp) < this.cacheExpiry;
  }

  // Get bookings for a specific date and time
  async getBookingCount(date, timeSlot) {
    try {
      const cacheKey = this.getCacheKey(date, timeSlot);
      const cachedData = this.availabilityCache.get(cacheKey);
      
      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return cachedData.count;
      }

      if (!this.db) {
        // Mock data for testing when Firebase is not available
        return Math.floor(Math.random() * 3); // Random 0-2
      }

      // Query Firestore for bookings on this date and time
      console.log(`🔍 Checking bookings for date: ${date}, time: ${timeSlot}`);
      const bookingsRef = this.db.collection('bookings')
        .where('date', '==', date)
        .where('time', '==', timeSlot)
        .where('status', '!=', 'cancelled');

      const snapshot = await bookingsRef.get();
      const count = snapshot.size;

      console.log(`📊 Found ${count} bookings for ${date} at ${timeSlot}`);
      
      // Log booking details for debugging
      if (count > 0) {
        snapshot.forEach(doc => {
          const booking = doc.data();
          console.log(`📋 Booking: ${booking.name} - ${booking.phone} - Status: ${booking.status}`);
        });
      }

      // Cache the result
      this.availabilityCache.set(cacheKey, {
        count: count,
        timestamp: Date.now()
      });

      return count;

    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Firestore permissions denied - using fallback availability check');
        // Return mock availability when permissions are denied
        return Math.floor(Math.random() * 2); // 0 or 1 (always some availability)
      } else {
        console.error('❌ Error getting booking count:', error);
      }
      return 0; // Default to available if error
    }
  }

  // Get availability for all time slots on a specific date
  async getDateAvailability(date) {
    try {
      const cacheKey = this.getCacheKey(date);
      const cachedData = this.availabilityCache.get(cacheKey);
      
      // Return cached data if valid
      if (this.isCacheValid(cachedData)) {
        return cachedData.availability;
      }

      const availability = {};

      // Check availability for each time slot
      const promises = this.timeSlots.map(async (timeSlot) => {
        const count = await this.getBookingCount(date, timeSlot);
        return {
          time: timeSlot,
          available: count < this.maxBookingsPerSlot,
          count: count,
          remaining: Math.max(0, this.maxBookingsPerSlot - count)
        };
      });

      const results = await Promise.all(promises);
      
      // Build availability object
      results.forEach(result => {
        availability[result.time] = result;
      });

      // Cache the result
      this.availabilityCache.set(cacheKey, {
        availability: availability,
        timestamp: Date.now()
      });

      return availability;

    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn('⚠️ Firestore permissions denied - using mock availability data');
      } else {
        console.error('❌ Error getting date availability:', error);
      }
      return this.getMockAvailability(); // Fallback to mock data
    }
  }

  // Check if a specific date has any available slots
  async isDateAvailable(date) {
    try {
      const availability = await this.getDateAvailability(date);
      
      // Check if any time slot is available
      return Object.values(availability).some(slot => slot.available);

    } catch (error) {
      console.error('❌ Error checking date availability:', error);
      return true; // Default to available if error
    }
  }

  // Get availability for multiple dates (for calendar display)
  async getMultipleDateAvailability(dates) {
    try {
      const promises = dates.map(async (date) => {
        const isAvailable = await this.isDateAvailable(date);
        return { date, available: isAvailable };
      });

      const results = await Promise.all(promises);
      const availability = {};
      
      results.forEach(result => {
        availability[result.date] = result.available;
      });

      return availability;

    } catch (error) {
      console.error('❌ Error getting multiple date availability:', error);
      return {};
    }
  }

  // Reserve a time slot (called when booking is made)
  async reserveTimeSlot(date, timeSlot) {
    try {
      if (!this.db) {
        console.warn('⚠️ Firebase not available, cannot reserve slot');
        return true;
      }

      // Check if slot is still available
      const currentCount = await this.getBookingCount(date, timeSlot);
      
      if (currentCount >= this.maxBookingsPerSlot) {
        throw new Error(`Time slot ${timeSlot} on ${date} is fully booked`);
      }

      // The actual booking will be created by BookingFormHandler
      // This method just validates availability

      // Invalidate cache for this date and time
      this.invalidateCache(date, timeSlot);
      
      return true;

    } catch (error) {
      console.error('❌ Error reserving time slot:', error);
      throw error;
    }
  }

  // Invalidate cache for a specific date/time
  invalidateCache(date, timeSlot = null) {
    if (timeSlot) {
      const cacheKey = this.getCacheKey(date, timeSlot);
      this.availabilityCache.delete(cacheKey);
    }
    
    // Also invalidate the date-level cache
    const dateCacheKey = this.getCacheKey(date);
    this.availabilityCache.delete(dateCacheKey);
  }

  // Clear all cache
  clearCache() {
    this.availabilityCache.clear();
    console.log('🗑️ Availability cache cleared');
  }

  // Get mock availability data (for testing)
  getMockAvailability() {
    const availability = {};
    
    this.timeSlots.forEach(timeSlot => {
      const count = Math.floor(Math.random() * 3);
      availability[timeSlot] = {
        time: timeSlot,
        available: count < this.maxBookingsPerSlot,
        count: count,
        remaining: Math.max(0, this.maxBookingsPerSlot - count)
      };
    });

    return availability;
  }

  // Get time slot status text
  getTimeSlotStatusText(slotData) {
    if (!slotData.available) {
      return 'เต็ม';
    } else if (slotData.remaining === 1) {
      return 'เหลือ 1 ที่';
    } else {
      return 'ว่าง';
    }
  }

  // Get time slot status class
  getTimeSlotStatusClass(slotData) {
    if (!slotData.available) {
      return 'full';
    } else if (slotData.remaining === 1) {
      return 'almost-full';
    } else {
      return 'available';
    }
  }

  // Listen to real-time updates (for advanced implementation)
  listenToAvailabilityUpdates(date, callback) {
    if (!this.db) {
      console.warn('⚠️ Firebase not available, cannot listen to updates');
      return null;
    }

    try {
      // Listen to bookings collection for real-time updates
      const unsubscribe = this.db.collection('bookings')
        .where('date', '==', date)
        .where('status', '!=', 'cancelled')
        .onSnapshot(
          () => {
            console.log('📡 Real-time availability update for', date);
            
            // Invalidate cache for this date
            this.invalidateCache(date);
            
            // Notify callback
            if (callback) {
              callback(date);
            }
          },
          (error) => {
            console.error('❌ Error listening to availability updates:', error);
          }
        );

      return unsubscribe;

    } catch (error) {
      console.error('❌ Error setting up availability listener:', error);
      return null;
    }
  }

  // Get business hours configuration
  getBusinessHours() {
    return {
      start: '09:00',
      end: '17:00',
      slots: this.timeSlots,
      maxPerSlot: this.maxBookingsPerSlot,
      break: { start: '12:00', end: '13:00' }, // Optional lunch break
      weekends: true // Allow weekend bookings - work 7 days a week
    };
  }

  // Check if date is within business days
  isBusinessDay() {
    // Work 7 days a week - all days are business days
    return true;
  }

  // Check if date is in the future (not past)
  isFutureDate(date) {
    const today = new Date();
    const checkDate = new Date(date);
    
    // Reset time to compare dates only
    today.setHours(0, 0, 0, 0);
    checkDate.setHours(0, 0, 0, 0);
    
    return checkDate >= today;
  }

  // Debug method: Get all bookings
  async getAllBookings() {
    if (!this.db) {
      console.warn('⚠️ Firebase not available');
      return [];
    }

    try {
      const snapshot = await this.db.collection('bookings').get();
      const bookings = [];
      snapshot.forEach(doc => {
        bookings.push({
          id: doc.id,
          ...doc.data()
        });
      });
      console.log(`📊 Total bookings in database: ${bookings.length}`);
      return bookings;
    } catch (error) {
      console.error('❌ Error getting all bookings:', error);
      return [];
    }
  }

  // Debug method: Create test booking
  async createTestBooking(date, time) {
    if (!this.db) {
      console.warn('⚠️ Firebase not available');
      return false;
    }

    const testBooking = {
      date: date,
      time: time,
      name: 'Test Booking',
      phone: '0801234567',
      email: 'test@example.com',
      service: 'car',
      status: 'pending',
      submissionTime: new Date().toISOString(),
      source: 'test_data'
    };

    try {
      const docRef = await this.db.collection('bookings').add(testBooking);
      console.log('✅ Test booking created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating test booking:', error);
      return false;
    }
  }

  // Validate date for booking
  isValidBookingDate(date) {
    return this.isFutureDate(date) && this.isBusinessDay(date);
  }
}

// Initialize availability service
window.availabilityService = new AvailabilityService();

// Export for global use
window.AvailabilityService = AvailabilityService;

console.log('✅ Availability Service loaded');