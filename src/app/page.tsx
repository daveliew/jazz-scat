"use client";

import { useConversation } from "@elevenlabs/react";
import { useState, useCallback } from "react";

type ConversationStatus = "idle" | "connecting" | "connected" | "disconnected";

export default function Home() {
  const [status, setStatus] = useState<ConversationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      setStatus("connected");
      setErrorMessage(null);
    },
    onDisconnect: () => {
      setStatus("disconnected");
      setTimeout(() => setStatus("idle"), 2000);
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      setErrorMessage("Connection error. Please try again.");
      setStatus("idle");
    },
  });

  const startConversation = useCallback(async () => {
    try {
      setStatus("connecting");
      setErrorMessage(null);

      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get signed URL from our API
      const response = await fetch("/api/conversation-token");
      if (!response.ok) {
        throw new Error("Failed to get conversation token");
      }

      const { signedUrl } = await response.json();

      // Start the conversation with WebSocket (more reliable)
      await conversation.startSession({
        signedUrl,
      });
    } catch (error) {
      console.error("Failed to start conversation:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to connect"
      );
      setStatus("idle");
    }
  }, [conversation]);

  const endConversation = useCallback(async () => {
    await conversation.endSession();
    setStatus("idle");
  }, [conversation]);

  const isSpeaking = conversation.isSpeaking;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
          🆘 VoiceLifeline
        </h1>
        <p className="text-slate-300 text-lg">
          Emergency help in any language
        </p>
      </div>

      {/* Main interaction area */}
      <div className="flex flex-col items-center gap-8">
        {/* Visual Orb */}
        <div
          className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full flex items-center justify-center transition-all duration-300 ${
            status === "idle"
              ? "bg-slate-700"
              : status === "connecting"
              ? "bg-yellow-500 animate-pulse"
              : status === "connected" && isSpeaking
              ? "bg-blue-500 animate-pulse scale-110"
              : status === "connected"
              ? "bg-green-500"
              : "bg-slate-600"
          }`}
        >
          {/* Inner glow effect */}
          <div
            className={`absolute inset-4 rounded-full ${
              status === "connected" && isSpeaking
                ? "bg-blue-400 animate-ping opacity-50"
                : ""
            }`}
          />

          {/* Status icon */}
          <div className="relative z-10 text-white text-6xl">
            {status === "idle" && "🎤"}
            {status === "connecting" && "⏳"}
            {status === "connected" && !isSpeaking && "👂"}
            {status === "connected" && isSpeaking && "🗣️"}
            {status === "disconnected" && "✅"}
          </div>
        </div>

        {/* Status text */}
        <div className="text-center">
          <p className="text-xl text-white font-medium">
            {status === "idle" && "Press to call for help"}
            {status === "connecting" && "Connecting..."}
            {status === "connected" && !isSpeaking && "Listening... Speak now"}
            {status === "connected" && isSpeaking && "Assistant speaking..."}
            {status === "disconnected" && "Call ended"}
          </p>
          {errorMessage && (
            <p className="text-red-400 mt-2">{errorMessage}</p>
          )}
        </div>

        {/* Main action button */}
        {status === "idle" || status === "disconnected" ? (
          <button
            onClick={startConversation}
            className="w-64 h-20 bg-red-600 hover:bg-red-700 text-white text-2xl font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all active:scale-95"
          >
            🆘 GET HELP
          </button>
        ) : status === "connecting" ? (
          <button
            disabled
            className="w-64 h-20 bg-yellow-600 text-white text-2xl font-bold rounded-2xl shadow-lg cursor-not-allowed"
          >
            Connecting...
          </button>
        ) : (
          <button
            onClick={endConversation}
            className="w-64 h-20 bg-slate-600 hover:bg-slate-700 text-white text-xl font-bold rounded-2xl shadow-lg transform hover:scale-105 transition-all active:scale-95"
          >
            End Call
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-12 text-center text-slate-400 max-w-md">
        <p className="text-sm">
          Speak in your native language. Our AI assistant will understand and
          help coordinate emergency response.
        </p>
      </div>

      {/* Language support indicator */}
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {["EN", "中文", "ES", "हिंदी", "عربي", "PT", "日本語", "한국어"].map(
          (lang) => (
            <span
              key={lang}
              className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm"
            >
              {lang}
            </span>
          )
        )}
      </div>
    </div>
  );
}
