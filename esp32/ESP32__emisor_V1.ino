#include <Wire.h>               // Librería para la comunicación I2C (usada para la pantalla OLED)
#include <Adafruit_GFX.h>       // Librería de gráficos universal de Adafruit (para dibujar líneas, círculos, texto, etc.)
#include <Adafruit_SSD1306.h>   // Controlador específico para pantallas OLED SSD1306 (128x64)
#include <math.h>               // Librería matemática estándar (usada aquí para calcular raíces cuadradas y valores absolutos)
#include <WiFi.h>               // Librería para gestionar la conexión WiFi en el ESP32 (modo Access Point en este caso)
#include <WebServer.h>          // Librería para levantar un servidor web en el ESP32
#include <WebSocketsServer.h>   // Librería para habilitar un servidor de WebSockets (permite transmisión de datos bidireccional y en tiempo real)

// --- CONFIGURACIÓN DE LA PANTALLA OLED
#define SCREEN_WIDTH 128        // Ancho de la pantalla OLED en píxeles
#define SCREEN_HEIGHT 64        // Alto de la pantalla OLED en píxeles
#define OLED_RESET    -1        // Pin de reset de la pantalla (-1 si comparte el pin de reset del ESP32)
#define I2C_SDA 21              // Pin GPIO del ESP32 usado como línea de datos (SDA) para el protocolo I2C
#define I2C_SCL 22              // Pin GPIO del ESP32 usado como línea de reloj (SCL) para el protocolo I2C

// Inicialización del objeto 'display' usando los parámetros de tamaño, el bus I2C (&Wire) y el pin de reset
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// --- ASIGNACIÓN DE PINES (PINOUT)
// Todos usan pines ADC1 del ESP32 para lecturas analógicas (0 a 3.3V)
#define PIN_FD 36   // Sensor de peso / suspensión: Delantero Derecho (Front Right)
#define PIN_FI 39   // Sensor de peso / suspensión: Delantero Izquierdo (Front Left)
#define PIN_TD 34   // Sensor de peso / suspensión: Trasero Derecho (Rear Right)
#define PIN_TI 35   // Sensor de peso / suspensión: Trasero Izquierdo (Rear Left)
#define PIN_PHI 32  // Potenciómetro para medir el ángulo del volante o inclinación (Phi)
#define PIN_ACEL 33 // Potenciómetro / sensor del pedal de acelerador
#define PIN_FREN 25 // Potenciómetro / sensor del pedal de freno (¡Advertencia! El pin 25 pertenece a ADC2, puede tener interferencia al usar WiFi)

// El convertidor analógico a digital (ADC) del ESP32 tiene una resolución de 12 bits (valores de 0 a 4095)
const int POT_MAX = 4095;

// --- CONFIGURACIÓN DE LA RED INALÁMBRICA (ACCESS POINT)
const char* ssid_ap = "RED_ESP32";      // Nombre de la red WiFi que creará el ESP32
const char* password_ap = "UAMOTORS";   // Contraseña de la red WiFi (debe tener al menos 8 caracteres)

// Crear el servidor de WebSockets escuchando en el puerto 81
WebSocketsServer webSocket = WebSocketsServer(81);

// Variables para controlar el tiempo y enviar datos en intervalos fijos sin congelar el programa
unsigned long lastSend = 0;             // Guarda el tiempo en milisegundos del último envío
const long sendInterval = 50;           // Intervalo de envío de telemetría: 50 ms (20 transmisiones por segundo)

/**
 * Lee un potenciómetro de suspensión y mapea su valor a un rango de -10.0 a 10.0.
 * Si el valor absoluto es muy pequeño, lo fuerza a 0.0 para eliminar el ruido central.
 */
float readPotentiometer(int pin) {
  int rawValue = analogRead(pin); // Lee valor analógico crudo (0 a 4095)
  // map() trabaja con enteros, por lo que mapeamos a -100 y 100, y luego dividimos entre 10.0 para obtener decimales
  float value = map(rawValue, 0, POT_MAX, -100, 100) / 10.0; 
  if (fabs(value) < 0.5) return 0.0; // Aplica una pequeña "zona muerta" para estabilizar el valor en cero
  return value;
}

/**
 * Lee la inclinación o giro (Phi) y la mapea a una escala de -10 a 10.
 */
float readPhi() {
  return map(analogRead(PIN_PHI), 0, POT_MAX, -10, 10);
}

/**
 * Lee el pedal de acelerador y mapea la presión de 0 (libre) a 10 (presionado a fondo).
 */
