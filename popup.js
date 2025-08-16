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
  
    function sendMessageToTab(tabId, message, callback) {
      browserAPI.tabs.sendMessage(tabId, message, function(response) {
        if (callback) {
          callback(response);
        }
      });
    }
    
    // Handle toggle changes
    toggle.addEventListener('click', function() {
      const newState = toggle.checked;
      
      // First, update storage
      browserAPI.storage.local.set({ shortcutEnabled: newState }, () => {
        // After storage is updated, notify all tabs
        browserAPI.tabs.query({}, function(tabs) {
          tabs.forEach(tab => {
            if (tab.url && tab.url.includes('salesforce.com')) {
              // Check if tab is still valid before sending message
              browserAPI.tabs.get(tab.id, function(tabInfo) {
                if (!browserAPI.runtime.lastError && tabInfo) {
                  sendMessageToTab(
                    tab.id,
                    { action: "updateShortcutState", enabled: newState },
                    function(response) {
                    }
                  );
                }
              });
            }
          });
        });
      });
    });
    
    const searchSyncToggle = document.getElementById("searchSyncToggle");

    browserAPI.storage.local.get({ searchSyncEnabled: true }, (result) => {
      searchSyncToggle.checked = result.searchSyncEnabled;
    });

    searchSyncToggle.addEventListener("change", () => {
      const newState = searchSyncToggle.checked;

      browserAPI.storage.local.set({ searchSyncEnabled: newState }, () => {
        browserAPI.tabs.query({ 
          url: "*://*.salesforce.com/*",
          status: "complete"
        }, (tabs) => {
          tabs.forEach((tab) => {
            browserAPI.tabs.get(tab.id, function(tabInfo) {
              if (!browserAPI.runtime.lastError && tabInfo && tabInfo.status === 'complete') {
                sendMessageToTab(
                  tab.id,
                  { action: "updateSearchSyncState", enabled: newState }
                );
              }
            });
          });
        });
      });
    });
  });