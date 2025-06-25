// DOM Elements
const adminsList = document.getElementById('adminsList');
const patientsList = document.getElementById('patientsList');
const adminCount = document.getElementById('adminCount');
const patientCount = document.getElementById('patientCount');
const refreshAdmins = document.getElementById('refreshAdmins');
const refreshPatients = document.getElementById('refreshPatients');
const refreshAll = document.getElementById('refreshAll');
const saveAdmin = document.getElementById('saveAdmin');
const savePatient = document.getElementById('savePatient');

// API Base URL
const API_BASE_URL = 'https://smart-saline.vercel.app'; //https://smart-saline.vercel.app/

// Fetch wrapper with error handling
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

// Load all data
async function loadAllData() {
  try {
    await Promise.all([loadAdmins(), loadPatients()]);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

// Load admins
async function loadAdmins() {
  try {
    adminsList.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
    
    const admins = await fetchData(`${API_BASE_URL}/api/admins`);
    displayAdmins(admins);
    adminCount.textContent = admins.length;
  } catch (error) {
    console.error('Error loading admins:', error);
    adminsList.innerHTML = `
      <div class="alert alert-danger">
        ${error.message || 'Failed to load admins. Please try again.'}
      </div>
    `;
    adminCount.textContent = '0';
  }
}

// Display admins
function displayAdmins(admins) {
  if (!admins || admins.length === 0) {
    adminsList.innerHTML = '<div class="alert alert-info">No admins found</div>';
    adminCount.textContent = '0';
    return;
  }
  
  let html = '';
  
  admins.forEach(admin => {
    html += `
      <div class="card admin-card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <h5>${admin.name || 'Unknown'}</h5>
            <p class="mb-1"><strong>ID:</strong> ${admin.admin_id || 'N/A'}</p>
            <p class="mb-1"><strong>Floor:</strong> ${admin.floor || 'N/A'}</p>
            <p class="mb-1"><strong>Contact:</strong> ${admin.contact || 'N/A'}</p>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-danger delete-admin" data-id="${admin.admin_id}">
              Delete
            </button>
          </div>
        </div>
      </div>
    `;
  });
  
  adminsList.innerHTML = html;
  adminCount.textContent = admins.length;
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-admin').forEach(button => {
    button.addEventListener('click', async (e) => {
      const adminId = e.target.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete admin ${adminId}?`)) {
        try {
          await fetchData(`${API_BASE_URL}/api/admins/${adminId}`, {
            method: 'DELETE'
          });
          await loadAdmins();
        } catch (error) {
          console.error('Error deleting admin:', error);
          alert('Failed to delete admin: ' + error.message);
        }
      }
    });
  });
}

// Load patients
async function loadPatients() {
  try {
    patientsList.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-success" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </div>
    `;
    
    const patients = await fetchData(`${API_BASE_URL}/api/patients`);
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
  }
}

// Display patients
function displayPatients(patients) {
  if (!patients || patients.length === 0) {
    patientsList.innerHTML = '<div class="alert alert-info">No patients found</div>';
    patientCount.textContent = '0';
    return;
  }
  
  let html = '';
  
  patients.forEach(patient => {
    const admissionDate = patient.admission_date 
      ? new Date(patient.admission_date).toLocaleString() 
      : 'Not specified';
    
    html += `
      <div class="card patient-card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5>${patient.name || 'Unknown'}</h5>
            <p class="mb-1"><strong>ID:</strong> ${patient.patient_id || 'N/A'}</p>
            <p class="mb-1"><strong>Age:</strong> ${patient.age || 'N/A'} | <strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
          </div>
          <div>
            <button class="btn btn-sm btn-outline-danger delete-patient" data-id="${patient.patient_id}">
              Delete
            </button>
          </div>
        </div>
        <hr>
        <div>
          <p><strong>Condition:</strong> ${patient.current_condition || 'Not specified'}</p>
          <p><strong>Contact:</strong> ${patient.contact_number || 'N/A'}</p>
          <small class="text-muted">Admitted: ${admissionDate}</small>
        </div>
      </div>
    `;
  });
  
  patientsList.innerHTML = html;
  patientCount.textContent = patients.length;
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-patient').forEach(button => {
    button.addEventListener('click', async (e) => {
      const patientId = e.target.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete patient ${patientId}?`)) {
        try {
          await fetchData(`${API_BASE_URL}/api/patients/${patientId}`, {
            method: 'DELETE'
          });
          await loadPatients();
        } catch (error) {
          console.error('Error deleting patient:', error);
          alert('Failed to delete patient: ' + error.message);
        }
      }
    });
  });
}

// Save new admin
saveAdmin.addEventListener('click', async () => {
  const adminData = {
    admin_id: document.getElementById('adminId').value.trim(),
    name: document.getElementById('adminName').value.trim(),
    password: document.getElementById('adminPassword').value.trim(),
    contact: document.getElementById('adminContact').value.trim(),
    floor: document.getElementById('adminFloor').value.trim(),
    check_hospital_id: document.getElementById('adminHospitalId').value.trim()
  };

  try {
    await fetchData(`${API_BASE_URL}/api/admins`, {
      method: 'POST',
      body: JSON.stringify(adminData)
    });
    
    // Close modal and refresh
    bootstrap.Modal.getInstance(document.getElementById('addAdminModal')).hide();
    document.getElementById('adminForm').reset();
    await loadAdmins();
  } catch (error) {
    console.error('Error saving admin:', error);
    alert('Failed to save admin: ' + error.message);
  }
});

// Save new patient
savePatient.addEventListener('click', async () => {
  const patientData = {
    patient_id: document.getElementById('newPatientId').value.trim(),
    name: document.getElementById('newPatientName').value.trim(),
    age: document.getElementById('newPatientAge').value.trim(),
    gender: document.getElementById('newPatientGender').value,
    contact_number: document.getElementById('newPatientContact').value.trim(),
    current_condition: document.getElementById('newPatientCondition').value.trim()
  };

  try {
    await fetchData(`${API_BASE_URL}/api/patients`, {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
    
    // Close modal and refresh
    bootstrap.Modal.getInstance(document.getElementById('addPatientModal')).hide();
    document.getElementById('patientForm').reset();
    await loadPatients();
  } catch (error) {
    console.error('Error saving patient:', error);
    alert('Failed to save patient: ' + error.message);
  }
});

// Refresh buttons
refreshAdmins.addEventListener('click', loadAdmins);
refreshPatients.addEventListener('click', loadPatients);
refreshAll.addEventListener('click', loadAllData);

// Initialize
document.addEventListener('DOMContentLoaded', loadAllData);