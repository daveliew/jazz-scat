'use client';

import { useConversation } from '@elevenlabs/react';
import { useState, useCallback } from 'react';

interface VoiceCoachProps {
  genre: string;
  bpm: number;
  activeLayers: string[];
}

export function VoiceCoach({ genre, bpm, activeLayers }: VoiceCoachProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to voice coach');
      setError(null);
    },
    onDisconnect: () => {
      console.log('Disconnected from voice coach');
    },
    onMessage: (message) => {
      console.log('Coach message:', message);
    },
    onError: (err) => {
      console.error('Voice coach error:', err);
      setError('Connection error. Please try again.');
    },
  });

  const startCoaching = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get signed URL from our API (use coach agent)
      const response = await fetch('/api/conversation-token?agent=coach');
      const data = await response.json();

      if (!response.ok || !data.signedUrl) {
        throw new Error(data.error || 'Failed to get conversation token');
      }

      // Pass context as dynamic variables
      await conversation.startSession({
        signedUrl: data.signedUrl,
        dynamicVariables: {
          genre,
          bpm: bpm.toString(),
          active_layers: activeLayers.join(', ') || 'none',
        },
      });
    } catch (err) {
      console.error('Failed to start coaching:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsConnecting(false);
    }
  }, [conversation, genre, bpm, activeLayers]);

  const stopCoaching = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error('Error ending session:', err);
    }
  }, [conversation]);

  const isConnected = conversation.status === 'connected';

  return (
    <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 rounded-xl p-6 border border-indigo-500/30">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span>🎤 Voice Coach</span>
        <span
          className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
          }`}
        />
        {isConnected && (
          <span className="text-xs text-green-400 font-normal">Connected</span>
        )}
      </h3>

      <p className="text-slate-400 text-sm mb-4">
        Talk to your AI coach for real-time vocal tips and feedback
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <button
            onClick={stopCoaching}
            className="w-full py-3 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors"
          >
            End Coaching Session
          </button>

          {/* Show agent speaking/listening status */}
          <div className="text-center text-sm text-slate-400">
            {conversation.isSpeaking ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                Coach is speaking...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Listening to you...
              </span>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={startCoaching}
          disabled={isConnecting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800
                     disabled:cursor-not-allowed rounded-lg font-medium transition-colors
                     flex items-center justify-center gap-2"
        >
          {isConnecting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            'Start Voice Coaching'
          )}
        </button>
      )}
    </div>
  );
}
