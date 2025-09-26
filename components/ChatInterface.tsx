import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types.ts';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition.ts';
import { MicrophoneIcon, PaperclipIcon, SendIcon, BrainCircuitIcon } from './icons.tsx';

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

  const handleTranscript = (transcript: string) => {
    setInputText(prev => (prev.trim() ? prev.trim() + ' ' : '') + transcript);
  };

  const { isListening, isAvailable, toggleListening } = useVoiceRecognition(handleTranscript);

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

  return (
    <div className="bg-jarvis-surface rounded-lg flex flex-col h-full overflow-hidden">
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && <BrainCircuitIcon className="w-8 h-8 text-jarvis-primary flex-shrink-0" />}
            <div className={`max-w-md lg:max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-jarvis-primary/80 text-white rounded-br-none' : 'bg-jarvis-bg text-jarvis-text rounded-bl-none'}`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>
              {msg.photo && <img src={msg.photo} alt="Allegato" className="mt-2 rounded-lg max-h-48 w-auto" />}
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
             <div className="flex items-center gap-2">
                <MicrophoneIcon className={`w-6 h-6 transition-colors ${isListening ? 'text-green-500' : 'text-jarvis-text-secondary'}`} />
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-jarvis-primary focus:ring-offset-2 focus:ring-offset-jarvis-bg ${isListening ? 'bg-green-500' : 'bg-red-600'}`}
                  role="switch"
                  aria-checked={isListening}
                  aria-label="Toggle Microphone"
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isListening ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
             </div>
           )}
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? 'Sto ascoltando...' : 'Descrivi un rilievo o un\'area...'}
            className="flex-1 bg-transparent focus:outline-none px-2 resize-none"
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || (!inputText.trim() && !file)} className="p-3 rounded-full bg-jarvis-primary text-white disabled:bg-jarvis-text-secondary disabled:cursor-not-allowed hover:bg-jarvis-secondary transition-colors">
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;