// SessionControls.jsx
import React, { useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";
import Button from "./Button";

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);
  function handleStartSession() {
    if (isActivating) return;
    setIsActivating(true);
    startSession();
  }
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-gray-600" : "bg-red-600"}
        icon={<CloudLightning height={16} />}
      >
        {isActivating ? "starting session..." : "start session"}
      </Button>
    </div>
  );
}

function SessionActive({
  stopSession,
  sendTextMessage,
  pushToTalkStart,
  pushToTalkStop,
  sendClientEvent,
}) {
  const [message, setMessage] = useState("");
  function handleSendText() {
    sendTextMessage(message);
    setMessage("");
  }
  return (
    <div className="flex items-center justify-center w-full h-full gap-4">
      <input
        onKeyDown={(e) => {
          if (e.key === "Enter" && message.trim()) {
            handleSendText();
          }
        }}
        type="text"
        placeholder="send a text message or hold button to talk..."
        className="border border-gray-200 rounded-full p-4 flex-1"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        // Si el input está vacío, el botón actuará como push-to-talk
        onMouseDown={() => {
          if (!message.trim()) {
            pushToTalkStart();
          }
        }}
        onMouseUp={() => {
          if (!message.trim()) {
            pushToTalkStop();
          }
        }}
        onTouchStart={() => {
          if (!message.trim()) {
            pushToTalkStart();
          }
        }}
        onTouchEnd={() => {
          if (!message.trim()) {
            pushToTalkStop();
          }
        }}
        // Si hay texto, se envía el mensaje
        onClick={() => {
          if (message.trim()) {
            handleSendText();
          }
        }}
        icon={<MessageSquare height={16} />}
        className="bg-blue-400"
      >
        {message.trim() ? "send text" : "push to talk"}
      </Button>
      <Button onClick={stopSession} icon={<CloudOff height={16} />}>
        disconnect
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  events,
  isSessionActive,
  pushToTalkStart,
  pushToTalkStop,
}) {
  return (
    <div className="flex gap-4 border-t-2 border-gray-200 h-full rounded-md">
      {isSessionActive ? (
        <SessionActive
          stopSession={stopSession}
          sendClientEvent={sendClientEvent}
          sendTextMessage={sendTextMessage}
          pushToTalkStart={pushToTalkStart}
          pushToTalkStop={pushToTalkStop}
        />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
