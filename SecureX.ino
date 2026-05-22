#include <HardwareSerial.h>
#include <Adafruit_Fingerprint.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── Pin definitions ──────────────────────────────────────────────────────────
#define RX_PIN     17
#define TX_PIN     16
#define GREEN_LED  18
#define RED_LED    19

// ── BLE UUIDs ────────────────────────────────────────────────────────────────
#define SERVICE_UUID           "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_RX "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHARACTERISTIC_UUID_TX "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// ── Hardware objects ─────────────────────────────────────────────────────────
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);

// ── BLE objects ──────────────────────────────────────────────────────────────
BLEServer          *pServer          = NULL;
BLECharacteristic  *pTxCharacteristic = NULL;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

// ── State ────────────────────────────────────────────────────────────────────
bool authRequested   = false;
bool enrollRequested = false;

int           failedAttempts  = 0;
bool          isLocked        = false;
unsigned long lockStartTime   = 0;
unsigned long lockDuration    = 0;   // ms; set when locking

uint8_t enrollId = 1;               // fingerprint slot to enroll into

// ── Forward declarations ─────────────────────────────────────────────────────
void sendBLEMessage(const String &message);
int  scanFingerprint();
void performAuth();
void enrollFinger();
void handleDeny();
uint8_t getFingerprintEnroll();

// ── BLE Server callbacks ─────────────────────────────────────────────────────
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer *pSrv) {
    deviceConnected = true;
    digitalWrite(GREEN_LED, HIGH); delay(200); digitalWrite(GREEN_LED, LOW);
    digitalWrite(RED_LED, LOW);
    Serial.println("App connected");
  }
  void onDisconnect(BLEServer *pSrv) {
    deviceConnected = false;
    digitalWrite(RED_LED, HIGH); delay(200); digitalWrite(RED_LED, LOW);
    Serial.println("App disconnected");
  }
};

// ── BLE Characteristic callbacks ─────────────────────────────────────────────
class MyCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    // getValue() returns Arduino String on modern ESP32 BLE library
    String rxValue = pCharacteristic->getValue();
    if (rxValue.length() == 0) return;
    rxValue.trim();

    if (rxValue == "SCAN" || rxValue == "AUTH") {
      authRequested = true;
    } else if (rxValue == "ENROLL") {
      enrollRequested = true;
    }
  }
};

// ── BLE helper ───────────────────────────────────────────────────────────────
void sendBLEMessage(const String &message) {
  if (deviceConnected && pTxCharacteristic != NULL) {
    pTxCharacteristic->setValue(message.c_str());
    pTxCharacteristic->notify();
    Serial.println("Sent: " + message);
  }
}

// ── Fingerprint: scan & match ─────────────────────────────────────────────────
int scanFingerprint() {
  int p = -1;
  unsigned long timeout = millis() + 10000; // 10-second window
  Serial.println("Waiting for finger...");

  while (p != FINGERPRINT_OK) {
    if (millis() > timeout) return FINGERPRINT_TIMEOUT;
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) { delay(50); continue; }
    if (p != FINGERPRINT_OK)       return p;
  }

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) return p;

  p = finger.fingerSearch();
  if (p != FINGERPRINT_OK) return p;

  Serial.print("Found ID #"); Serial.println(finger.fingerID);
  return FINGERPRINT_OK;
}

// ── Fingerprint: enroll ───────────────────────────────────────────────────────
uint8_t getFingerprintEnroll() {
  int p = -1;
  Serial.print("Waiting for finger to enroll as #"); Serial.println(enrollId);

  // ── First image ──────────────────────────────────────────────────────────
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:               Serial.println("Image taken");         break;
      case FINGERPRINT_NOFINGER:         delay(50);                             break;
      case FINGERPRINT_PACKETRECIEVEERR: Serial.println("Comm error");          break;
      case FINGERPRINT_IMAGEFAIL:        Serial.println("Imaging error");       break;
      default:                           Serial.println("Unknown error");       break;
    }
  }

  p = finger.image2Tz(1);
  switch (p) {
    case FINGERPRINT_OK:               Serial.println("Image converted"); break;
    case FINGERPRINT_IMAGEMESS:        Serial.println("Image too messy"); return p;
    case FINGERPRINT_PACKETRECIEVEERR: Serial.println("Comm error");      return p;
    case FINGERPRINT_FEATUREFAIL:
    case FINGERPRINT_INVALIDIMAGE:     Serial.println("Feature fail");    return p;
    default:                           Serial.println("Unknown error");   return p;
  }

  // ── Remove finger ────────────────────────────────────────────────────────
  Serial.println("Remove finger");
  delay(2000);
  p = 0;
  while (p != FINGERPRINT_NOFINGER) p = finger.getImage();

  // ── Second image ─────────────────────────────────────────────────────────
  Serial.println("Place same finger again");
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    switch (p) {
      case FINGERPRINT_OK:               Serial.println("Image taken");   break;
      case FINGERPRINT_NOFINGER:         delay(50);                       break;
      case FINGERPRINT_PACKETRECIEVEERR: Serial.println("Comm error");    break;
      case FINGERPRINT_IMAGEFAIL:        Serial.println("Imaging error"); break;
      default:                           Serial.println("Unknown error"); break;
    }
  }

  p = finger.image2Tz(2);
  switch (p) {
    case FINGERPRINT_OK:               Serial.println("Image converted"); break;
    case FINGERPRINT_IMAGEMESS:        Serial.println("Image too messy"); return p;
    case FINGERPRINT_PACKETRECIEVEERR: Serial.println("Comm error");      return p;
    case FINGERPRINT_FEATUREFAIL:
    case FINGERPRINT_INVALIDIMAGE:     Serial.println("Feature fail");    return p;
    default:                           Serial.println("Unknown error");   return p;
  }

  // ── Create & store model ─────────────────────────────────────────────────
  p = finger.createModel();
  if      (p == FINGERPRINT_OK)               { Serial.println("Prints matched!"); }
  else if (p == FINGERPRINT_PACKETRECIEVEERR) { Serial.println("Comm error");               return p; }
  else if (p == FINGERPRINT_ENROLLMISMATCH)   { Serial.println("Fingerprints did not match"); return p; }
  else                                        { Serial.println("Unknown error");             return p; }

  p = finger.storeModel(enrollId);
  if      (p == FINGERPRINT_OK)               { Serial.println("Stored!"); }
  else if (p == FINGERPRINT_PACKETRECIEVEERR) { Serial.println("Comm error");           return p; }
  else if (p == FINGERPRINT_BADLOCATION)      { Serial.println("Bad location");         return p; }
  else if (p == FINGERPRINT_FLASHERR)         { Serial.println("Flash write error");    return p; }
  else                                        { Serial.println("Unknown error");        return p; }

  return FINGERPRINT_OK;
}

