// #include <Adafruit_GFX.h>
// #include <Adafruit_SSD1306.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <WiFi.h>
// #include <Wire.h>
#include <math.h>

// #define SCREEN_WIDTH 128
// #define SCREEN_HEIGHT 64
// #define OLED_RESET -1
// #define I2C_SDA 21
// #define I2C_SCL 22
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
  int rawValue = analogRead(pin);
  float value = map(rawValue, 0, POT_MAX, -100, 100) / 10.0;
  if (fabs(value) < 0.5)
    return 0.0;
  return value;
}

float readPhi() {
  return map(analogRead(PIN_PHI), 0, POT_MAX, -100, 100) / 10.0;
}

/////////////////////////////// --- FUNCIONES DE LECTURA ---
float readAccel() {
  // Mapeo de 0 a 10 positivos
  return map(analogRead(PIN_ACEL), 0, POT_MAX, 0, 100) / 10.0;
}

float readBrake() {
  // Mapeo de 0 a -10 negativos
  return map(analogRead(PIN_FREN), 0, POT_MAX, 0, -100) / 10.0;
}

void setup() {
  Serial.begin(115200);

  // Wire.begin(I2C_SDA, I2C_SCL);
  // if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
  //   Serial.println(F("Error en pantalla SSD1306"));
  //   for (;;)
  //     ;
  // }
  /////////////////////////////////////// --- INICIO DE ACCESS POINT
  Serial.println("\nCreando red WiFi...");
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid_ap, password_ap);

  Serial.print("Red Creada: ");
  Serial.println(ssid_ap);
  Serial.print("IP para conectar: ");
  Serial.println(WiFi.softAPIP());

  // display.clearDisplay();
  // display.setTextSize(1);
  // display.setTextColor(SSD1306_WHITE);
  // display.setCursor(0, 0);
  // display.println("MODO FISICA");
  // display.print("IP: ");
  // display.println(WiFi.softAPIP());
  // display.display();
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

    // VALOR neto del eje y para las fórmulas físicas
    float y_posicion_abs = acel + fren;

    // --- FÍSICA ---
    float fuerza_giro = 1.0 + (phi / 100.0) * 0.5;
    if (phi < 0) {
      fuerza_giro = fuerza_giro * -1;
    } else {
      fuerza_giro = fuerza_giro * +1;
    }

    float klat = 60 + (y_posicion_abs / 40.0);
    float klong = 42 + (y_posicion_abs / 60.0);
    if (abs(klat) == 0)
      klat = 0.001;
    if (abs(klong) == 0)
      klong = 0.001;

    float x = ((((FD + TD) - (FI + TI)) / klat) * fuerza_giro) / 5;
    float y;
    if (y_posicion_abs < 0) {
      y = (((((FD + FI) - (TD + TI)) / klong)) / 5) * (-1);
    } else {
      y = (((((FD + FI) - (TD + TI)) / klong)) / 5) * (1);
    }

    float G = sqrt(x * x + y * y);

    // --- JSON ---
    String json = "{";
    json += "\"x\":" + String(x, 3) + ",";
    json += "\"y\":" + String(y, 3) + ",";
    json += "\"g\":" + String(G, 3) + ",";
    // json += "\"y_posicion_abs\":" + String(y_posicion_abs, 1) + ",";     //
    // VALOR SUMA neta resultante DE ACC Y BRE
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
