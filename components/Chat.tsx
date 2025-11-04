import React, { useState, useEffect, useRef, useMemo } from 'react';
// FIX: Corrected import path for types.
import type { ChatMessage } from './../types';
import { getChat } from '../services/geminiService';
// FIX: Renamed imported type `Chat` to `GeminiChat` to avoid naming conflict with the component.
import type { Chat as GeminiChat } from '@google/genai';
import { SendIcon } from './icons/Icons';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // FIX: Use the aliased type `GeminiChat`.
  const chatSession = useRef<GeminiChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSession.current = getChat();
  }, []);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);


  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      if (!chatSession.current) {
        throw new Error("Chat session not initialized");
      }
      
      // FIX: The `sendMessage` method expects an object with a `message` property.
      const response = await chatSession.current.sendMessage({ message: userMessage.text });
      
      const aiMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        text: response.text,
        sender: 'ai',
      };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error) {
      console.error("Error sending message to AI:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        text: 'Произошла ошибка при ответе. Попробуйте снова.',
        sender: 'ai',
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-10rem)] animate-fade-in">
       <h2 className="text-3xl font-bold text-text-primary mb-6">AI Чат</h2>
      <div className="flex-grow overflow-y-auto pr-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-md md:max-w-lg p-3 rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-accent text-white rounded-br-lg'
                  : 'bg-highlight text-text-primary rounded-bl-lg'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
          </div>
        ))}
         {isLoading && (
            <div className="flex items-end gap-2 justify-start">
                 <div className="max-w-md md:max-w-lg p-3 rounded-2xl bg-highlight text-text-primary rounded-bl-lg">
                    <div className="flex items-center justify-center space-x-1">
                        <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                        <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                        <span className="w-2 h-2 bg-text-secondary rounded-full animate-pulse"></span>
                    </div>
                 </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="mt-6">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Спросите что-нибудь..."
            className="w-full bg-secondary/80 backdrop-blur-md border border-border-color text-text-primary p-4 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-accent shadow-soft"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors bg-accent text-white hover:bg-accent-hover disabled:bg-highlight disabled:text-text-secondary"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;