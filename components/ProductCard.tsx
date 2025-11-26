
import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { Plus, Minus, Check, ChevronUp, Share2, PieChart } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, observation: string, selectedOptions?: CartItem['selectedOptions']) => void;
  id?: string;
  allowHalfHalf?: boolean;
  onOpenPizzaBuilder?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, id, allowHalfHalf, onOpenPizzaBuilder }) => {
  const [quantity, setQuantity] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [observation, setObservation] = useState('');
  const [isAdded, setIsAdded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Mode state: 'whole' or 'half'
  const [mode, setMode] = useState<'whole' | 'half'>('whole');
  
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => Math.max(1, q - 1));

  const hasOptions = product.options && product.options.length > 0;

  const calculateTotal = () => {
    let total = product.price;
    
    if (hasOptions && product.options) {
      product.options.forEach(option => {
        const selectedChoices = selections[option.id] || [];
        selectedChoices.forEach(choiceName => {
          const choice = option.choices.find(c => c.name === choiceName);
          if (choice) {
            total += choice.price;
          }
        });
      });
    }
    
    return total * quantity;
  };

  const handleOptionChange = (optionId: string, choiceName: string, type: 'single' | 'multiple') => {
    setSelections(prev => {
      const current = prev[optionId] || [];
      
      if (type === 'single') {
        return { ...prev, [optionId]: [choiceName] };
      } else {
        if (current.includes(choiceName)) {
          return { ...prev, [optionId]: current.filter(c => c !== choiceName) };
        } else {
          return { ...prev, [optionId]: [...current, choiceName] };
        }
      }
    });
  };

  const validateOptions = () => {
    if (!hasOptions || !product.options) return true;
    for (const option of product.options) {
      if (option.required) {
        const selected = selections[option.id];
        if (!selected || selected.length === 0) {
          alert(`Por favor, selecione uma opção em: ${option.name}`);
          return false;
        }
      }
    }
    return true;
  };

  const handleAdd = () => {
    if (!validateOptions()) return;

    const finalOptions: CartItem['selectedOptions'] = [];
    if (hasOptions && product.options) {
      product.options.forEach(option => {
        const selectedNames = selections[option.id] || [];
        selectedNames.forEach(name => {
          const choice = option.choices.find(c => c.name === name);
          if (choice) {
            finalOptions.push({
              groupName: option.name,
              choiceName: choice.name,
              price: choice.price
            });
          }
        });
      });
    }

    onAddToCart(product, quantity, observation, finalOptions);
    setIsAdded(true);
    
    setTimeout(() => {
      setIsAdded(false);
      setQuantity(1);
      setObservation('');
      setSelections({});
      setIsExpanded(false);
      setMode('whole');
    }, 600);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = window.location.origin + window.location.pathname;
    const url = `${origin}#product-${product.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar link:', err);
    }
  };

  const totalPrice = calculateTotal();

  return (
    <div id={id} className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow dark:bg-stone-900 dark:border-stone-800 relative group/card">
      <div id={`product-${product.id}`} className="absolute -top-28 left-0 w-full h-0 opacity-0 pointer-events-none" />

      <div 
        className="h-40 w-full bg-stone-100 relative overflow-hidden group cursor-pointer dark:bg-stone-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <OptimizedImage 
          src={product.image} 
          alt={product.name} 
          width={400} // Tamanho ideal para cards
          fill
          className="transition-transform duration-500 group-hover:scale-105"
        />
        
        {product.tags && product.tags.length > 0 && (
           <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {product.tags.map(tag => (
                 <span key={tag} className={`text-[10px] font-bold px-2 py-0.5 rounded shadow-sm uppercase tracking-wider ${
                    tag === 'popular' ? 'bg-yellow-400 text-yellow-900' : 
                    tag === 'vegetarian' ? 'bg-green-500 text-white' : 
                    tag === 'spicy' ? 'bg-red-500 text-white' :
                    tag === 'new' ? 'bg-blue-500 text-white' : 'bg-stone-800 text-white'
                 }`}>
                    {tag === 'popular' && '★ Popular'}
                    {tag === 'vegetarian' && 'Vegetariano'}
                    {tag === 'spicy' && 'Picante'}
                    {tag === 'new' && 'Novo'}
                 </span>
              ))}
           </div>
        )}

        <button onClick={handleShare} className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white text-stone-600 transition-all z-10 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-stone-800 hover:text-italian-green hover:scale-110">
          {isCopied ? <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-200" /> : <Share2 className="w-4 h-4" />}
        </button>

        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-stone-200 dark:bg-stone-900/90 dark:border-stone-700">
          <span className="font-bold text-italian-green text-sm">R$ {product.price.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2 leading-tight dark:text-white">
            {product.code && <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-mono h-fit dark:bg-stone-700 dark:text-stone-300">{product.code}</span>}
            {product.name}
          </h3>
        </div>
        
        {product.ingredients && product.ingredients.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.ingredients.map((ing, idx) => (
              <span key={idx} className="text-[10px] bg-stone-50 text-stone-600 border border-stone-100 px-1.5 py-0.5 rounded dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700">{ing}</span>
            ))}
          </div>
        )}

        <p className="text-stone-500 text-xs md:text-sm leading-relaxed mb-4 line-clamp-3 dark:text-stone-400">{product.description}</p>

        {hasOptions && !isExpanded && (
           <div className="mt-auto mb-3">
             <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100 font-semibold dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-900">Personalizável</span>
           </div>
        )}
      </div>

      <div className="p-4 pt-0 mt-auto">
        {!isExpanded ? (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full py-2.5 bg-white border border-italian-red text-italian-red rounded-lg font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2 dark:bg-transparent dark:hover:bg-red-900/20"
          >
            <Plus className="w-4 h-4" /> {hasOptions || allowHalfHalf ? 'Adicionar' : 'Adicionar'}
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* HALF-HALF TOGGLE */}
            {allowHalfHalf && (
               <div className="bg-stone-100 p-1 rounded-lg flex mb-4 dark:bg-stone-800">
                  <button 
                    onClick={() => setMode('whole')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'whole' ? 'bg-white text-italian-green shadow-sm dark:bg-stone-700 dark:text-white' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
                  >
                    Inteira
                  </button>
                  <button 
                    onClick={() => setMode('half')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'half' ? 'bg-white text-italian-green shadow-sm dark:bg-stone-700 dark:text-white' : 'text-stone-500 hover:text-stone-700 dark:text-stone-400'}`}
                  >
                    Meia a Meia
                  </button>
               </div>
            )}

            {mode === 'half' ? (
               <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-center dark:bg-stone-800 dark:border-stone-700">
                  <div className="mb-3 text-stone-600 dark:text-stone-300 text-sm">
                     <p className="font-bold mb-1">1ª Metade Selecionada:</p>
                     <p className="text-italian-green">{product.name}</p>
                  </div>
                  <button 
                    onClick={() => onOpenPizzaBuilder && onOpenPizzaBuilder(product)}
                    className="w-full bg-italian-green text-white py-2 rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <PieChart className="w-4 h-4" /> Escolher 2ª Metade
                  </button>
               </div>
            ) : (
               <>
                  {/* Standard Options */}
                  {hasOptions && product.options && (
                    <div className="space-y-4 border-b border-stone-100 pb-4 dark:border-stone-800">
                      {product.options.map(option => (
                        <div key={option.id} className="bg-stone-50 p-3 rounded-lg border border-stone-200 dark:bg-stone-800 dark:border-stone-700">
                          <div className="flex justify-between items-center mb-2">
                             <h4 className="font-bold text-sm text-stone-800 dark:text-stone-200">{option.name}</h4>
                             {option.required && <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded dark:bg-red-900/30 dark:text-red-300">*Obrigatório</span>}
                          </div>
                          
                          <div className="space-y-2">
                            {option.choices.map((choice, idx) => {
                               const isSelected = (selections[option.id] || []).includes(choice.name);
                               return (
                                 <label key={idx} className="flex items-center justify-between cursor-pointer group">
                                   <div className="flex items-center gap-2">
                                     <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${option.type === 'single' ? 'rounded-full' : 'rounded'} ${isSelected ? 'bg-italian-green border-italian-green' : 'bg-white border-stone-300 group-hover:border-italian-green dark:bg-stone-900 dark:border-stone-600'}`}>
                                        {isSelected && <div className={`bg-white ${option.type === 'single' ? 'w-2 h-2 rounded-full' : 'w-3 h-3 icon-check'}`} />}
                                     </div>
                                     <input type={option.type === 'single' ? 'radio' : 'checkbox'} name={`opt-${product.id}-${option.id}`} className="hidden" onChange={() => handleOptionChange(option.id, choice.name, option.type)} checked={isSelected} />
                                     <span className="text-sm text-stone-700 dark:text-stone-300">{choice.name}</span>
                                   </div>
                                   {choice.price > 0 && <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">+ R$ {choice.price.toFixed(2).replace('.',',')}</span>}
                                 </label>
                               );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <input type="text" value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Obs: Sem cebola..." className="w-full text-sm p-2 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:border-italian-green focus:ring-1 focus:ring-italian-green dark:bg-stone-800 dark:border-stone-700 dark:text-white" />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center border border-stone-300 rounded-lg bg-white shadow-sm h-10 dark:bg-stone-800 dark:border-stone-700">
                      <button onClick={handleDecrement} className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-italian-red active:bg-stone-100 rounded-l-lg dark:text-stone-400 dark:active:bg-stone-700"><Minus className="w-4 h-4" /></button>
                      <span className="w-6 text-center font-bold text-stone-800 text-sm dark:text-white">{quantity}</span>
                      <button onClick={handleIncrement} className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-italian-green active:bg-stone-100 rounded-r-lg dark:text-stone-400 dark:active:bg-stone-700"><Plus className="w-4 h-4" /></button>
                    </div>
                    
                    <button onClick={handleAdd} disabled={isAdded} className={`flex-1 h-10 rounded-lg font-medium text-xs md:text-sm transition-all shadow-sm flex items-center justify-center gap-1 ${isAdded ? 'bg-green-600 text-white scale-105' : 'bg-italian-green text-white hover:bg-green-800'}`}>
                      {isAdded ? <><Check className="w-4 h-4" /> Add!</> : `Add no carrinho R$ ${totalPrice.toFixed(2).replace('.',',')}`}
                    </button>
                  </div>
               </>
            )}
            
            <button onClick={() => setIsExpanded(false)} className="w-full text-center text-xs text-stone-400 hover:text-stone-600 pb-1 dark:text-stone-500 dark:hover:text-stone-300"><ChevronUp className="w-4 h-4 mx-auto" /></button>
          </div>
        )}
      </div>
    </div>
  );
};
