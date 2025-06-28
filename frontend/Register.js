const loginSection = document.getElementById('loginSection');
const hospitalLoginSection = document.getElementById('hospitalLoginSection');
const patientPortal = document.getElementById('patientPortal');
const loginForm = document.getElementById('loginForm');
const hospitalLoginForm = document.getElementById('hospitalLoginForm');
const logoutBtn = document.getElementById('logoutBtn');
const patientForm = document.getElementById('patientForm');
const patientsList = document.getElementById('patientsList');
const loginResult = document.getElementById('loginResult');
const patientResult = document.getElementById('patientResult');
const adminInfo = document.getElementById('adminInfo');
const refreshPatients = document.getElementById('refreshPatients');
const patientCount = document.getElementById('patientCount');
const emergencyStopBtn = document.getElementById('emergencyStopBtn');
const emergencyStatus = document.getElementById('emergencyStatus');
const ivStatusContainer = document.getElementById('ivStatusContainer');
const deviceStatusIcon = document.getElementById('deviceStatusIcon');
const deviceStatusText = document.getElementById('deviceStatusText');
const dashboard = document.getElementById('dashboard');
const backToPortal = document.getElementById('backToPortal');
const viewDashboard = document.getElementById('viewDashboard');
const searchInput = document.getElementById("searchInput");
const dashboardTableBody = document.getElementById('dashboardTableBody');

// Current session
let currentAdmin = null;
let currentHospital = null;
let monitoringInterval;
let currentPatientId = '';

// API Base URL
const API_BASE_URL = 'https://smart-saline.vercel.app';

