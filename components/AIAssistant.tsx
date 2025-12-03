
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

  useEffect(() => {
    if(isOpen) scrollToBottom();
  }, [isOpen, messages]);

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
        // Prepare context for the AI
        const systemPrompt = storeSettings.aiSystemPrompt || `Você é o Luigi, um garçom digital de uma pizzaria italiana chamada ${storeName}.
        Seu tom é amigável, prestativo e com leve sotaque italiano (use expressões como 'Mamma Mia', 'Prego', 'Ecco').
        Seja objetivo nas respostas. Não invente produtos que não existem no cardápio.
        A moeda é ${currencySymbol}.
        
        Cardápio Resumido:
        ${menuData.map(c => `${c.name}: ${c.items.map(i => `${i.name} (${currencySymbol}${i.price})`).join(', ')}`).join('\n')}
        `;

        const apiMessages: any[] = [
            { role: "system", content: systemPrompt },
            ...newMessages.map(m => ({ role: m.role as any, content: m.content }))
        ];

        const completion = await openaiRef.current.chat.completions.create({
             messages: apiMessages as any,
             model: "gpt-3.5-turbo",
             max_tokens: 150,
             temperature: 0.7
        });

        const message = completion.choices[0].message;
        if (message.content) {
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: message.content }]);
        }

    } catch (error: any) {
        console.error(error);
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ Scusi! Tive um problema técnico: ${error.message}` }]);
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
             className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-italian-red to-red-600 flex items-center justify-center hover:scale-105 transition-transform"
           >
             <Sparkles className="w-7 h-7 text-yellow-300 animate-pulse" />
           </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:justify-end sm:p-6 pointer-events-none">
          {/* Container Size Adjusted: Smaller height on mobile (50vh), smaller width/height on desktop */}
          <div className="pointer-events-auto relative w-full sm:w-[350px] bg-white h-[55vh] sm:h-[480px] rounded-t-xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden border border-stone-200">
            
            {/* Header */}
            <div className="p-3 bg-italian-red text-white flex justify-between items-center shadow-md" style={{ backgroundColor: storeSettings.colors?.primary }}>
              <div className="flex items-center gap-2">
                 <div className="bg-white/20 p-1.5 rounded-full"><Bot className="w-4 h-4" /></div>
                 <h2 className="font-bold text-sm">Luigi IA</h2>
              </div>
              <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-100">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                   
                   {/* Avatar */}
                   <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.role === 'user' ? 'bg-stone-700 text-white' : 'bg-italian-green text-white'}`}>
                      {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                   </div>

                   {/* Message Bubble - Improved Contrast */}
                   <div className={`max-w-[85%] p-3 text-sm shadow-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-stone-800 text-white rounded-2xl rounded-tr-none' 
                        : 'bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-tl-none'
                   }`}>
                      {msg.content}
                   </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full bg-italian-green text-white flex items-center justify-center shrink-0 mt-1"><Bot className="w-3 h-3" /></div>
                    <div className="bg-white border border-stone-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                       <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                       <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                       <span className="w-1.5 h-1.5 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                    </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-stone-200">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  placeholder="Digite sua dúvida..." 
                  className="flex-1 p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500 transition-all" 
                  disabled={isLoading} 
                />
                <button 
                  type="submit" 
                  disabled={!inputValue.trim() || isLoading} 
                  className="bg-stone-900 text-white p-2.5 rounded-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
