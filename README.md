# YuJin Film Solution Web Application

## Project Structure

```
YuJinFilmWeb/
├── public/               # Static HTML files
│   ├── index.html       # Homepage
│   ├── booking.html     # Booking page
│   └── test.html        # Test page
│
├── src/                 # Source code
│   ├── js/             # JavaScript modules
│   │   ├── config/     # Configuration files
│   │   │   └── firebase-config.js
│   │   ├── features/   # Feature-specific modules
│   │   │   └── chat/
│   │   │       └── chat.js
│   │   ├── pages/      # Page-specific scripts
│   │   │   └── index.js
│   │   ├── services/   # External service integrations
│   │   │   ├── firebase.js
│   │   │   └── tracking.js
│   │   └── utils/      # Utility functions
│   │       └── common.js
│   ├── css/            # Stylesheets
│   └── assets/         # Images and other assets
```

## Module Organization

### Core Utilities (`src/js/utils/common.js`)
- User management functions
- Form validation and utilities
- Date/time formatting
- UI helper functions
- Device detection
- Animation utilities

### Firebase Service (`src/js/services/firebase.js`)
- Firebase initialization
- Authentication management
- Firestore database operations
- User creation and management

### Tracking Service (`src/js/services/tracking.js`)
- User behavior tracking
- Event logging
- Session management
- Analytics data collection

### Usage

All modules are loaded in the following order in HTML files:
1. Firebase SDK
2. Common utilities
3. Firebase service
4. Tracking service
5. Page-specific scripts

### Example HTML Import
```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js"></script>

<!-- Core Utilities -->
<script src="../src/js/utils/common.js"></script>
<script src="../src/js/services/firebase.js"></script>
<script src="../src/js/services/tracking.js"></script>

<!-- Page-specific scripts -->
<script src="../src/js/pages/index.js" defer></script>
```