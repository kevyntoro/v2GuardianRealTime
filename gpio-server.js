// gpio-server.js
import { Gpio } from "onoff";
import { WebSocketServer, WebSocket } from "ws";

// Usa el número BCM correspondiente al pin físico que estás usando.
// Si el botón está en el pin físico 16, es probable que debas usar 23.
const button = new Gpio(23, "in", "both");

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
  console.log(`Estado del botón (GPIO 23): ${value}`);
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
