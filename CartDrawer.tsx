
import React, { useMemo, useState } from 'react';
import { CartItem, DeliveryRegion, Coupon, Category, Product } from '../types';
import { X, Trash2, ShoppingBag, Plus, Minus, Edit2, MapPin, CreditCard, User, Search, Loader2, Ticket, CheckCircle, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../supabaseClient';

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
  deliveryRegions?: DeliveryRegion[];
  paymentMethods?: string[];
  freeShipping?: boolean; // Prop for free shipping check
  menuData?: Category[]; // To enable suggestions/upsell
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
  storeName,
  deliveryRegions = [],
  paymentMethods = [],
  freeShipping = false,
  menuData = []
}) => {
  // Checkout State
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Success State (To prevent duplicates and handle iOS redirection)
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastOrderUrl, setLastOrderUrl] = useState('');
  
  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  
  // Address State
  const [cep, setCep] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressDistrict, setAddressDistrict] = useState(''); // Bairro
  const [addressCity, setAddressCity] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  
  // Fee Calculation State
  const [calculatedFee, setCalculatedFee] = useState<number | null>(null);
  const [matchedRegionName, setMatchedRegionName] = useState('');
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [cepError, setCepError] = useState('');

  // Fallback payment methods if none provided
  const availablePaymentMethods = paymentMethods.length > 0 
    ? paymentMethods 
    : ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX'];

  // Calculate Subtotal including options
  const subtotal = useMemo(() => {
    return items.reduce((acc, item) => {
       const optionsPrice = item.selectedOptions 
          ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0)
          : 0;
       return acc + ((item.price + optionsPrice) * item.quantity);
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return subtotal * (appliedCoupon.discount_percent / 100);
  }, [subtotal, appliedCoupon]);

  const deliveryFee = useMemo(() => {
    if (deliveryType === 'pickup') return 0;
    // Even if freeShipping is true, we need to know if the region is valid (calculatedFee !== null)
    // But the cost will be 0
    if (calculatedFee !== null && freeShipping) return 0;
    return calculatedFee !== null ? calculatedFee : 0;
  }, [deliveryType, calculatedFee, freeShipping]);

  const total = (subtotal + deliveryFee) - discountAmount;

  // --- UPSELL LOGIC ---
  const upsellItems = useMemo(() => {
     if (!menuData || menuData.length === 0) return [];
     if (items.length === 0) return []; // Don't suggest if cart empty (focus on menu)

     // 1. Check for Drinks
     const hasDrinks = items.some(item => {
        // Try to guess by category ID or name
        return (item.category && item.category.toLowerCase().includes('bebida')) || 
               (item.name && (item.name.toLowerCase().includes('coca') || item.name.toLowerCase().includes('guaran') || item.name.toLowerCase().includes('suco') || item.name.toLowerCase().includes('agua')));
     });

     if (!hasDrinks) {
        // Suggest Drinks
        const drinkCat = menuData.find(c => c.id.includes('bebida') || c.name.toLowerCase().includes('bebida'));
        if (drinkCat && drinkCat.items.length > 0) {
           return drinkCat.items.slice(0, 2); // Return top 2 drinks
        }
     }

     // 2. Check for Desserts (if they have drinks but no dessert)
     const hasDessert = items.some(item => {
        return (item.category && item.category.toLowerCase().includes('doce')) ||
               (item.name && (item.name.toLowerCase().includes('chocolate') || item.name.toLowerCase().includes('doce')));
     });

     if (!hasDessert) {
        // Suggest Desserts
        const dessertCat = menuData.find(c => c.id.includes('doce') || c.name.toLowerCase().includes('sobremesa'));
        if (dessertCat && dessertCat.items.length > 0) {
           return dessertCat.items.slice(0, 2); // Return top 2 desserts
        }
     }

     return [];
  }, [items, menuData]);

  const handleQuickAdd = (product: Product) => {
     if (onUpdateQuantity) { 
        // Placeholder for quick add
     }
  };
  
  // --- COUPON LOGIC ---
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setIsValidatingCoupon(true);

    if (!supabase) {
      // Fallback for demo without backend
      if (couponCode.toUpperCase() === 'TESTE10') {
        setAppliedCoupon({ id: 999, code: 'TESTE10', discount_percent: 10, active: true });
      } else {
        setCouponError('Cupom inválido (Backend offline). Tente TESTE10');
      }
      setIsValidatingCoupon(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('active', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setAppliedCoupon(data as Coupon);
        setCouponCode('');
      } else {
        setCouponError('Cupom inválido ou expirado.');
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error(err);
      setCouponError('Erro ao validar cupom.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  // --- CEP LOGIC ---
  const handleCepSearch = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setCepError('CEP deve ter 8 dígitos');
      return;
    }

    setIsFetchingCep(true);
    setCepError('');
    setCalculatedFee(null);
    setMatchedRegionName('');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado.');
        setAddressStreet('');
        setAddressDistrict('');
        setAddressCity('');
        return;
      }

      setAddressStreet(data.logradouro || '');
      setAddressDistrict(data.bairro || '');
      setAddressCity(data.localidade || '');

      let foundRegion: DeliveryRegion | undefined;

      foundRegion = deliveryRegions.find(region => {
         if (!region.zipPrefixes || region.zipPrefixes.length === 0) return false;
         return region.zipPrefixes.some(prefix => {
            const cleanPrefix = prefix.replace(/\D/g, '');
            return cleanCep.startsWith(cleanPrefix);
         });
      });
      
      if (foundRegion) {
         setCalculatedFee(foundRegion.price);
         setMatchedRegionName(foundRegion.name);
      } else {
         setCepError('Não realizamos entregas para esta região/CEP no momento.');
         setCalculatedFee(null);
      }

    } catch (error) {
      setCepError('Erro ao buscar CEP. Verifique sua conexão.');
      console.error(error);
    } finally {
      setIsFetchingCep(false);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (isSubmitting) return; // Prevent double clicks

    if (!customerName.trim()) {
      alert('Por favor, informe seu nome.');
      return;
    }
    if (!paymentMethod) {
      alert('Por favor, selecione a forma de pagamento.');
      return;
    }
    if (deliveryType === 'delivery') {
      if (calculatedFee === null) {
        alert('Por favor, informe um CEP válido para calcular a entrega.');
        return;
      }
      if (!addressStreet.trim() || !addressNumber.trim() || !addressDistrict.trim()) {
        alert('Por favor, preencha o endereço completo (Rua, Número e Bairro).');
        return;
      }
    }

    setIsSubmitting(true);
    let orderId = null;

    // --- 1. SAVE TO SUPABASE (KDS Integration) ---
    if (supabase) {
      try {
        const payload = {
          customer_name: customerName,
          delivery_type: deliveryType,
          address_street: addressStreet,
          address_number: addressNumber,
          address_district: addressDistrict,
          address_city: addressCity,
          address_complement: addressComplement,
          payment_method: paymentMethod,
          total: total,
          delivery_fee: deliveryFee,
          status: 'pending',
          items: items, // Saving items as JSONB
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          discount: discountAmount
        };
        
        const { data, error } = await supabase.from('orders').insert([payload]).select();
        
        if (error) {
           console.error("Erro ao salvar pedido no DB:", error);
        } else if (data && data.length > 0) {
           orderId = data[0].id;
           // Save to local storage for tracking
           try {
             const savedOrders = JSON.parse(localStorage.getItem('spagnolli_my_orders') || '[]');
             if (!savedOrders.includes(orderId)) {
               savedOrders.unshift(orderId);
               localStorage.setItem('spagnolli_my_orders', JSON.stringify(savedOrders.slice(0, 10))); // keep last 10
             }
           } catch (e) {
             console.error("Failed to save order ID to local storage", e);
           }
        }
      } catch (err) {
        console.error("Erro inesperado ao salvar pedido:", err);
      }
    }

    // --- 2. GENERATE WHATSAPP MESSAGE ---
    let message = `*NOVO PEDIDO ${orderId ? `#${orderId} ` : ''}- ${storeName}*\n`;
    message += `------------------------------\n`;
    
    // Items
    items.forEach((item) => {
      const optionsPrice = item.selectedOptions 
          ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0)
          : 0;
      const unitTotal = item.price + optionsPrice;

      message += `▪️ ${item.quantity}x ${item.name}`;
      if(item.code) message += ` (Cod: ${item.code})`;
      message += `\n   R$ ${(unitTotal * item.quantity).toFixed(2).replace('.', ',')}`;
      
      // Add Options to message
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach(opt => {
           message += `\n   + ${opt.choiceName} (${opt.groupName})`;
        });
      }

      if (item.observation) {
        message += `\n   _Obs: ${item.observation}_`;
      }
      message += `\n`;
    });

    message += `------------------------------\n`;
    message += `*Subtotal:* R$ ${subtotal.toFixed(2).replace('.', ',')}\n`;
    
    if (appliedCoupon) {
       message += `🎟 *Cupom (${appliedCoupon.code}):* - R$ ${discountAmount.toFixed(2).replace('.', ',')}\n`;
    }

    if (deliveryType === 'delivery') {
      const feeText = freeShipping ? 'GRÁTIS' : `R$ ${deliveryFee.toFixed(2).replace('.', ',')}`;
      message += `*Entrega (${matchedRegionName}):* ${feeText}\n`;
    } else {
      message += `*Retirada no Balcão*\n`;
    }
    
    message += `*TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n`;
    message += `------------------------------\n`;
    
    // Customer Info
    message += `*DADOS DO CLIENTE:*\n`;
    message += `👤 Nome: ${customerName}\n`;
    
    if (deliveryType === 'delivery') {
      message += `📍 Endereço de Entrega:\n`;
      message += `   CEP: ${cep}\n`;
      message += `   ${addressStreet}, ${addressNumber}\n`;
      message += `   Bairro: ${addressDistrict}\n`;
      message += `   Cidade: ${addressCity}\n`;
      if (addressComplement) message += `   Comp: ${addressComplement}\n`;
    } else {
      message += `📍 *Vou retirar no local*\n`;
    }
    
    message += `💳 Pagamento: ${paymentMethod}\n`;
    
    message += `\n_Enviado via Cardápio Digital_`;

    const encodedMessage = encodeURIComponent(message);
    
    let cleanNumber = whatsappNumber.replace(/\D/g, ''); 
    if (cleanNumber.length >= 10 && cleanNumber.length <= 11) {
      cleanNumber = '55' + cleanNumber;
    }

    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
    
    // Set success state to prevent duplicates and handle manual redirect if needed
    setLastOrderUrl(url);
    setOrderSuccess(true);
    setIsSubmitting(false);

    // Clear the cart content to prevent resubmission
    if (onClearCart) onClearCart();

    // Attempt automatic redirect (using location.href is better for iOS than window.open in async)
    window.location.href = url;
  };

  const handleEditObservation = (index: number, currentObs: string) => {
    if (!onUpdateObservation) return;
    const newObs = window.prompt("Editar observação:", currentObs);
    if (newObs !== null) {
      onUpdateObservation(index, newObs);
    }
  };

  const handleCloseSuccess = () => {
     setOrderSuccess(false);
     setLastOrderUrl('');
     onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={orderSuccess ? handleCloseSuccess : onClose}
      />

      <div className="relative w-full max-w-md bg-stone-50 dark:bg-stone-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-stone-800 dark:text-stone-100">
        
        {/* SUCCESS SCREEN */}
        {orderSuccess ? (
           <div className="flex flex-col h-full items-center justify-center p-6 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in">
                 <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-stone-800 dark:text-white">Pedido Realizado!</h2>
                 <p className="text-stone-500 dark:text-stone-400">Seu pedido foi registrado em nosso sistema.</p>
              </div>
              
              <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 w-full">
                 <p className="text-sm font-medium mb-3">Caso o WhatsApp não tenha aberto automaticamente, clique no botão abaixo:</p>
                 <a 
                   href={lastOrderUrl}
                   target="_blank"
                   rel="noreferrer"
                   className="w-full bg-italian-green text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg"
                 >
                    <MessageCircle className="w-6 h-6" /> Enviar no WhatsApp
                 </a>
              </div>

              <button 
                onClick={handleCloseSuccess}
                className="text-stone-400 hover:text-stone-600 dark:text-stone-500 dark:hover:text-stone-300 font-medium text-sm"
              >
                 Fechar e Voltar ao Cardápio
              </button>
           </div>
        ) : (
          <>
            <div className="p-4 bg-italian-red text-white flex items-center justify-between shadow-md shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="font-bold text-lg">Seu Pedido</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* ... Items ... */}
              <div className="space-y-3">
                <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider border-b border-stone-200 dark:border-stone-700 pb-2">Itens do Carrinho</h3>
                
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-stone-400 gap-3 py-8">
                      <ShoppingBag className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-medium">Seu carrinho está vazio</p>
                      <button onClick={onClose} className="text-italian-red font-semibold hover:underline text-sm">
                        Voltar ao cardápio
                      </button>
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const optionsPrice = item.selectedOptions 
                          ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0)
                          : 0;
                      const unitPrice = item.price + optionsPrice;

                      return (
                        <div key={`${item.id}-${index}`} className="bg-white dark:bg-stone-800 p-3 rounded-lg shadow-sm border border-stone-200 dark:border-stone-700 flex gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-stone-800 dark:text-white flex-1 mr-2 leading-tight text-sm">
                                {item.quantity}x {item.name}
                              </h4>
                              <span className="text-sm font-semibold text-stone-600 dark:text-stone-300 whitespace-nowrap">
                                R$ {(unitPrice * item.quantity).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.selectedOptions.map((opt, i) => (
                                    <p key={i} className="text-[10px] text-stone-500 dark:text-stone-400 flex justify-between">
                                      <span>+ {opt.choiceName}</span>
                                      {opt.price > 0 && <span>(+R$ {opt.price.toFixed(2)})</span>}
                                    </p>
                                ))}
                              </div>
                            )}

                            <div 
                              className="mt-1 group cursor-pointer"
                              onClick={() => handleEditObservation(index, item.observation || '')}
                            >
                              {item.observation ? (
                                <p className="text-[11px] text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 p-1.5 rounded border border-stone-200 dark:border-stone-600 flex items-center justify-between hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">
                                  <span><span className="font-semibold">Obs:</span> {item.observation}</span>
                                  <Edit2 className="w-3 h-3 text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300" />
                                </p>
                              ) : (
                                <p className="text-[11px] text-stone-400 dark:text-stone-500 flex items-center gap-1 hover:text-stone-600 dark:hover:text-stone-300 transition-colors py-1">
                                  <Edit2 className="w-3 h-3" /> Adicionar observação
                                </p>
                              )}
                            </div>

                            <div className="flex items-end justify-between mt-2">
                              <div className="flex items-center border border-stone-200 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-900 h-7">
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
                                  className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400"
                                  disabled={!onUpdateQuantity}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <div className="w-8 text-center text-xs font-bold text-stone-800 dark:text-white border-x border-stone-200 dark:border-stone-700 h-full flex items-center justify-center bg-white dark:bg-stone-800">
                                  {item.quantity}
                                </div>
                                <button 
                                  onClick={() => onUpdateQuantity ? onUpdateQuantity(index, item.quantity + 1) : null}
                                  className="w-8 h-full flex items-center justify-center text-stone-500 hover:text-green-600 dark:text-stone-400 dark:hover:text-green-400"
                                  disabled={!onUpdateQuantity}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <button 
                            onClick={() => onRemoveItem(index)}
                            className="text-stone-300 hover:text-red-500 self-start p-1 transition-colors dark:text-stone-600 dark:hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
              </div>
              
              {/* UPSELL SECTION */}
              {upsellItems.length > 0 && (
                 <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-right">
                    <h4 className="font-bold text-sm text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                       <Sparkles className="w-4 h-4" /> Que tal aproveitar?
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                       {upsellItems.map(prod => (
                          <div key={prod.id} className="bg-white dark:bg-stone-800 p-2 rounded border border-orange-100 dark:border-stone-700 flex flex-col justify-between h-full">
                             <div className="mb-2">
                                <p className="text-xs font-bold text-stone-800 dark:text-white line-clamp-1">{prod.name}</p>
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">R$ {prod.price.toFixed(2)}</p>
                             </div>
                             <button 
                               className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold py-1.5 rounded transition-colors"
                               onClick={() => {
                                  alert("Por favor, feche o carrinho e adicione o item através do menu principal.");
                               }}
                             >
                               + Adicionar
                             </button>
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              {/* Checkout Form */}
              {items.length > 0 && (
                <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider border-b border-stone-200 dark:border-stone-700 pb-2 flex items-center gap-2">
                          <User className="w-4 h-4" /> Seus Dados
                      </h3>
                      <div>
                          <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">Nome Completo</label>
                          <input 
                            type="text" 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Digite seu nome"
                            className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white focus:ring-1 focus:ring-italian-green outline-none"
                          />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider border-b border-stone-200 dark:border-stone-700 pb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" /> Entrega
                      </h3>
                      
                      <div className="flex bg-white dark:bg-stone-800 p-1 rounded-lg border border-stone-200 dark:border-stone-700">
                          <button 
                            onClick={() => setDeliveryType('delivery')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${deliveryType === 'delivery' ? 'bg-italian-green text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
                          >
                            Entrega
                          </button>
                          <button 
                            onClick={() => setDeliveryType('pickup')}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${deliveryType === 'pickup' ? 'bg-italian-green text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-700'}`}
                          >
                            Retirar no Balcão
                          </button>
                      </div>

                      {deliveryType === 'delivery' && (
                          <div className="bg-white dark:bg-stone-800 p-3 rounded-lg border border-stone-200 dark:border-stone-700 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">CEP</label>
                                <div className="flex gap-2">
                                  <input 
                                      type="text" 
                                      value={cep}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9-]/g, '');
                                        if (val.length <= 9) setCep(val);
                                      }}
                                      onBlur={() => {
                                        if(cep.length >= 8) handleCepSearch();
                                      }}
                                      placeholder="00000-000"
                                      className={`flex-1 p-2.5 bg-stone-50 dark:bg-stone-900 border rounded-lg text-sm text-stone-900 dark:text-white outline-none focus:border-italian-green ${cepError ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : 'border-stone-300 dark:border-stone-700'}`}
                                  />
                                  <button 
                                      onClick={handleCepSearch}
                                      disabled={isFetchingCep}
                                      className="bg-italian-green text-white px-3 rounded-lg flex items-center justify-center hover:bg-green-700 disabled:opacity-50"
                                  >
                                      {isFetchingCep ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                  </button>
                                </div>
                                {cepError && (
                                  <p className="text-xs text-red-500 mt-1 font-medium">{cepError}</p>
                                )}
                                {calculatedFee !== null && !cepError && (
                                  <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded text-xs text-green-800 dark:text-green-300 flex items-center gap-1">
                                      {freeShipping ? (
                                        <>
                                          <span className="font-bold">Região Atendida:</span> {matchedRegionName} (Taxa: <span className="line-through opacity-70">R$ {calculatedFee.toFixed(2)}</span> <span className="font-bold">GRÁTIS</span>)
                                        </>
                                      ) : (
                                        <>
                                          <span className="font-bold">Região Atendida:</span> {matchedRegionName} (Taxa: R$ {calculatedFee.toFixed(2)})
                                        </>
                                      )}
                                  </div>
                                )}
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-2">
                                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">Rua</label>
                                  <input 
                                    type="text" 
                                    value={addressStreet}
                                    onChange={(e) => setAddressStreet(e.target.value)}
                                    className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none" 
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">Número</label>
                                  <input 
                                    type="text" 
                                    value={addressNumber}
                                    onChange={(e) => setAddressNumber(e.target.value)}
                                    className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-italian-green" 
                                    placeholder="Nº"
                                  />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">Bairro</label>
                                <input 
                                  type="text" 
                                  value={addressDistrict}
                                  onChange={(e) => setAddressDistrict(e.target.value)}
                                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">Cidade</label>
                                <input 
                                  type="text" 
                                  value={addressCity}
                                  readOnly
                                  className="w-full p-2 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg text-sm outline-none text-stone-500 dark:text-stone-400 cursor-not-allowed" 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-600 dark:text-stone-400 mb-1">Complemento (Opcional)</label>
                                <input 
                                  type="text" 
                                  value={addressComplement}
                                  onChange={(e) => setAddressComplement(e.target.value)}
                                  placeholder="Ex: Apto 101, Fundos..."
                                  className="w-full p-2 bg-stone-50 dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none" 
                                />
                            </div>
                          </div>
                      )}
                      {deliveryType === 'pickup' && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900 rounded-lg text-xs text-yellow-800 dark:text-yellow-200 text-center">
                            O endereço para retirada será enviado após a confirmação do pedido.
                          </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider border-b border-stone-200 dark:border-stone-700 pb-2 flex items-center gap-2">
                          <Ticket className="w-4 h-4" /> Cupom de Desconto
                      </h3>
                      {!appliedCoupon ? (
                        <div>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Código do Cupom" 
                              className="flex-1 p-2 bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white uppercase"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value)}
                            />
                            <button 
                              onClick={handleApplyCoupon}
                              disabled={isValidatingCoupon || !couponCode}
                              className="bg-stone-800 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-stone-700 disabled:opacity-50"
                            >
                              {isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Aplicar'}
                            </button>
                          </div>
                          {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-2 rounded-lg">
                          <div>
                            <span className="block font-bold text-green-800 dark:text-green-300 text-sm">{appliedCoupon.code}</span>
                            <span className="text-xs text-green-600 dark:text-green-400">{appliedCoupon.discount_percent}% de desconto aplicado</span>
                          </div>
                          <button onClick={removeCoupon} className="text-stone-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-700 dark:text-stone-300 text-sm uppercase tracking-wider border-b border-stone-200 dark:border-stone-700 pb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" /> Pagamento
                      </h3>
                      <div className="grid grid-cols-1 gap-2">
                          {availablePaymentMethods.map(method => (
                            <label key={method} className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${paymentMethod === method ? 'bg-green-50 dark:bg-green-900/30 border-italian-green' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-700'}`}>
                                <input 
                                  type="radio" 
                                  name="payment" 
                                  value={method} 
                                  checked={paymentMethod === method}
                                  onChange={() => setPaymentMethod(method)}
                                  className="text-italian-green focus:ring-italian-green"
                                />
                                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{method}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              {items.length > 0 && onClearCart && (
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={onClearCart}
                    className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Limpar carrinho
                  </button>
                </div>
              )}
              
              <div className="space-y-1 mb-4">
                <div className="flex justify-between items-center text-sm text-stone-500 dark:text-stone-400">
                  <span>Subtotal</span>
                  <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>- R$ {discountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between items-center text-sm text-stone-500 dark:text-stone-400">
                      <span>Taxa de Entrega</span>
                      <span>
                        {calculatedFee !== null 
                            ? (freeShipping ? <span className="text-green-600 font-bold">GRÁTIS</span> : `R$ ${calculatedFee.toFixed(2).replace('.', ',')}`)
                            : 'Calcule pelo CEP'}
                      </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-stone-100 dark:border-stone-700">
                  <span className="text-stone-800 dark:text-white font-bold text-lg">Total</span>
                  <span className="text-xl font-bold text-italian-green">
                    R$ {total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={items.length === 0 || (deliveryType === 'delivery' && calculatedFee === null) || isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                  items.length === 0 || (deliveryType === 'delivery' && calculatedFee === null) || isSubmitting
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed dark:bg-stone-700 dark:text-stone-400'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Finalizar no WhatsApp
                  </>
                )}
              </button>
              <p className="text-center text-[10px] text-stone-400 mt-2">
                Ao clicar, você enviará o pedido para {whatsappNumber}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
