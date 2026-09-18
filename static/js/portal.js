/**
 * ICT Asset & Job Sheet Portal JavaScript Logic
 * Aligned with ODE-ICTS Computer Inventory Sheet & DPWH Official Job Sheet Form
 */

let currentAssets = [];
let currentJobs = [];
let editingAssetId = null;
let editingJobId = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupEventListeners();
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
  // Global Search
  const globalSearch = document.getElementById("globalSearch");
  globalSearch.addEventListener("input", (e) => {
    const val = e.target.value.trim().toLowerCase();
    filterDataGlobally(val);
  });

  // Asset Filter Controls
  document.getElementById("assetStatusFilter")?.addEventListener("change", loadAssets);
  document.getElementById("assetTypeFilter")?.addEventListener("change", loadAssets);
  document.getElementById("assetSearchInput")?.addEventListener("input", loadAssets);

  // Job Filter Controls
  document.getElementById("jobStatusFilter")?.addEventListener("change", loadJobs);
  document.getElementById("jobPriorityFilter")?.addEventListener("change", loadJobs);
  document.getElementById("jobSearchInput")?.addEventListener("input", loadJobs);

  // History Filter
  document.getElementById("historySearchInput")?.addEventListener("input", loadRepairHistory);

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

  // Asset selector in Job Sheet Modal - auto fills client & hardware info
  document.getElementById("jobAssetSelect")?.addEventListener("change", (e) => {
    updateJobSheetAssetPreview(e.target.value);
  });
}

function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(el => el.classList.remove("active"));
  editingAssetId = null;
  editingJobId = null;
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
          <div style="font-weight: 600; font-size: 0.88rem;">${job.ref_no} &bull; <span style="color: #38bdf8;">${job.full_name || 'N/A'}</span></div>
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
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding: 30px; color: var(--text-muted);">No computers found matching your criteria.</td></tr>`;
    return;
  }

  // Exact Excel Columns:
  // END-USER | DEVICE | BRAND and MODEL | SERIAL NUMBER | COMPUTER NAME | MONITOR with S/N | UPS with S/N | OFFICE | REPAIR HISTORY | ACTIONS
  tbody.innerHTML = assets.map(a => `
    <tr>
      <td>
        <strong style="color: #38bdf8; cursor: pointer;" onclick="viewAssetDetails(${a.id})" title="Click to view full profile">${a.end_user}</strong>
      </td>
      <td>
        <span style="font-size: 0.82rem; color: var(--text-secondary);">${a.device}</span>
      </td>
      <td>
        <div style="font-weight: 600; color: #fff;">${a.brand_model}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${a.processor || ''}</div>
      </td>
      <td>
        <span class="serial-tag">${a.serial_number}</span>
      </td>
      <td>
        <span style="font-family: monospace; font-size: 0.82rem; color: #e2e8f0;">${a.computer_name || '-'}</span>
      </td>
      <td>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${a.monitor_serial || '-'}</span>
      </td>
      <td>
        <span style="font-size: 0.78rem; color: var(--text-secondary);">${a.ups_serial || '-'}</span>
      </td>
      <td>
        <span class="badge-pill" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${a.office}</span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewAssetDetails(${a.id})" title="View Repair History">
          📜 ${a.total_repairs} repair${a.total_repairs === 1 ? '' : 's'}
        </button>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="viewAssetDetails(${a.id})" title="Profile & Repair History">🔍</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditAssetModal(${a.id})" title="Edit Details">✏️</button>
          <button class="btn btn-primary btn-sm" onclick="openNewJobSheetForAsset(${a.id})" title="File Official Job Sheet">🛠️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function populateAssetSelect(assets) {
  const select = document.getElementById("jobAssetSelect");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="">-- Select Computer (End-User / Serial No.) --</option>` +
    assets.map(a => `<option value="${a.id}">${a.end_user} | ${a.brand_model} (${a.serial_number}) - ${a.office}</option>`).join("");
  
  if (currentVal) select.value = currentVal;
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

  card.style.display = "grid";
  document.getElementById("previewOwner").textContent = asset.end_user || "Unassigned";
  document.getElementById("previewModel").textContent = asset.brand_model || "N/A";
  document.getElementById("previewSerial").textContent = asset.serial_number || "N/A";
  document.getElementById("previewCompName").textContent = asset.computer_name || "N/A";
  document.getElementById("previewOffice").textContent = asset.office || "ODE-ICTS";
  document.getElementById("previewStatus").textContent = asset.status || "N/A";

  // Auto-fill Client and Hardware info fields in Job Sheet Form
  if (!editingJobId) {
    document.getElementById("jobClientName").value = asset.end_user || "";
    document.getElementById("jobSection").value = asset.office || "ODE-ICTS";
    document.getElementById("jobDateFiling").value = new Date().toISOString().split("T")[0];
    document.getElementById("jobDateReceived").value = `${new Date().toISOString().split("T")[0]} 08:30 AM`;
  }
}