// Enhanced fetch wrapper
async function fetchData(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

const SALINE_API = "https://smart-saline.vercel.app/api/patient/286";

function fetchDropCount() {
  const dropElement = document.getElementById("dropCount");
  if (!dropElement) return; // 🔐 Prevent update if not in view

  fetch(SALINE_API)
    .then(res => res.json())
    .then(data => {
      dropElement.innerText = data?.drop_count ?? "Unavailable";
    })
    .catch(err => {
      console.error("Error fetching drop count:", err);
      dropElement.innerText = "Error";
    });
}
searchInput.addEventListener("input", function () {
    const filter = searchInput.value.toLowerCase();
    const rows = dashboardTableBody.querySelectorAll("tr");
    rows.forEach(row => {
      const idCell = row.querySelector("td:first-child");
      if (idCell) {
        const text = idCell.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? "" : "none";
      }
    });
  });
  async function updateDashboardStats() {
  try {
    const patients = await fetchData(`${API_BASE_URL}/api/patients`);

    // Total Patients
    document.getElementById('dashboardTotalPatients').textContent = patients.length;

    // Emergencies Count
    const emergencyCount = patients.filter(p => p.emergency_status).length;
    document.getElementById('dashboardEmergencies').textContent = emergencyCount;

    // Avg Flow Rate (skip null/zero)
    const validFlowRates = patients
      .map(p => p.flow_rate)
      .filter(rate => typeof rate === 'number');
    const avgFlowRate = validFlowRates.length
      ? (validFlowRates.reduce((a, b) => a + b, 0) / validFlowRates.length).toFixed(1)
      : '--';
    document.getElementById('dashboardAvgFlow').textContent = avgFlowRate;

    // Connected Devices (based on drop_count > 0)
    const connectedDevices = patients.filter(p => p.drop_count > 0).length;
    document.getElementById('dashboardDevices').textContent = connectedDevices;

  } catch (error) {
    console.error('Failed to update dashboard stats:', error);
    document.getElementById('dashboardTotalPatients').textContent = '--';
    document.getElementById('dashboardEmergencies').textContent = '--';
    document.getElementById('dashboardAvgFlow').textContent = '--';
    document.getElementById('dashboardDevices').textContent = '--';
  }
}


  document.getElementById("exportBtn").addEventListener("click", function () {
    const rows = Array.from(document.querySelectorAll("#dashboardTableBody tr"));
    const csv = ["Patient ID,Emergency"];
    rows.forEach(row => {
      if (row.style.display !== "none") {
        const cols = row.querySelectorAll("td");
        const rowData = Array.from(cols).map(td => td.textContent.trim()).join(",");
        csv.push(rowData);
      }
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "patient-dashboard.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

// Fetch drop count every minute
fetchDropCount();
setInterval(fetchDropCount, 5000);

document.getElementById("patientsList").scrollIntoView({ behavior: "smooth" });

// Admin login logic
loginForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const hospitalId = document.getElementById('hospitalId').value.trim();
  const adminId = document.getElementById('adminId').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!hospitalId || !adminId || !password) {
    loginResult.textContent = 'All fields are required';
    loginResult.style.color = 'red';
    return;
  }

  loginResult.textContent = 'Logging in...';
  loginResult.style.color = 'inherit';

  try {
    const data = await fetchData(`${API_BASE_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({ hospitalId, adminId, password })
    });

    if (data.success) {
      currentAdmin = data.admin;
      currentHospital = hospitalId;

      loginSection.style.display = 'none';
      hospitalLoginSection.style.display = 'none';
      patientPortal.style.display = 'block';

      adminInfo.innerHTML = `
        Welcome: <strong>${currentAdmin.name}</strong> |
        Floor: <strong>${currentAdmin.floor}</strong> |
        Ward: <strong>${currentAdmin.ward ?? 'N/A'}</strong> |
        Contact: <strong>${currentAdmin.contact}</strong>
      `;

      await loadPatients();
      loginResult.textContent = '';
    } else {
      throw new Error(data.message || 'Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    loginResult.textContent = error.message || 'Network error. Please try again.';
    loginResult.style.color = 'red';
  }
});

//patient dashboard
viewDashboard.addEventListener('click', async () => {
  try {
    const patients = await fetchData(`${API_BASE_URL}/api/patients`);
    await updateDashboardStats(); 
    displayDashboard(patients);
    patientPortal.style.display = 'none';
    dashboard.style.display = 'block';
  } catch (err) {
    alert('❌ Failed to load dashboard');
    console.error(err);
  }
});

backToPortal.addEventListener('click', () => {
  dashboard.style.display = 'none';
  patientPortal.style.display = 'block';
});

//Display Dashboard
function displayDashboard(patients) {
  dashboardTableBody.innerHTML = '';
  // Iterate 8 patients per row
  for (let i = 0; i < patients.length; i += 8) {
    const row = document.createElement('tr');
    for (let j = 0; j < 8; j++) {
      const patient = patients[i + j];

      if (patient) {
        // Patient ID Cell
        const idCell = document.createElement('td');
        idCell.innerHTML = `<a href="#" class="text-decoration-none patient-id-link" data-id="${patient.patient_id}">${patient.patient_id}</a>`;

        // Emergency Cell
        const emergencyCell = document.createElement('td');
        const emergencyBtn = document.createElement('button');
        emergencyBtn.className = patient.emergency_status ? 'btn btn-danger btn-sm' : 'btn btn-outline-success btn-sm';
        emergencyBtn.textContent = patient.emergency_status ? 'YES' : 'NO';
        emergencyBtn.disabled = true;
        emergencyCell.appendChild(emergencyBtn);

        row.appendChild(idCell);
        row.appendChild(emergencyCell);
      } else {
        // Fill empty cells if no more patients
        row.appendChild(document.createElement('td'));
        row.appendChild(document.createElement('td'));
      }
    }
    dashboardTableBody.appendChild(row);
  }
  // Make Patient ID clickable
  document.querySelectorAll('.patient-id-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const patientId = e.target.getAttribute('data-id');
      showOnlyPatientCard(patientId);
    });
  });
}

async function showOnlyPatientCard(patientId) {
  try {
    // Fetch the selected patient's data
    const patient = await fetchData(`${API_BASE_URL}/api/patient/${patientId}`);
    if (!patient) return;

    // Use the existing patient card template to display only this one patient
    const template = document.getElementById('patientCardTemplate').innerHTML;

    const admissionDate = patient.admission_date ? new Date(patient.admission_date).toLocaleString() : 'Not specified';
    const lastUpdate = patient.last_update ? new Date(patient.last_update).toLocaleString() : 'Never';
    const ivStatus = patient.emergency_status ? 'EMERGENCY' : (patient.saline_left < 20 ? 'LOW SALINE' : 'NORMAL');
    const ivStatusClass = patient.emergency_status ? 'danger' : (patient.saline_left < 20 ? 'warning' : 'success');
    const emergencyClass = patient.emergency_status ? 'emergency-patient' : '';
    const emergencyDisabled = patient.emergency_status ? 'disabled' : '';

    const restoreButton = patient.emergency_status
      ? `<button class="btn btn-outline-success restore-btn" data-id="${patient.patient_id}">
          <i class="fas fa-undo"></i> Restore
        </button>` : '';

    let card = template
      .replace(/{{name}}/g, patient.name || 'Unknown')
      .replace(/{{patient_id}}/g, patient.patient_id || 'N/A')
      .replace(/{{age}}/g, patient.age || 'N/A')
      .replace(/{{gender}}/g, patient.gender || 'N/A')
      .replace(/{{current_condition}}/g, patient.current_condition || 'Not specified')
      .replace(/{{contact_number}}/g, patient.contact_number || 'N/A')
      .replace(/{{medical_history}}/g, patient.medical_history || 'None recorded')
      .replace(/{{admission_date}}/g, admissionDate)
      .replace(/{{emergencyClass}}/g, emergencyClass)
      .replace(/{{ivStatusText}}/g, ivStatus)
      .replace(/{{ivStatusClass}}/g, ivStatusClass)
      .replace(/{{salineLeft}}/g, patient.saline_left ? patient.saline_left.toFixed(1) : 'N/A')
      .replace(/{{dropCount}}/g, patient.drop_count || 'N/A')
      .replace(/{{flowRate}}/g, patient.flow_rate ? patient.flow_rate.toFixed(1) : 'N/A')
      .replace(/{{heartRate}}/g, patient.heart_rate || 'N/A')
      .replace(/{{last_update}}/g, lastUpdate)
      .replace(/{{emergencyDisabled}}/g, emergencyDisabled)
      .replace(/{{restoreButton}}/g, restoreButton);

    patientsList.innerHTML = card;
    dashboard.style.display = 'none';
    patientPortal.style.display = 'block';

    monitorPatientStatus(patientId);
  } catch (err) {
    console.error('Error loading patient details:', err);
    alert('❌ Failed to load patient details.');
  }
}


// Hospital login logic
hospitalLoginForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  const hospitalId = document.querySelector('#hospitalLoginForm #hospitalId').value.trim();
  const password = document.querySelector('#hospitalLoginForm #password').value.trim();
  const resultDisplay = document.getElementById('hospitalLoginResult');

  if (!hospitalId || !password) {
    resultDisplay.textContent = 'All fields are required';
    resultDisplay.style.color = 'red';
    return;
  }

  resultDisplay.textContent = 'Verifying...';
  resultDisplay.style.color = 'inherit';

  try {
    const res = await fetch(`${API_BASE_URL}/api/verify-hospital-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hospitalId, password })
    });

    const data = await res.json();

    if (data.valid) {
      window.location.href = 'hospital.html';
    } else {
      resultDisplay.textContent = data.message || 'Invalid Hospital ID or Password';
      resultDisplay.style.color = 'red';
    }
  } catch (err) {
    console.error('Hospital login error:', err);
    resultDisplay.textContent = 'Server error. Please try again.';
    resultDisplay.style.color = 'red';
  }
});

