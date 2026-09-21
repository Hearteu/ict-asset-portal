/**
 * ICT Asset & Job Sheet Portal JavaScript Logic
 * Aligned with ODE-ICTS Computer Inventory Sheet & DPWH Official Job Sheet Form
 */

let currentAssets = [];
let currentJobs = [];
let editingAssetId = null;
let editingJobId = null;
let resolvingJobId = null;
let closingJobId = null;

// Official 19 DPWH Offices / Sections / Divisions Mapping
const OFFICE_MAP = {
  // 1. Office of the District Engineer -> ODE
  "Office of the District Engineer": { short: "ODE", full: "Office of the District Engineer" },
  "ODE": { short: "ODE", full: "Office of the District Engineer" },
  "DE Office": { short: "ODE", full: "Office of the District Engineer" },

  // 2. Office of the Assistant District Engineer -> OADE
  "Office of the Assistant District Engineer": { short: "OADE", full: "Office of the Assistant District Engineer" },
  "OADE": { short: "OADE", full: "Office of the Assistant District Engineer" },
  "ADE Office": { short: "OADE", full: "Office of the Assistant District Engineer" },

  // 3. Procurement Unit -> Procurement
  "Procurement Unit": { short: "Procurement", full: "Procurement Unit" },
  "Procurement": { short: "Procurement", full: "Procurement Unit" },

  // 4. PIO Staff -> PIO
  "PIO Staff": { short: "PIO", full: "PIO Staff" },
  "PIO": { short: "PIO", full: "PIO Staff" },

  // 5. ICT Staff -> ICTS
  "ICT Staff": { short: "ICTS", full: "ICT Staff" },
  "ICTS": { short: "ICTS", full: "ICT Staff" },
  "ODE-ICTS": { short: "ICTS", full: "ICT Staff" },

  // 6. Commission On Audit -> COA
  "Commission On Audit": { short: "COA", full: "Commission On Audit" },
  "COA": { short: "COA", full: "Commission On Audit" },

  // 7. Administrative Section -> AS
  "Administrative Section": { short: "AS", full: "Administrative Section" },
  "AS": { short: "AS", full: "Administrative Section" },
  "Admin Office": { short: "AS", full: "Administrative Section" },

  // 8. Human Resource Management Unit -> HRMU
  "Human Resource Management Unit": { short: "HRMU", full: "Human Resource Management Unit" },
  "HRMU": { short: "HRMU", full: "Human Resource Management Unit" },

  // 9. Records Management Unit -> Records
  "Records Management Unit": { short: "Records", full: "Records Management Unit" },
  "Records": { short: "Records", full: "Records Management Unit" },
  "Records Unit": { short: "Records", full: "Records Management Unit" },

  // 10. Cash Management Unit -> Cash Unit
  "Cash Management Unit": { short: "Cash Unit", full: "Cash Management Unit" },
  "Cash Unit": { short: "Cash Unit", full: "Cash Management Unit" },

  // 11. Supply and Property Management Unit -> Supply
  "Supply and Property Management Unit": { short: "Supply", full: "Supply and Property Management Unit" },
  "Supply": { short: "Supply", full: "Supply and Property Management Unit" },
  "Supply Management Unit": { short: "Supply", full: "Supply and Property Management Unit" },

  // 12. General Services Office -> GSO
  "General Services Office": { short: "GSO", full: "General Services Office" },
  "GSO": { short: "GSO", full: "General Services Office" },

  // 13. Finance Section -> FS
  "Finance Section": { short: "FS", full: "Finance Section" },
  "FS": { short: "FS", full: "Finance Section" },

  // 14. Planning and Design Section -> PDS
  "Planning and Design Section": { short: "PDS", full: "Planning and Design Section" },
  "PDS": { short: "PDS", full: "Planning and Design Section" },
  "Planning & Design Section": { short: "PDS", full: "Planning and Design Section" },

  // 15. Construction Section -> CS
  "Construction Section": { short: "CS", full: "Construction Section" },
  "CS": { short: "CS", full: "Construction Section" },
  "Construction": { short: "CS", full: "Construction Section" },

  // 16. Quality Assurance Section -> QAS
  "Quality Assurance Section": { short: "QAS", full: "Quality Assurance Section" },
  "QAS": { short: "QAS", full: "Quality Assurance Section" },

  // 17. Quality Assurance Laboratory -> QA Lab
  "Quality Assurance Laboratory": { short: "QA Lab", full: "Quality Assurance Laboratory" },
  "QA Lab": { short: "QA Lab", full: "Quality Assurance Laboratory" },
  "QA Laboratory": { short: "QA Lab", full: "Quality Assurance Laboratory" },

  // 18. Maintenance Section -> Maintenance
  "Maintenance Section": { short: "Maintenance", full: "Maintenance Section" },
  "Maintenance": { short: "Maintenance", full: "Maintenance Section" },

  // 19. Equipment Service Unit -> ESU
  "Equipment Service Unit": { short: "ESU", full: "Equipment Service Unit" },
  "ESU": { short: "ESU", full: "Equipment Service Unit" }
};

function getOfficeInfo(office) {
  if (!office) return { short: "ICTS", full: "ICT Staff" };
  const trimmed = office.trim();
  if (OFFICE_MAP[trimmed]) {
    return OFFICE_MAP[trimmed];
  }
  const lower = trimmed.toLowerCase();
  for (const k in OFFICE_MAP) {
    if (k.toLowerCase() === lower) {
      return OFFICE_MAP[k];
    }
  }
  return { short: trimmed, full: trimmed };
}

// Custom Office Dropdown Controller (Anchored strictly below the field)
function setupCustomOfficeDropdown() {
  const wrapper = document.getElementById("customOfficeSelectWrapper");
  const trigger = document.getElementById("customOfficeTrigger");
  const searchInput = document.getElementById("customOfficeSearch");
  const optionsContainer = document.getElementById("customOfficeOptions");
  const selectElem = document.getElementById("assetDeptSelect");

  if (!wrapper || !trigger || !optionsContainer || !selectElem) return;

  // Render 19 options from selectElem with badges
  renderCustomOfficeOptions();

  // Toggle dropdown on trigger click
  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains("open");
    closeAllCustomDropdowns();
    if (!isOpen) {
      wrapper.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      if (searchInput) {
        searchInput.value = "";
        filterCustomOfficeOptions("");
        setTimeout(() => searchInput.focus(), 60);
      }
    }
  });

  // Handle keyboard on trigger
  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      trigger.click();
    }
  });

  // Filter search
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterCustomOfficeOptions(e.target.value);
    });
    searchInput.addEventListener("click", (e) => e.stopPropagation());
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllCustomDropdowns();
        trigger.focus();
      }
    });
  }

  // Close on outside click
  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      closeAllCustomDropdowns();
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrapper.classList.contains("open")) {
      closeAllCustomDropdowns();
      trigger.focus();
    }
  });
}

