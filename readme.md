# 📚 SmartSaline – Real-time IV Monitoring System

SmartSaline is a real-time IV drop monitoring and alert system using ESP32/ESP8266, a Node.js backend, and a responsive hospital dashboard. It enables accurate IV monitoring, timely alerts, and smart analytics through seamless integration of hardware, backend, and frontend components.

---

## 🌐 Live Demo

🔗 [SmartSaline Portal](https://smartsaline.netlify.app)

---

## 💪 Features

* 💧 **Real-Time IV Monitoring** – Monitors drop count, flow rate, saline level, and heart rate.
* 🚨 **Emergency Detection** – Auto-triggers alerts for excessive flow or low saline.
* 📟 **Buzzer Alert System** – Triggers buzzer after 3 mins of inactivity.
* 🧑‍⚕️ **Hospital Dashboard** – Admins can monitor patient status, emergency triggers, and live updates.
* 📡 **ThingSpeak Integration** – Visualize drop data and flow in the cloud.
* 🔐 **Secure Admin Login** – Session-based validation with patient assignment.
* 📈 **Live Patient Polling** – Frontend updates every 3s to reflect ESP32 inputs.

---

## 🔧 Technologies Used

* Frontend: **HTML5, CSS3, JavaScript**
* Backend: **Node.js, Express.js**
* Microcontroller: **ESP8266 / ESP32 (Arduino IDE)**
* Database: **MySQL**
* Hosting: **Vercel (backend), Netlify (frontend)**
* Sensor Cloud: **ThingSpeak API**

---

## 🧪 ESP32 / ESP8266 Configuration

1. Connect IR sensor to A0 and buzzer to GPIO14 (D5)
2. Upload the code via Arduino IDE
3. Use `WiFiClientSecure` to send HTTPS POST to backend:
4. JSON sent every minute:
```json
{
  "patientId": 286,
  "salineLeft": 88,
  "flowRate": 12,
  "heartRate": 72,
  "dropCount": 34
}
```
---

## License
This project is proprietary software. All rights reserved by TechCure.

## Contact
For inquiries or support, please email: sahasagnik279@gmail.com

# 👨‍💻 Team

👨‍💻 Sagnik Saha (Web Developer)

🤖 Prasun Majumder (Hardware Specialist)

📊 Alapan Basak (Researcher)

🧑‍🔬Abhijeet Sharma (AI/ML)

🎓 Sudip Barik (Mentor)

Built with ❤️ & Tech — Tech Cure

> 💡 *Saving lives with every drop monitored.*
> 🔬 Built with ❤️ by **Sagnik Saha**
