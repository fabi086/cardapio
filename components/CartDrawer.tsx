import React, { useMemo } from 'react';
import { CartItem } from '../types';
import { X, Trash2, ShoppingBag, Plus, Minus, Edit2 } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (index: number) => void;
  onClearCart?: () => void;
  onUpdateQuantity?: (index: number, newQuantity: number) => void;
  onUpdateObservation?: (index: number, newObservation: string) => void;
  whatsappNumber: string;
  storeName: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  onRemoveItem, 
  onClearCart,
  onUpdateQuantity,
  onUpdateObservation,
  whatsappNumber,
  storeName
}) => {
  const total = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  }, [items]);

  const handleCheckout = () => {
    if (items.length === 0) return;

    let message = `*Olá, ${storeName}! Gostaria de fazer um pedido:*\n\n`;
    
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
    
    // Tratamento robusto do número de WhatsApp
    let cleanNumber = whatsappNumber.replace(/\D/g, ''); // Remove tudo que não é número
    
    // Se o número tiver entre 10 e 11 dígitos (típico celular BR sem DDI), adiciona o 55
    // Isso previne links quebrados se o usuário esquecer o DDI no painel admin
    if (cleanNumber.length >= 10 && cleanNumber.length <= 11) {
      cleanNumber = '55' + cleanNumber;
    }

    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    
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
                         onClick={() => {
                           if (!onUpdateQuantity) return;
                           if (item.quantity <= 1) {
                             if (window.confirm('Remover este item do carrinho?')) {
                               onRemoveItem(index);
                             }
                           } else {
                             onUpdateQuantity(index, item.quantity - 1);
                           }
                         }}
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
            {/* WhatsApp Original Icon */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Enviar Pedido no WhatsApp
          </button>
          <p className="text-center text-xs text-stone-400 mt-3">
            O pedido será enviado para o número {whatsappNumber}
          </p>
        </div>
      </div>
    </div>
  );
};