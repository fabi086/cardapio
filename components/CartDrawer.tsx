import React, { useMemo } from 'react';
import { CartItem } from '../types';
import { WHATSAPP_NUMBER } from '../data';
import { X, Trash2, MessageCircle, ShoppingBag, Plus, Minus, Edit2 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (index: number) => void;
  onClearCart?: () => void;
  onUpdateQuantity?: (index: number, newQuantity: number) => void;
  onUpdateObservation?: (index: number, newObservation: string) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  onRemoveItem, 
  onClearCart,
  onUpdateQuantity,
  onUpdateObservation
}) => {
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [items]);

  const handleCheckout = () => {
    if (items.length === 0) return;

    let message = `*Olá, Spagnolli Pizzaria! Gostaria de fazer um pedido:*\n\n`;
    
    items.forEach((item) => {
      message += `▪️ ${item.quantity}x *${item.name}*`;
      if(item.code) message += ` (Cod: ${item.code})`;
      message += `\n   R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}`;
      if (item.observation) {
        message += `\n   _Obs: ${item.observation}_`;
      }
      message += `\n`;
    });

    message += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    message += `\n\n_Aguardo a confirmação!_`;

    const encodedMessage = encodeURIComponent(message);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
    
    window.open(url, '_blank');
  };

  const handleEditObservation = (index: number, currentObs: string) => {
    if (!onUpdateObservation) return;
    const newObs = window.prompt("Editar observação:", currentObs);
    if (newObs !== null) {
      onUpdateObservation(index, newObs);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-4 bg-italian-red text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            <h2 className="font-bold text-lg">Seu Pedido</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-3">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p className="text-lg font-medium">Seu carrinho está vazio</p>
              <button 
                onClick={onClose}
                className="mt-2 text-italian-red font-semibold hover:underline"
              >
                Voltar ao cardápio
              </button>
            </div>
          ) : (
            items.map((item, index) => (
              <div key={`${item.id}-${index}`} className="bg-white p-3 rounded-lg shadow-sm border border-stone-100 flex gap-3 animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards" style={{ animationDelay: `${index * 50}ms` }}>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-stone-800 flex-1 mr-2 leading-tight">
                      {item.name}
                    </h4>
                    <span className="text-sm font-semibold text-stone-600 whitespace-nowrap">
                      R$ {(item.price * item.quantity).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  
                  <div 
                    className="mt-2 group cursor-pointer"
                    onClick={() => handleEditObservation(index, item.observation || '')}
                  >
                    {item.observation ? (
                      <p className="text-xs text-stone-600 bg-stone-100 p-2 rounded border border-stone-200 flex items-center justify-between hover:bg-stone-200 transition-colors">
                        <span><span className="font-semibold">Obs:</span> {item.observation}</span>
                        <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-stone-600" />
                      </p>
                    ) : (
                      <p className="text-xs text-stone-400 flex items-center gap-1 hover:text-stone-600 transition-colors py-1">
                        <Edit2 className="w-3 h-3" /> Adicionar observação
                      </p>
                    )}
                  </div>

                  <div className="flex items-end justify-between mt-3">
                    {/* Quantity Controls */}
                    <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 h-8 shadow-sm">
                       <button 
                         onClick={() => onUpdateQuantity ? onUpdateQuantity(index, item.quantity - 1) : null}
                         className="w-9 h-full flex items-center justify-center text-stone-500 hover:bg-red-50 hover:text-red-600 rounded-l-lg transition-colors active:bg-red-100"
                         disabled={!onUpdateQuantity}
                       >
                         <Minus className="w-4 h-4" />
                       </button>
                       <div className="w-10 text-center text-sm font-bold text-stone-800 border-x border-stone-200 h-full flex items-center justify-center bg-white">
                         {item.quantity}
                       </div>
                       <button 
                         onClick={() => onUpdateQuantity ? onUpdateQuantity(index, item.quantity + 1) : null}
                         className="w-9 h-full flex items-center justify-center text-stone-500 hover:bg-green-50 hover:text-green-600 rounded-r-lg transition-colors active:bg-green-100"
                         disabled={!onUpdateQuantity}
                       >
                         <Plus className="w-4 h-4" />
                       </button>
                    </div>

                    <div className="text-xs text-stone-400">
                      Unit: R$ {item.price.toFixed(2).replace('.',',')}
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => onRemoveItem(index)}
                  className="text-stone-300 hover:text-red-500 self-start p-1 transition-colors -mr-1"
                  title="Remover item"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {items.length > 0 && onClearCart && (
            <div className="flex justify-end mb-4">
               <button 
                 onClick={onClearCart}
                 className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 rounded transition-colors"
               >
                 <Trash2 className="w-3 h-3" /> Limpar carrinho
               </button>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-600 font-medium">Total do Pedido</span>
            <span className="text-2xl font-bold text-italian-green">
              R$ {total.toFixed(2).replace('.', ',')}
            </span>
          </div>
          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
              items.length === 0 
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
            }`}
          >
            <MessageCircle className="w-6 h-6" />
            Enviar Pedido no WhatsApp
          </button>
          <p className="text-center text-xs text-stone-400 mt-3">
            O pedido será enviado para nosso WhatsApp para confirmação.
          </p>
        </div>
      </div>
    </div>
  );
};