import React, { useState } from 'react';
import { Product, CartItem } from '../types';
import { Plus, Minus, ImageOff, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, observation: string, selectedOptions?: CartItem['selectedOptions']) => void;
  id?: string; // Add optional ID prop for the tour
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart, id }) => {
  const [quantity, setQuantity] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [observation, setObservation] = useState('');
  const [imageError, setImageError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  
  // State for selected options: { [groupId]: [choiceName1, choiceName2] }
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => Math.max(1, q - 1));

  const hasOptions = product.options && product.options.length > 0;

  // Calculate total price based on selections
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
        // If clicking same radio, keep it (or toggle off if optional? Usually radios stay on)
        // For simple UI, just switch
        return { ...prev, [optionId]: [choiceName] };
      } else {
        // Toggle checkbox
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

    // Prepare selection data for CartItem
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
    }, 600);
  };

  const totalPrice = calculateTotal();

  return (
    <div id={id} className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow dark:bg-stone-900 dark:border-stone-800">
      {/* Product Image */}
      <div 
        className="h-40 w-full bg-stone-100 relative overflow-hidden group cursor-pointer dark:bg-stone-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {product.image && !imageError ? (
          <img 
            src={product.image} 
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-100 dark:bg-stone-800 dark:text-stone-600">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
        
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-stone-200 dark:bg-stone-900/90 dark:border-stone-700">
          <span className="font-bold text-italian-green text-sm">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2 leading-tight dark:text-white">
            {product.code && <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-mono h-fit dark:bg-stone-700 dark:text-stone-300">{product.code}</span>}
            {product.name}
          </h3>
        </div>
        <p className="text-stone-500 text-xs md:text-sm leading-relaxed mb-4 line-clamp-3 dark:text-stone-400">
          {product.description}
        </p>

        {/* Badge for configurable items */}
        {hasOptions && !isExpanded && (
           <div className="mt-auto mb-3">
             <span className="text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 rounded border border-yellow-100 font-semibold dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-900">
               Personalizável
             </span>
           </div>
        )}
      </div>

      <div className="p-4 pt-0 mt-auto">
        {!isExpanded ? (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full py-2.5 bg-white border border-italian-red text-italian-red rounded-lg font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2 dark:bg-transparent dark:hover:bg-red-900/20"
          >
            <Plus className="w-4 h-4" /> 
            {hasOptions ? 'Configurar' : 'Adicionar'}
          </button>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* OPTIONS RENDERING */}
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
                               <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  option.type === 'single' ? 'rounded-full' : 'rounded'
                               } ${isSelected ? 'bg-italian-green border-italian-green' : 'bg-white border-stone-300 group-hover:border-italian-green dark:bg-stone-900 dark:border-stone-600'}`}>
                                  {isSelected && <div className={`bg-white ${option.type === 'single' ? 'w-2 h-2 rounded-full' : 'w-3 h-3 icon-check'}`} />}
                               </div>
                               <input 
                                 type={option.type === 'single' ? 'radio' : 'checkbox'}
                                 name={`opt-${product.id}-${option.id}`}
                                 className="hidden"
                                 onChange={() => handleOptionChange(option.id, choice.name, option.type)}
                                 checked={isSelected}
                               />
                               <span className="text-sm text-stone-700 dark:text-stone-300">{choice.name}</span>
                             </div>
                             {choice.price > 0 && (
                               <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">+ R$ {choice.price.toFixed(2).replace('.',',')}</span>
                             )}
                           </label>
                         );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div>
              <input 
                type="text" 
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Obs: Sem cebola..."
                className="w-full text-sm p-2 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:border-italian-green focus:ring-1 focus:ring-italian-green dark:bg-stone-800 dark:border-stone-700 dark:text-white"
              />
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-stone-300 rounded-lg bg-white shadow-sm h-10 dark:bg-stone-800 dark:border-stone-700">
                <button onClick={handleDecrement} className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-italian-red active:bg-stone-100 rounded-l-lg dark:text-stone-400 dark:active:bg-stone-700">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-stone-800 text-sm dark:text-white">{quantity}</span>
                <button onClick={handleIncrement} className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-italian-green active:bg-stone-100 rounded-r-lg dark:text-stone-400 dark:active:bg-stone-700">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <button 
                onClick={handleAdd}
                disabled={isAdded}
                className={`flex-1 h-10 rounded-lg font-medium text-xs md:text-sm transition-all shadow-sm flex items-center justify-center gap-1 ${
                  isAdded 
                    ? 'bg-green-600 text-white scale-105' 
                    : 'bg-italian-green text-white hover:bg-green-800'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Add!
                  </>
                ) : (
                  `Add R$ ${totalPrice.toFixed(2).replace('.',',')}`
                )}
              </button>
            </div>
            
            <button 
               onClick={() => setIsExpanded(false)}
               className="w-full text-center text-xs text-stone-400 hover:text-stone-600 pb-1 dark:text-stone-500 dark:hover:text-stone-300"
            >
               <ChevronUp className="w-4 h-4 mx-auto" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};