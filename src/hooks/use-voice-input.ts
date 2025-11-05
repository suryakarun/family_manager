import { useState, useRef, useCallback, useEffect } from 'react';
import type { VoiceRecording, VoiceInputState } from '../types/ai-assistant';

export const useVoiceInput = () => {
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout>();

  // Initialize audio analysis
  const initializeAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio level
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalized = Math.min((average / 128) * 100, 100);

        setState(prev => ({ ...prev, audioLevel: normalized }));
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };

      updateAudioLevel();
    } catch (error) {
      console.error('Error initializing audio analysis:', error);
    }
  }, []);

  // Cleanup audio analysis
  const cleanupAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    audioContextRef.current = null;
    analyserRef.current = null;
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      streamRef.current = stream;

      // Initialize audio analysis
      initializeAudioAnalysis(stream);

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      startTimeRef.current = Date.now();

      // Update duration every second
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);

      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        isPaused: false,
        error: undefined,
      }));

    } catch (error: any) {
      console.error('Error starting recording:', error);
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to access microphone',
      }));
    }
  }, [initializeAudioAnalysis]);

  // Stop recording
  const stopRecording = useCallback((): Promise<VoiceRecording | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || state.isRecording === false) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        const recording: VoiceRecording = {
          id: crypto.randomUUID(),
          audio_blob: audioBlob,
          duration,
          timestamp: new Date(),
        };

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (durationIntervalRef.current) {
          clearInterval(durationIntervalRef.current);
        }

        cleanupAudioAnalysis();

        setState({
          isRecording: false,
          isPaused: false,
          duration: 0,
          audioLevel: 0,
        });

        resolve(recording);
      };

      mediaRecorderRef.current.stop();
    });
  }, [state.isRecording, cleanupAudioAnalysis]);

  // Pause recording (not fully supported by MediaRecorder API)
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && !state.isPaused) {
      mediaRecorderRef.current.pause();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setState(prev => ({ ...prev, isPaused: true }));
    }
  }, [state.isRecording, state.isPaused]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state.isRecording && state.isPaused) {
      mediaRecorderRef.current.resume();
      
      durationIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setState(prev => ({ ...prev, duration: elapsed }));
      }, 1000);

      setState(prev => ({ ...prev, isPaused: false }));
    }
  }, [state.isRecording, state.isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && state.isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      cleanupAudioAnalysis();
    };
  }, [state.isRecording, cleanupAudioAnalysis]);

  return {
    isRecording: state.isRecording,
    isPaused: state.isPaused,
    duration: state.duration,
    audioLevel: state.audioLevel,
    error: state.error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
};
