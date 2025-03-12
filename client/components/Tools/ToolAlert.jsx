// ToolAlert.jsx
import { useEffect, useState } from "react";

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
              description:
                "ID de la alerta (0: accidente vehicular, 1: incencio, 2: robo, 3: emergencia medica, 4: persona desaparecida)",
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
  console.log(`ToolAlert - Calling endpoint: ${endpoint}`);
  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    console.log(`ToolAlert - Received response: ${text}`);
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
  const [functionAdded, setFunctionAdded] = useState(false);

  // Log de montaje
  useEffect(() => {
    console.log("ToolAlert mounted");
  }, []);

  useEffect(() => {
    if (!events || events.length === 0) return;

    console.log("ToolAlert - Eventos:", events);

    const firstEvent = events[events.length - 1];
    if (!functionAdded && firstEvent.type === "session.created") {
      console.log("ToolAlert - Registering function display_alert_info");
      sendClientEvent(sessionUpdate);
      setFunctionAdded(true);
    }

    const mostRecentEvent = events[0];
    if (mostRecentEvent.type === "response.done" && mostRecentEvent.response.output) {
      mostRecentEvent.response.output.forEach((output) => {
        if (output.type === "function_call" && output.name === "display_alert_info") {
          console.log("ToolAlert - Executing display_alert_info with arguments:", output.arguments);
          let args;
          try {
            args = JSON.parse(output.arguments);
          } catch (error) {
            console.error("ToolAlert - Error parsing arguments:", error);
            return;
          }
          const { alerta_id } = args;
          if (alerta_id === undefined || alerta_id === null) {
            console.error("ToolAlert - alerta_id not provided");
            return;
          }
          (async () => {
            const data = await fetchAlertInfo(alerta_id);
            const summary = generateSummary(data);
            console.log("ToolAlert - Summary generated:", summary);
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
      console.log("ToolAlert - Session inactive, resetting function registration");
    }
  }, [isSessionActive]);

  return null;
}

