import { useState } from "react";
import type { PatientProfile } from "@shared/schema";
import { useVoiceRecorder, useVoiceStream } from "@/replit_integrations/audio";
import { Mic, Square, Loader2, Volume2, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";

export function PatientTab({ profile }: { profile: PatientProfile }) {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const recorder = useVoiceRecorder();
  
  const stream = useVoiceStream({
    onUserTranscript: (text) => {
      setMessages(prev => [...prev, { role: 'user', text }]);
      setIsProcessing(true);
    },
    onTranscript: (_, full) => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last && last.role === 'assistant') {
          last.text = full;
        } else {
          newMsgs.push({ role: 'assistant', text: full });
        }
        return newMsgs;
      });
    },
    onComplete: () => {
      setIsProcessing(false);
    },
    onError: (err) => {
      console.error(err);
      setIsProcessing(false);
    }
  });

  const handleToggleRecord = async () => {
    if (recorder.state === "recording") {
      const blob = await recorder.stopRecording();
      if (!blob || blob.size === 0) {
        setIsProcessing(false);
        return;
      }
      const url = `/api/profiles/${profile.id}/voice-chat`;
      
      try {
        await stream.streamVoiceResponse(url, blob);
      } catch (err) {
        console.error("Failed to stream", err);
        setIsProcessing(false);
      }
    } else {
      stream.ensureReady().catch(() => {});
      await recorder.startRecording();
    }
  };

  const isRecording = recorder.state === "recording";
  const isPlaying = stream.playbackState === "playing";

  return (
    <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-700">
      <div className="text-center mb-12">
        <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-4">
          Hello, {profile.name.split(' ')[0]}
        </h2>
        <p className="text-xl text-muted-foreground">
          I am your care companion. How are you feeling today?
        </p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-12">
        
        {/* BIG Accessible Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleToggleRecord}
          disabled={isProcessing || isPlaying}
          className={`
            relative w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center gap-3
            text-white shadow-2xl transition-all duration-300 disabled:opacity-50
            ${isRecording 
              ? 'bg-destructive shadow-destructive/40 animate-pulse' 
              : 'bg-gradient-to-br from-primary to-teal-400 shadow-primary/30'}
          `}
        >
          {isRecording && (
            <div className="absolute inset-0 rounded-full border-4 border-white/20 animate-ping"></div>
          )}
          
          {isRecording ? (
            <>
              <Square className="w-12 h-12 fill-current" />
              <span className="text-xl font-bold">Tap to Stop</span>
            </>
          ) : isProcessing || isPlaying ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin" />
              <span className="text-xl font-bold">{isPlaying ? "Speaking..." : "Thinking..."}</span>
            </>
          ) : (
            <>
              <Mic className="w-16 h-16" />
              <span className="text-xl font-bold">Tap to Speak</span>
            </>
          )}
        </motion.button>

        {/* Conversation Transcript (Simplified for elderly) */}
        {messages.length > 0 && (
          <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/5 space-y-6">
            {messages.slice(-2).map((msg, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Volume2 className="w-6 h-6" />
                  </div>
                )}
                <div className={`
                  px-6 py-4 rounded-3xl text-xl sm:text-2xl leading-relaxed max-w-[85%]
                  ${msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                    : 'bg-secondary text-secondary-foreground rounded-tl-sm'}
                `}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
