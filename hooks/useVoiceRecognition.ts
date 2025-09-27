import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onStop: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const transcriptRef = useRef<string>('');
  
  // Use a ref for the callback to prevent stale closures in event handlers
  // and avoid re-running the main useEffect.
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not available in this browser.');
      setIsAvailable(false);
      return;
    }
    setIsAvailable(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'it-IT';
    recognition.interimResults = false;

    recognition.onstart = () => {
      transcriptRef.current = ''; // Clear previous transcript on start
      setIsListening(true);
    };

    // onend's only job is to update the UI state. It should not send data,
    // as it can be triggered by silence on mobile browsers, which is not a user action.
    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      // Accumulate the final transcript parts.
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          transcriptRef.current += event.results[i][0].transcript.trim() + ' ';
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []); // This effect should run only once.

  const startListening = useCallback(() => {
    if (isAvailable && recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
      }
    }
  }, [isAvailable, isListening]);

  const stopListening = useCallback(() => {
    if (isAvailable && recognitionRef.current && isListening) {
      try {
        // IMPORTANT: The message is sent ONLY when the user manually stops.
        // We call the onStop callback with the accumulated transcript *before* stopping the engine.
        if (transcriptRef.current.trim()) {
          onStopRef.current(transcriptRef.current.trim());
        }
        // Now, we stop the recognition engine. This will trigger the 'onend' event.
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Could not stop recognition:", e);
      }
    }
  }, [isAvailable, isListening]);

  return { isListening, isAvailable, startListening, stopListening };
};
