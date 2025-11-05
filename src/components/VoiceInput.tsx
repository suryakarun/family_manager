import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { AudioVisualizer } from './ui/audio-visualizer';
import { useVoiceInput } from '../hooks/use-voice-input';
import type { VoiceRecording, VoiceInputProps } from '../types/ai-assistant';

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onRecordingComplete,
  onTranscriptionReady,
  maxDuration = 120,
  disabled = false,
}) => {
  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    startRecording,
    stopRecording,
    error,
  } = useVoiceInput();

  const [transcriptionStatus, setTranscriptionStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [transcriptionText, setTranscriptionText] = useState('');

  // Handle recording completion
  const handleStopRecording = async () => {
    setTranscriptionStatus('processing');
    
    try {
      const recording = await stopRecording();
      
      if (recording) {
        // Transcribe audio using Web Speech API
        const transcription = await transcribeAudio(recording.audio_blob);
        
        if (transcription) {
          setTranscriptionText(transcription);
          setTranscriptionStatus('success');
          
          const completedRecording: VoiceRecording = {
            ...recording,
            transcription,
            confidence: 0.9, // Web Speech API doesn't provide confidence
          };
          
          onTranscriptionReady?.(transcription);
          onRecordingComplete(completedRecording);
          
          // Reset after 2 seconds
          setTimeout(() => {
            setTranscriptionStatus('idle');
            setTranscriptionText('');
          }, 2000);
        } else {
          throw new Error('Transcription failed');
        }
      }
    } catch (err) {
      console.error('Recording error:', err);
      setTranscriptionStatus('error');
      setTimeout(() => setTranscriptionStatus('idle'), 3000);
    }
  };

  // Transcribe audio using Web Speech API
  const transcribeAudio = (audioBlob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      // Convert blob to audio for recognition
      const audio = new Audio(URL.createObjectURL(audioBlob));
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(event.error));
      };

      // Note: Web Speech API doesn't work with audio blobs directly
      // In production, you'd send this to a backend STT service
      // For now, we'll use a mock transcription
      setTimeout(() => {
        resolve('Sample transcription - integrate with real STT service');
      }, 1000);
    });
  };

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && duration >= maxDuration) {
      handleStopRecording();
    }
  }, [duration, maxDuration, isRecording]);

  // Format duration display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Recording Button */}
      <div className="relative">
        {/* Pulsing ring when recording */}
        {isRecording && (
          <motion.div
            className="absolute inset-0 rounded-full bg-red-500"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.2, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Main Button */}
        <motion.button
          onClick={isRecording ? handleStopRecording : startRecording}
          disabled={disabled || transcriptionStatus === 'processing'}
          className={`
            relative z-10 w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-200 shadow-lg
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-indigo-600 hover:bg-indigo-700'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
        >
          {transcriptionStatus === 'processing' ? (
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          ) : transcriptionStatus === 'success' ? (
            <CheckCircle className="w-10 h-10 text-white" />
          ) : transcriptionStatus === 'error' ? (
            <XCircle className="w-10 h-10 text-white" />
          ) : isRecording ? (
            <Square className="w-10 h-10 text-white" />
          ) : (
            <Mic className="w-10 h-10 text-white" />
          )}
        </motion.button>
      </div>

      {/* Duration Display */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-mono font-bold text-gray-700 dark:text-gray-300"
        >
          {formatDuration(duration)}
        </motion.div>
      )}

      {/* Audio Visualizer */}
      {isRecording && (
        <div className="w-full max-w-md">
          <AudioVisualizer audioLevel={audioLevel} isActive={isRecording} />
        </div>
      )}

      {/* Status Messages */}
      <div className="text-center min-h-[60px]">
        {transcriptionStatus === 'processing' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-gray-600 dark:text-gray-400"
          >
            Transcribing your message...
          </motion.p>
        )}

        {transcriptionStatus === 'success' && transcriptionText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 max-w-md"
          >
            <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-1">
              Transcribed:
            </p>
            <p className="text-gray-700 dark:text-gray-300 italic">
              "{transcriptionText}"
            </p>
          </motion.div>
        )}

        {transcriptionStatus === 'error' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 dark:text-red-400"
          >
            Transcription failed. Please try again.
          </motion.p>
        )}

        {error && transcriptionStatus === 'idle' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-600 dark:text-red-400 text-sm"
          >
            {error}
          </motion.p>
        )}

        {!isRecording && transcriptionStatus === 'idle' && !error && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {disabled ? 'Voice input disabled' : 'Tap to start recording'}
          </p>
        )}

        {isRecording && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Tap to stop recording
          </p>
        )}
      </div>

      {/* Max Duration Warning */}
      {isRecording && duration > maxDuration * 0.8 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-4 py-2"
        >
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Recording will stop at {formatDuration(maxDuration)}
          </p>
        </motion.div>
      )}
    </div>
  );
};
