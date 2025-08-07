// ===== FIREBASE CHAT SYSTEM =====
class ChatSystem {
  constructor() {
    this.currentUser = null;
    this.chatRef = null;
    this.messagesRef = null;
    this.isOpen = false;
    this.isInitialized = false;
    this.unsubscribeAuth = null;
    
    this.init();
  }

  async init() {
    try {
      // Wait for Firebase to be available
      if (typeof firebase === 'undefined') {
        console.error('Firebase not loaded');
        return;
      }

      // Initialize Firebase Realtime Database
      this.database = firebase.database();
      this.auth = firebase.auth();
      
      // Set up authentication listener
      this.unsubscribeAuth = this.auth.onAuthStateChanged((user) => {
        this.handleAuthStateChange(user);
      });

      this.setupEventListeners();
      this.isInitialized = true;
      console.log('💬 Chat system initialized');
    } catch (error) {
      console.error('Failed to initialize chat system:', error);
    }
  }

  setupEventListeners() {
    // Chat button click
    const chatButton = document.querySelector('.chat-button');
    if (chatButton) {
      chatButton.addEventListener('click', () => this.toggleChat());
    }

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.isOpen) {
        this.adjustChatPosition();
      }
    });
  }

  handleAuthStateChange(user) {
    if (user) {
      this.currentUser = user;
      this.setupChatRoom();
      console.log('👤 User authenticated for chat:', user.uid);
    } else {
      // Sign in anonymously for chat
      this.signInAnonymously();
    }
  }

  async signInAnonymously() {
    try {
      const result = await this.auth.signInAnonymously();
      console.log('👤 Anonymous user signed in for chat:', result.user.uid);
    } catch (error) {
      console.error('Failed to sign in anonymously:', error);
    }
  }

  setupChatRoom() {
    if (!this.currentUser) return;

    // Create or get chat room reference
    this.chatRef = this.database.ref(`chats/${this.currentUser.uid}`);
    this.messagesRef = this.chatRef.child('messages');

    // Listen for new messages
    this.messagesRef.on('child_added', (snapshot) => {
      this.displayMessage(snapshot.val(), snapshot.key);
    });

    // Initialize chat room if it doesn't exist
    this.chatRef.once('value', (snapshot) => {
      if (!snapshot.exists()) {
        this.chatRef.set({
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          userId: this.currentUser.uid,
          status: 'active'
        });

        // Send welcome message
        setTimeout(() => {
          this.sendSystemMessage('สวัสดีครับ! ยินดีต้อนรับสู่ YuJin Film Solutions 🎬\nมีอะไรให้ช่วยเหลือไหมครับ?');
        }, 1000);
      }
    });
  }

  toggleChat() {
    if (!this.isInitialized) {
      console.error('Chat system not initialized yet');
      return;
    }

    if (this.isOpen) {
      this.closeChat();
    } else {
      this.openChat();
    }
  }

  openChat() {
    this.createChatUI();
    this.isOpen = true;
    
    // Add animation class
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      setTimeout(() => {
        chatContainer.classList.add('chat-open');
      }, 10);
    }

    // Track chat open event
    if (window.trackEvent) {
      window.trackEvent('chat_opened', { timestamp: new Date().toISOString() });
    }
  }

  closeChat() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer) {
      chatContainer.classList.remove('chat-open');
      setTimeout(() => {
        chatContainer.remove();
        this.isOpen = false;
      }, 300);
    }
  }

  createChatUI() {
    // Remove existing chat if any
    const existingChat = document.getElementById('chatContainer');
    if (existingChat) {
      existingChat.remove();
    }

    const chatHTML = `
      <div id="chatContainer" class="chat-container">
        <div class="chat-header">
          <div class="chat-title">
            <div class="chat-avatar">
              <img src="/img/logo.png" alt="YuJin Film" />
            </div>
            <div class="chat-info">
              <h4>YuJin Film Solutions</h4>
              <span class="chat-status online">พร้อมให้บริการ</span>
            </div>
          </div>
          <button class="chat-close-btn" onclick="chatSystem.closeChat()">×</button>
        </div>
        
        <div class="chat-messages" id="chatMessages">
          <div class="message-loading">
            <div class="loading-dots">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
        
        <div class="chat-input-container">
          <div class="chat-input-wrapper">
            <input 
              type="text" 
              id="chatInput" 
              placeholder="พิมพ์ข้อความ..."
              maxlength="500"
            />
            <button id="chatSendBtn" class="chat-send-btn">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', chatHTML);
    this.setupChatEventListeners();
    this.loadRecentMessages();
  }

  setupChatEventListeners() {
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');

    if (chatInput && sendBtn) {
      // Send message on Enter
      chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });

      // Send message on button click
      sendBtn.addEventListener('click', () => this.sendMessage());

      // Auto-focus input
      setTimeout(() => chatInput.focus(), 100);
    }
  }

  async sendMessage() {
    const input = document.getElementById('chatInput');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.value = '';

    try {
      await this.messagesRef.push({
        text: message,
        sender: 'user',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        userId: this.currentUser.uid
      });

      // Track message sent
      if (window.trackEvent) {
        window.trackEvent('chat_message_sent', { 
          messageLength: message.length,
          timestamp: new Date().toISOString()
        });
      }

      // Simulate admin response (in real implementation, this would be handled by admin panel)
      setTimeout(() => {
        this.simulateAdminResponse(message);
      }, 1000 + Math.random() * 2000);

    } catch (error) {
      console.error('Failed to send message:', error);
      this.showErrorMessage('ไม่สามารถส่งข้อความได้ กรุณาลองใหม่อีกครั้ง');
    }
  }

  simulateAdminResponse(userMessage) {
    // Simple auto-response logic (replace with actual admin system)
    let response = 'ขอบคุณสำหรับข้อความครับ ทีมงานจะตอบกลับโดยเร็วที่สุด 🙏';

    if (userMessage.includes('ราคา') || userMessage.includes('ค่าใช้จ่าย')) {
      response = 'สำหรับราคาฟิล์ม ขึ้นอยู่กับรุ่นรถและประเภทฟิล์มที่เลือกครับ คุณสามารถกดปุ่ม "จองคิว" เพื่อรับใบเสนอราคาได้เลยครับ 💰';
    } else if (userMessage.includes('จอง') || userMessage.includes('นัด')) {
      response = 'สามารถจองคิวได้ที่ปุ่ม "จองคิว" ด้านบนครับ หรือโทร 083-865-0007 เพื่อนัดหมายเลยครับ 📅';
    } else if (userMessage.includes('รับประกัน')) {
      response = 'ฟิล์มของเรามีรับประกัน 7 ปีเต็มครับ ไม่ลอก ไม่มัว ไม่พอง รับประกันคุณภาพ 💯';
    } else if (userMessage.includes('ที่อยู่') || userMessage.includes('พื้นที่')) {
      response = 'เราให้บริการพื้นที่กรุงเทพฯ และปริมณฑลครับ มีบริการติดตั้งถึงบ้านฟรี! 🚗';
    }

    this.sendSystemMessage(response);
  }

  sendSystemMessage(message) {
    if (!this.messagesRef) return;

    this.messagesRef.push({
      text: message,
      sender: 'admin',
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      senderName: 'YuJin Film Support'
    });
  }

  loadRecentMessages() {
    if (!this.messagesRef) return;

    // Load last 50 messages
    this.messagesRef.limitToLast(50).once('value', (snapshot) => {
      const messagesContainer = document.getElementById('chatMessages');
      if (messagesContainer) {
        // Clear loading
        messagesContainer.innerHTML = '';
        
        if (snapshot.exists()) {
          snapshot.forEach((childSnapshot) => {
            this.displayMessage(childSnapshot.val(), childSnapshot.key);
          });
        }
        this.scrollToBottom();
      }
    });
  }

  displayMessage(messageData, messageId) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${messageData.sender}`;
    messageElement.setAttribute('data-message-id', messageId);

    const timestamp = messageData.timestamp ? 
      new Date(messageData.timestamp).toLocaleTimeString('th-TH', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : '';

    const senderName = messageData.sender === 'admin' ? 
      (messageData.senderName || 'YuJin Film') : 'คุณ';

    messageElement.innerHTML = `
      <div class="message-content">
        <div class="message-header">
          <span class="sender-name">${senderName}</span>
          <span class="message-time">${timestamp}</span>
        </div>
        <div class="message-text">${this.formatMessage(messageData.text)}</div>
      </div>
    `;

    messagesContainer.appendChild(messageElement);
    this.scrollToBottom();

    // Add animation
    setTimeout(() => {
      messageElement.classList.add('message-appear');
    }, 10);
  }

  formatMessage(text) {
    // Convert line breaks to HTML
    return text.replace(/\n/g, '<br>');
  }

  showErrorMessage(error) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const errorElement = document.createElement('div');
    errorElement.className = 'message error';
    errorElement.innerHTML = `
      <div class="message-content">
        <div class="message-text">${error}</div>
      </div>
    `;

    messagesContainer.appendChild(errorElement);
    this.scrollToBottom();

    // Remove error message after 5 seconds
    setTimeout(() => {
      errorElement.remove();
    }, 5000);
  }

  scrollToBottom() {
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  adjustChatPosition() {
    const chatContainer = document.getElementById('chatContainer');
    if (chatContainer && window.innerWidth <= 768) {
      // Full screen on mobile
      chatContainer.style.position = 'fixed';
      chatContainer.style.inset = '0';
    }
  }

  destroy() {
    if (this.unsubscribeAuth) {
      this.unsubscribeAuth();
    }
    if (this.messagesRef) {
      this.messagesRef.off();
    }
    this.closeChat();
  }
}

// Initialize chat system when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Wait a bit for Firebase to be fully loaded
  setTimeout(() => {
    window.chatSystem = new ChatSystem();
  }, 1000);
});

// Global function for HTML onclick
function openChat() {
  if (window.chatSystem) {
    window.chatSystem.openChat();
  }
}