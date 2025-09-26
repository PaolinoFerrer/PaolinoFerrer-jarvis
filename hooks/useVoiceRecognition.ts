import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  
  const recognitionRef = useRef<any | null>(null);
  // This ref will hold the current listening state to avoid stale closures in event handlers.
  const isListeningRef = useRef(false);

  // Initialize the SpeechRecognition object only once.
  useEffect(() => {
    if (!SpeechRecognition) {
      setIsAvailable(false);
      console.warn('Speech Recognition API not available in this browser.');
      return;
    }
    setIsAvailable(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening even after a pause
    recognition.lang = 'it-IT';
    recognition.interimResults = false; // We only want final results

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      // Accumulate final results
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
      // On any error, we must stop and reflect this in the UI.
      if (isListeningRef.current) {
        isListeningRef.current = false;
        setIsListening(false);
      }
    };
    
    recognition.onend = () => {
      console.log("Recognition service ended.");
      // If the service ends but our state/intent is still 'listening', it means
      // it timed out. We should restart it.
      if (isListeningRef.current) {
        console.log("Restarting recognition service...");
        try {
          recognition.start();
        } catch (e) {
            console.error("Error restarting recognition:", e);
            if (isListeningRef.current) {
              isListeningRef.current = false;
              setIsListening(false);
            }
        }
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        isListeningRef.current = false; // Prevent any restarts
        recognitionRef.current.abort(); // Forcefully stop
      }
    };
  }, [onTranscript]);

  // This is the single control function for the user.
  const toggleListening = useCallback(() => {
    if (!isAvailable || !recognitionRef.current) {
        console.warn("Speech recognition not available or not initialized.");
        return;
    }
    
    // We toggle the state and the ref, then issue the command.
    const shouldBeListening = !isListening;
    setIsListening(shouldBeListening);
    isListeningRef.current = shouldBeListening;

    if (shouldBeListening) {
      console.log("User command: START listening.");
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        // If it fails to start, revert the state.
        setIsListening(false);
        isListeningRef.current = false;
      }
    } else {
      console.log("User command: STOP listening.");
      recognitionRef.current.stop();
    }
  }, [isListening, isAvailable]);


  return { isListening, isAvailable, toggleListening };
};
