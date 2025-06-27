#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>

// -------------------- Wi-Fi & Backend Config --------------------
const char* ssid = "Hudson Bay";
const char* password = "sagnik278";
const char* serverUrl = "https://smart-saline.vercel.app/api/esp32-data";
const int patientId = 286;

WiFiClientSecure secureClient;
HTTPClient http;

// -------------------- Test Data --------------------
int dropCount = 15;
float dropFrequency = 15.0;
int heartRate = 72;
float salineLeft = 85.0;

unsigned long previousMillis = 0;
const unsigned long interval = 60000;  // 60 seconds

void setup() {
  Serial.begin(115200);
  delay(100);

  WiFi.begin(ssid, password);
  Serial.print("🔌 Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Connected to WiFi!");
  Serial.print("📡 IP Address: ");
  Serial.println(WiFi.localIP());

  secureClient.setInsecure();  // Ignore SSL cert verification
}

void loop() {
  unsigned long currentMillis = millis();
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;

    // ✅ Compose JSON Payload
    String json = "{";
    json += "\"patientId\":" + String(patientId) + ",";
    json += "\"salineLeft\":" + String(salineLeft) + ",";
    json += "\"flowRate\":" + String(dropFrequency) + ",";
    json += "\"heartRate\":" + String(heartRate) + ",";
    json += "\"dropCount\":" + String(dropCount);
    json += "}";

    Serial.println("\n📦 Sending JSON to backend:");
    Serial.println(json);

    if (WiFi.status() == WL_CONNECTED) {
      http.begin(secureClient, serverUrl);
      http.addHeader("Content-Type", "application/json");

      int httpCode = http.POST(json);
      if (httpCode <= 0) {
        Serial.print("❌ POST failed: ");
        Serial.println(http.errorToString(httpCode));
      } else {
        Serial.print("✅ POST status: ");
        Serial.println(httpCode);
        String response = http.getString();
        Serial.print("🔁 Server response: ");
        Serial.println(response);
      }

      http.end();
    } else {
      Serial.println("❌ WiFi not connected");
    }

    // Optional: Update drop count for next loop (simulate)
    dropCount = random(10, 20);
    dropFrequency = dropCount;
    salineLeft = max(0.0f, 100.0f - dropCount);
  }
}