// Logout
logoutBtn.addEventListener('click', function() {
  currentAdmin = null;
  currentHospital = null;
  currentPatientId = '';
  clearInterval(monitoringInterval);

  patientPortal.style.display = 'none';
  loginSection.style.display = 'block';
  hospitalLoginSection.style.display = 'block';

  loginForm.reset();
  patientForm.reset();
});

// Load patients
async function loadPatients() {
  try {
    patientsList.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;

    const patients = await fetchData(`${API_BASE_URL}/api/patients`);

    // ✅ Render connected devices
    const connectedPatients = patients.filter(p => p.patient_id === 286 && p.drop_count !== null && p.drop_count !== undefined);
    const connectedList = document.getElementById("connectedDevicesList");
    connectedList.innerHTML = "";

    if (connectedPatients.length === 0) {
      connectedList.innerHTML = "<li>❌ No active devices</li>";
    } else {
      connectedPatients.forEach(p => {
        const li = document.createElement("li");
        li.textContent = `✅ Patient ${p.patient_id}`;
        connectedList.appendChild(li);
      });
    }

    // ✅ Render patient cards
    displayPatients(patients);
    patientCount.textContent = patients.length;
  } catch (error) {
    console.error('Error loading patients:', error);

    patientsList.innerHTML = `
      <div class="alert alert-danger">
        ${error.message || 'Failed to load patients. Please try again.'}
      </div>
    `;

    patientCount.textContent = '0';

    // ❌ Optional: Clear connected list on error
    const connectedList = document.getElementById("connectedDevicesList");
    connectedList.innerHTML = "<li>❌ Could not load device status</li>";
  }
  await loadEmergencyPatients();
}

