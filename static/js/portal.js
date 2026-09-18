/**
 * ICT Asset & Job Sheet Portal JavaScript Logic
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

  // Refresh relevant view
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

  // Asset selector in Job Sheet Modal - updates spec preview card
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
    const res = await fetch("/api/stats");
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
    const res = await fetch("/api/jobs");
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
          <div style="font-weight: 600; font-size: 0.88rem;">${job.job_no} &bull; <span style="color: #38bdf8;">${job.asset_tag || 'N/A'}</span></div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); max-width: 320px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
            ${job.issue_description}
          </div>
        </div>
        <div style="text-align: right;">
          <span class="status-badge ${getStatusClass(job.status)}">${job.status}</span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 3px;">${job.date_received || ''}</div>
        </div>
      </div>
    `).join("");
  } catch (err) {
    console.error(err);
  }
}

// Computer Assets Management
async function loadAssets() {
  try {
    const status = document.getElementById("assetStatusFilter")?.value || "";
    const deviceType = document.getElementById("assetTypeFilter")?.value || "";
    const search = document.getElementById("assetSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (deviceType) params.append("device_type", deviceType);
    if (search) params.append("search", search);

    const res = await fetch(`/api/assets?${params.toString()}`);
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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color: var(--text-muted);">No computers found matching your criteria.</td></tr>`;
    return;
  }

  tbody.innerHTML = assets.map(a => `
    <tr>
      <td>
        <strong style="color: #38bdf8; cursor: pointer;" onclick="viewAssetDetails(${a.id})">${a.asset_tag}</strong>
      </td>
      <td>
        <span class="serial-tag">${a.serial_no}</span>
      </td>
      <td>
        <div class="table-device-cell">
          <span class="device-title">${a.brand_model}</span>
          <span class="device-sub">${a.device_type} &bull; ${a.processor || 'Specs not set'}</span>
        </div>
      </td>
      <td>
        <div style="font-size: 0.85rem; font-weight: 500;">${a.owner_name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${a.department}</div>
      </td>
      <td>
        <span style="font-size: 0.8rem; color: var(--text-secondary);">${a.location || 'N/A'}</span>
      </td>
      <td>
        <span class="status-badge ${getStatusClass(a.status)}">${a.status}</span>
      </td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewAssetDetails(${a.id})" title="View Repair History">
          📜 ${a.total_repairs} repairs
        </button>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="viewAssetDetails(${a.id})" title="Details & Repair History">🔍</button>
          <button class="btn btn-secondary btn-sm" onclick="openEditAssetModal(${a.id})" title="Edit Specs / Owner">✏️</button>
          <button class="btn btn-primary btn-sm" onclick="openNewJobSheetForAsset(${a.id})" title="Create Job Sheet">🛠️</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function populateAssetSelect(assets) {
  const select = document.getElementById("jobAssetSelect");
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = `<option value="">-- Select Computer (Asset Tag / Serial) --</option>` +
    assets.map(a => `<option value="${a.id}">${a.asset_tag} | ${a.serial_no} (${a.brand_model} - ${a.owner_name})</option>`).join("");
  
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
  document.getElementById("previewModel").textContent = asset.brand_model || "N/A";
  document.getElementById("previewSerial").textContent = asset.serial_no || "N/A";
  document.getElementById("previewOwner").textContent = `${asset.owner_name} (${asset.department})`;
  document.getElementById("previewCpu").textContent = asset.processor || "N/A";
  document.getElementById("previewRam").textContent = asset.ram || "N/A";
  document.getElementById("previewStorage").textContent = asset.storage || "N/A";
  document.getElementById("previewOs").textContent = asset.os || "N/A";
  document.getElementById("previewStatus").textContent = asset.status || "N/A";
}

// Job Sheets & Repair System
async function loadJobs() {
  try {
    const status = document.getElementById("jobStatusFilter")?.value || "";
    const priority = document.getElementById("jobPriorityFilter")?.value || "";
    const search = document.getElementById("jobSearchInput")?.value || "";

    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (priority) params.append("priority", priority);
    if (search) params.append("search", search);

    const res = await fetch(`/api/jobs?${params.toString()}`);
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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 30px; color: var(--text-muted);">No job sheets found.</td></tr>`;
    return;
  }

  tbody.innerHTML = jobs.map(j => `
    <tr>
      <td>
        <strong style="color: #38bdf8; font-family: monospace; font-size: 0.9rem;">${j.job_no}</strong>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${j.date_received || ''}</div>
      </td>
      <td>
        <div><strong style="color: #fff;">${j.asset_tag || 'N/A'}</strong></div>
        <span class="serial-tag">${j.serial_no || 'N/A'}</span>
      </td>
      <td>
        <div style="max-width: 260px;">
          <div style="font-weight: 500; font-size: 0.86rem; color: #f1f5f9;">${j.issue_description}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 2px;">
            ${j.parts_replaced ? '🔧 Parts: ' + j.parts_replaced : ''}
          </div>
        </div>
      </td>
      <td>
        <span class="priority-badge priority-${j.priority}">${j.priority}</span>
      </td>
      <td>
        <span class="status-badge ${getStatusClass(j.status)}">${j.status}</span>
      </td>
      <td>
        <div style="font-size: 0.84rem;">${j.technician_name || 'Unassigned'}</div>
      </td>
      <td>
        <div style="font-weight: 600; font-size: 0.85rem; color: ${j.cost > 0 ? '#34d399' : 'inherit'};">
          ${j.cost > 0 ? '$' + j.cost.toFixed(2) : '-'}
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-sm" onclick="openEditJobSheetModal(${j.id})" title="Update Job Sheet / Repair Notes">✏️</button>
          <button class="btn btn-primary btn-sm" onclick="openPrintableJobSheet(${j.id})" title="Printable Job Sheet Form">🖨️ Print</button>
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

    const res = await fetch(`/api/jobs?${params.toString()}`);
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
          <span class="timeline-job-no">${j.job_no}</span>
          <span style="margin: 0 8px; color: var(--text-muted);">&bull;</span>
          <strong style="color: #fff;">${j.asset_tag || 'N/A'}</strong> (${j.brand_model || ''})
        </div>
        <div>
          <span class="status-badge ${getStatusClass(j.status)}" style="margin-right: 8px;">${j.status}</span>
          <span class="timeline-date">${j.date_received}</span>
        </div>
      </div>
      <div class="timeline-body">
        <p><strong>Reported Issue:</strong> ${j.issue_description}</p>
        ${j.diagnosis ? `<p style="margin-top: 4px;"><strong>Diagnosis:</strong> ${j.diagnosis}</p>` : ''}
        ${j.action_taken ? `<p style="margin-top: 4px;"><strong>Action Taken:</strong> ${j.action_taken}</p>` : ''}
        ${j.parts_replaced ? `<p style="margin-top: 4px;"><strong>Parts Replaced:</strong> ${j.parts_replaced}</p>` : ''}
      </div>
      <div class="timeline-meta">
        <span>👨‍💻 Technician: <strong>${j.technician_name || 'Unassigned'}</strong></span>
        <span>👤 User: <strong>${j.owner_name || 'N/A'}</strong> (${j.department || 'N/A'})</span>
        <span>🏷️ Serial: <code>${j.serial_no || 'N/A'}</code></span>
        ${j.cost > 0 ? `<span>💰 Cost: <strong>$${j.cost.toFixed(2)}</strong></span>` : ''}
        ${j.date_completed ? `<span>✅ Completed: <strong>${j.date_completed}</strong></span>` : ''}
      </div>
    </div>
  `).join("");
}

// Asset Details & Repair History Modal
async function viewAssetDetails(assetId) {
  try {
    const res = await fetch(`/api/assets/${assetId}`);
    if (!res.ok) throw new Error("Asset not found");
    const asset = await res.json();

    document.getElementById("detailModalTitle").textContent = `${asset.asset_tag} — ${asset.brand_model}`;
    document.getElementById("detailTag").textContent = asset.asset_tag;
    document.getElementById("detailSerial").textContent = asset.serial_no;
    document.getElementById("detailType").textContent = asset.device_type;
    document.getElementById("detailModel").textContent = asset.brand_model;
    document.getElementById("detailStatus").innerHTML = `<span class="status-badge ${getStatusClass(asset.status)}">${asset.status}</span>`;

    document.getElementById("detailCpu").textContent = asset.processor || "Not specified";
    document.getElementById("detailRam").textContent = asset.ram || "Not specified";
    document.getElementById("detailStorage").textContent = asset.storage || "Not specified";
    document.getElementById("detailGpu").textContent = asset.gpu || "Not specified";
    document.getElementById("detailOs").textContent = asset.os || "Not specified";

    document.getElementById("detailOwner").textContent = asset.owner_name || "Unassigned";
    document.getElementById("detailDept").textContent = asset.department || "General Pool";
    document.getElementById("detailLocation").textContent = asset.location || "Not recorded";
    document.getElementById("detailWarranty").textContent = asset.warranty_expiry || "N/A";
    document.getElementById("detailNotes").textContent = asset.notes || "None";

    // Populate computer repair history
    const historyContainer = document.getElementById("assetRepairHistoryContainer");
    if (asset.job_sheets && asset.job_sheets.length > 0) {
      historyContainer.innerHTML = asset.job_sheets.map(job => `
        <div class="timeline-item" style="margin-bottom: 14px;">
          <div class="timeline-top">
            <span class="timeline-job-no">${job.job_no}</span>
            <div>
              <span class="status-badge ${getStatusClass(job.status)}" style="margin-right: 6px;">${job.status}</span>
              <span class="timeline-date">${job.date_received}</span>
            </div>
          </div>
          <div class="timeline-body">
            <p><strong>Issue:</strong> ${job.issue_description}</p>
            ${job.action_taken ? `<p style="margin-top: 4px;"><strong>Action Taken:</strong> ${job.action_taken}</p>` : ''}
            ${job.parts_replaced ? `<p style="margin-top: 4px;"><strong>Parts:</strong> ${job.parts_replaced}</p>` : ''}
          </div>
          <div class="timeline-meta">
            <span>Tech: <strong>${job.technician_name || 'Unassigned'}</strong></span>
            ${job.cost > 0 ? `<span>Cost: <strong>$${job.cost.toFixed(2)}</strong></span>` : ''}
            ${job.date_completed ? `<span>Resolved on: <strong>${job.date_completed}</strong></span>` : ''}
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

// Modal Handlers: Add / Edit Asset
function openNewAssetModal() {
  editingAssetId = null;
  document.getElementById("assetModalTitle").textContent = "Register New Computer / Asset";
  document.getElementById("assetForm").reset();
  document.getElementById("assetModal").classList.add("active");
}

async function openEditAssetModal(assetId) {
  editingAssetId = assetId;
  try {
    const res = await fetch(`/api/assets/${assetId}`);
    const a = await res.json();

    document.getElementById("assetModalTitle").textContent = `Edit Computer: ${a.asset_tag}`;
    document.getElementById("assetTagInput").value = a.asset_tag;
    document.getElementById("assetSerialInput").value = a.serial_no;
    document.getElementById("assetTypeSelect").value = a.device_type;
    document.getElementById("assetModelInput").value = a.brand_model;
    document.getElementById("assetCpuInput").value = a.processor;
    document.getElementById("assetRamInput").value = a.ram;
    document.getElementById("assetStorageInput").value = a.storage;
    document.getElementById("assetGpuInput").value = a.gpu;
    document.getElementById("assetOsInput").value = a.os;
    document.getElementById("assetOwnerInput").value = a.owner_name;
    document.getElementById("assetDeptInput").value = a.department;
    document.getElementById("assetLocationInput").value = a.location;
    document.getElementById("assetStatusSelect").value = a.status;
    document.getElementById("assetPurchaseDate").value = a.purchase_date;
    document.getElementById("assetWarrantyDate").value = a.warranty_expiry;
    document.getElementById("assetNotesInput").value = a.notes;

    document.getElementById("assetModal").classList.add("active");
  } catch (err) {
    showToast("Error loading asset", "error");
  }
}

async function handleAssetFormSubmit(e) {
  e.preventDefault();
  const payload = {
    asset_tag: document.getElementById("assetTagInput").value.trim(),
    serial_no: document.getElementById("assetSerialInput").value.trim(),
    device_type: document.getElementById("assetTypeSelect").value,
    brand_model: document.getElementById("assetModelInput").value.trim(),
    processor: document.getElementById("assetCpuInput").value.trim(),
    ram: document.getElementById("assetRamInput").value.trim(),
    storage: document.getElementById("assetStorageInput").value.trim(),
    gpu: document.getElementById("assetGpuInput").value.trim(),
    os: document.getElementById("assetOsInput").value.trim(),
    owner_name: document.getElementById("assetOwnerInput").value.trim(),
    department: document.getElementById("assetDeptInput").value.trim(),
    location: document.getElementById("assetLocationInput").value.trim(),
    status: document.getElementById("assetStatusSelect").value,
    purchase_date: document.getElementById("assetPurchaseDate").value,
    warranty_expiry: document.getElementById("assetWarrantyDate").value,
    notes: document.getElementById("assetNotesInput").value.trim()
  };

  try {
    const url = editingAssetId ? `/api/assets/${editingAssetId}` : `/api/assets`;
    const method = editingAssetId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || "Failed to save asset", "error");
      return;
    }

    showToast(editingAssetId ? "Computer asset updated successfully!" : "New computer registered!", "success");
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
  document.getElementById("jobSheetModalTitle").textContent = "Create New Maintenance / Repair Job Sheet";
  document.getElementById("jobSheetForm").reset();
  document.getElementById("jobDateReceived").value = new Date().toISOString().split("T")[0];
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
    const res = await fetch(`/api/jobs/${jobId}`);
    const j = await res.json();

    document.getElementById("jobSheetModalTitle").textContent = `Update Job Sheet: ${j.job_no}`;
    document.getElementById("jobAssetSelect").value = j.asset_id;
    updateJobSheetAssetPreview(j.asset_id);

    document.getElementById("jobIssueInput").value = j.issue_description;
    document.getElementById("jobPrioritySelect").value = j.priority;
    document.getElementById("jobStatusSelect").value = j.status;
    document.getElementById("jobTechInput").value = j.technician_name;
    document.getElementById("jobDiagnosisInput").value = j.diagnosis;
    document.getElementById("jobActionInput").value = j.action_taken;
    document.getElementById("jobPartsInput").value = j.parts_replaced;
    document.getElementById("jobCostInput").value = j.cost;
    document.getElementById("jobDateReceived").value = j.date_received;
    document.getElementById("jobDateCompleted").value = j.date_completed || "";
    document.getElementById("jobRemarksInput").value = j.remarks;

    document.getElementById("jobSheetModal").classList.add("active");
  } catch (err) {
    showToast("Error loading job sheet", "error");
  }
}

async function handleJobSheetFormSubmit(e) {
  e.preventDefault();
  const payload = {
    asset_id: parseInt(document.getElementById("jobAssetSelect").value),
    issue_description: document.getElementById("jobIssueInput").value.trim(),
    priority: document.getElementById("jobPrioritySelect").value,
    status: document.getElementById("jobStatusSelect").value,
    technician_name: document.getElementById("jobTechInput").value.trim(),
    diagnosis: document.getElementById("jobDiagnosisInput").value.trim(),
    action_taken: document.getElementById("jobActionInput").value.trim(),
    parts_replaced: document.getElementById("jobPartsInput").value.trim(),
    cost: parseFloat(document.getElementById("jobCostInput").value || 0.0),
    date_received: document.getElementById("jobDateReceived").value,
    date_completed: document.getElementById("jobDateCompleted").value || null,
    remarks: document.getElementById("jobRemarksInput").value.trim()
  };

  try {
    const url = editingJobId ? `/api/jobs/${editingJobId}` : `/api/jobs`;
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

    showToast(editingJobId ? "Job sheet updated successfully!" : "New job sheet created!", "success");
    closeAllModals();
    await loadJobs();
    await loadAssets();
    await loadStats();
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Printable Job Sheet Modal
async function openPrintableJobSheet(jobId) {
  try {
    const res = await fetch(`/api/jobs/${jobId}`);
    const j = await res.json();

    document.getElementById("printJobNo").textContent = j.job_no;
    document.getElementById("printDate").textContent = j.date_received || new Date().toISOString().split("T")[0];
    document.getElementById("printPriority").textContent = j.priority;
    document.getElementById("printStatus").textContent = j.status;

    // Asset Info
    document.getElementById("printAssetTag").textContent = j.asset_tag || "N/A";
    document.getElementById("printSerial").textContent = j.serial_no || "N/A";
    document.getElementById("printModel").textContent = j.brand_model || "N/A";
    document.getElementById("printOwner").textContent = j.owner_name || "Unassigned";
    document.getElementById("printDept").textContent = j.department || "General Pool";
    document.getElementById("printSpecs").textContent = `${j.processor || ''} | ${j.ram || ''} | ${j.storage || ''}`;

    // Repair Details
    document.getElementById("printIssue").textContent = j.issue_description || "N/A";
    document.getElementById("printDiagnosis").textContent = j.diagnosis || "Pending diagnostic inspection.";
    document.getElementById("printAction").textContent = j.action_taken || "Pending repair work.";
    document.getElementById("printParts").textContent = j.parts_replaced || "No parts replaced.";
    document.getElementById("printCost").textContent = j.cost > 0 ? `$${j.cost.toFixed(2)}` : "$0.00";
    document.getElementById("printTech").textContent = j.technician_name || "ICT Support Team";
    document.getElementById("printOwnerSigLabel").textContent = j.owner_name || "User";

    document.getElementById("printableJobSheetModal").classList.add("active");
  } catch (err) {
    showToast("Error preparing printable job sheet", "error");
  }
}

// Trigger browser print
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
    a.asset_tag.toLowerCase().includes(query) ||
    a.serial_no.toLowerCase().includes(query) ||
    a.brand_model.toLowerCase().includes(query) ||
    a.owner_name.toLowerCase().includes(query) ||
    a.department.toLowerCase().includes(query)
  );
  renderAssetsTable(filteredAssets);

  const filteredJobs = currentJobs.filter(j => 
    j.job_no.toLowerCase().includes(query) ||
    (j.asset_tag && j.asset_tag.toLowerCase().includes(query)) ||
    (j.serial_no && j.serial_no.toLowerCase().includes(query)) ||
    j.issue_description.toLowerCase().includes(query) ||
    (j.technician_name && j.technician_name.toLowerCase().includes(query))
  );
  renderJobsTable(filteredJobs);
}

// Helper: Status badge CSS classes
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