function renderCustomOfficeOptions() {
  const optionsContainer = document.getElementById("customOfficeOptions");
  const selectElem = document.getElementById("assetDeptSelect");
  if (!optionsContainer || !selectElem) return;

  const currentVal = selectElem.value || "ICT Staff";
  const options = Array.from(selectElem.options);

  optionsContainer.innerHTML = options.map(opt => {
    const val = opt.value;
    const off = getOfficeInfo(val);
    const isSelected = (val === currentVal || off.short === currentVal || off.full === currentVal);
    return `
      <div class="custom-select-option ${isSelected ? 'selected' : ''}" data-value="${val}" role="option" aria-selected="${isSelected}">
        <span>${off.full}</span>
        <span class="option-badge">${off.short}</span>
      </div>
    `;
  }).join("");

  // Attach click listeners to options
  optionsContainer.querySelectorAll(".custom-select-option").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = item.getAttribute("data-value");
      setCustomOfficeValue(val);
      closeAllCustomDropdowns();
      const trigger = document.getElementById("customOfficeTrigger");
      if (trigger) trigger.focus();
    });
  });
}

function filterCustomOfficeOptions(query) {
  const optionsContainer = document.getElementById("customOfficeOptions");
  if (!optionsContainer) return;

  const q = query.trim().toLowerCase();
  const optionItems = optionsContainer.querySelectorAll(".custom-select-option");
  let visibleCount = 0;

  optionItems.forEach(item => {
    const val = item.getAttribute("data-value") || "";
    const off = getOfficeInfo(val);
    const matches = off.full.toLowerCase().includes(q) || off.short.toLowerCase().includes(q);
    if (matches) {
      item.style.display = "flex";
      visibleCount++;
    } else {
      item.style.display = "none";
    }
  });

  let noResults = optionsContainer.querySelector(".custom-select-no-results");
  if (visibleCount === 0) {
    if (!noResults) {
      noResults = document.createElement("div");
      noResults.className = "custom-select-no-results";
      noResults.textContent = "No matching offices found";
      optionsContainer.appendChild(noResults);
    }
    noResults.style.display = "block";
  } else if (noResults) {
    noResults.style.display = "none";
  }
}

function setCustomOfficeValue(val) {
  const selectElem = document.getElementById("assetDeptSelect");
  const selectedTextElem = document.getElementById("customOfficeSelectedText");
  const optionsContainer = document.getElementById("customOfficeOptions");

  const off = getOfficeInfo(val);
  const targetVal = off.full;

  if (selectElem) {
    let matched = false;
    for (let opt of selectElem.options) {
      if (opt.value === targetVal || opt.value === off.short || opt.value === val) {
        selectElem.value = opt.value;
        matched = true;
        break;
      }
    }
    if (!matched && targetVal) {
      const newOpt = document.createElement("option");
      newOpt.value = targetVal;
      newOpt.textContent = targetVal;
      selectElem.appendChild(newOpt);
      selectElem.value = targetVal;
    }
  }

  if (selectedTextElem) {
    selectedTextElem.textContent = off.full;
  }

  if (optionsContainer) {
    optionsContainer.querySelectorAll(".custom-select-option").forEach(item => {
      const itemVal = item.getAttribute("data-value");
      const isSelected = (itemVal === targetVal || itemVal === off.short || itemVal === val);
      item.classList.toggle("selected", isSelected);
      item.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  }
}

function closeAllCustomDropdowns() {
  document.querySelectorAll(".custom-select-wrapper.open").forEach(w => {
    w.classList.remove("open");
    const trigger = w.querySelector(".custom-select-trigger");
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  });
}

// Custom Job Asset (Computer) Dropdown Controller (Anchored strictly below the field)
function setupCustomJobAssetDropdown() {
  const wrapper = document.getElementById("customJobAssetSelectWrapper");
  const trigger = document.getElementById("customJobAssetTrigger");
  const searchInput = document.getElementById("customJobAssetSearch");
  const optionsContainer = document.getElementById("customJobAssetOptions");
  const selectElem = document.getElementById("jobAssetSelect");

  if (!wrapper || !trigger || !optionsContainer || !selectElem) return;

  renderCustomJobAssetOptions();

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = wrapper.classList.contains("open");
    closeAllCustomDropdowns();
    if (!isOpen) {
      wrapper.classList.add("open");
      trigger.setAttribute("aria-expanded", "true");
      if (searchInput) {
        searchInput.value = "";
        filterCustomJobAssetOptions("");
        setTimeout(() => searchInput.focus(), 60);
      }
    }
  });

  trigger.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      trigger.click();
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      filterCustomJobAssetOptions(e.target.value);
    });
    searchInput.addEventListener("click", (e) => e.stopPropagation());
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllCustomDropdowns();
        trigger.focus();
      }
    });
  }

  document.addEventListener("click", (e) => {
    if (!wrapper.contains(e.target)) {
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && wrapper.classList.contains("open")) {
      wrapper.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  });
}

function renderCustomJobAssetOptions() {
  const optionsContainer = document.getElementById("customJobAssetOptions");
  const selectElem = document.getElementById("jobAssetSelect");
  if (!optionsContainer || !selectElem) return;

  const currentVal = selectElem.value;

  if (!currentAssets || currentAssets.length === 0) {
    optionsContainer.innerHTML = `<div class="custom-select-no-results">No registered computers found in inventory.</div>`;
    return;
  }

  optionsContainer.innerHTML = currentAssets.map(a => {
    const off = getOfficeInfo(a.office);
    const isSelected = (currentVal && String(a.id) === String(currentVal));
    return `
      <div class="custom-select-option custom-asset-option ${isSelected ? 'selected' : ''}" data-id="${a.id}" role="option" aria-selected="${isSelected}">
        <div class="asset-opt-primary">
          <strong class="asset-opt-user">${a.end_user}</strong>
          <span class="asset-opt-device">${a.device}</span>
        </div>
        <div class="asset-opt-secondary">
          <span class="asset-opt-model">${a.brand_model}</span>
          <span class="serial-tag" style="font-size: 0.72rem; padding: 1px 5px;">${a.serial_number}</span>
          <span class="badge-pill office-badge" style="font-size: 0.7rem; padding: 1px 6px;">${off.short}</span>
          <span class="status-badge ${getStatusClass(a.status)}" style="font-size: 0.68rem; padding: 2px 7px;">${a.status}</span>
        </div>
      </div>
    `;
  }).join("");

  optionsContainer.querySelectorAll(".custom-asset-option").forEach(item => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const assetId = item.getAttribute("data-id");
      setCustomJobAssetValue(assetId);
      closeAllCustomDropdowns();
      const trigger = document.getElementById("customJobAssetTrigger");
      if (trigger) trigger.focus();
    });
  });
}

function filterCustomJobAssetOptions(query) {
  const optionsContainer = document.getElementById("customJobAssetOptions");
  if (!optionsContainer) return;

  const q = query.trim().toLowerCase();
  const items = optionsContainer.querySelectorAll(".custom-asset-option");
  let visibleCount = 0;

  items.forEach(item => {
    const assetId = item.getAttribute("data-id");
    const a = currentAssets.find(x => String(x.id) === String(assetId));
    if (!a) return;

    const off = getOfficeInfo(a.office);
    const textToSearch = `${a.end_user} ${a.brand_model} ${a.serial_number} ${a.computer_name || ''} ${off.short} ${off.full} ${a.device} ${a.status}`.toLowerCase();
    
    if (!q || textToSearch.includes(q)) {
      item.style.display = "flex";
      visibleCount++;
    } else {
      item.style.display = "none";
    }
  });

  let noResults = optionsContainer.querySelector(".custom-select-no-results");
  if (visibleCount === 0) {
    if (!noResults) {
      noResults = document.createElement("div");
      noResults.className = "custom-select-no-results";
      noResults.textContent = "No matching computers found";
      optionsContainer.appendChild(noResults);
    }
    noResults.style.display = "block";
  } else if (noResults) {
    noResults.style.display = "none";
  }
}

