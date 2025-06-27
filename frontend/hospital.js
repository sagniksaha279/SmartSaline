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
const adminDashboard = document.getElementById('adminDashboard');
const viewAdminDashboard = document.getElementById('viewAdminDashboard');
const backToPortalFromAdmin = document.getElementById('backToPortalFromAdmin');
const adminDashboardTableBody = document.getElementById('adminDashboardTableBody');
const viewSimplePatientDashboard = document.getElementById('viewSimplePatientDashboard');
const patientDashboardSimple = document.getElementById('patientDashboardSimple');
const backFromSimplePatient = document.getElementById('backFromSimplePatient');
const simplePatientTableBody = document.getElementById('simplePatientTableBody');
const viewPatientGridDashboard = document.getElementById('viewPatientGridDashboard');
const patientGridDashboard = document.getElementById('patientGridDashboard');
const backFromPatientGrid = document.getElementById('backFromPatientGrid');

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

//Admin Dashborad
viewAdminDashboard.addEventListener('click', async () => {
  try {
    const admins = await fetchData(`${API_BASE_URL}/api/admins`);
    displayAdminDashboard(admins);
    patientPortal.style.display = 'none';
    adminDashboard.style.display = 'block';
  } catch (err) {
    alert('❌ Failed to load admin dashboard');
    console.error(err);
  }
});

backToPortalFromAdmin.addEventListener('click', () => {
  adminDashboard.style.display = 'none';
  patientPortal.style.display = 'block';
});

function displayAdminDashboard(admins) {
  adminDashboardTableBody.innerHTML = '';

  admins.forEach(admin => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${admin.admin_id}</td>
      <td>${admin.name}</td>
      <td>${admin.contact}</td>
      <td>${admin.floor}</td>
      <td>
        <button class="btn btn-sm btn-danger delete-admin-btn" data-id="${admin.admin_id}">
          Delete
        </button>
      </td>
    `;
    adminDashboardTableBody.appendChild(row);
  });

  document.querySelectorAll('.delete-admin-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const adminId = button.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete admin ${adminId}?`)) {
        try {
          await fetchData(`${API_BASE_URL}/api/admins/${adminId}`, {
            method: 'DELETE'
          });
          const updated = await fetchData(`${API_BASE_URL}/api/admins`);
          displayAdminDashboard(updated);
        } catch (err) {
          alert('❌ Failed to delete admin.');
          console.error(err);
        }
      }
    });
  });
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