// ── Enroll wrapper ────────────────────────────────────────────────────────────
void enrollFinger() {
  uint8_t result = getFingerprintEnroll();
  if (result == FINGERPRINT_OK) {
    sendBLEMessage("ENROLLED");
    digitalWrite(GREEN_LED, HIGH); delay(2000); digitalWrite(GREEN_LED, LOW);
  } else {
    sendBLEMessage("ENROLL_FAIL");
    digitalWrite(RED_LED, HIGH);   delay(2000); digitalWrite(RED_LED, LOW);
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
void performAuth() {
  if (isLocked) {
    sendBLEMessage("LOCKED");
    return;
  }

  unsigned long timeout  = millis() + 10000;
  int  p          = -1;
  bool toggleRed  = false;
  unsigned long lastBlink = millis();

  while (p != FINGERPRINT_OK) {
    if (millis() > timeout) {
      sendBLEMessage("TIMEOUT");
      digitalWrite(RED_LED, LOW);
      return;
    }
    if (millis() - lastBlink > 300) {
      toggleRed = !toggleRed;
      digitalWrite(RED_LED, toggleRed ? HIGH : LOW);
      lastBlink = millis();
    }
    p = finger.getImage();
    if (p == FINGERPRINT_NOFINGER) continue;
    if (p != FINGERPRINT_OK)       continue;
  }
  digitalWrite(RED_LED, LOW);

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) { handleDeny(); return; }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    failedAttempts = 0;
    Serial.println("ACCESS GRANTED");
    sendBLEMessage("GRANTED");
    digitalWrite(GREEN_LED, HIGH); delay(1000); digitalWrite(GREEN_LED, LOW);
  } else {
    handleDeny();
  }
}

// ── Deny / lockout ────────────────────────────────────────────────────────────
void handleDeny() {
  failedAttempts++;
  Serial.println("ACCESS DENIED");
  digitalWrite(RED_LED, HIGH); delay(1000); digitalWrite(RED_LED, LOW);

  if (failedAttempts >= 6) {
    Serial.println("PERMANENTLY LOCKED");
    isLocked      = true;
    lockStartTime = millis();
    lockDuration  = 5000; // 5 s demo; change to real value in production
    sendBLEMessage("LOCKED_PERM");
  } else if (failedAttempts >= 3) {
    Serial.println("TEMPORARILY LOCKED");
    isLocked      = true;
    lockStartTime = millis();
    lockDuration  = 10000; // 10 s demo
    sendBLEMessage("LOCKED_TEMP");
  } else {
    sendBLEMessage("DENIED");
  }
}

// ── setup() ───────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(RED_LED,   OUTPUT);
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(RED_LED,   HIGH); // idle indicator

  mySerial.begin(57600, SERIAL_8N1, RX_PIN, TX_PIN);
  finger.begin(57600);

  if (finger.verifyPassword()) {
    Serial.println("Fingerprint sensor found!");
  } else {
    Serial.println("Fingerprint sensor NOT found :(");
  }

  // BLE init
  BLEDevice::init("SecureX_ESP32");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // TX characteristic – notify only (ESP32 → phone)
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY);
  pTxCharacteristic->addDescriptor(new BLE2902());

  // RX characteristic – write only (phone → ESP32)
  BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_RX,
                        BLECharacteristic::PROPERTY_WRITE);
  pRxCharacteristic->setCallbacks(new MyCallbacks());

  pService->start();
  pServer->getAdvertising()->start();
  Serial.println("BLE advertising started. Waiting for connection...");
}

// ── loop() ────────────────────────────────────────────────────────────────────
void loop() {
  // ── Unlock after timeout ────────────────────────────────────────────────
  if (isLocked && (millis() - lockStartTime >= lockDuration)) {
    isLocked = false;
    if (failedAttempts >= 6) failedAttempts = 0; // demo reset for perm lock
    Serial.println("Lock expired, resetting.");
  }

  // ── Handle BLE commands ─────────────────────────────────────────────────
  if (authRequested) {
    authRequested = false;
    performAuth();
  }
  if (enrollRequested) {
    enrollRequested = false;
    enrollFinger();
  }

  // ── BLE reconnect handling ──────────────────────────────────────────────
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
    digitalWrite(RED_LED, HIGH); // back to idle indicator
    Serial.println("Restarted advertising...");
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }
}
