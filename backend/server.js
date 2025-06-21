const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();

// Allow all origins (safe for dev, restrict in production)
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,    
 // acquireTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Confirm DB connection
pool.getConnection()
  .then(conn => {
    console.log('✅ Connected to SmartSaline DB');
    conn.release();
  })
  .catch(err => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
  });

/* ------------------ ROUTES ------------------ */

// ✅ Admin login
app.post('/login', async (req, res) => {
  try {
    const { hospitalId, adminId, password } = req.body;

    if (!hospitalId || !adminId || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const [results] = await pool.query(`
      SELECT a.admin_id, a.name, a.contact, a.floor, a.password AS adminPassword
      FROM admin a
      WHERE a.admin_id = ? AND a.check_hospital_id = ?
    `, [adminId, hospitalId]);

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const admin = results[0];

    if (admin.adminPassword !== password) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    res.json({
      success: true,
      admin: {
        admin_id: admin.admin_id,
        name: admin.name,
        floor: admin.floor,
        contact: admin.contact
      }
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ✅ Get all patients
app.get('/api/patients', async (req, res) => {
  try {
    const [patients] = await pool.query(`
      SELECT * FROM patients ORDER BY admission_date DESC
    `);
    res.json(patients);
  } catch (err) {
    console.error('Error fetching patients:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Get one patient by ID
app.get('/api/patient/:pid', async (req, res) => {
  try {
    const pid = req.params.pid;
    const [results] = await pool.query(`SELECT * FROM patients WHERE patient_id = ?`, [pid]);

    if (results.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json(results[0]);
  } catch (err) {
    console.error('Error fetching patient:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add these routes to server.js before the fallback error handler

// ✅ Get all admins
app.get('/api/admins', async (req, res) => {
  try {
    const [admins] = await pool.query(`SELECT * FROM admin`);
    res.json(admins);
  } catch (err) {
    console.error('Error fetching admins:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Add new admin
app.post('/api/admins', async (req, res) => {
  try {
    const { admin_id, name, password, contact, floor, check_hospital_id } = req.body;
    
    if (!admin_id || !name || !password || !contact || !floor || !check_hospital_id) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await pool.query(`
      INSERT INTO admin (admin_id, name, password, contact, floor, check_hospital_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [admin_id, name, password, contact, floor, check_hospital_id]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding admin:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Delete admin
app.delete('/api/admins/:adminId', async (req, res) => {
  try {
    const adminId = req.params.adminId;
    const [result] = await pool.query(`DELETE FROM admin WHERE admin_id = ?`, [adminId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting admin:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ✅ Delete patient
app.delete('/api/patients/:patientId', async (req, res) => {
  try {
    const patientId = req.params.patientId;
    const [result] = await pool.query(`DELETE FROM patients WHERE patient_id = ?`, [patientId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting patient:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/verify-hospital-session', async (req, res) => {
    try {
        const { hospitalId } = req.body;
        
        if (!hospitalId) {
            return res.status(400).json({ valid: false, message: 'Hospital ID is required' });
        }

        const [results] = await pool.query(
            `SELECT hospital_id FROM hospital WHERE hospital_id = ?`,
            [hospitalId]
        );

        res.json({ valid: results.length > 0 });
    } catch (err) {
        console.error('Hospital session verification error:', err.message);
        res.status(500).json({ valid: false, error: 'Database error' });
    }
});


//-----------ESP32------------------
/* ------------------------------------------- */
// Add these routes before the fallback error handler

// ESP32 Data Endpoint
app.post('/api/esp32-data', async (req, res) => {
  try {
    const { patientId, salineLeft, flowRate, heartRate } = req.body;

    if (!patientId || salineLeft === undefined || flowRate === undefined || heartRate === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate adjusted flow rate based on heart rate
    const adjustedFlowRate = flowRate * (72 / heartRate); // 72 is normal heart rate

    // Update patient record
    await pool.query(`
      UPDATE patients 
      SET saline_left = ?, flow_rate = ?, heart_rate = ?, last_update = NOW()
      WHERE patient_id = ?
    `, [salineLeft, adjustedFlowRate, heartRate, patientId]);

    // Check for emergency conditions
    const isEmergency = adjustedFlowRate > 100 || salineLeft < 10; // Threshold values
    
    if (isEmergency) {
      // Trigger emergency alert
      await pool.query(`
        UPDATE patients 
        SET emergency_status = 1, emergency_time = NOW()
        WHERE patient_id = ?
      `, [patientId]);
      
      // Here you would typically send a notification to nurses
    }

    res.json({ 
      success: true,
      adjustedFlowRate,
      isEmergency 
    });

  } catch (err) {
    console.error('ESP32 data error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Emergency Stop Endpoint
app.post('/api/emergency-stop', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Update patient record
    await pool.query(`
      UPDATE patients 
      SET emergency_status = 1, emergency_time = NOW()
      WHERE patient_id = ?
    `, [patientId]);

    // Here you would send a signal to ESP32 to stop flow
    // This would require your ESP32 to poll this status

    res.json({ success: true });

  } catch (err) {
    console.error('Emergency stop error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get Emergency Patients
app.get('/api/emergency-patients', async (req, res) => {
  try {
    const [patients] = await pool.query(`
      SELECT * FROM patients 
      WHERE emergency_status = 1
      ORDER BY emergency_time DESC
    `);
    res.json(patients);
  } catch (err) {
    console.error('Error fetching emergency patients:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});
/*----------------------------------------- */



// Fallback error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SmartSaline Backend running at http://localhost:${PORT}`);
});
