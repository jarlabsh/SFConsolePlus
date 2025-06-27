function getBrowserAPI() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
      return chrome;
    }
    if (typeof browser !== 'undefined') {
      return browser;
    }
    return null;
  }
  
  document.addEventListener('DOMContentLoaded', function() {
    const toggle = document.getElementById('shortcutToggle');
    const browserAPI = getBrowserAPI();
    
    if (!browserAPI) {
      console.error('Browser API not available');
      return;
    }
  
    // Load initial state
    browserAPI.storage.local.get({ shortcutEnabled: true }, function(result) {
      toggle.checked = result.shortcutEnabled;
  });
  
    
    // Handle toggle changes
    toggle.addEventListener('click', function() {
      const newState = toggle.checked;
      
      // First, update storage
      browserAPI.storage.local.set({ shortcutEnabled: newState }, () => {
        // After storage is updated, notify all tabs
        browserAPI.tabs.query({}, function(tabs) {
          tabs.forEach(tab => {
            if (tab.url && tab.url.includes('salesforce.com')) {
              browserAPI.tabs.sendMessage(
                tab.id,
                { action: "updateShortcutState", enabled: newState },
                function(response) {
                    if (browserAPI.runtime.lastError) {
                        console.log(`Error sending message to Tab ${tab.id}:`, browserAPI.runtime.lastError.message);
                    } else {
                        console.log(`Message sent to Tab ${tab.id}:`, response);
                    }
                }
            );            
            }
          });
        });
      });
    });
  });