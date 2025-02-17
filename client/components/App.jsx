// App.jsx
import React, { useEffect, useRef, useState } from "react";
import logo from "/assets/openai-logomark.svg";
import EventLog from "./EventLog";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const localAudioTrack = useRef(null); // Referencia a la pista de audio local

  async function startSession() {
    // Obtener token efímero
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Crear la conexión WebRTC
    const pc = new RTCPeerConnection();

    // Configurar reproducción de audio remoto
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => {
      audioElement.current.srcObject = e.streams[0];
    };

    // Capturar audio local (micrófono) y añadirlo, pero desactivarlo inicialmente
    const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
    const track = ms.getTracks()[0];
    track.enabled = false; // No se transmite hasta activar push-to-talk
    localAudioTrack.current = track;
    pc.addTrack(track);

    // Configurar canal de datos para eventos
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Negociación SDP
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

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
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
    if (dataChannel) {
      message.event_id = message.event_id || crypto.randomUUID();
      dataChannel.send(JSON.stringify(message));
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error("Failed to send message - no data channel available", message);
    }
  }

  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: message }],
      },
    };
    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Funciones para push-to-talk: activan o desactivan la transmisión del audio
  function pushToTalkStart() {
    if (localAudioTrack.current) {
      console.log("pushToTalkStart: habilitando audio");
      localAudioTrack.current.enabled = true;
    }
  }
  function pushToTalkStop() {
    if (localAudioTrack.current) {
      console.log("pushToTalkStop: deshabilitando audio");
      localAudioTrack.current.enabled = false;
    }
  }

  // Configurar eventos del data channel
  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("message", (e) => {
        setEvents((prev) => [JSON.parse(e.data), ...prev]);
      });
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
      });
    }
  }, [dataChannel]);

  // Conexión al servidor WebSocket para recibir eventos del GPIO
  useEffect(() => {
    // Ajusta la URL según corresponda (por ejemplo, ws://<ip-de-tu-raspberry>:8080)
    const ws = new WebSocket("ws://localhost:8080");
    ws.onopen = () => {
      console.log("Conectado al servidor WebSocket GPIO");
    };
    ws.onmessage = (message) => {
      console.log("Mensaje recibido del servidor GPIO:", message.data);
      try {
        const data = JSON.parse(message.data);
        if (data.event === "pushToTalkStart") {
          pushToTalkStart();
        } else if (data.event === "pushToTalkStop") {
          pushToTalkStop();
        }
      } catch (e) {
        console.error("Error al parsear el mensaje GPIO:", e);
      }
    };
    ws.onerror = (error) => {
      console.error("Error en WebSocket GPIO:", error);
    };
    ws.onclose = () => {
      console.log("Conexión WebSocket GPIO cerrada");
    };
    return () => {
      ws.close();
    };
  }, []);

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
              sendTextMessage={sendTextMessage}
              events={events}
              isSessionActive={isSessionActive}
              pushToTalkStart={pushToTalkStart}
              pushToTalkStop={pushToTalkStop}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            events={events}
            isSessionActive={isSessionActive}
          />
        </section>
      </main>
    </>
  );
}
