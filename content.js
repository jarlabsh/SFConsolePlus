let shortcutEnabled = true;  
const script = document.createElement('script');

script.src = chrome.runtime.getURL('injected.js');
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Initialize shortcut state from storage
chrome.storage.local.get({ shortcutEnabled: true }, function(result) {
  shortcutEnabled = result.shortcutEnabled;
});

function triggerShortcut() {
  if (!shortcutEnabled) return; 
  
  const events = [
    new KeyboardEvent('keydown', {
      key: 'g',
      keyCode: 71,
      which: 71,
      code: 'KeyG',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true
    }),
    new KeyboardEvent('keyup', {
      key: 'g',
      keyCode: 71,
      which: 71,
      code: 'KeyG',
      altKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true
    })
  ];

  events.forEach(event => {
    // window.dispatchEvent(event);
    // document.dispatchEvent(event);
    const activeElement = document.activeElement || document.body;
    activeElement.dispatchEvent(event);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateShortcutState") {
    shortcutEnabled = request.enabled;
    sendResponse({ status: "updated" });
  } else if (request.action === "triggerShortcut" && 
             window.location.href.includes('_ui/common/apex/debug/ApexCSIPage')) {
    triggerShortcut();
  }
});

document.addEventListener('visibilitychange', () => {
  if (shortcutEnabled && 
      document.hidden && 
      window.location.href.includes('_ui/common/apex/debug/ApexCSIPage')) {
    triggerShortcut();
  }
});
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('shortcutToggle');
  const browserAPI = getBrowserAPI();

  // Load initial state
  browserAPI.storage.local.get({ shortcutEnabled: true }, function(result) {
    toggle.checked = result.shortcutEnabled;
  });
  
  toggle.addEventListener('click', function() {
    const newState = toggle.checked;
    
    browserAPI.storage.local.set({ shortcutEnabled: newState }, () => {
      
      browserAPI.tabs.query({}, function(tabs) {
        tabs.forEach(tab => {
          if (tab.url && tab.url.includes('salesforce.com')) {
            browserAPI.tabs.sendMessage(
              tab.id,
              { action: "updateShortcutState", enabled: newState }
            );            
          }
        });
      });
    });
  });
});

