import React, { useState, useMemo, useEffect } from 'react';
import { Product, CartItem } from '../types';
import { X, Check, Search } from 'lucide-react';

interface PizzaBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePizzas: Product[];
  onAddToCart: (product: Product, quantity: number, observation: string, selectedOptions?: CartItem['selectedOptions']) => void;
  initialFirstHalf?: Product | null;
}

export const PizzaBuilderModal: React.FC<PizzaBuilderModalProps> = ({
  isOpen,
  onClose,
  availablePizzas,
  onAddToCart,
  initialFirstHalf
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstHalf, setFirstHalf] = useState<Product | null>(null);
  const [secondHalf, setSecondHalf] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<CartItem['selectedOptions']>([]);
  const [observation, setObservation] = useState('');

  // Reset state when opening or when initialFirstHalf changes
  useEffect(() => {
    if (isOpen) {
      if (initialFirstHalf) {
        setFirstHalf(initialFirstHalf);
        setStep(2); // Skip to second half selection immediately
      } else {
        setFirstHalf(null);
        setStep(1);
      }
      setSecondHalf(null);
      setSearchTerm('');
      setSelectedOptions([]);
      setObservation('');
    }
  }, [isOpen, initialFirstHalf]);

  const filteredPizzas = useMemo(() => {
    if (!searchTerm) return availablePizzas;
    const lowerTerm = searchTerm.toLowerCase();
    return availablePizzas.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) || 
      (p.description && p.description.toLowerCase().includes(lowerTerm))
    );
  }, [availablePizzas, searchTerm]);

  const handleSelectPizza = (pizza: Product) => {
    if (step === 1) {
      setFirstHalf(pizza);
      setStep(2);
      setSearchTerm('');
    } else if (step === 2) {
      setSecondHalf(pizza);
      setStep(3);
    }
  };

  const handleOptionToggle = (groupName: string, choiceName: string, price: number, type: 'single' | 'multiple') => {
    setSelectedOptions(prev => {
      const current = prev || [];
      if (type === 'single') {
        // Remove existing selection for this group and add new one
        const filtered = current.filter(o => o.groupName !== groupName);
        return [...filtered, { groupName, choiceName, price }];
      } else {
        // Toggle logic for multiple
        const exists = current.find(o => o.groupName === groupName && o.choiceName === choiceName);
        if (exists) {
          return current.filter(o => !(o.groupName === groupName && o.choiceName === choiceName));
        } else {
          return [...current, { groupName, choiceName, price }];
        }
      }
    });
  };

  const handleFinish = () => {
    if (!firstHalf || !secondHalf) return;

    // Logic: Price is usually based on the higher value pizza
    const basePrice = Math.max(firstHalf.price, secondHalf.price);
    
    // Construct a composite product with unique synthetic ID (Timestamp to ensure uniqueness)
    const mixedPizza: Product = {
      id: Date.now(), 
      name: `Meia ${firstHalf.name} / Meia ${secondHalf.name}`,
      description: `1/2 ${firstHalf.name}\n1/2 ${secondHalf.name}`,
      price: basePrice,
      category: firstHalf.category,
      image: firstHalf.image, // Use image from first selection
      code: 'MM',
      options: firstHalf.options // Inherit options structure from first pizza
    };

    onAddToCart(mixedPizza, 1, observation, selectedOptions);
    onClose();
  };

  // Calculate total current price
  const currentTotal = useMemo(() => {
    let total = 0;
    if (firstHalf && !secondHalf) total = firstHalf.price;
    if (firstHalf && secondHalf) total = Math.max(firstHalf.price, secondHalf.price);
    
    if (selectedOptions) {
      total += selectedOptions.reduce((acc, opt) => acc + opt.price, 0);
    }
    return total;
  }, [firstHalf, secondHalf, selectedOptions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-700 flex justify-between items-center bg-italian-red text-white md:rounded-t-2xl">
          <div>
            <h2 className="font-display text-xl">Montar Pizza Meia a Meia</h2>
            <p className="text-xs opacity-90">
              {step === 1 && 'Passo 1: Escolha a 1ª Metade'}
              {step === 2 && 'Passo 2: Escolha a 2ª Metade'}
              {step === 3 && 'Passo 3: Finalizar'}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X className="w-6 h-6" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          
          {/* Selection Summary Bar */}
          <div className="flex gap-2 mb-4">
            <div className={`flex-1 p-3 rounded-lg border text-sm transition-colors ${firstHalf ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800'}`}>
              <span className="block text-xs font-bold uppercase mb-1">1ª Metade</span>
              {firstHalf ? firstHalf.name : 'Selecionando...'}
            </div>
            <div className={`flex-1 p-3 rounded-lg border text-sm transition-colors ${secondHalf ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:text-green-300' : 'bg-stone-100 border-stone-200 text-stone-400 dark:bg-stone-800'} ${step === 2 ? 'ring-2 ring-italian-red' : ''}`}>
              <span className="block text-xs font-bold uppercase mb-1">2ª Metade</span>
              {secondHalf ? secondHalf.name : (step === 1 ? 'Aguardando...' : 'Selecionando...')}
            </div>
          </div>

          {(step === 1 || step === 2) && (
            <>
              <div className="relative mb-4">
                <input 
                  type="text" 
                  placeholder="Buscar sabor..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 pl-10 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-italian-green dark:bg-stone-800 dark:border-stone-700 dark:text-white"
                  autoFocus
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredPizzas.map(pizza => (
                  <button 
                    key={pizza.id} 
                    onClick={() => handleSelectPizza(pizza)}
                    className="text-left p-3 border border-stone-200 rounded-xl hover:border-italian-green hover:bg-green-50 dark:border-stone-700 dark:hover:bg-stone-800 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-stone-800 dark:text-white group-hover:text-italian-green">{pizza.name}</h4>
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400">R$ {pizza.price.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2 mt-1 dark:text-stone-400">{pizza.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && firstHalf && secondHalf && (
            <div className="space-y-6 animate-in fade-in">
              
              <div className="bg-stone-50 dark:bg-stone-800 p-4 rounded-xl border border-stone-200 dark:border-stone-700 text-center">
                <h3 className="text-lg font-display text-italian-red mb-1">Sua Pizza Meia a Meia</h3>
                <p className="text-stone-600 dark:text-stone-300 text-sm">
                  1/2 {firstHalf.name} + 1/2 {secondHalf.name}
                </p>
                <div className="mt-2 inline-block bg-white dark:bg-stone-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm border border-stone-200 dark:border-stone-700 text-stone-500">
                  Preço base: R$ {Math.max(firstHalf.price, secondHalf.price).toFixed(2)}
                </div>
              </div>

              {/* Show options from the first half pizza (usually borders are standard across the pizza or associated with base) */}
              {firstHalf.options && firstHalf.options.length > 0 && (
                <div className="space-y-4">
                  {firstHalf.options.map(option => (
                    <div key={option.id} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-4 rounded-xl">
                      <h4 className="font-bold text-sm text-stone-800 dark:text-white mb-3">{option.name}</h4>
                      <div className="space-y-2">
                        {option.choices.map((choice, idx) => {
                          const isSelected = (selectedOptions || []).some(o => o.groupName === option.name && o.choiceName === choice.name);
                          return (
                            <label key={idx} className="flex items-center justify-between cursor-pointer p-2 hover:bg-stone-50 dark:hover:bg-stone-700/50 rounded-lg transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-italian-green bg-italian-green text-white' : 'border-stone-300 dark:border-stone-600'}`}>
                                  {isSelected && <Check className="w-3 h-3" />}
                                </div>
                                <input 
                                  type={option.type === 'single' ? 'radio' : 'checkbox'} 
                                  name={option.id}
                                  className="hidden"
                                  checked={isSelected}
                                  onChange={() => handleOptionToggle(option.name, choice.name, choice.price, option.type)}
                                />
                                <span className="text-sm text-stone-700 dark:text-stone-300">{choice.name}</span>
                              </div>
                              {choice.price > 0 && <span className="text-xs font-bold text-stone-500">+ R$ {choice.price.toFixed(2)}</span>}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Observações</label>
                <textarea 
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  placeholder="Ex: Sem cebola na parte de calabresa..."
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-italian-green outline-none dark:bg-stone-800 dark:border-stone-700 dark:text-white"
                  rows={2}
                />
              </div>

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 md:rounded-b-2xl">
          {step < 3 ? (
            <div className="text-center text-xs text-stone-400">
              Selecione um sabor para continuar
            </div>
          ) : (
            <button 
              onClick={handleFinish}
              className="w-full bg-italian-green text-white py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-green-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              Adicionar ao Pedido <span className="bg-white/20 px-2 py-0.5 rounded text-sm">R$ {currentTotal.toFixed(2).replace('.', ',')}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};