float readAccel() {
  return map(analogRead(PIN_ACEL), 0, POT_MAX, 0, 10);
}

/**
 * Lee el pedal de freno y mapea la presión de 0 (libre) a -10 (presionado a fondo).
 * Se usa un valor negativo para restar directamente a la aceleración neta.
 */
float readBrake() {
  return map(analogRead(PIN_FREN), 0, POT_MAX, 0, -10);
}

/**
 * Configuración inicial del hardware y protocolos del ESP32.
 */
void setup() {
  Serial.begin(115200); // Abre el monitor serie a 115200 baudios para depuración

  Wire.begin(I2C_SDA, I2C_SCL); // Inicializa el protocolo I2C con los pines definidos
  // Inicializa la pantalla OLED con dirección I2C 0x3C
  if(!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("Error en pantalla SSD1306"));
    for(;;); // Bucle infinito si la pantalla no responde (detiene el programa)
  }
  
  // --- INICIALIZAR EL MODO ACCESS POINT (Crear red WiFi propia)
  Serial.println("\nCreando red WiFi...");
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid_ap, password_ap); // Lanza la red inalámbrica

  Serial.print("Red Creada: "); Serial.println(ssid_ap);
  Serial.print("IP para conectar: "); Serial.println(WiFi.softAPIP()); // Imprime la IP asignada por defecto (normalmente 192.168.4.1)

  // Mostrar información inicial en la pantalla OLED
  display.clearDisplay();                 // Limpia el buffer de la pantalla
  display.setTextSize(1);                 // Tamaño de letra estándar (pequeño)
  display.setTextColor(SSD1306_WHITE);    // Color blanco
  display.setCursor(0,0);                 // Cursor en la esquina superior izquierda (X=0, Y=0)
  display.println("MODO FISICA");         // Escribe texto
  display.print("IP: "); display.println(WiFi.softAPIP()); // Muestra la dirección IP para conectar los dispositivos
  display.display();                      // Fuerza a la pantalla a mostrar lo dibujado en el buffer
  
  // --- INICIALIZAR EL SERVIDOR WEBSOCKET
  webSocket.begin();
  webSocket.onEvent(webSocketEvent); // Define qué función manejará las conexiones y desconexiones de clientes
}

/**
 * Maneja eventos de WebSocket (cuando un cliente como un celular o PC se conecta o desconecta).
 */
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] ¡Desconectado!\n", num); // Imprime el ID del cliente desconectado
      break;
    case WStype_CONNECTED:
      Serial.printf("[%u] Conectado\n", num);    // Imprime el ID del cliente conectado
      break;
  }
}

/**
 * Bucle principal de ejecución del programa.
 */
