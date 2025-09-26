import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  
  const recognitionRef = useRef<any | null>(null);
  // This ref is crucial to differentiate between a user-initiated stop and a browser timeout.
  const userStoppedRef = useRef(false);

  // Initialize the SpeechRecognition object only once.
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
      // On any error, ensure we are in a stopped state.
      userStoppedRef.current = true; // Prevent any restart attempts on error
      setIsListening(false);
    };
    
    recognition.onend = () => {
      console.log("Recognition service ended.");
      // If the service ended but our intent was to keep listening (i.e., user did not stop it),
      // it means it timed out or had a network issue. We should restart it.
      if (!userStoppedRef.current) {
        console.log("Restarting recognition service...");
        try {
          recognition.start();
        } catch (e) {
            console.error("Error restarting recognition:", e);
            // If restart fails, truly stop and update UI.
            setIsListening(false);
        }
      }
    };

    recognitionRef.current = recognition;

    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        userStoppedRef.current = true; // Prevent any restarts during cleanup
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!isAvailable || !recognitionRef.current) {
        console.warn("Speech recognition not available or not initialized.");
        return;
    }
    
    const shouldBeListening = !isListening;
    setIsListening(shouldBeListening);

    if (shouldBeListening) {
      console.log("User command: START listening.");
      // Signal that any 'onend' event from now on is not user-initiated.
      userStoppedRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start recognition:", e);
        // If it fails to start, revert the state.
        setIsListening(false);
      }
    } else {
      console.log("User command: STOP listening.");
      // Signal that the upcoming 'onend' event IS user-initiated and should not trigger a restart.
      userStoppedRef.current = true;
      recognitionRef.current.stop();
    }
  }, [isListening, isAvailable]);


  return { isListening, isAvailable, toggleListening };
};
