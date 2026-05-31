// #include <Adafruit_GFX.h> // librería para display
// #include <Adafruit_SSD1306.h> // librería para display
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <WiFi.h>
#include <Wire.h>
#include <math.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define I2C_SDA 21
#define I2C_SCL 22
// Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- PINOUT
#define PIN_FD 36   // ADC1
#define PIN_FI 39   // ADC1
#define PIN_TD 34   // ADC1
#define PIN_TI 35   // ADC1
#define PIN_PHI 32  // ADC1
#define PIN_ACEL 33 // ADC1
#define PIN_FREN                                                               \
  25 // NUEVO PIN (Advertencia: Revisar conflicto con WiFi en ESP32)

const int POT_MAX = 4095;

////////////////////////////////// --- CONFIGURACIÓN DE RED
const char *ssid_ap = "RED_ESP32";
const char *password_ap = "UAMOTORS";

WebSocketsServer webSocket = WebSocketsServer(81);

unsigned long lastSend = 0;
const long sendInterval = 50;

float readPotentiometer(int pin) {
  // esp32 sólo debe procesar esto y enviar las señales
  int rawValue = analogRead(pin);
  float value = map(rawValue, 0, POT_MAX, -100, 100) / 10.0;
  if (fabs(value) < 0.5)
    return 0.0;
  return value;
}

float readPhi() { return map(analogRead(PIN_PHI), 0, POT_MAX, -10, 10); }

/////////////////////////////// --- FUNCIONES DE LECTURA ---
float readAccel() {
  // Mapeo de 0 a 10 positivos
  return map(analogRead(PIN_ACEL), 0, POT_MAX, 0, 10);
}

float readBrake() {
  // Mapeo de 0 a -10 negativos
  return map(analogRead(PIN_FREN), 0, POT_MAX, 0, -10);
}

// void setup() {
//   Serial.begin(115200);

//   Wire.begin(I2C_SDA, I2C_SCL);
//   if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
//     Serial.println(F("Error en pantalla SSD1306"));
//     for (;;)
//       ;
//   }

/////////////////////////////////////// --- INICIO DE ACCESS POINT
Serial.println("\nCreando red WiFi...");
WiFi.mode(WIFI_AP);
WiFi.softAP(ssid_ap, password_ap);

Serial.print("Red Creada: ");
Serial.println(ssid_ap);
Serial.print("IP para conectar: ");
Serial.println(WiFi.softAPIP());

display.clearDisplay();
display.setTextSize(1);
display.setTextColor(SSD1306_WHITE);
display.setCursor(0, 0);
display.println("MODO FISICA");
display.print("IP: ");
display.println(WiFi.softAPIP());
display.display();

webSocket.begin();
webSocket.onEvent(webSocketEvent);
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t *payload,
                    size_t length) {
  switch (type) {
  case WStype_DISCONNECTED:
    Serial.printf("[%u] ¡Desconectado!\n", num);
    break;
  case WStype_CONNECTED:
    Serial.printf("[%u] Conectado\n", num);
    break;
  }
}

void loop() {
  // debe ir en MATI/core
  webSocket.loop();

  unsigned long currentTime = millis();
  if (currentTime - lastSend >= sendInterval) {

    ///////////////////////////////////// Lectura de Sensores
    float FD = readPotentiometer(PIN_FD);
    float FI = readPotentiometer(PIN_FI);
    float TD = readPotentiometer(PIN_TD);
    float TI = readPotentiometer(PIN_TI);
    float phi = readPhi();
    float acel = readAccel(); // 0 a 10
    float fren = readBrake(); // 0 a -10

    // VALOR neto para las fórmulas físicas ********************************
    float v = acel + fren;

    // --- FÍSICA ---
    float FG = 1.0 + (phi / 100.0) * 0.5;
    if (phi < 0) {
      FG = FG * -1;
    } else {
      FG = FG * +1;
    }

    float klat = 0.875 + (v / 20.0);
    float klong = 1.662 + (v / 30.0);
    if (abs(klat) < 0.001)
      klat = 0.001;
    if (abs(klong) < 0.001)
      klong = 0.001;

    float x = ((((FD + TD) - (FI + TI)) / klat) * FG) / 5;
    float y;
    if (v < 0) {
      y = (((((FD + FI) - (TD + TI)) / klong)) / 5) * (-1);
    } else {
      y = (((((FD + FI) - (TD + TI)) / klong)) / 5) * (1);
    }

    float G = sqrt(x * x + y * y);

    // Restricciones visuales ***********************************************
    x = constrain(x, -3.0, 3.0);
    y = constrain(y, -3.0, 3.0);

    // --- PANTALLA OLED ---
    display.clearDisplay();
    display.drawLine(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2,
                     SSD1306_WHITE);
    display.drawLine(SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT,
                     SSD1306_WHITE);

    int screenX = map(x * 100, -300, 300, 0, SCREEN_WIDTH);
    int screenY = map(y * 100, -300, 300, SCREEN_HEIGHT, 0);

    display.fillCircle(screenX, screenY, 4, SSD1306_WHITE);
    display.setCursor(0, SCREEN_HEIGHT - 8);
    display.print("G:");
    display.print(G, 2);
    // Opcional: Mostrar Acel/Freno en pantalla pequeña
    // display.setCursor(60, SCREEN_HEIGHT - 8);
    // display.print("V:"); display.print(v, 0);
    display.display();

    // --- JSON ---
    String json = "{";
    json += "\"x\":" + String(x, 3) + ",";
    json += "\"y\":" + String(y, 3) + ",";
    json += "\"g\":" + String(G, 3) + ",";
    // json += "\"v\":" + String(v, 1) + ",";     // VALOR SUMA neta resultante
    // DE ACC Y BRE
    json += "\"acel\":" + String(acel, 1) + ","; // Valor Acelerador (0 a 10)
    json += "\"fren\":" + String(fren, 1) + ","; // Valor Freno (0 a -10)
    json += "\"phi\":" + String(phi, 1) + ",";
    json += "\"fd\":" + String(FD, 1) + ",";
    json += "\"fi\":" + String(FI, 1) + ",";
    json += "\"td\":" + String(TD, 1) + ",";
    json += "\"ti\":" + String(TI, 1);
    json += "}";

    webSocket.broadcastTXT(json);
    lastSend = currentTime;
  }
}