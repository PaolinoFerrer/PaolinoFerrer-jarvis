import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  
  const recognitionRef = useRef<any | null>(null);
  // A ref to hold the latest value of `isListening` for use in event handlers,
  // preventing issues with stale closures.
  const listeningIntentRef = useRef(false);

  // Sync the ref with the state
  useEffect(() => {
    listeningIntentRef.current = isListening;
  }, [isListening]);

  // This effect runs only once to set up the recognition object and its listeners
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsAvailable(false);
      console.warn('Speech Recognition API not available in this browser.');
      return;
    }
    setIsAvailable(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'it-IT';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript.trim() + ' ';
        }
      }
      if (finalTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        setIsListening(false); // Stop on critical errors
      }
    };
    
    recognition.onend = () => {
      console.log("Recognition service ended.");
      // If the user's intent is still to be listening, it means the service
      // stopped on its own (e.g., timeout). So, restart it.
      if (listeningIntentRef.current) {
        try {
          recognition.start();
          console.log("Restarting recognition...");
        } catch (e) {
          console.error("Failed to restart recognition:", e);
          setIsListening(false); // If restart fails, update UI state
        }
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        listeningIntentRef.current = false; // Stop any restart attempts
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  // The toggle function just flips the state, and a separate effect handles the logic.
  const toggleListening = useCallback(() => {
    setIsListening(prevState => !prevState);
  }, []);
  
  // This effect starts or stops the recognition service when the state changes.
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      try {
        console.log("Starting recognition...");
        recognitionRef.current.start();
      } catch (error) {
        // This can happen if start() is called while it's already running.
        console.error("Could not start recognition:", error);
        // If start fails, we must ensure the UI reflects that we're not listening.
        setIsListening(false);
      }
    } else {
      console.log("Stopping recognition...");
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return { isListening, isAvailable, toggleListening };
};