// ✅ Fetch and display emergency patients
async function loadEmergencyPatients() {
  const emergencyList = document.getElementById("emergencyList");
  emergencyList.innerHTML = "<li>Loading...</li>";

  try {
    const res = await fetch(`${API_BASE_URL}/api/emergency-patients`);
    const data = await res.json();

    emergencyList.innerHTML = "";

    if (!data || data.length === 0) {
      emergencyList.innerHTML = "<li>No active emergency</li>";
    } else {
      data.forEach(patient => {
        const li = document.createElement("li");
        li.textContent = `⚠️ Patient ${patient.patient_id} - ${patient.name || 'Unknown'}`;
        li.style.color = "#dc3545";
        emergencyList.appendChild(li);
      });
    }
  } catch (err) {
    console.error("Error fetching emergency patients:", err);
    emergencyList.innerHTML = "<li>❌ Failed to load emergency status</li>";
  }
}


//Display Patients
function displayPatients(patients) {
  if (!patients || patients.length === 0) {
    patientsList.innerHTML = '<div class="alert alert-info">No patients found</div>';
    patientCount.textContent = '0';
    return;
  }

  let html = '';
  const template = document.getElementById('patientCardTemplate').innerHTML;

  patients.forEach(patient => {
    const admissionDate = patient.admission_date
      ? new Date(patient.admission_date).toLocaleString()
      : 'Not specified';

    const lastUpdate = patient.last_update
      ? new Date(patient.last_update).toLocaleString()
      : 'Never';

    let ivStatusText, ivStatusClass, emergencyClass = '';
    if (patient.emergency_status) {
      ivStatusText = 'EMERGENCY';
      ivStatusClass = 'danger';
      emergencyClass = 'emergency-patient';
    } else if (patient.saline_left < 20) {
      ivStatusText = 'LOW SALINE';
      ivStatusClass = 'warning';
    } else {
      ivStatusText = 'NORMAL';
      ivStatusClass = 'success';
    }

    const emergencyDisabled = patient.emergency_status ? 'disabled' : '';

    // ✅ Add restore button if emergency is active
    const restoreButton = patient.emergency_status
    ? `<button class="btn btn-outline-success restore-btn" data-id="${patient.patient_id}">
        <i class="fas fa-undo"></i> Restore
      </button>`
    : '';

    let card = template
      .replace(/{{name}}/g, patient.name || 'Unknown')
      .replace(/{{patient_id}}/g, patient.patient_id || 'N/A')
      .replace(/{{age}}/g, patient.age || 'N/A')
      .replace(/{{gender}}/g, patient.gender || 'N/A')
      .replace(/{{current_condition}}/g, patient.current_condition || 'Not specified')
      .replace(/{{contact_number}}/g, patient.contact_number || 'N/A')
      .replace(/{{medical_history}}/g, patient.medical_history || 'None recorded')
      .replace(/{{admission_date}}/g, admissionDate)
      .replace(/{{emergencyClass}}/g, emergencyClass)
      .replace(/{{ivStatusText}}/g, ivStatusText)
      .replace(/{{ivStatusClass}}/g, ivStatusClass)
      .replace(/{{salineLeft}}/g, patient.saline_left ? patient.saline_left.toFixed(1) : 'N/A')
      .replace(/{{dropCount}}/g, patient.drop_count || 'N/A')
      .replace(/{{flowRate}}/g, patient.flow_rate ? patient.flow_rate.toFixed(1) : 'N/A')
      .replace(/{{heartRate}}/g, patient.heart_rate || 'N/A')
      .replace(/{{last_update}}/g, lastUpdate)
      .replace(/{{emergencyDisabled}}/g, emergencyDisabled)
      .replace(/{{restoreButton}}/g, restoreButton);

    html += card;
  });

  patientsList.innerHTML = html;

  // ✅ Emergency Stop Button
  document.querySelectorAll('.emergency-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const patientId = button.getAttribute('data-id');
      try {
        const response = await fetch(`${API_BASE_URL}/api/emergency-stop`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId })
        });
        const result = await response.json();
        if (result.success) {
          alert(`⚠️ Emergency Stop activated.\nSaline flow for Patient ${patientId} has been halted.`);
          await loadPatients();
        }
      } catch (err) {
        alert('⚠️ Failed to send emergency command.');
        console.error(err);
      }
    });
  });

  // ✅ Restore Button
  document.querySelectorAll('.restore-btn').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.stopPropagation();
      const patientId = button.getAttribute('data-id');
      try {
        const response = await fetch(`${API_BASE_URL}/api/clear-emergency`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId })
        });
        const result = await response.json();
        if (result.success) {
          alert(`✅ Emergency cleared for Patient ${patientId}`);
          await loadPatients();
        }
      } catch (err) {
        alert('❌ Failed to clear emergency status.');
        console.error(err);
      }
    });
  });

  // ✅ Click on Patient Card → Monitor Panel
  document.querySelectorAll('.patient-card').forEach(card => {
    const patientId = card.querySelector('.emergency-btn').getAttribute('data-id');
    card.addEventListener('click', () => {
      monitorPatientStatus(patientId);
    });
  });

  patientCount.textContent = patients.length;
}


