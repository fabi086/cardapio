
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, User, Bot, Loader2, AlertTriangle } from 'lucide-react';
import { Category, ChatMessage, Product, CartItem, StoreSettings } from '../types';
import { supabase } from '../supabaseClient';

interface AIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  menuData: Category[];
  storeName: string;
  currencySymbol: string;
  cartItems: CartItem[];
  onAddToCart: (product: Product, quantity: number, observation: string) => void;
  storeSettings: StoreSettings;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: any[];
  tool_call_id?: string;
  name?: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
  isOpen, 
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
      role: 'model',
      text: `Ciao! 🍕 Eu sou o Luigi, o assistente virtual da ${storeName}. O que você gostaria de pedir hoje?`
    }
  ]);
  
  const [apiHistory, setApiHistory] = useState<OpenAIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && apiHistory.length === 0) {
      const simplifiedMenu = menuData.map(cat => ({
        category: cat.name,
        items: cat.items.map(item => ({ name: item.name, price: item.price, description: item.description }))
      }));

      const systemPrompt = storeSettings.aiSystemPrompt || `
        Você é o Luigi, garçom virtual da ${storeName}.
        Objetivos: Anotar pedidos, calcular entrega, finalizar.
        Cardápio: ${JSON.stringify(simplifiedMenu).slice(0, 3000)}... (resumido)
        Moeda: ${currencySymbol}
        Seja simpático e use emojis.
      `;

      setApiHistory([
        { role: 'system', content: systemPrompt },
        { role: 'assistant', content: `Ciao! 🍕 Eu sou o Luigi, o assistente virtual da ${storeName}. O que você gostaria de pedir hoje?` }
      ]);
    }
    scrollToBottom();
  }, [isOpen, menuData, storeName, storeSettings]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkDeliveryFee = (cep: string, neighborhood: string): { fee: number, regionName: string } | null => {
      if (!storeSettings.deliveryRegions) return null;
      const cleanCep = cep.replace(/\D/g, '');
      const cleanNeighborhood = neighborhood.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      if (cleanCep.length === 8) {
          const foundByCep = storeSettings.deliveryRegions.find(region => {
             if (region.zipRules) {
                 return region.zipRules.some(rule => cleanCep.startsWith(rule.replace(/\D/g, '')));
             }
             return false;
          });
          if (foundByCep) return { fee: foundByCep.price, regionName: foundByCep.name };
      }

      if (cleanNeighborhood.length > 2) {
          const foundByName = storeSettings.deliveryRegions.find(region => {
              const nameMatch = region.name.toLowerCase().includes(cleanNeighborhood);
              const listMatch = region.neighborhoods?.some(n => n.toLowerCase().includes(cleanNeighborhood));
              return nameMatch || listMatch;
          });
          if (foundByName) return { fee: foundByName.price, regionName: foundByName.name };
      }
      return null;
  };

  const callOpenAI = async (currentHistory: OpenAIMessage[]) => {
    const apiKey = storeSettings.openaiApiKey;
    if (!apiKey) throw new Error("API_MISSING");

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: currentHistory,
        tools: [
          {
            type: "function",
            function: {
              name: "add_item_to_order",
              description: "Adiciona item ao carrinho",
              parameters: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  quantity: { type: "number" },
                  observation: { type: "string" }
                },
                required: ["product_name", "quantity"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "finalize_order",
              description: "Gera link whatsapp",
              parameters: {
                  type: "object",
                  properties: {
                    customer_name: { type: "string" },
                    payment_method: { type: "string" }
                  },
                  required: ["customer_name"]
              }
            }
          }
        ],
        tool_choice: 'auto'
      })
    });

    if (!response.ok) throw new Error("API_ERROR");
    return response.json();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    // Verificação de segurança: Se não tem chave, avisa e para.
    if (!storeSettings.openaiApiKey) {
        setMessages(prev => [...prev, 
            { id: Date.now().toString(), role: 'user', text: inputValue },
            { id: (Date.now()+1).toString(), role: 'model', text: "⚠️ Opa! Meu cérebro (API Key) ainda não foi configurado no Painel Administrativo. Por favor, peça para o dono da loja configurar a aba 'Robô WhatsApp'." }
        ]);
        setInputValue('');
        return;
    }

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
    const userApiMsg: OpenAIMessage = { role: 'user', content: inputValue };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    let currentConversation = [...apiHistory, userApiMsg];
    setApiHistory(currentConversation);

    try {
        const data = await callOpenAI(currentConversation);
        const choice = data.choices[0];
        const responseMsg = choice.message;
        
        currentConversation.push(responseMsg);
        
        if (responseMsg.tool_calls) {
            for (const toolCall of responseMsg.tool_calls) {
                const fnName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                let resultText = "Ok";

                if (fnName === "add_item_to_order") {
                    let foundProduct;
                    for (const cat of menuData) {
                        foundProduct = cat.items.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
                        if (foundProduct) break;
                    }
                    if (foundProduct) {
                        onAddToCart(foundProduct, args.quantity || 1, args.observation || '');
                        resultText = `Adicionado ${args.quantity}x ${foundProduct.name}`;
                    } else {
                        resultText = "Produto não encontrado";
                    }
                } else if (fnName === "finalize_order") {
                     const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                     const msg = `Pedido de ${args.customer_name}. Total: ${currencySymbol} ${total.toFixed(2)}`;
                     const link = `https://wa.me/55${storeSettings.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`;
                     window.open(link, '_blank');
                     resultText = "Pedido enviado para WhatsApp";
                }

                currentConversation.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: fnName,
                    content: resultText
                });
            }
            // Chama a AI de novo após tool result
            const followUp = await callOpenAI(currentConversation);
            if (followUp.choices[0].message.content) {
                setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: followUp.choices[0].message.content }]);
            }
        } else if (responseMsg.content) {
             setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: responseMsg.content }]);
        }
        
        setApiHistory(currentConversation);

    } catch (error: any) {
        let msg = "Desculpe, tive um erro técnico.";
        if (error.message === "API_MISSING") msg = "API Key não configurada.";
        if (error.message === "API_ERROR") msg = "A OpenAI retornou erro. Verifique se a chave é válida e tem saldo.";
        
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: `⚠️ ${msg}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl flex flex-col h-[600px] max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        <div className="p-4 bg-gradient-to-r from-italian-red to-red-700 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="font-display text-lg leading-none">Luigi IA</h2>
              <p className="text-xs text-white/80">Garçom Virtual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50 dark:bg-stone-950/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-stone-200 dark:bg-stone-700' : 'bg-italian-green text-white'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-stone-600 dark:text-stone-300" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tr-none' : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-none border border-stone-100 dark:border-stone-700'}`}>
                   {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-italian-green text-white flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></div>
                <div className="bg-white dark:bg-stone-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                   <Loader2 className="w-4 h-4 animate-spin text-stone-400"/>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
           <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
             <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Digite sua mensagem..." className="flex-1 p-3 bg-stone-100 dark:bg-stone-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-italian-red outline-none dark:text-white" disabled={isLoading} />
             <button type="submit" disabled={!inputValue.trim() || isLoading} className="bg-italian-green text-white p-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
               <Send className="w-5 h-5" />
             </button>
           </form>
        </div>

      </div>
    </div>
  );
};
