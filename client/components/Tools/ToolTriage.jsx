// ToolTriage.jsx
import { useEffect, useState, useRef } from "react";

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
    const response = await fetch(
      `http://68.183.117.209:8000/triage/?input=${encodeURIComponent(restaurantName)}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("ToolTriage - Error fetching restaurant info:", error);
    return null;
  }
}

function generateSummary(data) {
  if (!data) return "No se pudo obtener la información del restaurante.";
  return data;
}

export default function ToolTriage({ sendClientEvent, events, isSessionActive }) {
  const [registered, setRegistered] = useState(false);
  // Guardamos en un Set los IDs de eventos ya procesados por este tool
  const processedEventsRef = useRef(new Set());

  useEffect(() => {
    console.log("ToolTriage mounted");
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) return;

    events.forEach((event) => {
      // Si el evento ya fue procesado, lo saltamos.
      if (processedEventsRef.current.has(event.event_id)) return;

      // Registro de la herramienta al recibir session.created
      if (!registered && event.type === "session.created") {
        console.log("ToolTriage - Registrando función display_restaurant_info");
        sendClientEvent(sessionUpdate);
        setRegistered(true);
        processedEventsRef.current.add(event.event_id);
      }

      // Procesa la llamada a la función cuando se recibe response.done
      if (
        event.type === "response.done" &&
        event.response &&
        event.response.output
      ) {
        event.response.output.forEach((output) => {
          if (output.type === "function_call" && output.name === "display_restaurant_info") {
            console.log("ToolTriage - Ejecutando display_restaurant_info con argumentos:", output.arguments);
            let args;
            try {
              args = JSON.parse(output.arguments);
            } catch (error) {
              console.error("ToolTriage - Error al parsear argumentos:", error);
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
            processedEventsRef.current.add(event.event_id);
          }
        });
      }
    });
  }, [events, registered, sendClientEvent]);

  useEffect(() => {
    if (!isSessionActive) {
      setRegistered(false);
      processedEventsRef.current.clear();
      console.log("ToolTriage - Sesión inactiva, reiniciando registro");
    }
  }, [isSessionActive]);

  return null;
}
