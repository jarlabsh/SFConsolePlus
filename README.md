# Salesforce Console Plus

This Chrome extension enhances the Salesforce Developer Console UI by rendering a custom, searchable, and sortable table of Apex test coverage.
Not affiliated with or endorsed by Salesforce.  
This extension uses internal Salesforce APIs and libraries.
Intended for chromium based browsers

## 🧩 Features

- Shows Apex test class coverage in a fixed panel without lazy loading
- Substring based search
- Instant search with saved filter using `sessionStorage`. Don't have to search again if refreshed 
- Focus on your test class with search and realtime coverage update. Running tests or saving classes won't reset table state
- A clear log panel for prototyping 

## 🚀 Installation

1. Clone or download the repo.
2. Open Chrome/Edge > Extensions (`chrome://extensions/`).
3. Enable **Developer Mode**.
4. Click **Load unpacked**, then select this folder.
5. Open a Salesforce Developer Console or Apex Test view.
6. The coverage panel will appear at the bottom right.

## ⚠️ Permissions

This extension requests access only to Salesforce domains:

```json
"host_permissions": ["https://*.lightning.force.com/*"]
