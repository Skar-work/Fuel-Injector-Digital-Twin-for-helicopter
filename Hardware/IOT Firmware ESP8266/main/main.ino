#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>

#define LEVER A0  // Define the lever pin for the collective pitch

const char* ssid = "ESP8266_AP";
const char* password = "12345678";

ESP8266WebServer server(80);

int CollectivePitch = 0;

void handleRoot() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "text/plain", "ESP8266 AP HTTP Server is running");
}

// JSON data handler
void handleData() {
  String json = "{";
  json += "\"CollectivePitch\": " + String(CollectivePitch);
  json += "}";
  server.sendHeader("Access-Control-Allow-Origin", "*"); //CORS
  server.send(200, "application/json", json);
}

void setup() {
  Serial.begin(115200);

  WiFi.softAP(ssid, password);
  IPAddress IP = WiFi.softAPIP();

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
}

void loop() {
  server.handleClient();

  int raw = analogRead(LEVER);
  CollectivePitch = map(raw, 0, 1023, 0, 100);
  Serial.print("Collective pitch : ");
  Serial.println(CollectivePitch);
  delay(100); 
}
