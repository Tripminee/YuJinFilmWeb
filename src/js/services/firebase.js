// ===== FIREBASE CONFIGURATION AND UTILITIES =====
// Universal Firebase setup for YuJin Film Solution
// Version: 1.0
// Usage: Include after Firebase SDK and before other scripts

class YuJinFirebase {
  constructor() {
    this.config = {
      apiKey: "AIzaSyAxrPxDwiuOaYIaumBPIfo-I4pwus7Xq80",
      authDomain: "yujin-film-solutions.firebaseapp.com",
      projectId: "yujin-film-solutions",
      storageBucket: "yujin-film-solutions.firebasestorage.app",
      messagingSenderId: "505666612467",
      appId: "1:505666612467:web:887cd0404bcf66186a9b86",
      measurementId: "G-H69SZK5WKK"
    };
    
    this.app = null;
    this.auth = null;
    this.db = null;
    this.isInitialized = false;
    
    this.init();
  }
  
  // Initialize Firebase
  init() {
    try {
      if (typeof firebase !== 'undefined') {
        this.app = firebase.initializeApp(this.config);
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.isInitialized = true;
        console.log('🔥 Firebase initialized successfully');
      } else {
        console.warn('⚠️ Firebase SDK not loaded');
      }
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
    }
  }
  
  // Create Firebase user from form data (Universal method)
  async createUser(userData, source = 'form') {
    try {
      // Check for existing UID
      let existingUID = localStorage.getItem('yujin_firebase_uid');
      if (existingUID && !existingUID.startsWith('LOCAL_') && !existingUID.startsWith('PHONE_')) {
        console.log('📌 Using existing Firebase UID:', existingUID);
        return existingUID;
      }
      
      const email = userData.email;
      const cleanPhone = userData.phone.replace(/[-\s]/g, '');
      const password = 'PHONE_' + cleanPhone;
      const phoneNumber = userData.phone;
      
      console.log('🔥 Creating Firebase user with email:', email);
      
      try {
        // Try to create new user
        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        const firebaseUID = userCredential.user.uid;
        
        console.log('✅ Firebase User created:', firebaseUID);
        
        // Save user data to Firestore
        const userDoc = {
          uid: firebaseUID,
          email: email,
          phoneNumber: phoneNumber,
          name: userData.name,
          autoCreated: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          source: source,
          ...userData.additionalData || {}
        };
        
        await this.db.collection('users').doc(firebaseUID).set(userDoc);
        
        // Save to localStorage
        this.saveUserToStorage(firebaseUID, email, phoneNumber, userData.name, source);
        
        return firebaseUID;
        
      } catch (createError) {
        // If email exists, try to login
        if (createError.code === 'auth/email-already-in-use') {
          console.log('🔍 Email exists, trying to login...');
          
          try {
            const loginCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const firebaseUID = loginCredential.user.uid;
            
            console.log('✅ Logged in with existing user:', firebaseUID);
            
            // Update user document
            await this.db.collection('users').doc(firebaseUID).update({
              lastLoginAttempt: firebase.firestore.FieldValue.serverTimestamp(),
              loginSource: source,
              ...userData.additionalData || {}
            });
            
            // Update localStorage
            this.saveUserToStorage(firebaseUID, email, phoneNumber, userData.name, source);
            
            return firebaseUID;
            
          } catch (loginError) {
            console.error('❌ Login failed:', loginError);
            throw loginError;
          }
        } else {
          throw createError;
        }
      }
      
    } catch (error) {
      console.error('❌ Firebase Auth Error:', error);
      
      // Fallback: Email-based UID
      const emailHash = btoa(userData.email).replace(/[^a-zA-Z0-9]/g, '').substring(0, 20);
      const fallbackUID = source.toUpperCase() + '_' + emailHash + '_' + Date.now();
      
      this.saveUserToStorage(fallbackUID, userData.email, userData.phone, userData.name, source + '_fallback');
      
      console.log('⚠️ Using fallback UID:', fallbackUID);
      return fallbackUID;
    }
  }
  
  // Save user to localStorage
  saveUserToStorage(uid, email, phone, name, source) {
    localStorage.setItem('yujin_firebase_uid', uid);
    localStorage.setItem('yujin_user_email', email);
    localStorage.setItem('yujin_user_phone', phone);
    localStorage.setItem('yujin_user_data', JSON.stringify({
      uid: uid,
      email: email,
      phone: phone,
      name: name,
      timestamp: new Date().toISOString(),
      source: source
    }));
  }
  
  // Get current user UID
  getCurrentUserUID() {
    return localStorage.getItem('yujin_firebase_uid');
  }
  
  // Get current user data
  getCurrentUserData() {
    try {
      const userData = localStorage.getItem('yujin_user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Error parsing user data:', error);
      return null;
    }
  }
  
  // Save data to Firestore collection
  async saveToCollection(collectionName, data) {
    try {
      if (!this.isInitialized || !this.db) {
        console.warn('⚠️ Firebase not initialized, cannot save to', collectionName);
        return null;
      }
      
      const docRef = await this.db.collection(collectionName).add({
        ...data,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Data saved to', collectionName, ':', docRef.id);
      return docRef.id;
    } catch (error) {
      if (error.code === 'permission-denied') {
        console.warn(`⚠️ Permission denied for ${collectionName} - data will be saved locally`);
        throw new Error(`Permission denied for ${collectionName}: ${error.message}`);
      } else {
        console.error('❌ Error saving to', collectionName, ':', error);
      }
      return null;
    }
  }
  
  // Update document in Firestore
  async updateDocument(collectionName, docId, data) {
    try {
      if (!this.isInitialized || !this.db) {
        console.warn('⚠️ Firebase not initialized, cannot update', collectionName);
        return false;
      }
      
      await this.db.collection(collectionName).doc(docId).update({
        ...data,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      console.log('✅ Document updated in', collectionName, ':', docId);
      return true;
    } catch (error) {
      console.error('❌ Error updating document:', error);
      return false;
    }
  }
  
  // Get document from Firestore
  async getDocument(collectionName, docId) {
    try {
      if (!this.isInitialized || !this.db) {
        console.warn('⚠️ Firebase not initialized, cannot get document');
        return null;
      }
      
      const doc = await this.db.collection(collectionName).doc(docId).get();
      
      if (doc.exists) {
        return { id: doc.id, ...doc.data() };
      } else {
        console.log('📄 Document not found:', docId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting document:', error);
      return null;
    }
  }
  
  // Query documents from Firestore
  async queryDocuments(collectionName, field, operator, value, limit = 10) {
    try {
      if (!this.isInitialized || !this.db) {
        console.warn('⚠️ Firebase not initialized, cannot query documents');
        return [];
      }
      
      let query = this.db.collection(collectionName).where(field, operator, value);
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      console.log('📄 Found', documents.length, 'documents in', collectionName);
      return documents;
    } catch (error) {
      console.error('❌ Error querying documents:', error);
      return [];
    }
  }
}

// Initialize Firebase instance
const yuJinFirebase = new YuJinFirebase();

// Export to window for global access
window.yuJinFirebase = yuJinFirebase;
window.YuJinFirebase = YuJinFirebase;

console.log('✅ Firebase utilities loaded and ready');