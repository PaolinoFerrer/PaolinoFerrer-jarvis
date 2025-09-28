import React, { useState, useRef, useEffect } from 'react';
// Fix: Removed file extensions from imports.
import { ChatMessage } from '../types';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { MicrophoneIcon, PaperclipIcon, SendIcon, BrainCircuitIcon, StopIcon } from './icons';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, file?: File) => void;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isLoading }) => {
  const [inputText, setInputText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleVoiceSubmit = (transcript: string) => {
    if (transcript.trim()) {
      onSendMessage(transcript.trim());
    }
  };

  const { isListening, isAvailable, startListening, stopListening } = useVoiceRecognition(handleVoiceSubmit);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [file]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputText.trim() || file) && !isLoading) {
      onSendMessage(inputText.trim(), file || undefined);
      setInputText('');
      setFile(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleMicButtonClick = () => {
    if (isListening) {
      stopListening();
    } else {
      setInputText(''); // Clear text input when starting voice
      startListening();
    }
  }

  return (
    <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id}>
            <div className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'model' && <BrainCircuitIcon className="w-8 h-8 text-jarvis-primary flex-shrink-0" />}
              <div className={`max-w-md lg:max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-jarvis-primary/80 text-white rounded-br-none' : 'bg-jarvis-bg text-jarvis-text rounded-bl-none'}`}>
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.photo && <img src={msg.photo} alt="Allegato" className="mt-2 rounded-lg max-h-48 w-auto" />}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-jarvis-text/10">
                    <h4 className="text-xs font-bold text-jarvis-text-secondary mb-1">Fonti:</h4>
                    <ul className="text-xs space-y-1">
                      {msg.sources.map((source, index) => (
                        <li key={index}>
                          <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-jarvis-secondary hover:underline truncate block">
                            {source.title || source.uri}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
         {isLoading && (
            <div className="flex items-end gap-3 justify-start">
              <BrainCircuitIcon className="w-8 h-8 text-jarvis-primary flex-shrink-0" />
              <div className="max-w-md lg:max-w-xl p-4 rounded-2xl bg-jarvis-bg text-jarvis-text rounded-bl-none">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-jarvis-secondary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-jarvis-secondary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-jarvis-secondary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-jarvis-text/10">
        {preview && (
          <div className="p-2 relative">
            <img src={preview} alt="File preview" className="max-h-24 rounded-lg" />
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if(fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs"
            >
              &times;
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 bg-jarvis-bg rounded-lg p-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="p-2 rounded-full hover:bg-jarvis-surface cursor-pointer text-jarvis-text-secondary hover:text-jarvis-primary transition-colors">
            <PaperclipIcon className="w-6 h-6" />
          </label>
           {isAvailable && (
             <button
                type="button"
                onClick={handleMicButtonClick}
                title={isListening ? 'Ferma registrazione e invia' : 'Avvia registrazione'}
                className={`p-3 rounded-full text-white transition-colors ${isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-jarvis-primary hover:bg-jarvis-secondary'}`}
             >
                {isListening ? <StopIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
             </button>
           )}
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? 'In ascolto...' : 'Descrivi un rilievo o un\'area...'}
            className="flex-1 bg-transparent focus:outline-none px-2 resize-none"
            disabled={isLoading || isListening}
            readOnly={isListening}
          />
          <button type="submit" disabled={isLoading || isListening || (!inputText.trim() && !file)} className="p-3 rounded-full bg-jarvis-primary text-white disabled:bg-jarvis-text-secondary disabled:cursor-not-allowed hover:bg-jarvis-secondary transition-colors">
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;
