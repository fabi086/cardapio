
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, User, Bot, Loader2 } from 'lucide-react';
import { Category, ChatMessage, Product, CartItem, StoreSettings } from '../types';
import OpenAI from 'openai';

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
  
  // Use ref to keep instance across renders but recreate if key changes
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

  const prepareContextData = () => {
      const simplifiedMenu = menuData.map(cat => {
        const itemsList = cat.items.map(item => 
            `- ${item.name} (${currencySymbol} ${item.price.toFixed(2)}): ${item.description || ''}`
        ).join('\n');
        return `CATEGORIA: ${cat.name}\n${itemsList}`;
      }).join('\n\n');

      const paymentInfo = storeSettings.paymentMethods?.join(', ') || "Dinheiro, Cartão, PIX";
      const scheduleInfo = storeSettings.openingHours;

      return `
=== DADOS DA LOJA ===
NOME: ${storeName}
MOEDA: ${currencySymbol}
HORÁRIOS: ${scheduleInfo}

--- FORMAS DE PAGAMENTO ---
${paymentInfo}

--- CARDÁPIO COMPLETO ---
${simplifiedMenu}
      `;
  };

  const getSystemInstruction = () => {
      const contextData = prepareContextData();
      const defaultPrompt = `
Você é o Luigi 🍕, o garçom virtual da ${storeName}.

--- SUAS FERRAMENTAS (USE-AS!) ---
1. 'add_item_to_order': Para adicionar itens normais (bebidas, pizzas inteiras).
2. 'add_half_half_pizza': OBRIGATÓRIO usar quando o cliente pedir "meia X e meia Y".
3. 'calculate_delivery_fee': OBRIGATÓRIO usar quando o cliente perguntar o valor da entrega ou disser o bairro.

--- REGRAS DE COMPORTAMENTO ---
1. **CARDÁPIO:** Se o cliente perguntar "quais sabores?", LISTE as opções com preços.
2. **NÃO ADICIONE SEM PEDIR:** Se o cliente perguntar "Quanto é a de Calabresa?", responda APENAS o preço. SÓ adicione ao carrinho se ele disser "Eu quero", "Pode por", "Vou levar".
3. **MEIA A MEIA:** Se o cliente pedir dois sabores em uma pizza só, use a ferramenta 'add_half_half_pizza'.
4. **ENTREGA:** Sempre pergunte o Bairro para calcular a taxa.
      `;

      return storeSettings.aiSystemPrompt && storeSettings.aiSystemPrompt.length > 10
          ? `${storeSettings.aiSystemPrompt}\n\n${contextData}` 
          : `${defaultPrompt}\n\n${contextData}`;
  };

  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "add_item_to_order",
        description: "Adiciona um item INTEIRO ao carrinho.",
        parameters: {
          type: "object",
          properties: {
            product_name: { type: "string" },
            quantity: { type: "number" },
            observation: { type: "string" }
          },
          required: ["product_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "add_half_half_pizza",
        description: "Adiciona UMA pizza com dois sabores.",
        parameters: {
          type: "object",
          properties: {
            flavor1: { type: "string" },
            flavor2: { type: "string" },
            observation: { type: "string" }
          },
          required: ["flavor1", "flavor2"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "calculate_delivery_fee",
        description: "Calcula frete pelo bairro.",
        parameters: {
          type: "object",
          properties: {
            neighborhood: { type: "string" }
          },
          required: ["neighborhood"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "finalize_order",
        description: "Gera link do WhatsApp.",
        parameters: {
            type: "object",
            properties: {
              customer_name: { type: "string" },
              payment_method: { type: "string" },
              delivery_method: { type: "string", enum: ["entrega", "retirada"] }
            },
            required: ["customer_name"]
        }
      }
    }
  ];

  useEffect(() => {
    if (isOpen) {
        setHasUnread(false);
    }
    setTimeout(scrollToBottom, 100);
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        // Prepare history for OpenAI
        const apiMessages: any[] = [
            { role: "system", content: getSystemInstruction() },
            ...newMessages.map(m => ({ role: m.role as any, content: m.content }))
        ];

        let loopCount = 0;
        const maxLoops = 5; 

        while (loopCount < maxLoops) {
             const completion = await openaiRef.current.chat.completions.create({
                 messages: apiMessages as any,
                 model: "gpt-3.5-turbo", // Or gpt-4o-mini
                 tools: tools,
                 tool_choice: "auto"
             });

             const choice = completion.choices[0];
             const message = choice.message;

             // Add assistant message to history (even if null content but has tool_calls)
             apiMessages.push(message as any);

             if (message.tool_calls && message.tool_calls.length > 0) {
                 for (const toolCall of message.tool_calls) {
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
                            resultText = `SUCESSO: Adicionado ${args.quantity || 1}x ${foundProduct.name}.`;
                        } else {
                            // Fuzzy search fallback
                            const allProducts = menuData.flatMap(c => c.items);
                            const match = allProducts.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase().split(' ')[0]));
                            if (match) {
                                 onAddToCart(match, args.quantity || 1, args.observation || '');
                                 resultText = `SUCESSO: Adicionado ${match.name} (aproximado).`;
                            } else {
                                 resultText = "ERRO: Produto não encontrado.";
                            }
                        }
                     }
                     else if (fnName === "add_half_half_pizza") {
                         const allProducts = menuData.flatMap(c => c.items);
                         const p1 = allProducts.find(p => p.name.toLowerCase().includes(args.flavor1.toLowerCase()));
                         const p2 = allProducts.find(p => p.name.toLowerCase().includes(args.flavor2.toLowerCase()));
    
                         if (p1 && p2) {
                             const maxPrice = Math.max(p1.price, p2.price);
                             const mixedPizza: Product = {
                                id: Date.now(),
                                name: `Meia ${p1.name} / Meia ${p2.name}`,
                                description: `1/2 ${p1.name} e 1/2 ${p2.name}`,
                                price: maxPrice,
                                category: p1.category,
                                image: p1.image,
                                code: 'MM'
                             };
                             onAddToCart(mixedPizza, 1, args.observation || '');
                             resultText = `SUCESSO: Pizza Meia a Meia criada!`;
                         } else {
                             resultText = `ERRO: Não encontrei um dos sabores.`;
                         }
                     }
                     else if (fnName === "calculate_delivery_fee") {
                        const neighborhood = args.neighborhood.toLowerCase().trim();
                        const regions = storeSettings.deliveryRegions || [];
                        let foundRegion = regions.find(r => 
                           r.name.toLowerCase().includes(neighborhood) || 
                           (r.neighborhoods && r.neighborhoods.some(n => n.toLowerCase().includes(neighborhood)))
                        );
                        if (foundRegion) {
                            resultText = `INFO: Taxa para ${foundRegion.name} é ${currencySymbol} ${foundRegion.price.toFixed(2)}.`;
                        } else {
                            resultText = `INFO: Bairro não tabelado. Taxa a combinar.`;
                        }
                     }
                     else if (fnName === "finalize_order") {
                         const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
                         const msg = `PEDIDO IA\nCliente: ${args.customer_name}\nPgto: ${args.payment_method}\nModo: ${args.delivery_method}\nTotal Aprox: ${currencySymbol} ${total.toFixed(2)}`;
                         let cleanPhone = storeSettings.whatsapp.replace(/\D/g,'');
                         if (cleanPhone.length >= 10 && cleanPhone.length <= 11) cleanPhone = '55' + cleanPhone;
                         const link = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                         window.open(link, '_blank');
                         resultText = "SUCESSO: Link gerado.";
                     }

                     apiMessages.push({
                         role: "tool",
                         tool_call_id: toolCall.id,
                         content: resultText
                     });
                 }
                 loopCount++;
             } else {
                 // Final response
                 const content = message.content;
                 if (content) {
                     setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content }]);
                 }
                 break;
             }
        }

    } catch (error: any) {
        console.error(error);
        let msg = "Desculpe, tive um erro técnico.";
        if (error?.message?.includes('API key')) msg = "Chave da OpenAI inválida ou não configurada.";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ ${msg}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button (Visible when closed) */}
      {!isOpen && (
        <div className="fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[60] flex flex-col items-end gap-2 group animate-in slide-in-from-bottom-10 fade-in duration-500">
           {/* Balloon */}
           <div className="bg-white dark:bg-stone-800 text-stone-800 dark:text-white px-4 py-2 rounded-xl rounded-tr-none shadow-xl border border-stone-100 dark:border-stone-700 mb-1 animate-bounce duration-[2000ms] origin-bottom-right cursor-pointer" onClick={onOpen}>
              <p className="text-sm font-bold flex items-center gap-1">Precisa de ajuda? 🍕</p>
           </div>

           <button
             onClick={onOpen}
             className="w-14 h-14 md:w-16 md:h-16 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center relative bg-gradient-to-br from-italian-red to-red-600"
             style={{ backgroundColor: storeSettings.colors?.primary }}
           >
             <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-yellow-300 animate-pulse" />
             {hasUnread && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-ping"></span>
             )}
             {hasUnread && (
                <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
             )}
           </button>
        </div>
      )}

      {/* Chat Window (Visible when open) */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:justify-end sm:p-6 pointer-events-none">
          {/* Backdrop for mobile */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] sm:bg-transparent pointer-events-auto sm:pointer-events-none transition-opacity" onClick={onClose} />

          <div className="pointer-events-auto relative w-full sm:w-[400px] bg-white dark:bg-stone-900 h-[85vh] sm:h-[600px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:slide-in-from-right-10 border border-stone-200 dark:border-stone-700">
            
            <div className="p-4 bg-gradient-to-r from-italian-red to-red-700 text-white flex justify-between items-center shadow-md" style={{ background: storeSettings.colors?.primary }}>
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full">
                  <Sparkles className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <h2 className="font-display text-lg leading-none">Luigi IA</h2>
                  <p className="text-xs text-white/80">Sommelier de Pizza</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50 dark:bg-stone-950/50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-stone-200 dark:bg-stone-700' : 'bg-italian-green text-white'}`} style={msg.role === 'assistant' ? { backgroundColor: storeSettings.colors?.secondary } : {}}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-stone-600 dark:text-stone-300" /> : <Bot className="w-5 h-5" />}
                  </div>
                  
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tr-none' : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-none border border-stone-100 dark:border-stone-700'}`}>
                      {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-italian-green text-white flex items-center justify-center shrink-0" style={{ backgroundColor: storeSettings.colors?.secondary }}><Bot className="w-5 h-5" /></div>
                    <div className="bg-white dark:bg-stone-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                      <Loader2 className="w-4 h-4 animate-spin text-stone-400"/>
                      <span className="text-xs text-stone-400">Digitando...</span>
                    </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Digite sua mensagem..." className="flex-1 p-3 bg-stone-100 dark:bg-stone-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-italian-red outline-none dark:text-white" disabled={isLoading} autoFocus />
                <button type="submit" disabled={!inputValue.trim() || isLoading} className="bg-italian-green text-white p-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style={{ backgroundColor: storeSettings.colors?.secondary }}>
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