// Register patient
patientForm.addEventListener('submit', async function(e) {
  e.preventDefault();

  currentPatientId = document.getElementById('patientId').value.trim();
  const patientName = document.getElementById('patientName').value.trim();

  if (!currentPatientId || !patientName) {
    patientResult.textContent = 'Patient ID and Name are required';
    patientResult.style.color = 'red';
    return;
  }

  const patientData = {
    patient_id: currentPatientId,
    name: patientName,
    age: document.getElementById('patientAge').value.trim(),
    gender: document.getElementById('patientGender').value,
    contact_number: document.getElementById('patientContact').value.trim(),
    current_condition: document.getElementById('patientCondition').value.trim(),
    medical_history: document.getElementById('patientHistory').value.trim()
  };

  try {
    patientResult.textContent = 'Registering patient...';
    patientResult.style.color = 'inherit';

    const result = await fetchData(`${API_BASE_URL}/api/patients`, {
      method: 'POST',
      body: JSON.stringify(patientData)
    });

    patientResult.textContent = 'Patient registered successfully!';
    patientResult.style.color = 'green';

    // Start monitoring for this patient
    monitorPatientStatus(currentPatientId);
    await loadPatients();
    patientForm.reset();
  } catch (error) {
    console.error('Error registering patient:', error);
    patientResult.textContent = error.message || 'Failed to register patient. Please try again.';
    patientResult.style.color = 'red';
  }
});

