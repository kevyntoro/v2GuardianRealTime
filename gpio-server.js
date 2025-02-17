// gpio-server.js
import { Gpio } from 'pigpio';
import { WebSocketServer, WebSocket } from 'ws';

// Configura el pin GPIO (número BCM) que usarás, por ejemplo, GPIO17
const button = new Gpio(16, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN, // Asume que el botón se conecta a 3.3V y a tierra
  edge: Gpio.EITHER_EDGE,
});

// Crea el servidor WebSocket
const PORT = 8080;
const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`Servidor WebSocket GPIO corriendo en el puerto ${PORT}`);
});

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado al WebSocket GPIO');
});

// Establece un filtro de rebote (opcional, en microsegundos)
button.glitchFilter(10000); // 10 ms

// Registra el evento "alert" que se dispara en cada cambio de estado
button.on('alert', (level, tick) => {
  console.log(`Alerta del botón: nivel ${level} en tick ${tick}`);
  const event = level === 1 ? 'pushToTalkStart' : 'pushToTalkStop';
  console.log(`Evento: ${event}`);

  // Envía el evento a todos los clientes conectados
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ event });
      client.send(message);
      console.log('Mensaje enviado al cliente:', message);
    }
  });
});

process.on('SIGINT', () => {
  button.digitalWrite(0);
  process.exit();
});
