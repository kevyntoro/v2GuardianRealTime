// ToolTriage.jsx
import { useEffect, useState } from "react";

const functionDescription = `
Call this function when a user asks for restaurant information.
It receives a restaurant name, queries the external endpoint for details,
and returns a brief summary of the restaurant.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_restaurant_info",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            restaurantName: {
              type: "string",
              description: "Name of the restaurant to get information from",
            },
          },
          required: ["restaurantName"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

async function fetchRestaurantInfo(restaurantName) {
  try {
    // Llama al endpoint con el parámetro "input" configurado con el nombre del restaurante.
    const response = await fetch(
      `http://68.183.117.209:8000/triage/?input=${encodeURIComponent(restaurantName)}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // Se asume que el endpoint devuelve un resumen en texto (puede ser HTML o plain text).
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Error fetching restaurant info:", error);
    return null;
  }
}

function generateSummary(data) {
  if (!data) return "No se pudo obtener la información del restaurante.";
  return data;
}

export default function ToolTriage({ sendClientEvent, events, isSessionActive }) {
  const [functionAdded, setFunctionAdded] = useState(false);

  useEffect(() => {
    console.log("ToolTriage mounted");
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) return;

    console.log("ToolTriage - Eventos recibidos:", events);

    // Registra la función cuando se detecta el evento "session.created"
    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      console.log("ToolTriage - Registrando función display_restaurant_info");
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    // Procesa el evento que invoque la función "display_restaurant_info"
    const mostRecentEvent = events[0];
    if (mostRecentEvent.type === "response.done" && mostRecentEvent.response.output) {
      mostRecentEvent.response.output.forEach((output) => {
        if (output.type === "function_call" && output.name === "display_restaurant_info") {
          console.log("ToolTriage - Función display_restaurant_info llamada con argumentos:", output.arguments);
          let args;
          try {
            args = JSON.parse(output.arguments);
          } catch (error) {
            console.error("ToolTriage - Error al parsear los argumentos:", error);
            return;
          }
          const { restaurantName } = args;
          if (!restaurantName) {
            console.error("ToolTriage - No se proporcionó el nombre del restaurante.");
            return;
          }
          (async () => {
            const data = await fetchRestaurantInfo(restaurantName);
            const summary = generateSummary(data);
            console.log("ToolTriage - Resumen generado:", summary);
            sendClientEvent({
              type: "response.create",
              response: {
                instructions: summary,
              },
            });
          })();
        }
      });
    }
  }, [events, functionAdded, sendClientEvent]);

  useEffect(() => {
    if (!isSessionActive) {
      setFunctionAdded(false);
      console.log("ToolTriage - Sesión inactiva, reiniciando registro de función");
    }
  }, [isSessionActive]);

  return null;
}
