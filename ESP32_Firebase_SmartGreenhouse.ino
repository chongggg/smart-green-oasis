
/**
 * Smart Greenhouse IoT System with Firebase Integration
 * Uses ESP32 with Firebase RTDB for remote monitoring and control
 */

#include <WiFi.h>
#include <Arduino.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>

// Provide the token generation process info
#include "addons/TokenHelper.h"
// Provide the RTDB payload printing info and other helper functions
#include "addons/RTDBHelper.h"

// WiFi credentials
#define WIFI_SSID "PLDT_Home_2551F"
#define WIFI_PASSWORD "pldthome"

// Firebase project API Key
#define API_KEY "AIzaSyDVBwk2dqZXbVGkWvxwIEmDCrHKGy-7Wow"

// Firebase Realtime Database URL
#define DATABASE_URL "https://greenhouse-656f2-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Firebase user account
#define USER_EMAIL "johnclarencemiranda382@gmail.com"
#define USER_PASSWORD "zetkzluulngpwfvf"

// Define Firebase Data object
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// Sensor/Relay Pins
#define DHT_PIN 4
#define DHT_TYPE DHT11
#define SOIL_MOISTURE_PIN 36
#define SOIL_MOISTURE_VCC 23
#define LDR_PIN 39
#define LDR_VCC 22
#define RELAY_PUMP 18
#define RELAY_FAN 25
#define RELAY_LEDS 27
#define GREEN_LED 2

// Thresholds
int lum_thresh = 20;
int moist_thresh = 20;
int temp_thresh = 31;

// Status flags
bool leds_ON = false;
bool fan_status = false;
bool pump_status = false;
bool light_status = false;
bool automation_enabled = true;

// Sensor values
float temperature = 0;
float humidity = 0;
int light = 0;
float moisture_percentage = 0;

// Initialize DHT sensor
DHT dht(DHT_PIN, DHT_TYPE);

// Function prototypes
void readSensors();
void controlDevices();
void sendToFirebase();
void checkFirebaseCommands();

unsigned long dataMillis = 0;
bool signupOK = false;

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  dht.begin();
  pinMode(SOIL_MOISTURE_VCC, OUTPUT);
  pinMode(LDR_VCC, OUTPUT);
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_LEDS, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);

  // Turn off relays initially (HIGH = OFF for most relay modules)
  digitalWrite(RELAY_PUMP, HIGH);
  digitalWrite(RELAY_FAN, HIGH);
  digitalWrite(RELAY_LEDS, HIGH);
  digitalWrite(GREEN_LED, LOW);

  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(300);
  }
  Serial.print("\nConnected with IP: ");
  Serial.println(WiFi.localIP());

  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;

  // Initialize Firebase
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Get SignUp status
  signupOK = true;  // Assuming signup is already done
}

void loop() {
  // Check if WiFi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi connection lost. Reconnecting...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    delay(5000);
    return;
  }

  // Check if Firebase is connected
  if (!Firebase.ready()) {
    Serial.println("Firebase not connected. Waiting...");
    delay(1000);
    return;
  }

  // Update every 10 seconds
  if (millis() - dataMillis > 10000 || dataMillis == 0) {
    dataMillis = millis();
    
    readSensors();
    checkFirebaseCommands();
    if (automation_enabled) {
      controlDevices();
    }
    sendToFirebase();
  }
}

void readSensors() {
  // Read DHT sensor
  float newTemp = dht.readTemperature();
  float newHumidity = dht.readHumidity();
  
  // Only update if readings are valid
  if (!isnan(newTemp)) {
    temperature = newTemp;
  }
  if (!isnan(newHumidity)) {
    humidity = newHumidity;
  }

  // Read soil moisture sensor
  digitalWrite(SOIL_MOISTURE_VCC, HIGH);
  delay(500);
  int moisture = analogRead(SOIL_MOISTURE_PIN);
  digitalWrite(SOIL_MOISTURE_VCC, LOW);
  moisture_percentage = 100 - ((moisture * 100.0) / 4095);

  // Read light sensor
  digitalWrite(LDR_VCC, HIGH);
  delay(500);
  int rawLight = analogRead(LDR_PIN);
  digitalWrite(LDR_VCC, LOW);
  light = (rawLight * 100) / 4095;

  Serial.printf("Temp: %.1f°C, Hum: %.1f%%, Moisture: %.1f%%, Light: %d%%\n",
                temperature, humidity, moisture_percentage, light);
}

