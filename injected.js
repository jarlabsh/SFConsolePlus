(function () {
  if (!apex?.test?.TestResultBrowser?.getAggregateCoveragePercentages) {
    console.error('Coverage data not available.');
    return;
  }

  let currentSortColumn = 'className';
  let currentSortAsc = true;
  let coverageData = [];
  let searchQuery = sessionStorage.getItem('coverageSearchQuery') || '';
  let lastActiveTabText = '';
  let debounceTimeout = null;
  let autoUpdateSearchBox = false;
  let searchSyncEnabled = true;
  
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'searchSyncToggleUpdate') {
      searchSyncEnabled = event.data.value;
    }
  });
  window.postMessage({ type: 'requestSearchSyncState' }, '*');


  function sortData(data, column, ascending = true) {
    return data.slice().sort((a, b) => {
      const valA = a[column];
      const valB = b[column];
      return ascending
        ? String(valA).localeCompare(String(valB), undefined, { numeric: true })
        : String(valB).localeCompare(String(valA), undefined, { numeric: true });
    });
  }

  function hideExtGrid() {
    [
      'aggregateCoverageGrid',
      'aggregateCoverageGrid-body',
      'aggregateCoverageGrid_header',
      'aggregateCoverageGrid_header-body'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.style.display = 'none';
      }
    });
  }

  function getCoverageColor(percent) {
    percent = parseFloat(percent);
    if (percent > 85) return '#b6e3b6';      
    if (percent >= 75) return '#e0f7e0';     
    if (percent >= 65) return '#fbe4e4';     
    return '#f5cccc';                        
  }

  function renderStandaloneTable() {
    hideExtGrid();

    const containerId = 'customCoverageTableContainer';
    let container = document.getElementById(containerId);

    if (!container) {
      const gridCmp = Ext.getCmp('aggregateCoverageGrid');
      const parent = gridCmp?.getEl?.()?.dom?.parentElement;
      if (!parent) {
        console.error('Could not find container to inject table');
        return;
      }
      container = document.createElement('div');
      container.id = containerId;
      container.style.position = 'fixed';
      container.style.right = '0';
      container.style.width = '350px';
      container.style.overflowY = 'auto';
      container.style.overflowX = 'hidden';
      container.style.backgroundColor = '#fff';
      container.style.zIndex = '9999';
      container.style.borderLeft = '1px solid #ccc';
      const hostPanel = document.getElementById('testResultBrowser');
      if (hostPanel) {
        const updateTableHeight = () => {
          const panelHeight = hostPanel.getBoundingClientRect().height;
          container.style.height = panelHeight + 'px';
        };
        updateTableHeight();

        const resizeObserver = new ResizeObserver(updateTableHeight);
        resizeObserver.observe(hostPanel);
      }

      parent.appendChild(container);
    }

    const filtered = coverageData.filter(item => {
      const name = item.className || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const sorted = sortData(filtered, currentSortColumn, currentSortAsc);

    const tableHTML = `
      <table style="width: 100%; table-layout: fixed; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 0.7rem">
        <thead style="position: sticky; top: 0; background-color: #dbe6f1; z-index: 1;">
          <tr>
            <th style="width: 160px; border: 1px solid #ccc; padding-left: 5px; cursor: pointer;" data-sort="className">
              Class ${currentSortColumn === 'className' ? (currentSortAsc ? '▲' : '▼') : ''}
              <input type="text" id="coverageSearchBox" placeholder="Search by class name..."
                style="width: 150px; height:20px; font-size: 0.7rem; margin-left: 4px">
            </th>
            <th style="width: 18%; border: 1px solid #ccc; padding: 6px; cursor: pointer;" data-sort="percent">
              Cov. % ${currentSortColumn === 'percent' ? (currentSortAsc ? '▲' : '▼') : ''}
            </th>
            <th style="width: 16%; border: 1px solid #ccc; padding: 6px;">Lines</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(item => {
            const [coveredStr, totalStr] = item.numLines.split('/');
            const covered = parseInt(coveredStr, 10) || 0;
            const total = parseInt(totalStr, 10) || 1;
            const percent = ((covered / total) * 100).toFixed(1);
            return `
              <tr>
                <td style="width: 160px; border: 1px solid #ccc; padding: 6px;">${item.className}</td>
                <td style="width: 80px; border: 1px solid #ccc; padding: 6px; background: ${getCoverageColor(percent)};">${percent}%</td>
                <td style="width: 80px; border: 1px solid #ccc; padding: 6px;">${covered}/${total}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    `;

    container.innerHTML = tableHTML;

    container.querySelectorAll('th[data-sort]').forEach(th => {
      th.onclick = () => {
        const key = th.getAttribute('data-sort');
        currentSortAsc = currentSortColumn === key ? !currentSortAsc : true;
        currentSortColumn = key;
        renderStandaloneTable();
      };
    });

    setTimeout(() => {
      const searchBox = document.getElementById('coverageSearchBox');
      if (!searchBox) {
        return;
      }
      searchBox.onclick = (e) => e.stopPropagation();
      searchBox.oninput = (e) => {
        if (autoUpdateSearchBox) return;
        searchQuery = e.target.value;
        sessionStorage.setItem('coverageSearchQuery', searchQuery);
        renderStandaloneTable();
      };
      autoUpdateSearchBox = true;
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeInputValueSetter.call(searchBox, searchQuery);
      searchBox.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        inputType: 'insertText',
        data: searchQuery
      }));
      searchBox.dispatchEvent(new KeyboardEvent('keyup', {
        bubbles: true,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13
      }));
      searchBox.focus();
      searchBox.setSelectionRange(searchQuery.length, searchQuery.length);
      autoUpdateSearchBox = false;
    }, 0);
  }

  function waitAndUpdateSearchBox(cleaned, retries = 10) {
    const searchBox = document.getElementById('coverageSearchBox');
    if (!searchBox) {
      if (retries > 0) {
        return setTimeout(() => waitAndUpdateSearchBox(cleaned, retries - 1), 200);
      } else {
        return;
      }
    }

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(searchBox, cleaned);

    sessionStorage.setItem('coverageSearchQuery', cleaned);
    searchQuery = cleaned;

    searchBox.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: cleaned
    }));

    searchBox.dispatchEvent(new KeyboardEvent('keyup', {
      bubbles: true,
      key: 'Enter',
      code: 'Enter',
      keyCode: 13
    }));
    renderStandaloneTable();
  }

  function populateSearchBoxFromActiveTab() {
  if (!searchSyncEnabled) {
    return;
  }

  if (debounceTimeout) clearTimeout(debounceTimeout);    debounceTimeout = setTimeout(() => {
      const tabCandidates = Array.from(document.querySelectorAll('.x-tab-inner'))
        .filter(el => el.textContent.trim().toLowerCase().endsWith('.apxc'));

      for (const el of tabCandidates) {
        const parentTabDiv = el.closest('div.x-tab.x-box-item');
        if (!parentTabDiv || !parentTabDiv.classList.contains('x-tab-active')) continue;

        const tabText = el.textContent.trim();
        if (tabText === lastActiveTabText) {
          return;
        }
        lastActiveTabText = tabText;
        let cleaned = tabText.slice(0, -5).replace(/test/i, '').trim();
        renderStandaloneTable();
        waitAndUpdateSearchBox(cleaned);
        return;
      }
    }, 300);
  }

  function observeTabSwitches() {
    const tryObserve = setInterval(() => {
      const allTabs = Array.from(document.querySelectorAll('.x-tab-inner'));
      if (allTabs.length < 2) {
        return;
      }

      let container = allTabs[0].parentElement;
      while (container && container.querySelectorAll('.x-tab-inner').length !== allTabs.length) {
        container = container.parentElement;
      }
      if (!container) {
        return;
      }

      clearInterval(tryObserve);
      let tabUpdateTimeout;
      const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          const isTabChange =
            (mutation.type === 'attributes' &&
              mutation.attributeName === 'class' &&
              mutation.target.classList.contains('x-tab-strip-active')) ||
            mutation.type === 'childList';

          if (isTabChange) {
            if (tabUpdateTimeout) clearTimeout(tabUpdateTimeout);
            tabUpdateTimeout = setTimeout(() => {
              populateSearchBoxFromActiveTab();
            }, 200);
          }
        }
      });
      observer.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
        childList: true,
      });
    }, 500);
  }

  (function hookCoverageRefresh() {
    if (apex.test.TestResultBrowser.__patched) return;
    const original = apex.test.TestResultBrowser.getAggregateCoveragePercentages;
    apex.test.TestResultBrowser.getAggregateCoveragePercentages = function (cb) {
      original.call(this, function (data) {
        if (typeof cb === 'function') {
          try { cb(data); } catch (e) { console.warn(e); }
        }
        if (Array.isArray(data) && data.length) {
          coverageData = data;
          renderStandaloneTable();
          setTimeout(() => populateSearchBoxFromActiveTab(), 100);
        }
      });
    };
    apex.test.TestResultBrowser.__patched = true;
  })();

  const waitForGrid = setInterval(() => {
    const gridCmp = Ext.getCmp('aggregateCoverageGrid');
    if (gridCmp?.getEl?.()?.dom) {
      clearInterval(waitForGrid);
      apex.test.TestResultBrowser.getAggregateCoveragePercentages(data => {
        if (Array.isArray(data) && data.length > 0) {
          coverageData = data;
          renderStandaloneTable();
          setTimeout(() => populateSearchBoxFromActiveTab(), 100);
          observeTabSwitches();
        } else {
          console.warn('No data to render.');
        }
      });
    }
  }, 500);
})();
