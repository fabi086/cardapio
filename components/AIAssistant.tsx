import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Sparkles, Send, X, User, Bot, Loader2 } from 'lucide-react';
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
      text: `Ciao! 🍕 Eu sou o Luigi, o assistente virtual da ${storeName}. Posso anotar seu pedido, calcular a entrega e enviar para a cozinha. O que vai querer hoje?`
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // --- Helper Logic for Delivery Calculation (Mirrors CartDrawer logic) ---
  const checkDeliveryFee = (cep: string, neighborhood: string): { fee: number, regionName: string } | null => {
      if (!storeSettings.deliveryRegions) return null;
      
      const cleanCep = cep.replace(/\D/g, '');
      const cleanNeighborhood = neighborhood.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

      // Check by CEP
      if (cleanCep.length === 8) {
          const foundByCep = storeSettings.deliveryRegions.find(region => {
              if (region.zipExclusions?.some(ex => cleanCep.startsWith(ex.replace(/\D/g, '')))) return false;
              if (!region.zipRules) return false;
              return region.zipRules.some(rule => {
                  if (rule.includes('-')) {
                      const [start, end] = rule.split('-').map(r => parseInt(r.replace(/\D/g, '')));
                      const current = parseInt(cleanCep);
                      return current >= start && current <= end;
                  } else {
                      return cleanCep.startsWith(rule.replace(/\D/g, ''));
                  }
              });
          });
          if (foundByCep) return { fee: foundByCep.price, regionName: foundByCep.name };
      }

      // Check by Neighborhood
      if (cleanNeighborhood.length > 2) {
          const foundByName = storeSettings.deliveryRegions.find(region => {
              const hasListMatch = region.neighborhoods?.some(n => {
                  const normN = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                  return normN === cleanNeighborhood || cleanNeighborhood.includes(normN);
              });
              const normRegionName = region.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
              return hasListMatch || normRegionName === cleanNeighborhood || cleanNeighborhood.includes(normRegionName);
          });
          if (foundByName) return { fee: foundByName.price, regionName: foundByName.name };
      }
      return null;
  };

  // --- Tools Definition ---
  const tools = [
    {
      functionDeclarations: [
        {
          name: "add_item_to_order",
          description: "Adiciona um item do cardápio ao carrinho de compras.",
          parameters: {
            type: "OBJECT",
            properties: {
               product_name: { type: "STRING", description: "Nome exato ou aproximado do produto" },
               quantity: { type: "NUMBER", description: "Quantidade" },
               observation: { type: "STRING", description: "Observação (sem cebola, ponto da carne, etc)" }
            },
            required: ["product_name", "quantity"]
          }
        },
        {
          name: "check_delivery_fee",
          description: "Verifica se entregamos no local e calcula a taxa de entrega baseado no CEP ou Bairro.",
          parameters: {
            type: "OBJECT",
            properties: {
              cep: { type: "STRING", description: "CEP do cliente" },
              neighborhood: { type: "STRING", description: "Bairro do cliente" }
            },
            required: []
          }
        },
        {
          name: "finalize_order",
          description: "Finaliza o pedido, salva no sistema e gera o link do WhatsApp.",
          parameters: {
             type: "OBJECT",
             properties: {
                customer_name: { type: "STRING" },
                payment_method: { type: "STRING" },
                street: { type: "STRING" },
                number: { type: "STRING" },
                district: { type: "STRING" },
                cep: { type: "STRING" },
                complement: { type: "STRING" }
             },
             required: ["customer_name", "payment_method", "street", "number", "district"]
          }
        }
      ]
    }
  ];

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const simplifiedMenu = menuData.map(cat => ({
        category: cat.name,
        items: cat.items.map(item => ({ name: item.name, price: item.price, description: item.description }))
      }));

      const systemInstruction = `
        Você é o Luigi, garçom virtual da ${storeName}.
        
        SEUS OBJETIVOS:
        1. Anotar pedidos (use a ferramenta add_item_to_order).
        2. Calcular entrega (use check_delivery_fee quando o cliente informar onde mora).
        3. Finalizar pedido (use finalize_order).
        
        REGRAS IMPORTANTES:
        - Antes de finalizar, você DEVE ter: Itens no carrinho, Nome, Endereço completo e Forma de Pagamento.
        - Se o cliente pedir para finalizar, verifique se falta alguma dessas informações e pergunte.
        - O cardápio disponível é: ${JSON.stringify(simplifiedMenu)}
        - Sempre informe o valor da entrega antes de finalizar, se for delivery.
        - Não invente preços. Use os do cardápio.
        - Para pagamentos, aceite: Dinheiro, PIX, Cartão de Crédito/Débito.
        - Se o cliente adicionar item, confirme "Adicionei X ao carrinho".
      `;

      // Construct history
      const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      history.push({ role: 'user', parts: [{ text: userMsg.text }] });

      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction });

      // Generate content (non-streaming simpler for function calling loop)
      let result = await model.generateContent({
         contents: history,
         tools: tools
      });

      let response = result.response;
      let functionCalls = response.functionCalls();

      // Handle function calls loop
      while (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          const args = call.args as any;
          let functionResponse = {};

          if (call.name === 'add_item_to_order') {
             // Find product
             let foundProduct: Product | undefined;
             for (const cat of menuData) {
                 foundProduct = cat.items.find(p => p.name.toLowerCase().includes(args.product_name.toLowerCase()));
                 if (foundProduct) break;
             }

             if (foundProduct) {
                 onAddToCart(foundProduct, args.quantity || 1, args.observation || '');
                 functionResponse = { result: `Adicionado: ${args.quantity}x ${foundProduct.name}. Total atual do item: ${(foundProduct.price * args.quantity).toFixed(2)}` };
             } else {
                 functionResponse = { error: "Produto não encontrado no cardápio." };
             }
          } 
          
          else if (call.name === 'check_delivery_fee') {
             const res = checkDeliveryFee(args.cep || '', args.neighborhood || '');
             if (res) {
                 functionResponse = { success: true, fee: res.fee, region: res.regionName };
             } else {
                 functionResponse = { success: false, message: "Não encontramos uma taxa exata para este local. Informe que será calculado manualmente pelo atendente." };
             }
          }

          else if (call.name === 'finalize_order') {
             if (cartItems.length === 0) {
                 functionResponse = { error: "O carrinho está vazio. Adicione itens antes de finalizar." };
             } else {
                 // Calculate totals
                 const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                 const deliveryCheck = checkDeliveryFee(args.cep || '', args.district || '');
                 const deliveryFee = deliveryCheck ? deliveryCheck.fee : 0;
                 const total = subtotal + deliveryFee;

                 // Insert to Supabase
                 const dbPayload = {
                     customer_name: args.customer_name,
                     delivery_type: 'delivery',
                     address_street: args.street,
                     address_number: args.number,
                     address_district: args.district,
                     address_city: 'Itupeva', // Default assumption or ask
                     address_complement: args.complement || '',
                     payment_method: args.payment_method,
                     total: total,
                     delivery_fee: deliveryFee,
                     status: 'pending',
                     items: cartItems.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, observation: i.observation }))
                 };

                 let orderId = 'TEMP-' + Date.now();
                 if (supabase) {
                     const { data, error } = await supabase.from('orders').insert([dbPayload]).select();
                     if (data && !error) orderId = data[0].id;
                 }

                 // Generate WhatsApp Link
                 let waMsg = `*PEDIDO #${orderId} (Via Luigi IA)*\n`;
                 waMsg += `Cliente: ${args.customer_name}\n`;
                 waMsg += `Endereço: ${args.street}, ${args.number} - ${args.district}\n`;
                 waMsg += `Pagamento: ${args.payment_method}\n`;
                 waMsg += `----------------\n`;
                 cartItems.forEach(i => waMsg += `${i.quantity}x ${i.name}\n`);
                 waMsg += `----------------\n`;
                 waMsg += `Total: R$ ${total.toFixed(2)}`;
                 
                 const cleanPhone = storeSettings.whatsapp.replace(/\D/g, '');
                 const link = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(waMsg)}`;
                 
                 functionResponse = { success: true, orderId: orderId, whatsappLink: link, message: "Pedido salvo no sistema." };
                 
                 // Open link for user immediately if possible, or just provide it
                 window.open(link, '_blank');
             }
          }

          // Send function response back to model
          result = await model.generateContent({
             contents: [
               ...history,
               { role: 'model', parts: [{ functionCall: call }] },
               { role: 'user', parts: [{ functionResponse: { name: call.name, response: functionResponse } }] }
             ],
             tools: tools
          });
          
          response = result.response;
          functionCalls = response.functionCalls();
      }

      // Final text response
      const text = response.text();
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: text }]);

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Mamma mia! Tive um problema técnico. Pode repetir?"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl flex flex-col h-[600px] max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-italian-red to-red-700 text-white flex justify-between items-center shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <h2 className="font-display text-lg leading-none">Luigi IA</h2>
              <p className="text-xs text-white/80">Atendente Virtual</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50 dark:bg-stone-950/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-stone-200 dark:bg-stone-700' : 'bg-italian-green text-white'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-stone-600 dark:text-stone-300" /> : <Bot className="w-5 h-5" />}
              </div>
              
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tr-none' : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-tl-none border border-stone-100 dark:border-stone-700'}`}>
                   <div className="prose prose-sm dark:prose-invert leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                   </div>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-italian-green text-white flex items-center justify-center shrink-0"><Bot className="w-5 h-5" /></div>
                <div className="bg-white dark:bg-stone-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                   <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}/>
                   <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}/>
                   <span className="w-2 h-2 bg-stone-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}/>
                </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700">
           {cartItems.length > 0 && (
             <div className="mb-2 text-xs text-center text-stone-500 bg-stone-100 dark:bg-stone-800 py-1 rounded">
               🛒 {cartItems.length} itens no carrinho | Total: {currencySymbol} {cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)}
             </div>
           )}
           <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
             <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Digite sua mensagem..." className="flex-1 p-3 bg-stone-100 dark:bg-stone-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-italian-red outline-none dark:text-white" disabled={isLoading} />
             <button type="submit" disabled={!inputValue.trim() || isLoading} className="bg-italian-green text-white p-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
               {isLoading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Send className="w-5 h-5" />}
             </button>
           </form>
           <div className="text-center mt-2">
             <span className="text-[10px] text-stone-400 dark:text-stone-500">Powered by Gemini AI ✨</span>
           </div>
        </div>

      </div>
    </div>
  );
};