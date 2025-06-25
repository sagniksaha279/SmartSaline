const path = require('path');
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const app = express();

app.use(cors());
app.get("/favicon.ico", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "favicon.ico"));
});
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,    
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

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
//Admin login
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

//Get all patients
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

//Get one patient by ID
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

//Get all admins
app.get('/api/admins', async (req, res) => {
  try {
    const [admins] = await pool.query(`SELECT * FROM admin`);
    res.json(admins);
  } catch (err) {
    console.error('Error fetching admins:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

//Add new admin
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

//Delete admin
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

//Delete patient
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

//feedback API
app.post("/submit-feedback", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Feedback cannot be empty" });
    }

    await pool.query("INSERT INTO feedback (message) VALUES (?)", [message]);
    res.status(201).json({ 
      success: true,
      message: "Thank you for your feedback! We appreciate your input." 
    });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ 
      error: "Failed to submit feedback",
      details: err.message 
    });
  }
});

//-----------ESP32------------------
app.post('/api/esp32-data', async (req, res) => {
  try {
    const { patientId, salineLeft, flowRate, heartRate, dropCount } = req.body;

    if (!patientId || salineLeft === undefined || flowRate === undefined || heartRate === undefined || dropCount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const adjustedFlowRate = flowRate * (72 / heartRate);
    console.log("Updating patient:", {
      patientId,
      salineLeft,
      flowRate,
      heartRate,
      dropCount
    });

    
    await pool.query(`
    UPDATE patients 
    SET saline_left = ?, flow_rate = ?, heart_rate = ?, drop_count = ?, last_update = NOW()
    WHERE patient_id = ?`, [salineLeft, adjustedFlowRate, heartRate, dropCount, patientId]);
    
    await pool.query(`
      INSERT INTO drop_log (patient_id, drop_count)
      VALUES (?, ?)
    `, [patientId, dropCount]);

    const isEmergency = adjustedFlowRate > 100 || salineLeft < 10;

    if (isEmergency) {
      await pool.query(`
        UPDATE patients 
        SET emergency_status = 1, emergency_time = NOW()
        WHERE patient_id = ?
      `, [patientId]);
    }

    res.json({ success: true, adjustedFlowRate, isEmergency });

  } catch (err) {
    console.error('ESP32 data error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/esp32-data', (req, res) => {
  res.send("This endpoint is POST-only. Please use a POST request.");
});

// Emergency Stop Endpoint
app.post('/api/emergency-stop', async (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    await pool.query(`
      UPDATE patients 
      SET emergency_status = 1, emergency_time = NOW()
      WHERE patient_id = ?
    `, [patientId]);

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

/*___REQUEST TRIAL ______*/
app.post("/request-saline-trial", async (req, res) => {
  const {
    name,
    email,
    phone,
    organization,
    designation,
    purpose,
    students,
    startDate
  } = req.body;

  if (!name || !email || !phone || !organization || !designation || !purpose || !students || !startDate) {
    return res.status(400).json({ success: false, message: "All fields are required" });
  }

  const nodemailer = require("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMARTSALINE_EMAIL,
      pass: process.env.SMARTSALINE_APP_PASSWORD
    }
  });

  const mailOptions = {
    from: email,
    to: "sahasagnik279@gmail.com",
    subject: "New SmartSaline Trial Request",
    text: `
Dear SmartSaline Team,

You’ve received a new free trial request. Details below:

Name: ${name}
Email: ${email}
Phone: ${phone}
Hospital: ${organization}
Role: ${designation}
Purpose: ${purpose}
Expected Patients: ${students}
Preferred Start Date: ${startDate}

The user has been informed that this trial is free and full access can be purchased after evaluation.

Regards,  
SmartSaline Web System
    `
};

  try {
    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Trial request sent successfully!" });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});



// Fallback error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.get('/', (req, res) => {
  res.send(`
    <h1>🩺 SmartSaline Backend API</h1>
    <p>This is the backend server for the SmartSaline IV Monitoring System.</p>
    <ul>
      <li>✅ <strong>POST</strong> /api/esp32-data – Data upload from ESP32</li>
      <li>✅ <strong>GET</strong> /api/patient/:id – Patient monitoring</li>
      <li>✅ <strong>POST</strong> /api/emergency-stop – Trigger manual emergency</li>
    </ul>
    <p>Visit the frontend: <a href="https://smartsaline.netlify.app" target="_blank">SmartSaline Portal</a></p>
  `);
});


// Start server
module.exports = app;
