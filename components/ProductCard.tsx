import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Minus, ImageOff, Check } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number, observation: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [observation, setObservation] = useState('');
  const [imageError, setImageError] = useState(false);
  const [isAdded, setIsAdded] = useState(false);

  const handleIncrement = () => setQuantity(q => q + 1);
  const handleDecrement = () => setQuantity(q => Math.max(1, q - 1));

  const handleAdd = () => {
    onAddToCart(product, quantity, observation);
    setIsAdded(true);
    
    // Show success state briefly before resetting
    setTimeout(() => {
      setIsAdded(false);
      setQuantity(1);
      setObservation('');
      setIsExpanded(false);
    }, 600);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden flex flex-col h-full hover:shadow-md transition-shadow">
      {/* Product Image */}
      <div className="h-40 w-full bg-stone-100 relative overflow-hidden group">
        {product.image && !imageError ? (
          <img 
            src={product.image} 
            alt={product.name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-100">
            <ImageOff className="w-8 h-8" />
          </div>
        )}
        
        {/* Price Tag Overlay */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm border border-stone-200">
          <span className="font-bold text-italian-green text-sm">
            R$ {product.price.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="mb-2">
          <h3 className="font-bold text-stone-800 text-lg flex items-center gap-2 leading-tight">
            {product.code && <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded font-mono h-fit">{product.code}</span>}
            {product.name}
          </h3>
        </div>
        <p className="text-stone-500 text-xs md:text-sm leading-relaxed mb-4 line-clamp-3">
          {product.description}
        </p>
      </div>

      <div className="p-4 pt-0 mt-auto">
        {!isExpanded ? (
          <button 
            onClick={() => setIsExpanded(true)}
            className="w-full py-2.5 bg-white border border-italian-red text-italian-red rounded-lg font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        ) : (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div>
              <input 
                type="text" 
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Obs: Sem cebola..."
                className="w-full text-sm p-2 bg-stone-50 border border-stone-200 rounded-md focus:outline-none focus:border-italian-green focus:ring-1 focus:ring-italian-green"
              />
            </div>
            
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center border border-stone-300 rounded-lg bg-white shadow-sm h-10">
                <button onClick={handleDecrement} className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-italian-red active:bg-stone-100 rounded-l-lg">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-6 text-center font-bold text-stone-800 text-sm">{quantity}</span>
                <button onClick={handleIncrement} className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-italian-green active:bg-stone-100 rounded-r-lg">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <button 
                onClick={handleAdd}
                disabled={isAdded}
                className={`flex-1 h-10 rounded-lg font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2 ${
                  isAdded 
                    ? 'bg-green-600 text-white scale-105' 
                    : 'bg-italian-green text-white hover:bg-green-800'
                }`}
              >
                {isAdded ? (
                  <>
                    <Check className="w-4 h-4" /> Adicionado!
                  </>
                ) : (
                  `Add R$ ${(product.price * quantity).toFixed(2).replace('.',',')}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};