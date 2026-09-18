# ICT Asset Inventory & Job Sheet Portal (Django)

A modern, local-first internal web portal designed specifically for ICT staff to manage computer hardware inventory, specifications, owners, serial numbers, and maintenance job sheets with full repair histories and printable sign-off sheets.

---

## 🌟 Key Features

### 1. 📊 Unified ICT Operations Dashboard
- Live KPI operational metrics:
  - **Total Computers**: Fleet count across all departments.
  - **In Active Use**: Machines assigned to employees.
  - **Available Spares**: Ready-to-deploy buffer inventory in ICT storeroom.
  - **Under Repair**: Units currently in the technician workbench queue.
  - **Active Job Sheets**: Open and in-progress maintenance requests.
- Real-time instant search bar (find by Serial Number, Asset Tag, Owner, Brand/Model, or Job #).
- Recent repair activity feed.

### 2. 💻 Computer & Hardware Inventory Management
- Full lifecycle tracking: **Asset Tag**, **Serial Number**, **Device Type** (Laptop, Desktop, Workstation, Server, All-in-One), **Brand & Model**.
- Technical Specifications & Component Details:
  - Processor (CPU)
  - Memory (RAM)
  - Storage / SSD capacity and interface
  - Graphics Card (GPU)
  - Operating System
- Ownership & Physical Location:
  - Assigned Staff Owner Name
  - Department
  - Office / Desk Location
- Status Badges: `In Use`, `Available / Spare`, `Under Repair`, `Decommissioned`.
- Purchase & Warranty tracking with notes.
- Instant CSV Export for hardware audits and management reporting.

### 3. 🛠️ Job Sheet & Repair Ticketing System
- Auto-incrementing Job Sheet identifiers (e.g., `JOB-2026-0001`).
- **Dynamic Spec Auto-Population**: Selecting any computer instantly pulls and displays its processor, memory, storage, OS, and owner in a preview card.
- Comprehensive technical logging:
  - Reported Symptom / Problem Description
  - Priority Level (`Low`, `Medium`, `High`, `Critical`)
  - Assigned ICT Technician
  - Diagnostic findings upon hardware inspection
  - Actions taken / Repair procedures
  - Parts replaced / added (e.g. SSD upgrades, battery replacements, RAM modules)
  - Repair / Parts cost calculation
  - Status management (`Open`, `In Progress`, `Waiting for Parts`, `Resolved`, `Closed`)
- Automatic asset status synchronization (setting computer to "Under Repair" when a ticket is opened).

### 4. 🖨️ Professional Printable Job Sheet Form
- Formal job sheet format tailored for physical printout and archival.
- Contains company ICT header, barcode/job number, asset specification summary, technical diagnosis, parts table, and physical signature/sign-off blocks for the Technician and Equipment Owner.
- Direct 1-click `window.print()` support with dedicated `@media print` CSS styling.

### 5. 📜 Complete Machine Repair History & Audit Trail
- Each computer asset has a dedicated service record tab displaying every repair ticket ever filed for that serial number.
- Global Repair History Timeline view showing chronological maintenance operations across the organization.

### 6. 🔐 Built-in Django Admin Interface
- Access Django's powerful admin portal at `/admin/` with full table search, filters, and inline repair history management.

---

## ⚡ How to Run with ZERO Commands (No Typing Needed!)

### Option 1: Double-Click Launcher
Simply double-click either:
- **`Launch Portal.bat`** (or **`run.bat`**)

**What it does automatically:**
1. Connects to Python virtual environment.
2. Automatically opens your default web browser (Chrome, Edge, Firefox) directly to `http://127.0.0.1:8000`.
3. Starts the Django server.

### Option 2: Completely Silent (No Console Window)
- Double-click **`Launch Silent (No Window).vbs`**

### To Stop the Server:
- Close the command window, or double-click **`Stop Portal.bat`**.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Python 3 & **Django**
- **Database**: **SQLite (SQL)** via Django ORM (`models.Model`)
- **Frontend**: Responsive modern dark command center dashboard with vanilla HTML5, CSS3, and JavaScript (zero npm build step needed).

---

## 🧪 Running Automated Tests

```powershell
python manage.py test inventory
```
