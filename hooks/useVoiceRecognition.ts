
import { useState, useEffect, useRef } from 'react';

// Polyfill for browser compatibility
// FIX: Cast window to `any` to access non-standard SpeechRecognition APIs without TypeScript errors.
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  // FIX: Use `any` for the ref type to avoid needing to define the full SpeechRecognition interface.
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not available in this browser.');
      setIsAvailable(false);
      return;
    }
    setIsAvailable(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Stop after a pause
    recognition.lang = 'it-IT';
    recognition.interimResults = false;

    // FIX: Use `any` for the event type to fix "Cannot find name 'SpeechRecognitionEvent'" error.
    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      onTranscript(transcript);
      stopListening();
    };

    // FIX: Use `any` for the event type to fix "Cannot find name 'SpeechRecognitionErrorEvent'" error.
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      stopListening();
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTranscript]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Could not start recognition", error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
       try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error("Could not stop recognition", error);
      }
    }
  };

  return { isListening, isAvailable, startListening, stopListening };
};
