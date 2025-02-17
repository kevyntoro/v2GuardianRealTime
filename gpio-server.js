// gpio-server.js
const Gpio = require("onoff").Gpio;
const button = new Gpio(16, "in", "both"); // Configura GPIO 16 para detectar ambos flancos

const WebSocket = require("ws");
const PORT = 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on("connection", (ws) => {
  console.log("Nuevo cliente conectado al WebSocket GPIO");
});

// Vigila el estado del botón y envía eventos
button.watch((err, value) => {
  if (err) {
    console.error("Error leyendo GPIO:", err);
    return;
  }
  // value === 1 => botón presionado, value === 0 => botón soltado
  const event = value === 1 ? "pushToTalkStart" : "pushToTalkStop";
  console.log(`GPIO: ${event} (valor: ${value})`);

  // Envía el evento a todos los clientes conectados
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ event }));
      console.log("Mensaje enviado al cliente:", { event });
    }
  });
});

console.log(`Servidor WebSocket GPIO corriendo en el puerto ${PORT}`);

process.on("SIGINT", () => {
  button.unexport();
  process.exit();
});