function setCustomJobAssetValue(assetId) {
  const selectElem = document.getElementById("jobAssetSelect");
  const selectedTextElem = document.getElementById("customJobAssetSelectedText");
  const optionsContainer = document.getElementById("customJobAssetOptions");

  if (selectElem) {
    selectElem.value = assetId ? String(assetId) : "";
  }

  if (!assetId) {
    if (selectedTextElem) {
      selectedTextElem.innerHTML = `<span style="color: var(--text-muted);">-- Select Computer (End-User / Serial No.) --</span>`;
    }
    if (optionsContainer) {
      optionsContainer.querySelectorAll(".custom-asset-option").forEach(item => {
        item.classList.remove("selected");
        item.setAttribute("aria-selected", "false");
      });
    }
    updateJobSheetAssetPreview(null);
    return;
  }

  const asset = currentAssets.find(x => String(x.id) === String(assetId));
  if (asset) {
    const off = getOfficeInfo(asset.office);
    if (selectedTextElem) {
      selectedTextElem.innerHTML = `
        <span style="font-weight: 700; color: #02025c;">${asset.end_user}</span>
        <span style="color: #64748b; font-size: 0.82rem; margin: 0 4px;">—</span>
        <span style="color: #334155; font-size: 0.84rem;">${asset.brand_model} (${asset.serial_number})</span>
        <span class="badge-pill office-badge" style="margin-left: 6px; font-size: 0.7rem; padding: 1px 6px;">${off.short}</span>
      `;
    }

    if (optionsContainer) {
      optionsContainer.querySelectorAll(".custom-asset-option").forEach(item => {
        const isSelected = (item.getAttribute("data-id") === String(assetId));
        item.classList.toggle("selected", isSelected);
        item.setAttribute("aria-selected", isSelected ? "true" : "false");
      });
    }

    updateJobSheetAssetPreview(asset.id);
  }
}

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupEventListeners();
  setupCustomOfficeDropdown();
  setupCustomJobAssetDropdown();
  loadAllData();
});

// Toast notification helper
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Navigation & Tab Switching
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      const viewName = item.getAttribute("data-view");
      switchView(viewName);
    });
  });
}

function switchView(viewName) {
  document.querySelectorAll(".nav-item").forEach(el => {
    el.classList.toggle("active", el.getAttribute("data-view") === viewName);
  });

  document.querySelectorAll(".portal-view").forEach(view => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });

  if (viewName === "dashboard") {
    loadStats();
    loadRecentActivity();
  } else if (viewName === "inventory") {
    loadAssets();
  } else if (viewName === "jobs") {
    loadJobs();
  } else if (viewName === "history") {
    loadRepairHistory();
  }
}

// Global Event Listeners
function setupEventListeners() {
  // Global Top Search Bar
  const globalSearch = document.getElementById("globalSearch");
  globalSearch?.addEventListener("input", (e) => {
    const val = e.target.value;
    filterDataGlobally(val);
    const assetSearch = document.getElementById("assetSearchInput");
    if (assetSearch && document.activeElement === globalSearch) {
      assetSearch.value = val;
    }
  });

  // Asset Inventory Search Bar
  const assetSearch = document.getElementById("assetSearchInput");
  assetSearch?.addEventListener("input", (e) => {
    const val = e.target.value;
    filterDataGlobally(val);
    if (globalSearch && document.activeElement === assetSearch) {
      globalSearch.value = val;
    }
  });

  // Asset Dropdown Filters
  document.getElementById("assetStatusFilter")?.addEventListener("change", loadAssets);
  document.getElementById("assetTypeFilter")?.addEventListener("change", loadAssets);

  // Job Sheet Search Bar
  const jobSearch = document.getElementById("jobSearchInput");
  jobSearch?.addEventListener("input", (e) => {
    const val = e.target.value;
    filterDataGlobally(val);
  });
  document.getElementById("jobStatusFilter")?.addEventListener("change", loadJobs);
  document.getElementById("confirmDeleteJobBtn")?.addEventListener("click", confirmDeleteJobSheet);

  // History Filter
  const historySearch = document.getElementById("historySearchInput");
  historySearch?.addEventListener("input", (e) => {
    const val = e.target.value;
    filterDataGlobally(val);
  });

  // Modal Close buttons
  document.querySelectorAll(".modal-close-btn, .btn-close-modal").forEach(btn => {
    btn.addEventListener("click", () => {
      closeAllModals();
    });
  });

  // Close modal when clicking overlay background
  document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeAllModals();
      }
    });
  });

  // Forms
  document.getElementById("assetForm")?.addEventListener("submit", handleAssetFormSubmit);
  document.getElementById("jobSheetForm")?.addEventListener("submit", handleJobSheetFormSubmit);
  document.getElementById("resolveJobForm")?.addEventListener("submit", handleResolveFormSubmit);
  document.getElementById("closeJobForm")?.addEventListener("submit", handleCloseFormSubmit);

  // Asset selector in Job Sheet Modal - auto fills client & hardware info
  document.getElementById("jobAssetSelect")?.addEventListener("change", (e) => {
    updateJobSheetAssetPreview(e.target.value);
  });
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(el => el.classList.remove("active"));
  editingAssetId = null;
  editingJobId = null;
  resolvingJobId = null;
  closingJobId = null;
}

// Load Data
async function loadAllData() {
  await Promise.all([loadStats(), loadAssets(), loadJobs()]);
  loadRecentActivity();
}

// Stats & Dashboard
async function loadStats() {
  try {
    const res = await fetch("/api/stats/");
    const data = await res.json();
    document.getElementById("statTotalAssets").textContent = data.total_assets;
    document.getElementById("statInUse").textContent = data.in_use;
    document.getElementById("statUnderRepair").textContent = data.under_repair;
    document.getElementById("statSpares").textContent = data.spares;
    document.getElementById("statActiveJobs").textContent = data.active_jobs;
  } catch (err) {
    console.error("Error loading stats:", err);
  }
}

async function loadRecentActivity() {
  try {
    const res = await fetch("/api/jobs/");
    const jobs = await res.json();
    const container = document.getElementById("recentJobsList");
    if (!container) return;

    if (jobs.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No job sheets recorded yet.</p>`;
      return;
    }

    container.innerHTML = jobs.slice(0, 5).map(job => `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <div>
          <div style="font-weight: 600; font-size: 0.88rem;">${job.ref_no} &bull; <span style="color: #02025c; font-weight: 700;">${job.full_name || 'N/A'}</span></div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); max-width: 320px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${job.incident_description}
          </div>
        </div>
        <div style="text-align: right;">
          <span class="status-badge ${getStatusClass(job.status)}">${job.status}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">${job.date_of_filing || ''}</div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
  }
}

