// gpio-server.js
import { Gpio } from "onoff";
import { WebSocketServer, WebSocket } from "ws";

// Usar GPIO 17 (BCM 17) para probar; asegúrate de conectar el botón al pin correcto.
const button = new Gpio(17, "in", "both");

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`Servidor WebSocket GPIO corriendo en el puerto ${PORT}`);
});

wss.on("connection", (ws) => {
  console.log("Nuevo cliente conectado al WebSocket GPIO");
});

button.watch((err, value) => {
  if (err) {
    console.error("Error leyendo GPIO:", err);
    return;
  }
  console.log(`Estado del botón (GPIO 17): ${value}`);
  const event = value === 1 ? "pushToTalkStart" : "pushToTalkStop";
  console.log(`GPIO: ${event} (valor: ${value})`);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ event });
      client.send(message);
      console.log("Mensaje enviado al cliente:", message);
    }
  });
});

process.on("SIGINT", () => {
  button.unexport();
  process.exit();
});