// Job Sheets & Repair Management (DPWH Aligned)
async function loadJobs() {
  try {
    const status = document.getElementById("jobStatusFilter")?.value || "";
    const priority = document.getElementById("jobPriorityFilter")?.value || "";
    const search = document.getElementById("jobSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (priority) params.append("priority", priority);
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

  tbody.innerHTML = jobs.map(j => `
    <tr>
      <td>
        <strong style="color: #38bdf8; font-family: monospace; font-size: 0.9rem;">${j.ref_no}</strong>
      </td>
      <td>
        <div style="font-weight: 600; color: #fff;">${j.full_name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${j.contact_no ? 'Tel: ' + j.contact_no : ''}</div>
      </td>
      <td>
        <span class="badge-pill" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${j.section_division}</span>
      </td>
      <td>
        <div><strong style="color: #fff;">${j.hardware_brand_model || 'N/A'}</strong></div>
        <span class="serial-tag">${j.hardware_serial_number || 'N/A'}</span>
      </td>
      <td>
        <div style="max-width: 260px; font-size: 0.84rem; color: #f1f5f9;">
          ${j.incident_description}
        </div>
      </td>
      <td>
        <span class="status-badge ${getStatusClass(j.status)}">${j.status}</span>
        <div style="margin-top: 3px;">
          <span class="priority-badge priority-${j.priority}">${j.priority}</span>
        </div>
      </td>
      <td>
        <div style="font-size: 0.84rem;">${j.fulfilled_by || 'Unassigned'}</div>
      </td>
      <td>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">${j.date_of_filing || ''}</div>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="openEditJobSheetModal(${j.id})" title="Update Assessment & Actions">✏️</button>
          <button class="btn btn-primary btn-sm" onclick="openPrintableJobSheet(${j.id})" title="Print Official DPWH Job Sheet Form">🖨️ Print</button>
        </div>
      </td>
    </tr>
  `).join("");
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
          <strong style="color: #fff;">${j.full_name}</strong> (${j.hardware_brand_model} &bull; <code>${j.hardware_serial_number}</code>)
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
    document.getElementById("detailDept").textContent = asset.office;
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
  document.getElementById("assetDeptInput").value = "ODE-ICTS";
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
    document.getElementById("assetDeptInput").value = a.office;
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
  const payload = {
    end_user: document.getElementById("assetOwnerInput").value.trim(),
    device: document.getElementById("assetTypeSelect").value,
    brand_model: document.getElementById("assetModelInput").value.trim(),
    serial_number: document.getElementById("assetSerialInput").value.trim().toUpperCase(),
    computer_name: document.getElementById("assetComputerNameInput").value.trim(),
    monitor_serial: document.getElementById("assetMonitorInput").value.trim(),
    ups_serial: document.getElementById("assetUpsInput").value.trim(),
    office: document.getElementById("assetDeptInput").value.trim(),
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
  document.getElementById("jobSheetModalTitle").textContent = "Official DPWH Job Sheet Form";
  document.getElementById("jobSheetForm").reset();
  document.getElementById("jobDateFiling").value = new Date().toISOString().split("T")[0];
  document.getElementById("jobDateReceived").value = `${new Date().toISOString().split("T")[0]} 08:30 AM`;
  document.getElementById("jobSection").value = "ODE-ICTS";
  document.getElementById("jobAssetPreviewCard").style.display = "none";
  document.getElementById("jobSheetModal").classList.add("active");
}

function openNewJobSheetForAsset(assetId) {
  openNewJobSheetModal();
  const select = document.getElementById("jobAssetSelect");
  if (select) {
    select.value = assetId;
    updateJobSheetAssetPreview(assetId);
  }
}

async function openEditJobSheetModal(jobId) {
  editingJobId = jobId;
  try {
    const res = await fetch(`/api/jobs/${jobId}/`);
    const j = await res.json();

    document.getElementById("jobSheetModalTitle").textContent = `Update Job Sheet: Ref #${j.ref_no}`;
    document.getElementById("jobAssetSelect").value = j.asset_id;
    updateJobSheetAssetPreview(j.asset_id);

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
    document.getElementById("jobPrioritySelect").value = j.priority || "Medium";
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
    priority: document.getElementById("jobPrioritySelect").value,
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

// Official DPWH Job Sheet Form Print Preview
async function openPrintableJobSheet(jobId) {
  try {
    const res = await fetch(`/api/jobs/${jobId}/`);
    const j = await res.json();

    document.getElementById("printJobNo").textContent = j.ref_no || "2026-00-000";
    
    // Client Info
    document.getElementById("printClientName").textContent = j.full_name || "-";
    document.getElementById("printSection").textContent = j.section_division || "ODE-ICTS";
    document.getElementById("printDateFiling").textContent = j.date_of_filing || "-";
    document.getElementById("printContact").textContent = j.contact_no || "-";
    document.getElementById("printIncident").textContent = j.incident_description || "-";
    document.getElementById("printClientSigName").textContent = j.full_name || "Client's Signature";

    // Hardware
    document.getElementById("printHwType").textContent = j.hardware_type || "Desktop";
    document.getElementById("printHwBrand").textContent = j.hardware_brand_model || "-";
    document.getElementById("printHwSerial").textContent = j.hardware_serial_number || "-";
    document.getElementById("printHwCompName").textContent = j.hardware_computer_name || "-";

    // Software & Network
    document.getElementById("printAppDesc").textContent = j.app_software_description || "N/A";
    document.getElementById("printAppVer").textContent = j.app_software_version || "-";
    document.getElementById("printConnDesc").textContent = j.connectivity_description || "N/A";
    document.getElementById("printUserAcct").textContent = j.user_account_description || "N/A";

    // Technical Assessment & Actions
    document.getElementById("printAssessment").textContent = j.assessment || "Pending assessment.";
    document.getElementById("printActionsTaken").textContent = j.actions_taken || "Pending action.";

    // Mode of Filing Checkboxes
    const mode = j.mode_of_filing || "Walk-in";
    document.getElementById("printModeWalkin").innerHTML = mode === "Walk-in" ? "<strong>[X] Walk-in</strong>" : "[ ] Walk-in";
    document.getElementById("printModePhone").innerHTML = mode === "Telephone Call" ? "<strong>[X] Telephone Call</strong>" : "[ ] Telephone Call";
    document.getElementById("printModeEmail").innerHTML = mode === "Email" ? "<strong>[X] Email</strong>" : "[ ] Email";

    document.getElementById("printDateReceived").textContent = j.date_time_received || "-";
    document.getElementById("printDateCompleted").textContent = j.date_time_completed || "In Progress";
    document.getElementById("printFulfilledBy").textContent = j.fulfilled_by || "ICT Support";
    document.getElementById("printReviewedBy").textContent = j.reviewed_by || "Head, ICT Unit";

    // Evaluation checkboxes
    const addressed = j.concern_addressed || "";
    document.getElementById("evalCheckYes").textContent = addressed === "Yes" ? "✓" : " ";
    document.getElementById("evalCheckNo").textContent = addressed === "No" ? "✓" : " ";

    const sat = j.it_support_satisfaction || "";
    document.getElementById("evalCheckSupVery").textContent = sat === "Very Satisfied" ? "✓" : " ";
    document.getElementById("evalCheckSupSat").textContent = sat === "Satisfied" ? "✓" : " ";
    document.getElementById("evalCheckSupNot").textContent = sat === "Not Satisfied" ? "✓" : " ";

    const solSat = j.solution_satisfaction || sat;
    document.getElementById("evalCheckSolVery").textContent = solSat === "Very Satisfied" ? "✓" : " ";
    document.getElementById("evalCheckSolSat").textContent = solSat === "Satisfied" ? "✓" : " ";
    document.getElementById("evalCheckSolNot").textContent = solSat === "Not Satisfied" ? "✓" : " ";

    document.getElementById("printComments").textContent = j.comments_suggestions || "None";

    document.getElementById("printableJobSheetModal").classList.add("active");
  } catch (err) {
    showToast("Error preparing printable job sheet", "error");
  }
}

// Trigger print
function printCurrentSheet() {
  window.print();
}

// Global Filter Helper
function filterDataGlobally(query) {
  if (!query) {
    renderAssetsTable(currentAssets);
    renderJobsTable(currentJobs);
    return;
  }
  const filteredAssets = currentAssets.filter(a => 
    a.end_user.toLowerCase().includes(query) ||
    a.serial_number.toLowerCase().includes(query) ||
    a.brand_model.toLowerCase().includes(query) ||
    (a.computer_name && a.computer_name.toLowerCase().includes(query)) ||
    a.office.toLowerCase().includes(query)
  );
  renderAssetsTable(filteredAssets);

  const filteredJobs = currentJobs.filter(j => 
    j.ref_no.toLowerCase().includes(query) ||
    j.full_name.toLowerCase().includes(query) ||
    j.incident_description.toLowerCase().includes(query) ||
    (j.hardware_serial_number && j.hardware_serial_number.toLowerCase().includes(query)) ||
    (j.fulfilled_by && j.fulfilled_by.toLowerCase().includes(query))
  );
  renderJobsTable(filteredJobs);
}

// Status badge CSS classes
function getStatusClass(status) {
  switch (status) {
    case "In Use": return "status-in-use";
    case "Available / Spare": return "status-spare";
    case "Under Repair":
    case "In Progress":
    case "Waiting for Parts": return "status-repair";
    case "Decommissioned": return "status-decommissioned";
    case "Resolved":
    case "Closed": return "status-in-use";
    case "Open": return "status-spare";
    default: return "status-spare";
  }
}