// Monitor patient status
async function monitorPatientStatus(patientId) {
  clearInterval(monitoringInterval);
  currentPatientId = patientId;
  
      // Fetch patient data to determine connection
    const response = await fetch(`${API_BASE_URL}/api/patient/${patientId}`);
    const patient = await response.json();

    // Update device connection status based on drop count
    if (patient.drop_count && patient.drop_count > 0) {
      deviceStatusIcon.className = "fas fa-circle device-connected";
      deviceStatusText.textContent = `Device: Connected (Patient ${patient.patient_id})`;
      deviceStatusIcon.classList.remove("device-disconnected");
      deviceStatusIcon.classList.add("device-connected");
    } else {
      deviceStatusIcon.className = "fas fa-circle device-disconnected";
      deviceStatusText.textContent = "Device: Disconnected";
      deviceStatusIcon.classList.remove("device-connected");
      deviceStatusIcon.classList.add("device-disconnected");
    }
  
  monitoringInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/patient/${patientId}`);
      const patient = await response.json();
      
      // Update IV status display
      if (patient.emergency_status) {
        ivStatusContainer.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> EMERGENCY! 
            ${patient.flow_rate > 100 ? 'Excessive flow rate' : 'Low saline level'} detected
            <div class="mt-2">
              Saline: ${patient.saline_left ? patient.saline_left.toFixed(1) : 'N/A'}% | 
              Flow: ${patient.flow_rate ? patient.flow_rate.toFixed(1) : 'N/A'} ml/hr | 
              HR: ${patient.heart_rate || 'N/A'} bpm
            </div>
          </div>
        `;
        emergencyStopBtn.disabled = false;
      } else if (patient.saline_left < 20) {
        ivStatusContainer.innerHTML = `
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-circle"></i> Warning: Saline level low (${patient.saline_left ? patient.saline_left.toFixed(1) : 'N/A'}%)
            <div class="mt-2">
              Flow: ${patient.flow_rate ? patient.flow_rate.toFixed(1) : 'N/A'} ml/hr | 
              HR: ${patient.heart_rate || 'N/A'} bpm
            </div>
          </div>
        `;
      } else {
        ivStatusContainer.innerHTML = `
          <div class="alert alert-success">
            <i class="fas fa-check-circle"></i> IV Status Normal
            <div class="mt-2">
              Saline: ${patient.saline_left ? patient.saline_left.toFixed(1) : 'N/A'}% | 
              Flow: ${patient.flow_rate ? patient.flow_rate.toFixed(1) : 'N/A'} ml/hr | 
              HR: ${patient.heart_rate || 'N/A'} bpm
            </div>
          </div>
        `;
      }
      
      // Refresh patient list to update all statuses
      //await loadPatients();
      
    } catch (error) {
      console.error('Monitoring error:', error);
      ivStatusContainer.innerHTML = `
        <div class="alert alert-danger">
          <i class="fas fa-times-circle"></i> Error monitoring patient
        </div>
      `;
    }
  }, 3000); // Update every 3 seconds
}
// Refresh button
refreshPatients.addEventListener('click', loadPatients);

// Clean hash on load
if (window.location.href.includes('#')) {
  window.location.href = window.location.href.split('#')[0];
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.href.includes('#')) {
    window.location.href = window.location.href.split('#')[0];
  }
});

// 🌙☀️ NIGHT MODE SCRIPT
const toggleButton = document.getElementById("toggleNightMode");
let nightMode = false;
function applyTheme(isNight, showAlert = false) {
  nightMode = isNight;
  toggleButton.innerHTML = nightMode ? "☀️ Light Mode" : "🌙 Night Mode";
  
  if (nightMode) {
    document.body.classList.add("night-mode");
    document.body.style.background = "linear-gradient(135deg, rgba(120, 214, 153, 0.91), rgba(236, 236, 130, 0.96))";
    document.body.style.backgroundSize = "400% 400%";
    document.body.style.animation = "moveGradient 15s ease infinite";
  } else {
    document.body.classList.remove("night-mode");
    document.body.style.background = "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)";
    document.body.style.backgroundSize = "";
    document.body.style.animation = "";
  }

  if (showAlert && nightMode) {
    alert("🌙 Good Evening! Switched to Night Mode automatically.");
  }
}
function checkAutoNightMode() {
  const hours = new Date().getHours();
  if (hours >= 18 || hours < 5) {
    if (!nightMode) applyTheme(true, true);
  } else {
    if (nightMode) applyTheme(false);
  }
}

// 🔘 Manual toggle
toggleButton.addEventListener("click", () => {
  applyTheme(!nightMode);
});

document.addEventListener("DOMContentLoaded", () => {
  checkAutoNightMode();
});
