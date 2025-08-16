let shortcutEnabled = true;
let isReady = false;

function initializeContentScript() {
  chrome.storage.local.get({ shortcutEnabled: true }, function(result) {
    shortcutEnabled = result.shortcutEnabled;
  });
  
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
  };
  (document.head || document.documentElement).appendChild(script);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

window.addEventListener('message', (event) => {
  if (event.data?.type === 'requestSearchSyncState') {
    chrome.storage.local.get({ searchSyncEnabled: true }, result => {
      window.postMessage({ type: 'searchSyncToggleUpdate', value: result.searchSyncEnabled }, '*');
    });
  }
});

chrome.storage.local.get({ searchSyncEnabled: true }, result => {
  window.postMessage({ type: 'searchSyncToggleUpdate', value: result.searchSyncEnabled }, '*');
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "updateShortcutState") {
      shortcutEnabled = request.enabled;
      sendResponse({ status: "shortcut updated", ready: isReady });
      return true;

    } else if (request.action === "updateSearchSyncState") {
      chrome.storage.local.set({ searchSyncEnabled : request.enabled });
      // Notify injected.js
      window.postMessage({ type: 'searchSyncToggleUpdate', value: request.enabled }, '*');
      
      sendResponse({ status: "search sync updated", ready: isReady });
      return true;

    } else if (request.action === "triggerShortcut" &&
               window.location.href.includes('_ui/common/apex/debug/ApexCSIPage')) {
      triggerShortcut();
      sendResponse({ status: "shortcut triggered", ready: isReady });
      return true;
    }
    
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ status: "error", error: error.message });
    return true;
  }
});

document.addEventListener('visibilitychange', () => {
  if (shortcutEnabled &&
      document.hidden &&
      window.location.href.includes('_ui/common/apex/debug/ApexCSIPage')) {
    triggerShortcut();
  }
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
    const activeElement = document.activeElement || document.body;
    activeElement.dispatchEvent(event);
  });
}