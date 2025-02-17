// gpio-server.js
const Gpio = require("onoff").Gpio;
const button = new Gpio(16, "in", "both"); // Configura GPIO 16 para detectar ambos flancos

const WebSocket = require("ws");
const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Nuevo cliente conectado");
});

// Vigila el estado del botón
button.watch((err, value) => {
  if (err) {
    console.error("Error leyendo GPIO:", err);
    return;
  }
  // Cuando value es 1, asumimos que el botón se presionó; cuando es 0, se soltó.
  const event = value === 1 ? "pushToTalkStart" : "pushToTalkStop";
  console.log(`GPIO: ${event}`);
  // Envía el evento a todos los clientes conectados
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event }));
    }
  });
});

console.log(`Servidor WebSocket GPIO corriendo en el puerto ${PORT}`);

// Limpieza al salir
process.on("SIGINT", () => {
  button.unexport();
  process.exit();
});
