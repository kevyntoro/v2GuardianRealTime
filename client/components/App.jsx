// App.jsx
import { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";
import ToolAlert from "/components/Tools/ToolAlert.jsx";
import ToolTriage from "/components/Tools/ToolTriage.jsx";

// Registro combinado de herramientas
const combinedSessionUpdate = {
  type: "session.update",
  session: {
    tools: [
      {
        type: "function",
        name: "display_restaurant_info",
        description: `
Call this function when a user asks for restaurant information.
It receives a restaurant name, queries the external endpoint for details,
and returns a brief summary of the restaurant.
        `,
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
      {
        type: "function",
        name: "display_alert_info",
        description: `
Call this function when the user needs help or is in an emergency related to these fields {accidente vehicular:0, incencio:1, robo:2, emergencia medica:3, persona desaparecida:4} and similar.
It will call the Guardian alert API with the alert id.
        `,
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

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const localAudioTrack = useRef(null);

  async function startSession() {
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;
    const pc = new RTCPeerConnection();
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = ms.getTracks()[0];
    track.enabled = false;
    localAudioTrack.current = track;
    pc.addTrack(track);
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });
    const answer = { type: "answer", sdp: await sdpResponse.text() };
    await pc.setRemoteDescription(answer);
    peerConnection.current = pc;
  }

  function stopSession() {
    if (dataChannel) dataChannel.close();
    if (peerConnection.current) {
      peerConnection.current.getSenders().forEach((sender) => {
        if (sender.track) sender.track.stop();
      });
      peerConnection.current.close();
    }
    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  function sendClientEvent(message) {
    message.event_id = message.event_id || crypto.randomUUID();
    if (dataChannel && dataChannel.readyState === "open") {
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  // WebSocket para push-to-talk
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3000");
    ws.onopen = () => {
      console.log("WebSocket connected for push-to-talk events");
    };
    ws.onmessage = (message) => {
      try {
        const data = JSON.parse(message.data);
        if (data.event === "pushToTalkStart") {
          if (localAudioTrack.current) localAudioTrack.current.enabled = true;
        } else if (data.event === "pushToTalkStop") {
          if (localAudioTrack.current) localAudioTrack.current.enabled = false;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    return () => ws.close();
  }, []);

  // Cuando el dataChannel se abre, se registra la sesión combinada
  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      });
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        sendClientEvent(combinedSessionUpdate);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} alt="Logo" />
          <h1>realtime console</h1>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            <EventLog events={events} />
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              events={events}
              isSessionActive={isSessionActive}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
        {/* Componentes que actúan en segundo plano */}
        <ToolAlert sendClientEvent={sendClientEvent} events={events} isSessionActive={isSessionActive} />
        <ToolTriage sendClientEvent={sendClientEvent} events={events} isSessionActive={isSessionActive} />
      </main>
    </>
  );
}
