document.addEventListener('DOMContentLoaded', function() {
  // ===== USER ID MANAGEMENT =====
  function getUserId() {
    let userId = localStorage.getItem('yujin_user_id');
    
    if (!userId) {
      // สร้าง User ID ใหม่ถ้ายังไม่มี
      userId = 'USER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('yujin_user_id', userId);
      localStorage.setItem('yujin_first_visit', new Date().toISOString());
      console.log('🆕 New user created:', userId);
    } else {
      console.log('👤 Returning user:', userId);
    }
    
    // อัพเดตเวลาเข้าชมล่าสุด
    localStorage.setItem('yujin_last_visit', new Date().toISOString());
    
    return userId;
  }
  
  // เรียกใช้ getUserId เมื่อโหลดหน้า
  const currentUserId = getUserId();
  window.currentUserId = currentUserId;

  // ===== FIREBASE CONFIGURATION =====
  const firebaseConfig = {
      apiKey: "AIzaSyAxrPxDwiuOaYIaumBPIfo-I4pwus7Xq80",
      authDomain: "yujin-film-solutions.firebaseapp.com",
      projectId: "yujin-film-solutions",
      storageBucket: "yujin-film-solutions.firebasestorage.app",
      messagingSenderId: "505666612467",
      appId: "1:505666612467:web:887cd0404bcf66186a9b86",
      measurementId: "G-H69SZK5WKK"
    };

  // Initialize Firebase
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    console.log('🔥 Firebase initialized');
    
    // ฟังก์ชันสร้าง Anonymous User ใน Firebase
    async function createFirebaseUser(userData) {
      try {
        // สร้าง Anonymous User
        const userCredential = await auth.signInAnonymously();
        const firebaseUID = userCredential.user.uid;
        
        console.log('🔥 Firebase User created:', firebaseUID);
        
        // เก็บ Firebase UID ใน localStorage
        localStorage.setItem('yujin_firebase_uid', firebaseUID);
        
        return firebaseUID;
      } catch (error) {
        console.error('❌ Firebase Auth Error:', error);
        return null;
      }
    }
    
    window.createFirebaseUser = createFirebaseUser;
  } else {
    console.warn('⚠️ Firebase SDK not loaded');
  }
  
  const track = document.getElementById('testimonialTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const wrapper = document.querySelector('.testimonial-wrapper');
  
  let currentIndex = 0;

  // ===== GOOGLE APPS SCRIPT MANAGER (เรียบง่าย) =====
  class SimpleContactManager {
    constructor() {
      // ⭐ ใส่ Google Apps Script URL ที่ deploy แล้ว
      this.scriptUrl = 'https://script.google.com/macros/s/AKfycbzHm4R10RM0jXeKqzKRlfdQLo62tOF_BLELr8ZHftkgdMjJNjBwjcdTmgYv7C1m5dOf/exec';
      
      if (!this.scriptUrl || this.scriptUrl === '') {
        console.warn('⚠️ กรุณาใส่ Google Apps Script URL');
      } else {
        console.log('✅ Contact manager ready with URL:', this.scriptUrl);
      }
    }
    
    async submitContact(contactData) {
      try {
        if (!this.scriptUrl || this.scriptUrl === '') {
          throw new Error('กรุณาใส่ Google Apps Script URL ในโค้ด');
        }

        console.log('🔄 ส่งข้อมูลไป Google Sheet...');
        
        if (contactData.phone.length < 10) {
          throw new Error('กรุณาใส่เบอร์โทรให้ถูกต้อง')
        }

        // สร้าง Firebase UID
        let firebaseUID = localStorage.getItem('yujin_firebase_uid');
        if (!firebaseUID && window.createFirebaseUser) {
          console.log('🔥 Creating Firebase user...');
          firebaseUID = await window.createFirebaseUser({
            name: contactData.name,
            phone: contactData.phone
          });
        }

        // เตรียมข้อมูลส่ง
        const dataToSend = {
          name: contactData.name,
          phone: contactData.phone,
          message: contactData.message || 'ขอให้โทรกลับ - จากฟอร์มด่วน',
          customerId: 'customer_' + Date.now(),
          userId: window.currentUserId || 'unknown',
          firebaseUID: firebaseUID || 'not_created',
          source: 'website_contact_form',
          timestamp: new Date().toISOString()
        };

        console.log('📤 ข้อมูลที่ส่ง:', dataToSend);

        const response = await fetch(this.scriptUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(dataToSend)
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', response.headers);

        let result;
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          result = await response.json();
        } else {
          const text = await response.text();
          console.log('📡 Response text:', text);
          
          // Try to parse as JSON even if content-type is not set correctly
          try {
            result = JSON.parse(text);
          } catch (e) {
            console.error('❌ Failed to parse response as JSON:', e);
            result = { success: true, message: text };
          }
        }

        console.log('✅ ผลลัพธ์:', result);
        return result;

      } catch (error) {
        console.error('❌ Error:', error);
        throw error;
      }
    }
  }

  // สร้าง instance
  const contactManager = new SimpleContactManager();
  window.contactManager = contactManager;

  console.log('✅ Simple contact system initialized');

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

// ===== CONTACT FORM HANDLING (เรียบง่าย) =====
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

      if (!name || !phone) {
        throw new Error('กรุณากรอกชื่อและเบอร์โทรศัพท์');
      }

      const contactData = {
        name: name,
        phone: phone,
        message: 'ขอให้โทรกลับ - จากฟอร์มด่วน'
      };

      // ส่งข้อมูลไป Google Apps Script โดยตรง
      console.log('🔄 ส่งข้อมูลไป Google Sheet...');
      const result = await window.contactManager.submitContact(contactData);

      if (result.success) {
        console.log('✅ ส่งข้อมูลสำเร็จ:', result);
        
        const modal = document.getElementById('successModal');
        if (modal) {
          modal.style.display = 'flex';

          setTimeout(() => {
            modal.style.display = 'none';
          }, 3000);

        } else {
          alert(`✅ ส่งข้อมูลเรียบร้อยแล้ว! 
          Customer ID: ${result.customerId}
          เราจะติดต่อกลับไปในเร็วๆ นี้`);
        }
        
        this.reset();
      } else {
        throw new Error(result.message || 'ไม่สามารถส่งข้อมูลได้');
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