void loop() {
  webSocket.loop(); // Mantiene activo el servidor de WebSockets escuchando peticiones

  unsigned long currentTime = millis(); // Obtiene el tiempo actual desde que encendió el ESP32
  
  // Condicional para ejecutar el bloque sólo cada 50 milisegundos
  if (currentTime - lastSend >= sendInterval) {
    
    // --- LECTURA DE SENSORES ---
    float FD = readPotentiometer(PIN_FD);    // Suspensión delantera derecha
    float FI = readPotentiometer(PIN_FI);    // Suspensión delantera izquierda
    float TD = readPotentiometer(PIN_TD);    // Suspensión trasera derecha
    float TI = readPotentiometer(PIN_TI);    // Suspensión trasera izquierda
    float phi = readPhi();                   // Ángulo del volante / inclinación
    float acel = readAccel();                // Pedal de acelerador (0 a 10)
    float fren = readBrake();                // Pedal de freno (0 a -10)
    
    // Velocidad/aceleración resultante: acelerador sumado al freno (que es negativo)
    float v = acel + fren; 
    
    // --- FÓRMULAS DE FÍSICA SIMULADA ---
    // Factor de Gravedad (FG): Se modifica según la inclinación o giro (phi)
    float FG = 1.0 + (phi / 100.0) * 0.5;
    // Ajusta la dirección (signo positivo o negativo) de FG según si phi es positivo o negativo
    if (phi < 0) { FG = FG * -1; } else { FG = FG * +1; }
    
    // klat y klong: Coeficientes dinámicos lateral y longitudinal. Varían según la velocidad resultante (v)
    float klat = 0.875 + (v / 20.0);
    float klong = 1.662 + (v / 30.0);
    // Protección para evitar división por cero en las fórmulas matemáticas
    if (abs(klat) < 0.001) klat = 0.001; 
    if (abs(klong) < 0.001) klong = 0.001;
    
    // Fuerza G Lateral (x): Compara el lado derecho (FD + TD) contra el izquierdo (FI + TI)
    // Se divide por la resistencia lateral 'klat', se multiplica por el factor de gravedad 'FG' y se escala entre 5
    float x = ((((FD + TD) - (FI + TI)) / klat) * FG)/5;
    
    // Fuerza G Longitudinal (y): Compara el eje delantero (FD + FI) contra el trasero (TD + TI)
    // Se divide por la resistencia longitudinal 'klong', se escala entre 5 y se invierte si vamos marcha atrás/frenando (v < 0)
    float y;
    if (v < 0) { 
      y = (((((FD + FI) - (TD + TI)) / klong))/5) * (-1); 
    } else { 
      y = (((((FD + FI) - (TD + TI)) / klong))/5) * (1); 
    }
    
    // Magnitud neta del vector de Fuerza G (Pitágoras: G = raíz(x^2 + y^2))
    float G = sqrt(x * x + y * y);
    
    // Restricciones visuales: Limita las coordenadas del punto de fuerza G entre -3.0 y 3.0 para que no salgan del plano
    x = constrain(x, -3.0, 3.0);
    y = constrain(y, -3.0, 3.0);
    
    // --- DIBUJADO EN PANTALLA OLED ---
    display.clearDisplay(); // Limpia la pantalla para el nuevo cuadro (frame)
    
    // Dibuja la línea horizontal del plano de fuerzas G (cruza en el medio de la altura de la pantalla)
    display.drawLine(0, SCREEN_HEIGHT/2, SCREEN_WIDTH, SCREEN_HEIGHT/2, SSD1306_WHITE);
    // Dibuja la línea vertical del plano de fuerzas G (cruza en el medio del ancho de la pantalla)
    display.drawLine(SCREEN_WIDTH/2, 0, SCREEN_WIDTH/2, SCREEN_HEIGHT, SSD1306_WHITE);
    
    // Mapea la fuerza G (rango -3 a 3) a coordenadas en píxeles dentro de la pantalla OLED
    // Se multiplica por 100 para trabajar con enteros (-300 a 300) que la función map() requiere
    int screenX = map(x * 100, -300, 300, 0, SCREEN_WIDTH);
    int screenY = map(y * 100, -300, 300, SCREEN_HEIGHT, 0); // Eje Y invertido (0 está arriba en la pantalla OLED)
    
    // Dibuja un círculo relleno blanco de 4 píxeles de radio en la posición mapeada para representar la burbuja de Fuerza G
    display.fillCircle(screenX, screenY, 4, SSD1306_WHITE);
    
    // Imprime la magnitud neta de Fuerza G en la esquina inferior izquierda
    display.setCursor(0, SCREEN_HEIGHT - 8); // Se sitúa 8 píxeles arriba del borde inferior
    display.print("G:"); display.print(G, 2); // Muestra "G: X.XX" con dos decimales
    
    display.display(); // Envía todo lo dibujado a la pantalla OLED física
    
    // --- CONSTRUCCIÓN DEL MENSAJE TELEMÉTRICO (JSON) ---
    // Crea un String formateado en JSON para que las aplicaciones receptoras (ej. navegador web) lean fácilmente los datos
    String json = "{";
    json += "\"x\":" + String(x, 3) + ",";       // Fuerza G lateral calculada (3 decimales)
    json += "\"y\":" + String(y, 3) + ",";       // Fuerza G longitudinal calculada (3 decimales)
    json += "\"g\":" + String(G, 3) + ",";       // Magnitud total G calculada (3 decimales)
    json += "\"acel\":" + String(acel, 1) + ","; // Valor analógico mapeado del acelerador
    json += "\"fren\":" + String(fren, 1) + ","; // Valor analógico mapeado del freno
    json += "\"phi\":" + String(phi, 1) + ",";   // Ángulo del volante
    json += "\"fd\":" + String(FD, 1) + ",";     // Suspensión delantera derecha
    json += "\"fi\":" + String(FI, 1) + ",";     // Suspensión delantera izquierda
    json += "\"td\":" + String(TD, 1) + ",";     // Suspensión trasera derecha
    json += "\"ti\":" + String(TI, 1);           // Suspensión trasera izquierda
    json += "}";
    
    // --- TRANSMISIÓN ---
    webSocket.broadcastTXT(json); // Envía los datos JSON a todos los dispositivos conectados por WebSocket
    lastSend = currentTime;       // Actualiza la marca de tiempo del último envío realizado
  }
}