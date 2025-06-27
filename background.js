let devConsoleTabId = null;
let lastActiveTabId = null;
let shortcutEnabled = true;  // Default state

// Initialize shortcut state from storage
chrome.storage.local.get({ shortcutEnabled: true }, function(result) {
  shortcutEnabled = result.shortcutEnabled;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.shortcutEnabled) {
    shortcutEnabled = changes.shortcutEnabled.newValue;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.url && tab.url.includes('_ui/common/apex/debug/ApexCSIPage')) {
    devConsoleTabId = tabId;
    lastActiveTabId = tabId;
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  if (shortcutEnabled && devConsoleTabId && 
      activeInfo.tabId !== devConsoleTabId && 
      lastActiveTabId === devConsoleTabId) {
    chrome.tabs.sendMessage(devConsoleTabId, { action: "triggerShortcut" });
  }
  lastActiveTabId = activeInfo.tabId;
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (shortcutEnabled && devConsoleTabId && 
      windowId !== chrome.windows.WINDOW_ID_NONE) {
    const tab = await chrome.tabs.get(devConsoleTabId);
    if (tab.windowId !== windowId && lastActiveTabId === devConsoleTabId) {
      chrome.tabs.sendMessage(devConsoleTabId, { action: "triggerShortcut" });
    }
  }
});