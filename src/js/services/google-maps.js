// Google Maps Service for Booking Location
// Handles map initialization, location picking, and geocoding

class GoogleMapsService {
  constructor() {
    this.map = null;
    this.marker = null;
    this.geocoder = null;
    this.autocomplete = null;
    this.defaultLocation = { lat: 13.7563, lng: 100.5018 }; // Bangkok center
  }

  // Initialize Google Maps
  init() {
    console.log('🗺️ Initializing Google Maps...');
    
    // Check if Google Maps API is loaded
    if (typeof google === 'undefined' || !google.maps) {
      console.error('❌ Google Maps API not loaded');
      this.handleMapError();
      return;
    }
    
    // Check if map container exists
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('❌ Map container not found');
      return;
    }
    
    console.log('📍 Map container found, creating map...');
    
    try {
      this.map = new google.maps.Map(mapContainer, {
        center: this.defaultLocation,
        zoom: 15,
        styles: [
          {
            "featureType": "poi",
            "elementType": "labels",
            "stylers": [{ "visibility": "off" }]
          }
        ],
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false
      });
      
      console.log('✅ Map initialized successfully');
      
      this.geocoder = new google.maps.Geocoder();
      
      // Initialize search autocomplete
      this.initSearchBox();
      
      // Add map click listener
      this.initMapClickListener();
      
      console.log('✅ Map click listener added');
      
      // Try to get current location
      this.getCurrentLocation();
      
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      this.handleMapError();
    }
  }

  // Initialize search autocomplete
  initSearchBox() {
    const searchBox = document.getElementById('searchAddress');
    if (searchBox) {
      this.autocomplete = new google.maps.places.Autocomplete(searchBox, {
        componentRestrictions: { country: 'th' }
      });
      
      this.autocomplete.addListener('place_changed', () => {
        const place = this.autocomplete.getPlace();
        if (place.geometry) {
          this.map.setCenter(place.geometry.location);
          this.map.setZoom(17);
          this.placeMarker(place.geometry.location);
        }
      });
      console.log('✅ Search autocomplete initialized');
    }
  }

  // Initialize map click listener
  initMapClickListener() {
    this.map.addListener('click', (e) => {
      console.log('🎯 Map clicked at:', e.latLng.lat(), e.latLng.lng());
      this.placeMarker(e.latLng);
      
      // Track map click if tracking is available
      if (window.yuJinTracking && window.yuJinTracking.trackEvent) {
        window.yuJinTracking.trackEvent('map_click', {
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng()
        });
      }
    });
  }

  // Place marker on map
  placeMarker(location) {
    console.log('📍 Placing marker at:', location.lat(), location.lng());
    
    try {
      // Remove existing marker
      if (this.marker) {
        this.marker.setMap(null);
        console.log('🗑️ Removed existing marker');
      }
      
      // Create new marker
      this.marker = new google.maps.Marker({
        position: location,
        map: this.map,
        animation: google.maps.Animation.DROP
      });
      
      console.log('✅ Marker placed successfully');
      
      const lat = location.lat();
      const lng = location.lng();
      
      // Update form fields
      this.updateLocationFields(lat, lng);
      
      // Get address from coordinates
      this.reverseGeocode(location);
      
    } catch (error) {
      console.error('❌ Error placing marker:', error);
    }
  }

  // Update location input fields
  updateLocationFields(lat, lng) {
    const latField = document.getElementById('latitude');
    const lngField = document.getElementById('longitude');
    
    if (latField) latField.value = lat;
    if (lngField) lngField.value = lng;
    
    // Show and update LatLong display
    const latLongDisplay = document.getElementById('latLongDisplay');
    const latLongText = document.getElementById('latLongText');
    
    if (latLongDisplay && latLongText) {
      latLongDisplay.style.display = 'block';
      latLongText.value = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      console.log('✅ LatLng display updated:', latLongText.value);
    }
  }

  // Reverse geocoding to get address
  reverseGeocode(location) {
    this.geocoder.geocode({ location: location }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const fullAddress = results[0].formatted_address;
        
        // Update search address field
        const searchField = document.getElementById('searchAddress');
        if (searchField) {
          searchField.value = fullAddress;
        }
        
        // Update address detail field if empty
        this.updateAddressDetail(results[0]);
        
        console.log('✅ Search address updated:', fullAddress);
      } else {
        console.log('⚠️ Geocoding failed:', status);
      }
    });
  }

  // Update address detail field
  updateAddressDetail(result) {
    const addressDetailField = document.getElementById('addressDetail');
    if (addressDetailField && !addressDetailField.value.trim()) {
      const addressComponents = result.address_components;
      let detailParts = [];
      
      // Extract useful parts of the address
      addressComponents.forEach(component => {
        const types = component.types;
        if (types.includes('street_number')) {
          detailParts.push(component.long_name);
        } else if (types.includes('route')) {
          detailParts.push(component.long_name);
        } else if (types.includes('sublocality_level_1') || types.includes('locality')) {
          detailParts.push(component.long_name);
        }
      });
      
      // Use specific components or fall back to full address
      if (detailParts.length > 0) {
        addressDetailField.value = detailParts.join(' ');
      } else {
        addressDetailField.value = result.formatted_address;
      }
      
      console.log('✅ Address detail updated:', addressDetailField.value);
    }
  }

  // Get current user location
  getCurrentLocation() {
    console.log('📍 Attempting to get current location...');
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('✅ Location obtained:', position.coords.latitude, position.coords.longitude);
          
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          this.map.setCenter(pos);
          this.map.setZoom(17);
          this.placeMarker(new google.maps.LatLng(pos.lat, pos.lng));
        },
        (error) => {
          console.log('⚠️ Location access error:', error.message);
          console.log('ℹ️ Map will use default Bangkok location');
          
          // Track geolocation error
          if (window.yuJinTracking && window.yuJinTracking.trackEvent) {
            window.yuJinTracking.trackEvent('geolocation_error', {
              error: error.message,
              code: error.code
            });
          }
        }
      );
    } else {
      console.log('⚠️ Geolocation not supported');
    }
  }

  // Handle map initialization errors
  handleMapError() {
    console.log('🛠️ Setting up map fallback...');
    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 300px; background: #f3f4f6; border-radius: 8px;">
          <div style="text-align: center; color: #6b7280; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🗺️</div>
            <div style="font-size: 18px; margin-bottom: 8px; font-weight: 500;">ไม่สามารถโหลดแผนที่ได้</div>
            <div style="font-size: 14px; color: #9ca3af; margin-bottom: 12px;">กรุณาระบุที่อยู่ในช่องค้นหาด้านบน</div>
            <button onclick="window.initMap()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      `;
    }
    
    // Enable manual address input
    const searchBox = document.getElementById('searchAddress');
    if (searchBox) {
      searchBox.placeholder = 'กรอกที่อยู่ของคุณ (แผนที่ไม่สามารถใช้งานได้)';
      searchBox.style.borderColor = '#f59e0b';
      searchBox.style.backgroundColor = '#fef3c7';
    }
  }

  // Get current marker position
  getMarkerPosition() {
    if (this.marker) {
      const position = this.marker.getPosition();
      return {
        lat: position.lat(),
        lng: position.lng()
      };
    }
    return null;
  }

  // Check if marker is placed
  hasMarker() {
    return this.marker !== null;
  }
}

// Global initialization function for Google Maps callback
window.initMap = function() {
  if (window.googleMapsService) {
    window.googleMapsService.init();
  } else {
    window.googleMapsService = new GoogleMapsService();
    window.googleMapsService.init();
  }
};

// Handle Google Maps authentication failures
window.gm_authFailure = function() {
  console.error('❌ Google Maps authentication failed');
  alert('ไม่สามารถโหลดแผนที่ได้ กรุณาลองใหม่อีกครั้ง');
};

// Note: initMap is now defined in booking.html before this script loads

// Export for global use
window.GoogleMapsService = GoogleMapsService;

console.log('✅ Google Maps Service loaded');