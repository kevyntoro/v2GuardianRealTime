// gpio-server.js
import { Gpio } from "onoff";
import { WebSocketServer, WebSocket } from "ws";

const button = new Gpio(16, "in", "both"); // Configura GPIO 16 para detectar ambos flancos

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
  // Log para ver cada cambio de estado
  console.log(`Estado del botón (GPIO 16): ${value}`);
  const event = value === 1 ? "pushToTalkStart" : "pushToTalkStop";
  console.log(`GPIO: ${event} (valor: ${value})`);

  // Envía el evento a todos los clientes conectados
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
