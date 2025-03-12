// ToolAlert.jsx
import { useEffect, useState, useRef } from "react";

const functionDescription = `
Call this function when the user needs help or is in an emergency related to these fields {accidente vehicular:0, incencio:1, robo:2, emergencia medica:3, persona desaparecida:4} and similar.
It will call the Guardian alert API with the alert id.
`;

const sessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_alert_info",
        description: functionDescription,
        parameters: {
          type: "object",
          strict: true,
          properties: {
            alerta_id: {
              type: "number",
              description: "ID de la alerta (0: accidente vehicular, 1: incencio, 2: robo, 3: emergencia medica, 4: persona desaparecida)",
            },
          },
          required: ["alerta_id"],
        },
      },
    ],
    tool_choice: "auto",
  },
};

async function fetchAlertInfo(alerta_id) {
  const endpoint = `http://68.183.117.209:8000/guardian/?alerta_id=${alerta_id}`;
  console.log(`ToolAlert - Llamando al endpoint: ${endpoint}`);
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    console.log("ToolAlert - Respuesta recibida:", text);
    return text;
  } catch (error) {
    console.error("ToolAlert - Error fetching alert info:", error);
    return null;
  }
}

function generateSummary(data) {
  if (!data) return "No se pudo obtener la información de la alerta.";
  return data;
}

export default function ToolAlert({ sendClientEvent, events, isSessionActive }) {
  const [registered, setRegistered] = useState(false);
  const processedEventsRef = useRef(new Set());

  useEffect(() => {
    console.log("ToolAlert mounted");
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) return;

    events.forEach((event) => {
      if (processedEventsRef.current.has(event.event_id)) return;

      if (!registered && event.type === "session.created") {
        console.log("ToolAlert - Registrando función display_alert_info");
        sendClientEvent(sessionUpdate);
        setRegistered(true);
        processedEventsRef.current.add(event.event_id);
      }

      if (event.type === "response.done" && event.response && event.response.output) {
        event.response.output.forEach((output) => {
          if (output.type === "function_call" && output.name === "display_alert_info") {
            console.log("ToolAlert - Ejecutando display_alert_info con argumentos:", output.arguments);
            let args;
            try {
              args = JSON.parse(output.arguments);
            } catch (error) {
              console.error("ToolAlert - Error al parsear argumentos:", error);
              return;
            }
            const { alerta_id } = args;
            if (alerta_id === undefined || alerta_id === null) {
              console.error("ToolAlert - No se proporcionó alerta_id");
              return;
            }
            (async () => {
              const data = await fetchAlertInfo(alerta_id);
              const summary = generateSummary(data);
              console.log("ToolAlert - Resumen generado:", summary);
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
      console.log("ToolAlert - Sesión inactiva, reiniciando registro");
    }
  }, [isSessionActive]);

  return null;
}
