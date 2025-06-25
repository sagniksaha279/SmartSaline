#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include "ThingSpeak.h"

// -------------------- Wi-Fi & Backend Config --------------------
const char* ssid = "Your_Wifi_Name";
const char* password = "Your_Wifi_Password";
const char* serverUrl = "https://smart-saline.vercel.app/api/esp32-data";
const int patientId = 286;

// -------------------- ThingSpeak Config --------------------
const char* apiKey = "Your_ThingSpeak_API_key";  // Replace with yours
const long channelID = 25***2;           // Replace with your channel ID

WiFiClientSecure secureClient; 
WiFiClient thingSpeakClient;   
HTTPClient http;

// -------------------- Pins & IV Drop Detection --------------------
const int irSensorPin = 34;   
const int buzzerPin = 5;      

#define NUM_SAMPLES 10
int samples[NUM_SAMPLES];
int sampleIndex = 0;
int dropCount = 0;
float dropFrequency = 0.0;
bool dropDetected = false;
int noDropMinutes = 0;
int prevIrValue = 0;
int deltaThreshold = 50;
int dropThreshold = 600;

unsigned long previousMillis = 0;
const unsigned long interval = 60000;  

int getFilteredIRValue() {
  samples[sampleIndex] = analogRead(irSensorPin);
  sampleIndex = (sampleIndex + 1) % NUM_SAMPLES;
  long sum = 0;
  for (int i = 0; i < NUM_SAMPLES; i++) sum += samples[i];
  return sum / NUM_SAMPLES;
}

void calibrateIRThreshold() {
  int baseline = 0;
  for (int i = 0; i < 50; i++) {
    baseline += analogRead(irSensorPin);
    delay(10);
  }
  dropThreshold = (baseline / 50) - 50;
  Serial.print("Drop Threshold Set To: ");
  Serial.println(dropThreshold);
}

void setup() {
  Serial.begin(115200);
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n✅ WiFi connected");
  Serial.print("📡 IP Address: ");
  Serial.println(WiFi.localIP());

  secureClient.setInsecure(); 

  ThingSpeak.begin(thingSpeakClient);

  for (int i = 0; i < NUM_SAMPLES; i++) samples[i] = analogRead(irSensorPin);
  calibrateIRThreshold();
}

void loop() {
  int irValue = getFilteredIRValue();
  float irVoltage = (irValue * 3.3) / 4095.0; 
  int delta = abs(irValue - prevIrValue);
  prevIrValue = irValue;

  Serial.print("IR: "); Serial.print(irValue);
  Serial.print(" | Δ: "); Serial.print(delta);
  Serial.print(" | V: "); Serial.print(irVoltage, 2);
  Serial.print(" | Drops: "); Serial.println(dropCount);

  if (delta > deltaThreshold && !dropDetected) {
    dropCount++;
    dropDetected = true;
  } else if (delta <= deltaThreshold) {
    dropDetected = false;
  }

  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    dropFrequency = dropCount;

    if (dropCount == 0) noDropMinutes++;
    else noDropMinutes = 0;

    if (noDropMinutes >= 3) {
      Serial.println("⚠ No drops in 3 min! Buzzing...");
      digitalWrite(buzzerPin, HIGH);
      delay(1000);
      digitalWrite(buzzerPin, LOW);
    }

    // ✅ Send to your backend (Vercel)
    if (WiFi.status() == WL_CONNECTED) {
      http.setTimeout(10000); 
      http.begin(secureClient, serverUrl);
      http.addHeader("Content-Type", "application/json");

      String json = "{";
      json += "\"patientId\":" + String(patientId) + ",";
      json += "\"salineLeft\":" + String(max(0, 100 - dropCount)) + ",";
      json += "\"flowRate\":" + String(dropFrequency) + ",";
      json += "\"heartRate\":72,";
      json += "\"dropCount\":" + String(dropCount);
      json += "}";

      Serial.println("📦 Sending JSON to backend:");
      Serial.println(json);

      int httpCode = http.POST(json);
      String response = http.getString();

      Serial.print("🔁 Backend POST code: ");
      Serial.println(httpCode);
      Serial.print("🧾 Backend response: ");
      Serial.println(response);

      http.end();
    }

    // ✅ Send to ThingSpeak
    ThingSpeak.setField(1, dropCount);
    ThingSpeak.setField(2, dropFrequency);
    ThingSpeak.setField(3, irVoltage);
    int tsStatus = ThingSpeak.writeFields(channelID, apiKey);
    Serial.println(tsStatus == 200 ? "📊 ThingSpeak ✅" : "📊 ThingSpeak ❌");

    dropCount = 0;
  }
}
// SmartSalineMonitor.ino
// Real-time IV Flow Monitoring using ESP32, ThingSpeak, and Backend API
// Year: 2025 Academic Innovation Project
