(function () {
  if (!apex?.test?.TestResultBrowser?.getAggregateCoveragePercentages) {
    console.error('Coverage data not available.');
    return;
  }

  let currentSortColumn = 'className';
  let currentSortAsc = true;
  let coverageData = [];
  let searchQuery = sessionStorage.getItem('coverageSearchQuery') || '';

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
                <td style="width: 80px; border: 1px solid #ccc; padding: 6px;">${percent}%</td>
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

    const searchBox = document.getElementById('coverageSearchBox');
    if (searchBox) {
      searchBox.value = searchQuery;
      searchBox.onclick = (e) => e.stopPropagation();
      setTimeout(() => {
        searchBox.focus();
        searchBox.setSelectionRange(searchQuery.length, searchQuery.length);
      }, 0);
      searchBox.oninput = (e) => {
        searchQuery = e.target.value;
        sessionStorage.setItem('coverageSearchQuery', searchQuery);
        renderStandaloneTable();
      };
    }
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
        } else {
          console.warn('No data to render.');
        }
      });
    }
  }, 500);
})();
