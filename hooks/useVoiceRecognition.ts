import { useState, useEffect, useRef, useCallback } from 'react';

// Polyfill for browser compatibility
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export const useVoiceRecognition = (onTranscript: (transcript: string) => void) => {
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      console.warn('Speech Recognition API not available in this browser.');
      setIsAvailable(false);
      return;
    }
    setIsAvailable(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Essential for long dictations
    recognition.lang = 'it-IT';
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      // Concatenate all final results from this session
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
         onTranscript(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      // Don't stop listening on recoverable errors like 'no-speech'
      if (event.error !== 'no-speech') {
        setIsListening(false);
      }
    };
    
    recognition.onend = () => {
        // This logic ensures that if the service stops for any reason
        // (like a network timeout) while it's supposed to be listening,
        // it will automatically restart.
        if (recognitionRef.current && (recognitionRef.current as any).__isListening) {
             console.log("Recognition ended, restarting...");
             try {
                recognition.start();
             } catch(e) {
                console.error("Restart failed", e);
                setIsListening(false);
                (recognitionRef.current as any).__isListening = false;
             }
        } else {
             setIsListening(false);
        }
    };

    recognitionRef.current = recognition;
    // Add a custom property to the instance to track our desired state
    (recognitionRef.current as any).__isListening = false;

  }, [onTranscript]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    const shouldBeListening = !isListening;
    setIsListening(shouldBeListening);
    (recognitionRef.current as any).__isListening = shouldBeListening;

    if (shouldBeListening) {
      try {
        recognitionRef.current.start();
        console.log("Recognition started");
      } catch (error) {
        console.error("Could not start recognition", error);
        setIsListening(false);
        (recognitionRef.current as any).__isListening = false;
      }
    } else {
      try {
        recognitionRef.current.stop();
        console.log("Recognition stopped by user");
      } catch (error) {
        console.error("Could not stop recognition", error);
      }
    }
  }, [isListening]);


  return { isListening, isAvailable, toggleListening };
};
