// Image Upload Handler for Building Service
// Handles image preview and file management for building film service

class ImageUploadHandler {
  constructor() {
    this.uploadedImages = [];
    this.init();
  }

  // Initialize image upload handler
  init() {
    console.log('📷 Initializing Image Upload Handler...');
    this.setupImageUploadListeners();
    console.log('✅ Image Upload Handler initialized');
  }

  // Setup image upload event listeners
  setupImageUploadListeners() {
    const imageInput = document.getElementById('buildingImages');
    if (imageInput) {
      imageInput.addEventListener('change', (e) => {
        this.handleImageUpload(e);
      });
    }

    // Setup drag and drop
    const uploadArea = document.querySelector('.upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
      });

      uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
      });

      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        this.processFiles(files);
      });
    }
  }

  // Handle image upload
  handleImageUpload(event) {
    const files = event.target.files;
    this.processFiles(files);
  }

  // Process uploaded files
  processFiles(files) {
    Array.from(files).forEach(file => {
      if (this.validateFile(file)) {
        this.previewImage(file);
      }
    });
  }

  // Validate file
  validateFile(file) {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPEG, PNG, GIF, WebP)');
      return false;
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('ขนาดไฟล์ต้องไม่เกิน 5MB');
      return false;
    }

    // Check max number of images (max 10)
    if (this.uploadedImages.length >= 10) {
      alert('สามารถอัพโหลดได้สูงสุด 10 รูป');
      return false;
    }

    return true;
  }

  // Preview image
  previewImage(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-preview-container';
      imageContainer.innerHTML = `
        <div class="image-preview">
          <img src="${e.target.result}" alt="Preview" />
          <button class="remove-image" onclick="window.imageUploadHandler.removeImage('${file.name}', this)">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="image-name">${file.name}</div>
      `;
      
      const imagesGrid = document.getElementById('imagesGrid');
      if (imagesGrid) {
        imagesGrid.appendChild(imageContainer);
      }

      // Store file data
      this.uploadedImages.push({
        file: file,
        name: file.name,
        size: file.size,
        type: file.type,
        dataUrl: e.target.result
      });

      // Update upload status
      this.updateUploadStatus();

      // Track image upload
      if (window.bookingTracker) {
        window.bookingTracker.trackUserAction('image_uploaded', {
          filename: file.name,
          filesize: file.size,
          total_images: this.uploadedImages.length
        });
      }
    };

    reader.readAsDataURL(file);
  }

  // Remove image
  removeImage(filename, buttonElement) {
    // Remove from uploaded images array
    this.uploadedImages = this.uploadedImages.filter(img => img.name !== filename);

    // Remove from DOM
    const container = buttonElement.closest('.image-preview-container');
    if (container) {
      container.remove();
    }

    // Update upload status
    this.updateUploadStatus();

    // Track image removal
    if (window.bookingTracker) {
      window.bookingTracker.trackUserAction('image_removed', {
        filename: filename,
        remaining_images: this.uploadedImages.length
      });
    }
  }

  // Update upload status
  updateUploadStatus() {
    const statusElement = document.querySelector('.upload-status');
    if (statusElement) {
      if (this.uploadedImages.length === 0) {
        statusElement.textContent = 'ยังไม่มีรูปภาพ';
      } else {
        statusElement.textContent = `อัพโหลดแล้ว ${this.uploadedImages.length} รูป`;
      }
    }

    // Update file input to reflect current state
    const fileInput = document.getElementById('buildingImages');
    if (fileInput && this.uploadedImages.length === 0) {
      fileInput.value = '';
    }
  }

  // Get uploaded images data
  getUploadedImages() {
    return this.uploadedImages;
  }

  // Clear all images
  clearAllImages() {
    this.uploadedImages = [];
    const imagesGrid = document.getElementById('imagesGrid');
    if (imagesGrid) {
      imagesGrid.innerHTML = '';
    }
    this.updateUploadStatus();
  }

  // Compress image (optional enhancement)
  compressImage(file, quality = 0.8, maxWidth = 1200) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  }

  // Convert images to base64 for form submission
  async getImagesAsBase64() {
    return this.uploadedImages.map(img => ({
      name: img.name,
      type: img.type,
      size: img.size,
      data: img.dataUrl
    }));
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  window.imageUploadHandler = new ImageUploadHandler();
});

// Export for global use
window.ImageUploadHandler = ImageUploadHandler;

console.log('✅ Image Upload Handler loaded');