function displayDashboard(patients) {
  const dashboardTableBody = document.getElementById('dashboardTableBody');
  dashboardTableBody.innerHTML = '';

  for (let i = 0; i < patients.length; i += 6) {
    const row = document.createElement('tr');

    for (let j = 0; j < 6; j++) {
      const patient = patients[i + j];
      const cell = document.createElement('td');

      if (patient) {
        cell.innerHTML = `
          <div class="card shadow-sm border rounded text-center p-2 bg-light h-100">
            <div>
              <strong>ID:</strong>
              <a href="#" class="patient-link text-decoration-none fw-semibold d-block mb-1" data-id="${patient.patient_id}">
                ${patient.patient_id}
              </a>
              <strong>Name:</strong>
              <a href="#" class="patient-link text-decoration-none" data-id="${patient.patient_id}">
                ${patient.name || 'Unknown'}
              </a>
            </div>
            <div class="mt-2">
              <button class="btn btn-sm ${patient.emergency_status ? 'btn-danger' : 'btn-outline-success'} w-75" disabled>
                ${patient.emergency_status ? 'Emergency' : 'Stable'}
              </button>
            </div>
          </div>
        `;
      } else {
        cell.innerHTML = '&nbsp;';
      }

      row.appendChild(cell);
    }

    dashboardTableBody.appendChild(row);
  }

  // Handle clicks on ID or Name
  document.querySelectorAll('.patient-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const patientId = e.target.getAttribute('data-id');

    // 👇 First, switch back to normal patient view
    patientGridDashboard.style.display = 'none';
    patientPortal.style.display = 'block';

    // Then scroll to the card
    setTimeout(() => {
      const card = document.querySelector(`.patient-card[data-id="${patientId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-card');
        setTimeout(() => card.classList.remove('highlight-card'), 2000);
      } else {
        alert('❌ Patient card not found.');
      }
    }, 100); // Wait a bit for layout shift
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

viewPatientGridDashboard.addEventListener('click', async () => {
  try {
    const patients = await fetchData(`${API_BASE_URL}/api/patients`);
    displayDashboard(patients);
    patientPortal.style.display = 'none';
    patientGridDashboard.style.display = 'block';
  } catch (err) {
    console.error('Failed to load patient grid dashboard:', err);
    alert('❌ Could not load dashboard.');
  }
});

backFromPatientGrid.addEventListener('click', () => {
  patientGridDashboard.style.display = 'none';
  patientPortal.style.display = 'block';
});

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
        <div class="card patient-card p-3 mb-3" data-id="${patient.patient_id}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5>${patient.name || 'Unknown'}</h5>
            <p class="mb-1"><strong>ID:</strong> ${patient.patient_id || 'N/A'}</p>
            <p class="mb-1"><strong>Age:</strong> ${patient.age || 'N/A'} | <strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
          </div>
          <div>
            <button class="btn btn-outline-danger btn-sm px-3 py-1 fw-semibold shadow-sm delete-simple-patient" data-id="${patient.patient_id}">
              <i class="fas fa-trash-alt me-1"></i> Delete
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
const adminDashboard = document.getElementById('adminDashboard');
const viewAdminDashboard = document.getElementById('viewAdminDashboard');
const backToPortalFromAdmin = document.getElementById('backToPortalFromAdmin');
const adminDashboardTableBody = document.getElementById('adminDashboardTableBody');
const viewSimplePatientDashboard = document.getElementById('viewSimplePatientDashboard');
const patientDashboardSimple = document.getElementById('patientDashboardSimple');
const backFromSimplePatient = document.getElementById('backFromSimplePatient');
const simplePatientTableBody = document.getElementById('simplePatientTableBody');
const viewPatientGridDashboard = document.getElementById('viewPatientGridDashboard');
const patientGridDashboard = document.getElementById('patientGridDashboard');
const backFromPatientGrid = document.getElementById('backFromPatientGrid');

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

//Admin Dashborad
viewAdminDashboard.addEventListener('click', async () => {
  try {
    const admins = await fetchData(`${API_BASE_URL}/api/admins`);
    displayAdminDashboard(admins);
    patientPortal.style.display = 'none';
    adminDashboard.style.display = 'block';
  } catch (err) {
    alert('❌ Failed to load admin dashboard');
    console.error(err);
  }
});

backToPortalFromAdmin.addEventListener('click', () => {
  adminDashboard.style.display = 'none';
  patientPortal.style.display = 'block';
});

function displayAdminDashboard(admins) {
  adminDashboardTableBody.innerHTML = '';

  admins.forEach(admin => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${admin.admin_id}</td>
      <td>${admin.name}</td>
      <td>${admin.contact}</td>
      <td>${admin.floor}</td>
      <td>
        <button class="btn btn-sm btn-danger delete-admin-btn" data-id="${admin.admin_id}">
          Delete
        </button>
      </td>
    `;
    adminDashboardTableBody.appendChild(row);
  });

  document.querySelectorAll('.delete-admin-btn').forEach(button => {
    button.addEventListener('click', async () => {
      const adminId = button.getAttribute('data-id');
      if (confirm(`Are you sure you want to delete admin ${adminId}?`)) {
        try {
          await fetchData(`${API_BASE_URL}/api/admins/${adminId}`, {
            method: 'DELETE'
          });
          const updated = await fetchData(`${API_BASE_URL}/api/admins`);
          displayAdminDashboard(updated);
        } catch (err) {
          alert('❌ Failed to delete admin.');
          console.error(err);
        }
      }
    });
  });
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

function displayDashboard(patients) {
  const dashboardTableBody = document.getElementById('dashboardTableBody');
  dashboardTableBody.innerHTML = '';

  for (let i = 0; i < patients.length; i += 6) {
    const row = document.createElement('tr');

    for (let j = 0; j < 6; j++) {
      const patient = patients[i + j];
      const cell = document.createElement('td');

      if (patient) {
        cell.innerHTML = `
          <div class="card shadow-sm border rounded text-center p-2 bg-light h-100">
            <div>
              <strong>ID:</strong>
              <a href="#" class="patient-link text-decoration-none fw-semibold d-block mb-1" data-id="${patient.patient_id}">
                ${patient.patient_id}
              </a>
              <strong>Name:</strong>
              <a href="#" class="patient-link text-decoration-none" data-id="${patient.patient_id}">
                ${patient.name || 'Unknown'}
              </a>
            </div>
            <div class="mt-2">
              <button class="btn btn-sm ${patient.emergency_status ? 'btn-danger' : 'btn-outline-success'} w-75" disabled>
                ${patient.emergency_status ? 'Emergency' : 'Stable'}
              </button>
            </div>
          </div>
        `;
      } else {
        cell.innerHTML = '&nbsp;';
      }

      row.appendChild(cell);
    }

    dashboardTableBody.appendChild(row);
  }

  // Handle clicks on ID or Name
  document.querySelectorAll('.patient-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const patientId = e.target.getAttribute('data-id');

    // 👇 First, switch back to normal patient view
    patientGridDashboard.style.display = 'none';
    patientPortal.style.display = 'block';

    // Then scroll to the card
    setTimeout(() => {
      const card = document.querySelector(`.patient-card[data-id="${patientId}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('highlight-card');
        setTimeout(() => card.classList.remove('highlight-card'), 2000);
      } else {
        alert('❌ Patient card not found.');
      }
    }, 100); // Wait a bit for layout shift
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

viewPatientGridDashboard.addEventListener('click', async () => {
  try {
    const patients = await fetchData(`${API_BASE_URL}/api/patients`);
    displayDashboard(patients);
    patientPortal.style.display = 'none';
    patientGridDashboard.style.display = 'block';
  } catch (err) {
    console.error('Failed to load patient grid dashboard:', err);
    alert('❌ Could not load dashboard.');
  }
});

backFromPatientGrid.addEventListener('click', () => {
  patientGridDashboard.style.display = 'none';
  patientPortal.style.display = 'block';
});

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
        <div class="card patient-card p-3 mb-3" data-id="${patient.patient_id}">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5>${patient.name || 'Unknown'}</h5>
            <p class="mb-1"><strong>ID:</strong> ${patient.patient_id || 'N/A'}</p>
            <p class="mb-1"><strong>Age:</strong> ${patient.age || 'N/A'} | <strong>Gender:</strong> ${patient.gender || 'N/A'}</p>
          </div>
          <div>
            <button class="btn btn-outline-danger btn-sm px-3 py-1 fw-semibold shadow-sm delete-simple-patient" data-id="${patient.patient_id}">
              <i class="fas fa-trash-alt me-1"></i> Delete
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
// NIGHT MODE
const toggleButton = document.getElementById("toggleNightMode");
let nightMode = false;

// 🌙☀️ NIGHT MODE SCRIPT
const toggleButton = document.getElementById("toggleNightMode");
let nightMode = false;
let autoModeApplied = false; // prevent repeated alerts

// 🎨 Function to apply theme
function applyTheme(isNight, showAlert = false) {
  nightMode = isNight;
  toggleButton.innerHTML = nightMode ? "☀️ Light Mode" : "🌙 Night Mode";

  // Change only background
  document.body.style.background = nightMode
    ? "linear-gradient(135deg, rgba(120, 214, 153, 0.91), rgba(236, 236, 130, 0.96))"
    : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)";

  // Show alert if required
  if (showAlert) {
    alert(nightMode
      ? "🌙 Good Evening! Switched to Night Mode automatically."
      : "☀️ Good Morning! Switched to Light Mode automatically.");
  }
}

// ⏱️ Auto Mode Based on Time
function checkAutoNightMode() {
  const hours = new Date().getHours();
  if (hours >= 18 || hours < 5) {
    applyTheme(true, true);  // Night mode
    autoModeApplied = true;
  } else if (hours >= 5 && hours < 18) {
    applyTheme(false, true); // Light mode
    autoModeApplied = true;
  }
}

// 🖱️ Manual Toggle (User choice always respected)
toggleButton.addEventListener("click", () => {
  applyTheme(!nightMode);
});

// 🚀 On Page Load
document.addEventListener("DOMContentLoaded", () => {
  checkAutoNightMode();
});