// Computer Assets Management (Aligned with Excel Sheet)
async function loadAssets() {
  try {
    const status = document.getElementById("assetStatusFilter")?.value || "";
    const device = document.getElementById("assetTypeFilter")?.value || "";
    const search = document.getElementById("assetSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (device) params.append("device", device);
    if (search) params.append("search", search);

    const res = await fetch(`/api/assets/?${params.toString()}`);
    currentAssets = await res.json();
    renderAssetsTable(currentAssets);
    populateAssetSelect(currentAssets);
  } catch (err) {
    console.error("Error loading assets:", err);
  }
}

function renderAssetsTable(assets) {
  const tbody = document.getElementById("assetTableBody");
  if (!tbody) return;

  if (assets.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 30px; color: var(--text-muted);">No computers found matching your criteria.</td></tr>`;
    return;
  }

  // Exact Excel Columns without redundant repair history column:
  // END-USER | DEVICE | BRAND and MODEL | SERIAL NUMBER | COMPUTER NAME | MONITOR with S/N | UPS with S/N | OFFICE | ACTIONS
  tbody.innerHTML = assets.map(a => {
    const off = getOfficeInfo(a.office);
    return `
    <tr>
      <td>
        <strong style="color: #0284c7; cursor: pointer;" onclick="viewAssetDetails(${a.id})" title="Click to view full profile & repair history">${a.end_user}</strong>
      </td>
      <td>
        <span style="font-size: 0.82rem; color: var(--text-secondary);">${a.device}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: #0f172a;">${a.brand_model}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${a.processor || ''}</div>
      </td>
      <td>
        <span class="serial-tag">${a.serial_number}</span>
      </td>
      <td>
        <span style="font-family: monospace; font-size: 0.82rem; color: #0f172a; font-weight: 600;">${a.computer_name || '-'}</span>
      </td>
      <td>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${a.monitor_serial || '-'}</span>
      </td>
      <td>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${a.ups_serial || '-'}</span>
      </td>
      <td>
        <span class="badge-pill office-badge" title="${off.full}" data-tooltip="${off.full}">${off.short}</span>
      </td>
      <td style="text-align: center; white-space: nowrap;">
        <div class="action-btns-group">
          <button class="btn btn-secondary btn-sm" onclick="viewAssetDetails(${a.id})" title="Profile & Repair History">🔍</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditAssetModal(${a.id})" title="Edit Details">✏️</button>
          <button class="btn btn-primary btn-sm" onclick="openNewJobSheetForAsset(${a.id})" title="File Official Job Sheet">🛠️</button>
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

function populateAssetSelect(assets) {
  const select = document.getElementById("jobAssetSelect");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="">-- Select Computer (End-User / Serial No.) --</option>` +
    assets.map(a => {
      const off = getOfficeInfo(a.office);
      return `<option value="${a.id}">${a.end_user} | ${a.brand_model} (${a.serial_number}) - ${off.short}</option>`;
    }).join("");

  if (currentVal) select.value = currentVal;
  renderCustomJobAssetOptions();
}

function updateJobSheetAssetPreview(assetId) {
  const card = document.getElementById("jobAssetPreviewCard");
  if (!card) return;

  if (!assetId) {
    card.style.display = "none";
    return;
  }

  const asset = currentAssets.find(a => a.id == assetId);
  if (!asset) return;

  const off = getOfficeInfo(asset.office);
  card.style.display = "grid";
  document.getElementById("previewOwner").textContent = asset.end_user || "Unassigned";
  document.getElementById("previewModel").textContent = asset.brand_model || "N/A";
  document.getElementById("previewSerial").textContent = asset.serial_number || "N/A";
  document.getElementById("previewCompName").textContent = asset.computer_name || "N/A";
  document.getElementById("previewOffice").textContent = `${off.short} (${off.full})`;
  document.getElementById("previewStatus").textContent = asset.status || "N/A";

  // Auto-fill Client and Hardware info fields in Job Sheet Form
  if (!editingJobId) {
    document.getElementById("jobClientName").value = asset.end_user || "";
    document.getElementById("jobSection").value = off.short;
    document.getElementById("jobDateFiling").value = new Date().toISOString().split("T")[0];
    document.getElementById("jobDateReceived").value = `${new Date().toISOString().split("T")[0]} 08:30 AM`;
  }
}

// Job Sheets & Repair Management (DPWH Aligned)
async function loadJobs() {
  try {
    const status = document.getElementById("jobStatusFilter")?.value || "";
    const search = document.getElementById("jobSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (search) params.append("search", search);

    const res = await fetch(`/api/jobs/?${params.toString()}`);
    currentJobs = await res.json();
    renderJobsTable(currentJobs);
  } catch (err) {
    console.error("Error loading jobs:", err);
  }
}

function renderJobsTable(jobs) {
  const tbody = document.getElementById("jobTableBody");
  if (!tbody) return;

  if (jobs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 30px; color: var(--text-muted);">No job sheets found.</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(j => {
    const off = getOfficeInfo(j.section_division);
    return `
    <tr>
      <td style="white-space: nowrap;">
        <strong style="color: #02025c; font-family: monospace; font-size: 0.9rem; white-space: nowrap;">${j.ref_no}</strong>
      </td>
      <td>
        <div style="font-weight: 600; color: #0f172a;">${j.full_name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${j.contact_no ? 'Tel: ' + j.contact_no : ''}</div>
      </td>
      <td>
        <span class="badge-pill office-badge" title="${off.full}" data-tooltip="${off.full}">${off.short}</span>
      </td>
      <td>
        <div><strong style="color: #0f172a;">${j.hardware_brand_model || 'N/A'}</strong></div>
        <span class="serial-tag">${j.hardware_serial_number || 'N/A'}</span>
      </td>
      <td>
        <div style="max-width: 260px; font-size: 0.84rem; color: #334155;">
          ${j.incident_description}
        </div>
      </td>
      <td>
        <span class="status-badge ${getStatusClass(j.status)}">${j.status}</span>
      </td>
      <td>
        <div style="font-size: 0.84rem;">${j.fulfilled_by || 'Unassigned'}</div>
      </td>
      <td style="white-space: nowrap;">
        <div style="font-size: 0.82rem; color: var(--text-secondary); white-space: nowrap;">${j.date_of_filing || ''}</div>
      </td>
      <td style="text-align: center;">
        <div class="job-actions-wrapper">
          <div class="job-status-btn-row">
            ${getNextStatusActionHtml(j)}
          </div>
          <div class="job-icon-btns-row">
            <button class="btn btn-secondary btn-sm btn-icon-only" onclick="openEditJobSheetModal(${j.id})" title="Edit Job Sheet">✏️</button>
            <button class="btn btn-primary btn-sm btn-icon-only" onclick="openPrintableJobSheet(${j.id})" title="Print Official DPWH Job Sheet Form">🖨️</button>
            <button class="btn btn-danger btn-sm btn-icon-only" onclick="promptDeleteJobSheet(${j.id}, '${(j.ref_no || '').replace(/'/g, "\\'")}')" title="Delete Job Sheet">🗑️</button>
          </div>
        </div>
      </td>
    </tr>
  `;
  }).join("");
}

// Repair History Audit View
async function loadRepairHistory() {
  try {
    const search = document.getElementById("historySearchInput")?.value || "";
    const params = new URLSearchParams();
    if (search) params.append("search", search);

    const res = await fetch(`/api/jobs/?${params.toString()}`);
    const jobs = await res.json();
    renderTimeline(jobs);
  } catch (err) {
    console.error(err);
  }
}

function renderTimeline(jobs) {
  const container = document.getElementById("repairHistoryTimeline");
  if (!container) return;

  if (jobs.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); padding: 20px;">No repair history records found.</p>`;
    return;
  }

  container.innerHTML = jobs.map(j => `
    <div class="timeline-item">
      <div class="timeline-top">
        <div>
          <span class="timeline-job-no">Ref: ${j.ref_no}</span>
          <span style="margin: 0 8px; color: var(--text-muted);">&bull;</span>
          <strong style="color: #0f172a;">${j.full_name}</strong> (${j.hardware_brand_model} &bull; <code>${j.hardware_serial_number}</code>)
        </div>
        <div>
          <span class="status-badge ${getStatusClass(j.status)}" style="margin-right: 8px;">${j.status}</span>
          <span class="timeline-date">${j.date_of_filing}</span>
        </div>
      </div>
      <div class="timeline-body">
        <p><strong>Incident / Request:</strong> ${j.incident_description}</p>
        ${j.assessment ? `<p style="margin-top: 4px;"><strong>Assessment:</strong> ${j.assessment}</p>` : ''}
        ${j.actions_taken ? `<p style="margin-top: 4px;"><strong>Actions Taken / Recommendations:</strong> ${j.actions_taken}</p>` : ''}
      </div>
      <div class="timeline-meta">
        <span>👨‍💻 Fulfilled by: <strong>${j.fulfilled_by || 'Unassigned'}</strong></span>
        <span>🏢 Office: <strong>${j.section_division}</strong></span>
        <span>🏷️ Computer Name: <code>${j.hardware_computer_name || 'N/A'}</code></span>
        ${j.date_time_completed ? `<span>✅ Completed: <strong>${j.date_time_completed}</strong></span>` : ''}
      </div>
    </div>
  `).join("");
}

// Computer Profile Modal
async function viewAssetDetails(assetId) {
  try {
    const res = await fetch(`/api/assets/${assetId}/`);
    if (!res.ok) throw new Error("Asset not found");
    const asset = await res.json();

    document.getElementById("detailModalTitle").textContent = `${asset.end_user} — ${asset.brand_model}`;
    document.getElementById("detailOwner").textContent = asset.end_user;
    document.getElementById("detailModel").textContent = asset.brand_model;
    document.getElementById("detailSerial").textContent = asset.serial_number;
    document.getElementById("detailCompName").textContent = asset.computer_name || "-";
    document.getElementById("detailMonitor").textContent = asset.monitor_serial || "-";
    document.getElementById("detailUps").textContent = asset.ups_serial || "-";
    const off = getOfficeInfo(asset.office);
    document.getElementById("detailDept").innerHTML = `<span class="badge-pill office-badge" title="${off.full}" data-tooltip="${off.full}">${off.short}</span> <span style="font-size: 0.85rem; color: var(--text-secondary); margin-left: 6px;">(${off.full})</span>`;
    document.getElementById("detailType").textContent = asset.device;
    document.getElementById("detailStatus").innerHTML = `<span class="status-badge ${getStatusClass(asset.status)}">${asset.status}</span>`;

    document.getElementById("detailCpu").textContent = asset.processor || "Not specified";
    document.getElementById("detailRamStorage").textContent = `${asset.ram || 'RAM N/A'} | ${asset.storage || 'Storage N/A'}`;
    document.getElementById("detailNotes").textContent = asset.notes || "None";

    // Populate repair history for this computer
    const historyContainer = document.getElementById("assetRepairHistoryContainer");
    if (asset.job_sheets && asset.job_sheets.length > 0) {
      historyContainer.innerHTML = asset.job_sheets.map(job => `
        <div class="timeline-item" style="margin-bottom: 14px;">
          <div class="timeline-top">
            <span class="timeline-job-no">Ref: ${job.ref_no}</span>
            <div>
              <span class="status-badge ${getStatusClass(job.status)}" style="margin-right: 6px;">${job.status}</span>
              <span class="timeline-date">${job.date_of_filing}</span>
            </div>
          </div>
          <div class="timeline-body">
            <p><strong>Incident / Request:</strong> ${job.incident_description}</p>
            ${job.assessment ? `<p style="margin-top: 4px;"><strong>Assessment:</strong> ${job.assessment}</p>` : ''}
            ${job.actions_taken ? `<p style="margin-top: 4px;"><strong>Actions Taken:</strong> ${job.actions_taken}</p>` : ''}
          </div>
          <div class="timeline-meta">
            <span>Fulfilled by: <strong>${job.fulfilled_by || 'Unassigned'}</strong></span>
            ${job.date_time_completed ? `<span>Completed: <strong>${job.date_time_completed}</strong></span>` : ''}
          </div>
        </div>
      `).join("");
    } else {
      historyContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; padding: 10px 0;">No repair records found for this asset. Machine has clean service history.</p>`;
    }

    // Set button to create job sheet for this asset
    const btnAddJob = document.getElementById("btnCreateJobForAsset");
    btnAddJob.onclick = () => {
      closeAllModals();
      openNewJobSheetForAsset(asset.id);
    };

    document.getElementById("assetDetailModal").classList.add("active");
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Modal Handlers: Add / Edit Computer
function openNewAssetModal() {
  editingAssetId = null;
  document.getElementById("assetModalTitle").textContent = "Register Computer to Inventory";
  document.getElementById("assetForm").reset();
  setCustomOfficeValue("ICT Staff");
  closeAllCustomDropdowns();
  document.getElementById("assetModal").classList.add("active");
}

async function openEditAssetModal(assetId) {
  editingAssetId = assetId;
  try {
    const res = await fetch(`/api/assets/${assetId}/`);
    const a = await res.json();

    document.getElementById("assetModalTitle").textContent = `Edit Computer: ${a.end_user} (${a.serial_number})`;
    document.getElementById("assetOwnerInput").value = a.end_user;
    document.getElementById("assetTypeSelect").value = a.device;
    document.getElementById("assetModelInput").value = a.brand_model;
    document.getElementById("assetSerialInput").value = a.serial_number;
    document.getElementById("assetComputerNameInput").value = a.computer_name === '-' ? '' : a.computer_name;
    document.getElementById("assetMonitorInput").value = a.monitor_serial === '-' ? '' : a.monitor_serial;
    document.getElementById("assetUpsInput").value = a.ups_serial === '-' ? '' : a.ups_serial;
    
    setCustomOfficeValue(a.office || "ICT Staff");
    closeAllCustomDropdowns();

    document.getElementById("assetStatusSelect").value = a.status;
    document.getElementById("assetCpuInput").value = a.processor || "";
    document.getElementById("assetRamInput").value = a.ram || "";
    document.getElementById("assetStorageInput").value = a.storage || "";
    document.getElementById("assetNotesInput").value = a.notes || "";

    document.getElementById("assetModal").classList.add("active");
  } catch (err) {
    showToast("Error loading computer data", "error");
  }
}

async function handleAssetFormSubmit(e) {
  e.preventDefault();
  const deptSelect = document.getElementById("assetDeptSelect");
  const payload = {
    end_user: document.getElementById("assetOwnerInput").value.trim(),
    device: document.getElementById("assetTypeSelect").value,
    brand_model: document.getElementById("assetModelInput").value.trim(),
    serial_number: document.getElementById("assetSerialInput").value.trim().toUpperCase(),
    computer_name: document.getElementById("assetComputerNameInput").value.trim(),
    monitor_serial: document.getElementById("assetMonitorInput").value.trim(),
    ups_serial: document.getElementById("assetUpsInput").value.trim(),
    office: deptSelect ? deptSelect.value.trim() : "ICT Staff",
    status: document.getElementById("assetStatusSelect").value,
    processor: document.getElementById("assetCpuInput").value.trim(),
    ram: document.getElementById("assetRamInput").value.trim(),
    storage: document.getElementById("assetStorageInput").value.trim(),
    notes: document.getElementById("assetNotesInput").value.trim()
  };

  try {
    const url = editingAssetId ? `/api/assets/${editingAssetId}/` : `/api/assets/`;
    const method = editingAssetId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to save computer", "error");
      return;
    }

    showToast(editingAssetId ? "Computer details updated!" : "Computer added to inventory!", "success");
    closeAllModals();
    await loadAssets();
    await loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Modal Handlers: Add / Edit Job Sheet
function openNewJobSheetModal() {
  editingJobId = null;
  document.getElementById("jobSheetModalTitle").textContent = "New Service Request Form";
  const submitBtn = document.getElementById("btnSubmitJobSheet");
  if (submitBtn) submitBtn.textContent = "File Job Sheet";

  // In new job sheet form, only show Client Info & Service Request (Section 1)
  const sec2 = document.getElementById("jobSection2Wrapper");
  if (sec2) sec2.style.display = "none";
  const sec3 = document.getElementById("jobSection3Wrapper");
  if (sec3) sec3.style.display = "none";

  document.getElementById("jobSheetForm").reset();
  document.getElementById("jobDateFiling").value = new Date().toISOString().split("T")[0];
  document.getElementById("jobDateReceived").value = `${new Date().toISOString().split("T")[0]} 08:30 AM`;
  document.getElementById("jobSection").value = "ICTS";
  setCustomJobAssetValue("");
  closeAllCustomDropdowns();
  document.getElementById("jobAssetPreviewCard").style.display = "none";
  const delBtn = document.getElementById("btnDeleteJobSheetModal");
  if (delBtn) delBtn.style.display = "none";
  document.getElementById("jobSheetModal").classList.add("active");
}

function openNewJobSheetForAsset(assetId) {
  openNewJobSheetModal();
  setCustomJobAssetValue(assetId);
  closeAllCustomDropdowns();
}

async function openEditJobSheetModal(jobId) {
  editingJobId = jobId;
  try {
    const res = await fetch(`/api/jobs/${jobId}/`);
    const j = await res.json();

    document.getElementById("jobSheetModalTitle").textContent = `Update Job Sheet: Ref #${j.ref_no}`;
    const submitBtn = document.getElementById("btnSubmitJobSheet");
    if (submitBtn) submitBtn.textContent = "Save Changes";

    // When editing, show all sections for complete administrative control
    const sec2 = document.getElementById("jobSection2Wrapper");
    if (sec2) sec2.style.display = "contents";
    const sec3 = document.getElementById("jobSection3Wrapper");
    if (sec3) sec3.style.display = "contents";

    const delBtn = document.getElementById("btnDeleteJobSheetModal");
    if (delBtn) delBtn.style.display = "inline-flex";
    setCustomJobAssetValue(j.asset_id);
    closeAllCustomDropdowns();

    document.getElementById("jobClientName").value = j.full_name;
    document.getElementById("jobSection").value = j.section_division;
    document.getElementById("jobDateFiling").value = j.date_of_filing;
    document.getElementById("jobContact").value = j.contact_no || "";
    document.getElementById("jobIssueInput").value = j.incident_description;

    document.getElementById("jobAppSoftware").value = j.app_software_description || "";
    document.getElementById("jobAppVersion").value = j.app_software_version || "";
    document.getElementById("jobConnectivity").value = j.connectivity_description || "";
    document.getElementById("jobUserAccount").value = j.user_account_description || "";

    document.getElementById("jobDiagnosisInput").value = j.assessment || "";
    document.getElementById("jobActionInput").value = j.actions_taken || "";
    document.getElementById("jobModeFiling").value = j.mode_of_filing || "Walk-in";
    document.getElementById("jobStatusSelect").value = j.status || "Open";

    document.getElementById("jobDateReceived").value = j.date_time_received || "";
    document.getElementById("jobDateCompleted").value = j.date_time_completed || "";
    document.getElementById("jobTechInput").value = j.fulfilled_by || "";
    document.getElementById("jobReviewedBy").value = j.reviewed_by || "";

    document.getElementById("jobEvalAddressed").value = j.concern_addressed || "";
    document.getElementById("jobEvalSupport").value = j.it_support_satisfaction || "";
    document.getElementById("jobComments").value = j.comments_suggestions || "";

    document.getElementById("jobSheetModal").classList.add("active");
  } catch (err) {
    showToast("Error loading job sheet", "error");
  }
}

async function handleJobSheetFormSubmit(e) {
  e.preventDefault();
  const payload = {
    asset_id: parseInt(document.getElementById("jobAssetSelect").value),
    full_name: document.getElementById("jobClientName").value.trim(),
    section_division: document.getElementById("jobSection").value.trim(),
    date_of_filing: document.getElementById("jobDateFiling").value,
    contact_no: document.getElementById("jobContact").value.trim(),
    incident_description: document.getElementById("jobIssueInput").value.trim(),

    app_software_description: document.getElementById("jobAppSoftware").value.trim(),
    app_software_version: document.getElementById("jobAppVersion").value.trim(),
    connectivity_description: document.getElementById("jobConnectivity").value.trim(),
    user_account_description: document.getElementById("jobUserAccount").value.trim(),

    assessment: document.getElementById("jobDiagnosisInput").value.trim(),
    actions_taken: document.getElementById("jobActionInput").value.trim(),
    mode_of_filing: document.getElementById("jobModeFiling").value,
    priority: "Medium",
    status: document.getElementById("jobStatusSelect").value,

    date_time_received: document.getElementById("jobDateReceived").value.trim(),
    date_time_completed: document.getElementById("jobDateCompleted").value.trim(),
    fulfilled_by: document.getElementById("jobTechInput").value.trim(),
    reviewed_by: document.getElementById("jobReviewedBy").value.trim(),

    concern_addressed: document.getElementById("jobEvalAddressed").value,
    it_support_satisfaction: document.getElementById("jobEvalSupport").value,
    comments_suggestions: document.getElementById("jobComments").value.trim()
  };

  try {
    const url = editingJobId ? `/api/jobs/${editingJobId}/` : `/api/jobs/`;
    const method = editingJobId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to save job sheet", "error");
      return;
    }

    showToast(editingJobId ? "Job sheet updated successfully!" : "Official DPWH Job Sheet filed!", "success");
    closeAllModals();
    await loadJobs();
    await loadAssets();
    await loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Next Status Quick Action Helper (Open -> In Progress -> Resolved -> Closed)
function getNextStatusActionHtml(j) {
  const safeRef = (j.ref_no || '').replace(/'/g, "\\'");
  switch (j.status) {
    case "Open":
      return `<button class="btn btn-cyan btn-sm" onclick="quickUpdateJobStatus(${j.id}, 'In Progress', '${safeRef}')" title="Start working on ticket — advance to In Progress">▶️ In Progress</button>`;
    case "In Progress":
      return `<button class="btn btn-accent btn-sm" onclick="openResolveJobModal(${j.id}, '${safeRef}')" title="Complete Assessment & Mark Resolved">✅ Resolve</button>`;
    case "Resolved":
      return `<button class="btn btn-secondary btn-sm" onclick="openCloseJobModal(${j.id}, '${safeRef}')" title="Record Client Evaluation & Close Ticket">🔒 Close</button>`;
    case "Closed":
      return `<button class="btn btn-secondary btn-sm" onclick="quickUpdateJobStatus(${j.id}, 'Open', '${safeRef}')" title="Reopen this job sheet" style="opacity: 0.75;">🔄 Reopen</button>`;
    default:
      return '';
  }
}

// Staged Modal: Section 2 - Technical Assessment & Resolve
async function openResolveJobModal(jobId, refNo) {
  resolvingJobId = jobId;
  try {
    const res = await fetch(`/api/jobs/${jobId}/`);
    const j = await res.json();

    const titleRef = document.getElementById("resolveJobRefTitle");
    if (titleRef) titleRef.textContent = `#${j.ref_no || refNo}`;

    document.getElementById("resolveDiagnosis").value = j.assessment || "";
    document.getElementById("resolveActions").value = j.actions_taken || "";
    document.getElementById("resolveAppSoftware").value = j.app_software_description || "";
    document.getElementById("resolveAppVersion").value = j.app_software_version || "";
    document.getElementById("resolveConnectivity").value = j.connectivity_description || "";
    document.getElementById("resolveUserAccount").value = j.user_account_description || "";

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const nowStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    document.getElementById("resolveDateReceived").value = j.date_time_received || `${j.date_of_filing} 08:30 AM`;
    document.getElementById("resolveDateCompleted").value = j.date_time_completed || nowStr;
    document.getElementById("resolveFulfilledBy").value = j.fulfilled_by || "";
    document.getElementById("resolveReviewedBy").value = j.reviewed_by || "";

    document.getElementById("resolveJobModal")?.classList.add("active");
  } catch (err) {
    console.error("openResolveJobModal error:", err);
    showToast("Error loading job sheet details", "error");
  }
}

async function handleResolveFormSubmit(e) {
  e.preventDefault();
  if (!resolvingJobId) return;

  const payload = {
    status: "Resolved",
    update_asset_status: "In Use",
    assessment: document.getElementById("resolveDiagnosis").value.trim(),
    actions_taken: document.getElementById("resolveActions").value.trim(),
    app_software_description: document.getElementById("resolveAppSoftware").value.trim(),
    app_software_version: document.getElementById("resolveAppVersion").value.trim(),
    connectivity_description: document.getElementById("resolveConnectivity").value.trim(),
    user_account_description: document.getElementById("resolveUserAccount").value.trim(),
    date_time_received: document.getElementById("resolveDateReceived").value.trim(),
    date_time_completed: document.getElementById("resolveDateCompleted").value.trim(),
    fulfilled_by: document.getElementById("resolveFulfilledBy").value.trim(),
    reviewed_by: document.getElementById("resolveReviewedBy").value.trim()
  };

  try {
    const res = await fetch(`/api/jobs/${resolvingJobId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Failed to resolve ticket", "error");
      return;
    }

    showToast("Technical assessment saved & ticket marked Resolved!", "success");
    closeAllModals();
    await loadJobs();
    await loadAssets();
    await loadStats();
    await loadRepairHistory();
  } catch (err) {
    console.error("handleResolveFormSubmit error:", err);
    showToast("Network error saving assessment", "error");
  } finally {
    resolvingJobId = null;
  }
}

// Staged Modal: Section 3 - Client Evaluation & Close
async function openCloseJobModal(jobId, refNo) {
  closingJobId = jobId;
  try {
    const res = await fetch(`/api/jobs/${jobId}/`);
    const j = await res.json();

    const titleRef = document.getElementById("closeJobRefTitle");
    if (titleRef) titleRef.textContent = `#${j.ref_no || refNo}`;

    document.getElementById("closeEvalAddressed").value = j.concern_addressed || "Yes";
    document.getElementById("closeEvalSupport").value = j.it_support_satisfaction || "Very Satisfied";
    document.getElementById("closeEvalSolution").value = j.solution_satisfaction || "Very Satisfied";
    document.getElementById("closeComments").value = j.comments_suggestions || "";

    document.getElementById("closeJobModal")?.classList.add("active");
  } catch (err) {
    console.error("openCloseJobModal error:", err);
    showToast("Error loading job sheet details", "error");
  }
}

async function handleCloseFormSubmit(e) {
  e.preventDefault();
  if (!closingJobId) return;

  const payload = {
    status: "Closed",
    update_asset_status: "In Use",
    concern_addressed: document.getElementById("closeEvalAddressed").value,
    it_support_satisfaction: document.getElementById("closeEvalSupport").value,
    solution_satisfaction: document.getElementById("closeEvalSolution").value,
    comments_suggestions: document.getElementById("closeComments").value.trim()
  };

  try {
    const res = await fetch(`/api/jobs/${closingJobId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Failed to close ticket", "error");
      return;
    }

    showToast("Client evaluation recorded & ticket closed!", "success");
    closeAllModals();
    await loadJobs();
    await loadAssets();
    await loadStats();
    await loadRepairHistory();
  } catch (err) {
    console.error("handleCloseFormSubmit error:", err);
    showToast("Network error closing ticket", "error");
  } finally {
    closingJobId = null;
  }
}

// Quick 1-Click Status Transition (For In Progress and Reopen)
async function quickUpdateJobStatus(jobId, newStatus, refNo) {
  try {
    const payload = { status: newStatus };
    if (newStatus === "Resolved" || newStatus === "Closed") {
      payload.update_asset_status = "In Use";
    } else if (newStatus === "In Progress" || newStatus === "Open") {
      payload.update_asset_status = "Under Repair";
    }

    const res = await fetch(`/api/jobs/${jobId}/`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Failed to update status", "error");
      return;
    }

    showToast(`Job Ref #${refNo || jobId} status updated to "${newStatus}"`, "success");
    await loadJobs();
    await loadAssets();
    await loadStats();
    await loadRepairHistory();
  } catch (err) {
    console.error("quickUpdateJobStatus error:", err);
    showToast("Network error updating status", "error");
  }
}

// Delete Job Sheet Modal Logic
let pendingDeleteJobId = null;
let pendingDeleteJobRef = null;

function promptDeleteJobSheet(jobId, refNo) {
  pendingDeleteJobId = jobId;
  pendingDeleteJobRef = refNo;
  const refElem = document.getElementById("deleteJobRefNo");
  if (refElem) refElem.textContent = refNo ? `#${refNo}` : "";
  document.getElementById("deleteJobModal")?.classList.add("active");
}

async function confirmDeleteJobSheet() {
  if (!pendingDeleteJobId) return;
  const id = pendingDeleteJobId;
  const ref = pendingDeleteJobRef;
  closeAllModals();

  try {
    const res = await fetch(`/api/jobs/${id}/`, {
      method: "DELETE"
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Failed to delete job sheet", "error");
      return;
    }

    showToast(`Job Sheet ${ref ? 'Ref #' + ref : ''} deleted successfully`, "success");
    await loadJobs();
    await loadAssets();
    await loadStats();
    await loadRepairHistory();
  } catch (err) {
    console.error("confirmDeleteJobSheet error:", err);
    showToast("Network error deleting job sheet", "error");
  } finally {
    pendingDeleteJobId = null;
    pendingDeleteJobRef = null;
  }
}

function deleteCurrentEditingJobSheet() {
  if (!editingJobId) return;
  const title = document.getElementById("jobSheetModalTitle")?.textContent || "";
  const refNo = title.replace("Update Job Sheet: Ref #", "").trim();
  const id = editingJobId;
  closeAllModals();
  promptDeleteJobSheet(id, refNo);
}

// Official DPWH Job Sheet Form Print Preview
async function openPrintableJobSheet(jobId) {
  try {
    const res = await fetch(`/api/jobs/${jobId}/`);
    const j = await res.json();

    // Ref. No. kept BLANK per official DPWH template format requirement
    const refNoElem = document.getElementById("printJobNo");
    if (refNoElem) {
      refNoElem.textContent = "";
    }

    // Client Info
    document.getElementById("printClientName").textContent = j.full_name || "";
    const off = getOfficeInfo(j.section_division);
    document.getElementById("printSection").textContent = off.short;
    document.getElementById("printDateFiling").textContent = j.date_of_filing || "";
    document.getElementById("printContact").textContent = j.contact_no || "";
    document.getElementById("printIncident").textContent = j.incident_description || "";

    // Hardware
    document.getElementById("printHwType").textContent = j.hardware_type || "Desktop";
    document.getElementById("printHwBrand").textContent = j.hardware_brand_model || "";
    document.getElementById("printHwSerial").textContent = j.hardware_serial_number || "";
    document.getElementById("printHwCompName").textContent = j.hardware_computer_name || "";

    // Software & Network
    document.getElementById("printAppDesc").textContent = j.app_software_description || "";
    document.getElementById("printAppVer").textContent = j.app_software_version || "";
    document.getElementById("printConnDesc").textContent = j.connectivity_description || "";
    document.getElementById("printUserAcct").textContent = j.user_account_description || "";

    // Technical Assessment & Actions
    document.getElementById("printAssessment").textContent = j.assessment || "";
    document.getElementById("printActionsTaken").textContent = j.actions_taken || "";

    // Mode of Filing Checkboxes
    const mode = j.mode_of_filing || "Walk-in";
    const boxWalkin = document.querySelector("#printModeWalkin .dpwh-box");
    const boxPhone = document.querySelector("#printModePhone .dpwh-box");
    const boxEmail = document.querySelector("#printModeEmail .dpwh-box");
    if (boxWalkin) boxWalkin.textContent = (mode === "Walk-in") ? "✓" : "";
    if (boxPhone) boxPhone.textContent = (mode === "Telephone Call" || mode === "Telphone Call") ? "✓" : "";
    if (boxEmail) boxEmail.textContent = (mode === "Email") ? "✓" : "";

    document.getElementById("printDateReceived").textContent = j.date_time_received || "";
    document.getElementById("printDateCompleted").textContent = j.date_time_completed || "";
    document.getElementById("printFulfilledBy").textContent = j.fulfilled_by || "";
    document.getElementById("printReviewedBy").textContent = j.reviewed_by || "";

    // Evaluation checkboxes
    const addressed = j.concern_addressed || "";
    const boxYes = document.querySelector("#evalCheckYes .dpwh-box");
    const boxNo = document.querySelector("#evalCheckNo .dpwh-box");
    if (boxYes) boxYes.textContent = (addressed === "Yes") ? "✓" : "";
    if (boxNo) boxNo.textContent = (addressed === "No") ? "✓" : "";

    const sat = j.it_support_satisfaction || "";
    const boxSupVery = document.querySelector("#evalCheckSupVery .dpwh-box");
    const boxSupSat = document.querySelector("#evalCheckSupSat .dpwh-box");
    const boxSupNot = document.querySelector("#evalCheckSupNot .dpwh-box");
    if (boxSupVery) boxSupVery.textContent = (sat === "Very Satisfied") ? "✓" : "";
    if (boxSupSat) boxSupSat.textContent = (sat === "Satisfied") ? "✓" : "";
    if (boxSupNot) boxSupNot.textContent = (sat === "Not Satisfied") ? "✓" : "";

    const solSat = j.solution_satisfaction || sat;
    const boxSolVery = document.querySelector("#evalCheckSolVery .dpwh-box");
    const boxSolSat = document.querySelector("#evalCheckSolSat .dpwh-box");
    const boxSolNot = document.querySelector("#evalCheckSolNot .dpwh-box");
    if (boxSolVery) boxSolVery.textContent = (solSat === "Very Satisfied") ? "✓" : "";
    if (boxSolSat) boxSolSat.textContent = (solSat === "Satisfied") ? "✓" : "";
    if (boxSolNot) boxSolNot.textContent = (solSat === "Not Satisfied") ? "✓" : "";

    document.getElementById("printComments").textContent = j.comments_suggestions || "";

    document.getElementById("printableJobSheetModal").classList.add("active");
  } catch (err) {
    showToast("Error preparing printable job sheet", "error");
  }
}

// Print Handler for Printable DPWH Job Sheet Form
function printCurrentSheet() {
  window.print();
}
window.printCurrentSheet = printCurrentSheet;

// Safe string helper
function safeStr(val) {
  return (val === null || val === undefined) ? "" : String(val).toLowerCase();
}

// Global Filter Helper
function filterDataGlobally(query) {
  const q = safeStr(query).trim();

  if (!q) {
    renderAssetsTable(currentAssets);
    renderJobsTable(currentJobs);
    renderTimeline(currentJobs);
    return;
  }

  // Filter Assets across all spreadsheet & specs fields
  const filteredAssets = currentAssets.filter(a =>
    safeStr(a.end_user).includes(q) ||
    safeStr(a.serial_number).includes(q) ||
    safeStr(a.brand_model).includes(q) ||
    safeStr(a.computer_name).includes(q) ||
    safeStr(a.monitor_serial).includes(q) ||
    safeStr(a.ups_serial).includes(q) ||
    safeStr(a.office).includes(q) ||
    safeStr(a.device).includes(q) ||
    safeStr(a.processor).includes(q) ||
    safeStr(a.status).includes(q) ||
    safeStr(a.notes).includes(q)
  );
  renderAssetsTable(filteredAssets);

  // Filter Jobs across all DPWH job sheet fields
  const filteredJobs = currentJobs.filter(j =>
    safeStr(j.ref_no).includes(q) ||
    safeStr(j.full_name).includes(q) ||
    safeStr(j.section_division).includes(q) ||
    safeStr(j.incident_description).includes(q) ||
    safeStr(j.hardware_serial_number).includes(q) ||
    safeStr(j.hardware_brand_model).includes(q) ||
    safeStr(j.hardware_computer_name).includes(q) ||
    safeStr(j.fulfilled_by).includes(q) ||
    safeStr(j.status).includes(q) ||
    safeStr(j.priority).includes(q) ||
    safeStr(j.assessment).includes(q) ||
    safeStr(j.actions_taken).includes(q)
  );
  renderJobsTable(filteredJobs);
  renderTimeline(filteredJobs);
}

// Status badge CSS classes
function getStatusClass(status) {
  switch (status) {
    case "In Use": return "status-in-use";
    case "Available / Spare": return "status-spare";
    case "Under Repair":
    case "In Progress": return "status-repair";
    case "Decommissioned": return "status-decommissioned";
    case "Resolved":
    case "Closed": return "status-in-use";
    case "Open": return "status-spare";
    default: return "status-spare";
  }
}

// Expose handlers globally for HTML inline onclick handlers
window.openResolveJobModal = openResolveJobModal;
window.openCloseJobModal = openCloseJobModal;
window.quickUpdateJobStatus = quickUpdateJobStatus;
window.openNewJobSheetModal = openNewJobSheetModal;
window.openEditJobSheetModal = openEditJobSheetModal;
window.promptDeleteJobSheet = promptDeleteJobSheet;
window.confirmDeleteJobSheet = confirmDeleteJobSheet;
window.deleteCurrentEditingJobSheet = deleteCurrentEditingJobSheet;
window.openPrintableJobSheet = openPrintableJobSheet;