void controlDevices() {
  // Light control
  if (light < lum_thresh && !leds_ON) {
    digitalWrite(RELAY_LEDS, LOW);  // Turn ON
    digitalWrite(GREEN_LED, HIGH);
    leds_ON = true;
    light_status = true;
  } else if (light >= lum_thresh && leds_ON) {
    digitalWrite(RELAY_LEDS, HIGH);  // Turn OFF
    digitalWrite(GREEN_LED, LOW);
    leds_ON = false;
    light_status = false;
  }

  // Water pump control
  if (moisture_percentage < moist_thresh) {
    digitalWrite(RELAY_PUMP, LOW);  // Turn ON
    pump_status = true;
  } else {
    digitalWrite(RELAY_PUMP, HIGH);  // Turn OFF
    pump_status = false;
  }

  // Fan control
  if (temperature >= temp_thresh) {
    digitalWrite(RELAY_FAN, LOW);  // Turn ON
    fan_status = true;
  } else {
    digitalWrite(RELAY_FAN, HIGH);  // Turn OFF
    fan_status = false;
  }
}

void sendToFirebase() {
  if (Firebase.ready() && signupOK) {
    // Send sensor data
    Firebase.RTDB.setFloat(&fbdo, "sensor_data/temperature", temperature);
    Firebase.RTDB.setFloat(&fbdo, "sensor_data/humidity", humidity);
    Firebase.RTDB.setFloat(&fbdo, "sensor_data/soil_moisture", moisture_percentage);
    Firebase.RTDB.setInt(&fbdo, "sensor_data/lighting", light);

    // Send actuator status
    Firebase.RTDB.setBool(&fbdo, "actuator_status/fan", fan_status);
    Firebase.RTDB.setBool(&fbdo, "actuator_status/pump", pump_status);
    Firebase.RTDB.setBool(&fbdo, "actuator_status/light", light_status);
    Firebase.RTDB.setBool(&fbdo, "settings/automation", automation_enabled);

    // Log timestamp
    Firebase.RTDB.setString(&fbdo, "system/last_update", String(millis()));

    // Store historical data (using timestamp as key)
    String timestamp = String(millis());
    Firebase.RTDB.setFloat(&fbdo, "history/" + timestamp + "/temperature", temperature);
    Firebase.RTDB.setFloat(&fbdo, "history/" + timestamp + "/humidity", humidity);
    Firebase.RTDB.setFloat(&fbdo, "history/" + timestamp + "/soil_moisture", moisture_percentage);
    Firebase.RTDB.setInt(&fbdo, "history/" + timestamp + "/lighting", light);
    Firebase.RTDB.setInt(&fbdo, "history/" + timestamp + "/timestamp", millis());

    Serial.println("Data sent to Firebase successfully.");
  } else {
    Serial.println("Failed to send data to Firebase.");
    Serial.println("Reason: " + fbdo.errorReason());
  }
}

void checkFirebaseCommands() {
  if (Firebase.ready() && signupOK) {
    // Check automation status
    if (Firebase.RTDB.getBool(&fbdo, "settings/automation")) {
      if (fbdo.dataType() == "boolean") {
        automation_enabled = fbdo.boolData();
        Serial.println("Automation is " + String(automation_enabled ? "enabled" : "disabled"));
      }
    }

    // If automation is disabled, check manual controls
    if (!automation_enabled) {
      // Check fan control
      if (Firebase.RTDB.getBool(&fbdo, "manual_control/fan")) {
        if (fbdo.dataType() == "boolean") {
          bool should_be_on = fbdo.boolData();
          digitalWrite(RELAY_FAN, should_be_on ? LOW : HIGH);  // LOW = ON, HIGH = OFF
          fan_status = should_be_on;
        }
      }

      // Check pump control
      if (Firebase.RTDB.getBool(&fbdo, "manual_control/pump")) {
        if (fbdo.dataType() == "boolean") {
          bool should_be_on = fbdo.boolData();
          digitalWrite(RELAY_PUMP, should_be_on ? LOW : HIGH);
          pump_status = should_be_on;
        }
      }

      // Check light control
      if (Firebase.RTDB.getBool(&fbdo, "manual_control/light")) {
        if (fbdo.dataType() == "boolean") {
          bool should_be_on = fbdo.boolData();
          digitalWrite(RELAY_LEDS, should_be_on ? LOW : HIGH);
          digitalWrite(GREEN_LED, should_be_on ? HIGH : LOW);
          light_status = should_be_on;
          leds_ON = should_be_on;
        }
      }
    }
  }
}
