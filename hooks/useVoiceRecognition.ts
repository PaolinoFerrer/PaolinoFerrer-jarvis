import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onStop: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const transcriptRef = useRef<string>('');

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

    recognition.onend = () => {
      setIsListening(false);
      // When recognition ends (manually or otherwise), call the onStop callback
      if (transcriptRef.current) {
        onStop(transcriptRef.current.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
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
  }, [onStop]);

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
        recognitionRef.current.stop();
      } catch (e) {
        console.error("Could not stop recognition:", e);
      }
    }
  }, [isAvailable, isListening]);

  return { isListening, isAvailable, startListening, stopListening };
};
