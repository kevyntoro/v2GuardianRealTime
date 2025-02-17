// gpio-server.js
import { Gpio } from 'pigpio';
import { WebSocketServer, WebSocket } from 'ws';

// Usa GPIO 4 (BCM 4) para la prueba; ajusta según tu cableado.
const button = new Gpio(4, {
  mode: Gpio.INPUT,
  pullUpDown: Gpio.PUD_DOWN, // Asume que el botón conecta a 3.3V al presionarlo
  edge: Gpio.EITHER_EDGE,
});

// Opcional: Si sospechas del glitchFilter, puedes comentarlo
// button.glitchFilter(10000); // 10 ms de filtro

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT }, () => {
  console.log(`Servidor WebSocket GPIO corriendo en el puerto ${PORT}`);
});

wss.on('connection', (ws) => {
  console.log('Nuevo cliente conectado al WebSocket GPIO');
});

button.on('alert', (level, tick) => {
  console.log(`Alerta del botón: nivel ${level} en tick ${tick}`);
  const event = level === 1 ? 'pushToTalkStart' : 'pushToTalkStop';
  console.log(`Evento: ${event}`);

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
