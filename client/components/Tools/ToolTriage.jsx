// ToolTriage.jsx
import { useEffect } from "react";

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
  useEffect(() => {
    console.log("ToolTriage mounted");
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) return;
    // Procesa eventos que invoquen "display_restaurant_info"
    events.forEach((event) => {
      if (
        event.type === "response.done" &&
        event.response &&
        event.response.output
      ) {
        event.response.output.forEach((output) => {
          if (
            output.type === "function_call" &&
            output.name === "display_restaurant_info"
          ) {
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
          }
        });
      }
    });
  }, [events, sendClientEvent]);

  useEffect(() => {
    if (!isSessionActive) {
      console.log("ToolTriage - Sesión inactiva, reiniciando procesamiento");
    }
  }, [isSessionActive]);

  return null;
}

