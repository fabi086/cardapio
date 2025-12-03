
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, User, Bot, Loader2 } from 'lucide-react';
import { Category, ChatMessage, Product, CartItem, StoreSettings } from '../types';
import OpenAI from 'openai';
import { supabase } from '../supabaseClient';

interface AIAssistantProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  menuData: Category[];
  storeName: string;
  currencySymbol: string;
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity: number, observation: string) => void;
  storeSettings: StoreSettings;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  isOpen, 
  onOpen,
  onClose, 
  menuData, 
  storeName,
  currencySymbol,
  cartItems,
  onAddToCart,
  storeSettings
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Ciao! 🍕 Eu sou o Luigi, o assistente virtual da ${storeName}. Posso te ajudar a escolher sabores, calcular a entrega ou montar uma pizza meia a meia. O que manda, chef?`
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const openaiRef = useRef<OpenAI | null>(null);

  useEffect(() => {
    if (storeSettings.openaiApiKey) {
      openaiRef.current = new OpenAI({
        apiKey: storeSettings.openaiApiKey,
        dangerouslyAllowBrowser: true 
      });
    } else {
        openaiRef.current = null;
    }
  }, [storeSettings.openaiApiKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    if (!openaiRef.current) {
        setMessages(prev => [...prev, 
            { id: Date.now().toString(), role: 'user', content: inputValue },
            { id: (Date.now()+1).toString(), role: 'assistant', content: "⚠️ Configure a API Key da OpenAI no Painel Admin (Aba Integrações)." }
        ]);
        setInputValue('');
        return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: inputValue };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);

    try {
        const apiMessages: any[] = [
            { role: "system", content: "Você é um garçom de pizzaria. Seja breve." },
            ...newMessages.map(m => ({ role: m.role as any, content: m.content }))
        ];

        let loopCount = 0;
        const maxLoops = 5; 

        while (loopCount < maxLoops) {
             const completion = await openaiRef.current.chat.completions.create({
                 messages: apiMessages as any,
                 model: "gpt-3.5-turbo",
             });

             const message = completion.choices[0].message;
             if (message.content) {
                 setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: message.content }]);
             }
             break; // Simples implementation for stability, expands later with tools
        }

    } catch (error: any) {
        console.error(error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ Erro: ${error.message}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] flex flex-col items-end gap-2">
           <button
             onClick={onOpen}
             className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-italian-red to-red-600 flex items-center justify-center"
           >
             <Sparkles className="w-7 h-7 text-yellow-300 animate-pulse" />
           </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:justify-end sm:p-6 pointer-events-none">
          <div className="pointer-events-auto relative w-full sm:w-[400px] bg-white h-[85vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-italian-red text-white flex justify-between items-center shadow-md">
              <h2 className="font-bold">Luigi IA</h2>
              <button onClick={onClose}><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-white' : 'bg-white border'}`}>
                      {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Digite..." className="flex-1 p-3 bg-stone-100 rounded-xl text-sm outline-none" disabled={isLoading} />
                <button type="submit" disabled={!inputValue.trim() || isLoading} className="bg-italian-green text-white p-3 rounded-xl">
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
