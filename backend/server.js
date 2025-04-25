import express from 'express';
import mysql from 'mysql2';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'https://smart-saline.netlify.app', // Or your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST ,
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ,
    port: process.env.DB_PORT
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        return;
    }
    console.log('Successfully connected to the database');
});

// Authentication Middleware
const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).send('Access denied');

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send('Invalid token');
        
        db.query('SELECT * FROM hospital_staff WHERE staff_id = ?', [decoded.staff_id], (err, users) => {
            if (err || users.length === 0) return res.status(401).send('Invalid token');
            req.user = users[0];
            next();
        });
    });
};

// Sample route
app.get('/', (req, res) => {
    res.send('IV Monitoring Server is running!');
});



app.post("/request-trial", async (req, res) => {
    const { name, email, phone, organization, designation, purpose, students, startDate } = req.body;
  
    if (!name || !email || !phone || !organization || !designation || !purpose || !students || !startDate) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
  
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMARTMERIT_EMAIL,
            pass: process.env.SMARTMERIT_APP_PASSWORD
        }
    });
    
    const mailOptions = {
        from: email,
        to: "sahasagnik279@gmail.com",
        subject: "Request for SmartMerit Free Trial Access",
        text: `
        Dear SmartMerit Team,
        
        I would like to request access to the free trial version of SmartMerit. Please find my details below:
        
        Name: ${name}
        Email: ${email}
        Phone: ${phone}
        Organization/School: ${organization}
        Designation: ${designation}
        Purpose of Use: ${purpose}
        Expected Number of Students: ${students}
        Preferred Trial Start Date: ${startDate}
        
        Looking forward to your confirmation.
        
        Best regards,
        ${name}
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

app.post("/submit-feedback", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ error: "Feedback cannot be empty" });
        }
    
        db.query("INSERT INTO feedback (message) VALUES (?)", [message], (err) => {
            if (err) {
                return res.status(500).json({ error: "Database error", details: err.message });
            }
            res.status(201).json({ message: "Thank you for sending us feedback! 😊 It helps us get better and better! 🚀✨" });
        });
    } catch (err) {
        res.status(500).json({ error: "Server error", details: err.message });
    }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
        return res.status(400).send('Email and password are required');
    }

    db.query('SELECT * FROM hospital_staff WHERE email = ?', [email], (err, users) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Database error');
        }
        
        if (users.length === 0) {
            return res.status(400).send('User not found');
        }

        const user = users[0];
        
        // Compare plaintext password (replace with bcrypt.compare() later)
        if (user.password_hash !== password) {
            return res.status(400).send('Invalid password');
        }

        // Generate token
        const token = jwt.sign(
            { staff_id: user.staff_id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '8h' }
        );
        
        res.send({ 
            token, 
            user: { 
                name: user.name, 
                role: user.role,
                staff_id: user.staff_id // Include for frontend use
            } 
        });
    });
});

// Device authentication route (simple token check)
app.post('/device-auth', (req, res) => {
    const { device_token } = req.body;
    
    if (device_token !== process.env.DEVICE_TOKEN) {
        return res.status(401).send('Invalid device token');
    }
    
    res.send({ message: 'Device authenticated' });
});

// Add a new patient
app.post('/patients', authenticate, (req, res) => {
    const { name, age, gender, medical_history, current_condition, contact_number } = req.body;
    
    db.query(
        'INSERT INTO patients (name, age, gender, medical_history, current_condition, contact_number) VALUES (?, ?, ?, ?, ?, ?)',
        [name, age, gender, medical_history, current_condition, contact_number],
        (err, result) => {
            if (err) return res.status(500).send('Database error');
            res.status(201).send({ patient_id: result.insertId });
        }
    );
});

// Get all patients
app.get('/patients', authenticate, (req, res) => {
    db.query('SELECT * FROM patients', (err, patients) => {
        if (err) return res.status(500).send('Database error');
        res.send(patients);
    });
});

// Start a new IV session
app.post('/sessions', authenticate, (req, res) => {
    const { patient_id, bottle_capacity, initial_saline_level } = req.body;
    
    db.query(
        'INSERT INTO iv_sessions (patient_id, bottle_capacity, initial_saline_level) VALUES (?, ?, ?)',
        [patient_id, bottle_capacity, initial_saline_level],
        (err, result) => {
            if (err) return res.status(500).send('Database error');
            res.status(201).send({ session_id: result.insertId });
        }
    );
});

// ESP32 sends data
app.post('/device-data', (req, res) => {
    const { device_token, session_id, bpm, flow_rate, saline_level, is_emergency, emergency_reason } = req.body;

    // Verify device token
    if (device_token !== process.env.DEVICE_TOKEN) {
        return res.status(401).send('Invalid device token');
    }

    db.query(
        'INSERT INTO vital_readings (session_id, bpm, flow_rate, saline_level, is_emergency, emergency_reason) VALUES (?, ?, ?, ?, ?, ?)',
        [session_id, bpm, flow_rate, saline_level, is_emergency, emergency_reason],
        (err) => {
            if (err) return res.status(500).send('Database error');
            
            if (is_emergency) {
                const alertType = getAlertType(emergency_reason);
                db.query(
                    'INSERT INTO alerts (session_id, alert_type, message) VALUES (?, ?, ?)',
                    [session_id, alertType, emergency_reason],
                    (err) => {
                        if (err) console.error('Failed to create alert:', err);
                    }
                );
            }
            
            res.status(200).send('Data received');
        }
    );
});

function getAlertType(reason) {
    if (reason.includes('Saline')) return 'Low Saline';
    if (reason.includes('BPM')) return 'Abnormal BPM';
    return 'Flow Irregularity';
}

// Dashboard endpoint
app.get('/dashboard/:session_id', authenticate, (req, res) => {
    const { session_id } = req.params;
    
    db.query('SELECT * FROM iv_sessions WHERE session_id = ?', [session_id], (err, session) => {
        if (err || session.length === 0) return res.status(404).send('Session not found');
        
        db.query('SELECT * FROM patients WHERE patient_id = ?', [session[0].patient_id], (err, patient) => {
            if (err || patient.length === 0) return res.status(404).send('Patient not found');
            
            db.query('SELECT * FROM vital_readings WHERE session_id = ? ORDER BY timestamp DESC LIMIT 100', [session_id], (err, readings) => {
                db.query('SELECT * FROM alerts WHERE session_id = ? AND resolved = FALSE ORDER BY timestamp DESC', [session_id], (err, alerts) => {
                    const latestReading = readings[0];
                    const hoursRemaining = latestReading.flow_rate > 0 ? 
                        latestReading.saline_level / (latestReading.flow_rate * 60) : 0;

                    res.send({
                        patient: patient[0],
                        session: session[0],
                        latestReading,
                        readings,
                        alerts,
                        prediction: {
                            hoursRemaining,
                            depletionTime: new Date(Date.now() + hoursRemaining * 60 * 60 * 1000)
                        }
                    });
                });
            });
        });
    });
});

// Resolve alert
app.post('/alerts/:alert_id/resolve', authenticate, (req, res) => {
    db.query(
        'UPDATE alerts SET resolved = TRUE, resolved_time = NOW() WHERE alert_id = ?',
        [req.params.alert_id],
        (err) => {
            if (err) return res.status(500).send('Database error');
            res.send('Alert resolved');
        }
    );
});

app.get('/validate-token', authenticate, (req, res) => {
    res.send({ 
        user: {
            name: req.user.name,
            role: req.user.role,
            staff_id: req.user.staff_id
        }
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
