document.addEventListener('DOMContentLoaded', function() {
  const track = document.getElementById('testimonialTrack');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const wrapper = document.querySelector('.testimonial-wrapper');
  
  let currentIndex = 0;

  function getCardWidth() {
    if (track.children.length > 0) {
      const firstCard = track.children[0];
      const trackStyle = window.getComputedStyle(track);
      
      // ดึงค่าจาก CSS จริง
      const cardWidth = firstCard.offsetWidth; // 350px
      const gapValue = trackStyle.gap; // "2rem"
      
      // แปลง rem เป็น px
      let gap = 32; // default
      if (gapValue.includes('rem')) {
        const remValue = parseFloat(gapValue);
        const fontSize = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        gap = remValue * fontSize;
      } else if (gapValue.includes('px')) {
        gap = parseInt(gapValue);
      }
      
      console.log('Card Width:', cardWidth, 'Gap:', gap, 'Total:', cardWidth + gap);
      return cardWidth + gap;
    }
    return 382; // fallback
  }

  function getCardToShow() {
    const containerWidth = wrapper.clientWidth; // ใช้ clientWidth แทน offsetWidth
    const cardWidth = getCardWidth();
    const cardsToShow = Math.floor(containerWidth / cardWidth);
    
    console.log('Container width:', containerWidth, 'Cards to show:', cardsToShow);

    const maxCards = window.innerWidth > 768 ? 3 : 1;
    const finalCardToShow = Math.min(Math.max(1, cardsToShow), maxCards);

    console.log('Final cards to show:', finalCardToShow);
    return finalCardToShow;
  }

  function getMaxIndex() {
    const totalCards = track.children.length;
    const cardToShow = getCardToShow();
    const calculatedMaxIndex = Math.max(0, totalCards - cardToShow);

    console.log('=== Calculation Summary ===');
    console.log('Total cards:', totalCards);
    console.log('Cards to show:', cardToShow);
    console.log('Max index:', calculatedMaxIndex);
    console.log('========================');

    return calculatedMaxIndex
  };

  function updateCarousel() {
    const currentMaxIndex = getMaxIndex();

    if (currentIndex >= currentMaxIndex) {
      currentIndex = currentMaxIndex;
    }
    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const cardWidth = getCardWidth();
    const translateX = -currentIndex * cardWidth;

    console.log('Current index:', currentIndex, 'Max index:', currentMaxIndex, 'Translate X:', translateX);
    track.style.transform = `translateX(${translateX}px)`;

    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= currentMaxIndex;

    console.log('Buttons - Prev disabled:', prevBtn.disabled, 'Next disabled:', nextBtn.disabled);
  }

  prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
      currentIndex--;
      console.log('Previous clicked, new index:', currentIndex);
      updateCarousel();
    }
  });

  nextBtn.addEventListener('click', () => {
    const currentMaxIndex = getMaxIndex();
    if (currentIndex < currentMaxIndex) {
      currentIndex++;
      console.log('Next clicked, new index:', currentIndex);
      updateCarousel();
    }
  });

  console.log('=== Initializing Carousel ===');
  console.log('Window width:', window.innerWidth);
  updateCarousel();

  window.addEventListener('resize', () => {
    console.log('=== Window Resized ===');
    console.log('New window width:', window.innerWidth);
    currentIndex = 0;
    updateCarousel();
  });
});

AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true
});

// Header scroll effect
window.addEventListener('scroll', function() {
  const header = document.getElementById('header');
  if (window.scrollY > 100) {
    header.classList.add('scrolled');
  } else {
    header.classList.remove('scrolled');
  }
});

// Quick Contact Form
document.getElementById('quickContactForm').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const name = document.getElementById('quickName').value;
  const phone = document.getElementById('quickPhone').value;
  
  if (name && phone) {
    // Simulate API call
    console.log('Contact form submitted:', { name, phone });
    
    // Show success modal
    const modal = document.getElementById('successModal');
    modal.style.display = 'flex';
    
    // Reset form
    this.reset();
  }
});

// Close Success Modal
function closeSuccessModal() {
  document.getElementById('successModal').style.display = 'none';
}

// Chat function
function openChat() {
  // Simulate opening Line or other chat platform
  window.open('https://line.me/ti/p/@yujinfilm', '_blank');
}

// Smooth scrolling for anchor links
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