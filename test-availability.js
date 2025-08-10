// Simple test script for YuJin Film Availability System
// Run this in the browser console on booking.html page

console.log('🧪 Testing YuJin Film Availability System...');

// Test 1: Check if services are loaded
async function testServicesLoaded() {
  console.log('\n=== Test 1: Services Loading ===');
  
  const services = [
    'window.availabilityService',
    'window.bookingFormController', 
    'window.yuJinFirebase'
  ];
  
  services.forEach(service => {
    if (eval(service)) {
      console.log(`✅ ${service} loaded`);
    } else {
      console.log(`❌ ${service} not loaded`);
    }
  });
}

// Test 2: Test Firestore connection
async function testFirestoreConnection() {
  console.log('\n=== Test 2: Firestore Connection ===');
  
  if (!window.availabilityService) {
    console.log('❌ Availability service not available');
    return;
  }
  
  try {
    // Get all bookings
    const bookings = await window.availabilityService.getAllBookings();
    console.log(`📊 Total bookings found: ${bookings.length}`);
    
    if (bookings.length > 0) {
      console.log('📋 Recent bookings:');
      bookings.slice(0, 3).forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.name} - ${booking.date} at ${booking.time} (${booking.status})`);
      });
    }
    
    console.log('✅ Firestore connection works');
  } catch (error) {
    console.log('❌ Firestore connection failed:', error.message);
  }
}

// Test 3: Test availability checking
async function testAvailabilityChecking() {
  console.log('\n=== Test 3: Availability Checking ===');
  
  if (!window.availabilityService) {
    console.log('❌ Availability service not available');
    return;
  }
  
  try {
    const testDate = '2025-01-15';
    const testTime = '10:00';
    
    console.log(`🔍 Checking availability for ${testDate} at ${testTime}...`);
    const count = await window.availabilityService.getBookingCount(testDate, testTime);
    console.log(`📊 Current bookings: ${count}/${window.availabilityService.maxBookingsPerSlot}`);
    
    const availability = await window.availabilityService.getDateAvailability(testDate);
    console.log('📅 Date availability:', availability);
    
    console.log('✅ Availability checking works');
  } catch (error) {
    console.log('❌ Availability checking failed:', error.message);
  }
}

// Test 3: Test business logic
async function testBusinessLogic() {
  console.log('\n=== Test 3: Business Logic ===');
  
  if (!window.availabilityService) return;
  
  try {
    const testDate = '2025-01-15';
    const isBusinessDay = window.availabilityService.isBusinessDay(testDate);
    const isFutureDate = window.availabilityService.isFutureDate(testDate);
    const isValidBooking = window.availabilityService.isValidBookingDate(testDate);
    
    console.log(`📊 ${testDate} - Business day: ${isBusinessDay}, Future: ${isFutureDate}, Valid: ${isValidBooking}`);
    
    const businessHours = window.availabilityService.getBusinessHours();
    console.log('🕐 Business hours:', businessHours);
    
    console.log('✅ Business logic works');
  } catch (error) {
    console.log('❌ Business logic failed:', error.message);
  }
}

// Test 4: Test time slot status
async function testTimeSlotStatus() {
  console.log('\n=== Test 4: Time Slot Status ===');
  
  if (!window.availabilityService) return;
  
  try {
    const mockSlotData = {
      time: '10:00',
      available: true,
      count: 1,
      remaining: 1
    };
    
    const statusText = window.availabilityService.getTimeSlotStatusText(mockSlotData);
    const statusClass = window.availabilityService.getTimeSlotStatusClass(mockSlotData);
    
    console.log(`🕐 Slot status: "${statusText}" (${statusClass})`);
    console.log('✅ Time slot status works');
  } catch (error) {
    console.log('❌ Time slot status failed:', error.message);
  }
}

// Test 5: Create test booking
async function createTestBooking() {
  console.log('\n=== Test 5: Create Test Booking ===');
  
  if (!window.availabilityService) {
    console.log('❌ Availability service not available');
    return;
  }
  
  try {
    const testDate = '2025-01-15';
    const testTime = '10:00';
    
    console.log(`📝 Creating test booking for ${testDate} at ${testTime}...`);
    const bookingId = await window.availabilityService.createTestBooking(testDate, testTime);
    
    if (bookingId) {
      console.log(`✅ Test booking created with ID: ${bookingId}`);
      
      // Check availability after creating booking
      const count = await window.availabilityService.getBookingCount(testDate, testTime);
      console.log(`📊 Updated booking count: ${count}`);
    } else {
      console.log('❌ Failed to create test booking');
    }
  } catch (error) {
    console.log('❌ Test booking creation failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting YuJin Film Availability Tests...\n');
  
  await testServicesLoaded();
  await testFirestoreConnection();
  await testAvailabilityChecking();
  await testBusinessLogic();
  await testTimeSlotStatus();
  
  console.log('\n🎯 Want to create a test booking? Run: createTestBooking()');
  console.log('\n✅ All tests completed!');
  console.log('🎯 Real-time availability system is ready for testing');
}

// Export test functions for manual use
window.createTestBooking = createTestBooking;
window.testFirestore = testFirestoreConnection;

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', runAllTests);
} else {
  runAllTests();
}

// Export for manual testing
if (typeof module !== 'undefined') {
  module.exports = { runAllTests };
}