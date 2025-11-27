
import React, { useMemo, useState, useEffect } from 'react';
import { CartItem, DeliveryRegion, Coupon, Category, Product } from '../types';
import { X, Trash2, ShoppingBag, Plus, Minus, Edit2, MapPin, CreditCard, User, Search, Loader2, Ticket, CheckCircle, MessageCircle, Sparkles, Utensils, Info } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onRemoveItem: (index: number) => void;
  onClearCart?: () => void;
  onUpdateQuantity?: (index: number, newQuantity: number) => void;
  onUpdateObservation?: (index: number, newObservation: string) => void;
  onAddToCart: (product: Product, quantity: number, observation: string, selectedOptions?: CartItem['selectedOptions']) => void;
  whatsappNumber: string;
  storeName: string;
  deliveryRegions?: DeliveryRegion[];
  paymentMethods?: string[];
  freeShipping?: boolean; 
  menuData?: Category[];
  currencySymbol?: string;
  tableNumber?: string | null;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  onRemoveItem, 
  onClearCart,
  onUpdateQuantity,
  onUpdateObservation,
  onAddToCart,
  whatsappNumber,
  storeName,
  deliveryRegions = [],
  paymentMethods = [],
  freeShipping = false,
  menuData = [],
  currencySymbol = 'R$',
  tableNumber = null
}) => {
  // Checkout State
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | 'table'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  const [needChange, setNeedChange] = useState(false);
  const [changeFor, setChangeFor] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
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
  
  // State for "Don't know CEP" mode
  const [unknownCepMode, setUnknownCepMode] = useState(false);
  const [manualNeighborhood, setManualNeighborhood] = useState('');

  const availablePaymentMethods = paymentMethods.length > 0 
    ? paymentMethods 
    : ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito', 'PIX'];

  useEffect(() => {
    if (tableNumber) {
      setDeliveryType('table');
    } else {
      setDeliveryType('delivery');
    }
  }, [tableNumber]);

  useEffect(() => {
    if (isOpen) {
       const savedName = localStorage.getItem('spagnolli_user_name');
       const savedStreet = localStorage.getItem('spagnolli_user_street');
       const savedNumber = localStorage.getItem('spagnolli_user_number');
       const savedDistrict = localStorage.getItem('spagnolli_user_district');
       const savedCep = localStorage.getItem('spagnolli_user_cep');
       const savedCity = localStorage.getItem('spagnolli_user_city');
       const savedComplement = localStorage.getItem('spagnolli_user_complement');

       if(savedName) setCustomerName(savedName);
       if(savedStreet) setAddressStreet(savedStreet);
       if(savedNumber) setAddressNumber(savedNumber);
       if(savedDistrict) setAddressDistrict(savedDistrict);
       if(savedCep) setCep(savedCep);
       if(savedCity) setAddressCity(savedCity);
       if(savedComplement) setAddressComplement(savedComplement);
    }
  }, [isOpen]);

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
    
    if (appliedCoupon.min_order_value && subtotal < appliedCoupon.min_order_value) {
       return 0; 
    }

    if (appliedCoupon.type === 'fixed') {
       return appliedCoupon.discount_value;
    } else if (appliedCoupon.type === 'percent') {
       return subtotal * (appliedCoupon.discount_value / 100);
    } else if (appliedCoupon.type === 'free_shipping') {
       return 0; 
    }
    
    return subtotal * (appliedCoupon.discount_value / 100);
  }, [subtotal, appliedCoupon]);

  const deliveryFee = useMemo(() => {
    if (deliveryType === 'pickup' || deliveryType === 'table') return 0;
    if (appliedCoupon && appliedCoupon.type === 'free_shipping') return 0;
    if (calculatedFee !== null && freeShipping) return 0;
    return calculatedFee !== null ? calculatedFee : 0;
  }, [deliveryType, calculatedFee, freeShipping, appliedCoupon]);

  const total = Math.max(0, (subtotal + deliveryFee) - discountAmount);

  const upsellItems = useMemo(() => {
     if (!menuData || menuData.length === 0) return [];
     if (items.length === 0) return [];

     const hasDrinks = items.some(item => {
        return (item.category && item.category.toLowerCase().includes('bebida')) || 
               (item.name && (item.name.toLowerCase().includes('coca') || item.name.toLowerCase().includes('guaran') || item.name.toLowerCase().includes('suco') || item.name.toLowerCase().includes('agua')));
     });

     if (!hasDrinks) {
        const drinkCat = menuData.find(c => c.id.includes('bebida') || c.name.toLowerCase().includes('bebida'));
        if (drinkCat && drinkCat.items.length > 0) {
           return drinkCat.items.slice(0, 2);
        }
     }

     const hasDessert = items.some(item => {
        return (item.category && item.category.toLowerCase().includes('doce')) ||
               (item.name && (item.name.toLowerCase().includes('chocolate') || item.name.toLowerCase().includes('doce')));
     });

     if (!hasDessert) {
        const dessertCat = menuData.find(c => c.id.includes('doce') || c.name.toLowerCase().includes('sobremesa'));
        if (dessertCat && dessertCat.items.length > 0) {
           return dessertCat.items.slice(0, 2);
        }
     }

     return [];
  }, [items, menuData]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setIsValidatingCoupon(true);

    if (!supabase) {
      if (couponCode.toUpperCase() === 'TESTE10') {
        setAppliedCoupon({ 
            id: 999, 
            code: 'TESTE10', 
            discount_value: 10, 
            type: 'percent',
            active: true 
        });
      } else {
        setCouponError('Cupom inválido (Backend offline).');
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
        const coupon = data as Coupon;
        const now = new Date();
        if (coupon.start_date && new Date(coupon.start_date) > now) {
            setCouponError('Este cupom ainda não está válido.');
            setAppliedCoupon(null);
            return;
        }
        if (coupon.end_date && new Date(coupon.end_date) < now) {
            setCouponError('Este cupom expirou.');
            setAppliedCoupon(null);
            return;
        }
        if (coupon.min_order_value && subtotal < coupon.min_order_value) {
            setCouponError(`Valor mínimo do pedido: ${currencySymbol} ${coupon.min_order_value.toFixed(2)}`);
            setAppliedCoupon(null);
            return;
        }

        setAppliedCoupon(coupon);
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

  const checkRegion = (cepInput: string, neighborhoodInput: string) => {
    const cleanCep = cepInput.replace(/\D/g, '');
    const cleanNeighborhood = neighborhoodInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    if (cleanCep.length === 8) {
        const foundByCep = deliveryRegions.find(region => {
            if (region.zipExclusions && region.zipExclusions.some(ex => cleanCep.startsWith(ex.replace(/\D/g, '')))) return false;
            
            if (!region.zipRules || region.zipRules.length === 0) return false;
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

        if (foundByCep) {
            setCalculatedFee(foundByCep.price);
            setMatchedRegionName(foundByCep.name);
            setCepError('');
            return true;
        }
    }

    if (cleanNeighborhood.length > 2) {
        const foundByName = deliveryRegions.find(region => {
            const hasListMatch = region.neighborhoods?.some(n => {
                const normN = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return normN === cleanNeighborhood || cleanNeighborhood.includes(normN) || normN.includes(cleanNeighborhood);
            });
            
            const normRegionName = region.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            const nameMatch = normRegionName === cleanNeighborhood || cleanNeighborhood.includes(normRegionName) || normRegionName.includes(cleanNeighborhood);

            return hasListMatch || nameMatch;
        });

        if (foundByName) {
             setCalculatedFee(foundByName.price);
             setMatchedRegionName(foundByName.name);
             setCepError('');
             return true;
        }
    }

    setCalculatedFee(null);
    setMatchedRegionName('');
    return false;
  };

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

      const found = checkRegion(cleanCep, data.bairro || '');
      if (!found) {
          setCepError('Não realizamos entregas para esta região/CEP no momento.');
      }
    } catch (error) {
      setCepError('Erro ao buscar CEP. Verifique sua conexão.');
    } finally {
      setIsFetchingCep(false);
    }
  };

  useEffect(() => {
     if (unknownCepMode && manualNeighborhood.length > 2) {
         const found = checkRegion('', manualNeighborhood);
     }
  }, [manualNeighborhood, unknownCepMode]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    if (isSubmitting) return;

    if (!customerName.trim()) { alert('Por favor, informe seu nome.'); return; }
    if (!paymentMethod) { alert('Por favor, selecione a forma de pagamento.'); return; }
    
    if (deliveryType === 'delivery') {
      if (unknownCepMode) {
          if (!addressStreet.trim() || !addressNumber.trim() || !manualNeighborhood.trim()) {
            alert('Por favor, preencha o endereço completo com o Bairro.');
            return;
          }
      } else {
        if (calculatedFee === null && !unknownCepMode) { 
           if (!window.confirm("A taxa de entrega não foi calculada automaticamente. Deseja consultar o valor com o atendente?")) return;
        }
        if (!addressStreet.trim() || !addressNumber.trim() || !addressDistrict.trim()) {
          alert('Por favor, preencha o endereço completo.');
          return;
        }
      }
    }

    localStorage.setItem('spagnolli_user_name', customerName);
    if(deliveryType === 'delivery') {
        localStorage.setItem('spagnolli_user_street', addressStreet);
        localStorage.setItem('spagnolli_user_number', addressNumber);
        if(unknownCepMode) localStorage.setItem('spagnolli_user_district', manualNeighborhood);
        else localStorage.setItem('spagnolli_user_district', addressDistrict);
        localStorage.setItem('spagnolli_user_cep', cep);
        localStorage.setItem('spagnolli_user_city', addressCity);
        localStorage.setItem('spagnolli_user_complement', addressComplement);
    }

    setIsSubmitting(true);
    let orderId = null;

    // Sanitize items for DB (ensure pure JSON)
    const cleanItems = items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      selectedOptions: i.selectedOptions || [],
      observation: i.observation || '',
      code: i.code || ''
    }));

    // Construct payload DYNAMICALLY to avoid sending missing columns (like table_number) if they are null
    // This helps prevent "schema cache" errors if the DB is outdated
    const dbPayload: any = {
      customer_name: customerName,
      delivery_type: deliveryType,
      address_street: addressStreet || '',
      address_number: addressNumber || '',
      address_district: unknownCepMode ? manualNeighborhood : addressDistrict,
      address_city: addressCity || '',
      address_complement: addressComplement || '',
      payment_method: paymentMethod,
      total: Number(total.toFixed(2)),
      delivery_fee: Number(deliveryFee.toFixed(2)),
      status: 'pending',
      items: cleanItems
    };

    // Only add these optional fields if they have values
    // This prevents sending 'null' to columns that might not exist yet in old schemas
    if (tableNumber) dbPayload.table_number = tableNumber;
    if (appliedCoupon) dbPayload.coupon_code = appliedCoupon.code;
    if (discountAmount > 0) dbPayload.discount = Number(discountAmount.toFixed(2));

    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').insert([dbPayload]).select();
        
        if (error) {
            console.error("Erro Supabase:", error);
            let errorMsg = `Erro ao salvar pedido: ${error.message}. `;
            if (error.message.includes('column') && error.message.includes('schema cache')) {
               errorMsg += " (Seu banco de dados está desatualizado. Copie o código do schema.sql e rode no Supabase).";
            }
            alert(`ATENÇÃO: ${errorMsg} O pedido será enviado apenas pelo WhatsApp.`);
        } else if (data && data.length > 0) {
            orderId = data[0].id;
            try {
                const savedOrders = JSON.parse(localStorage.getItem('spagnolli_my_orders') || '[]');
                if (!savedOrders.includes(orderId)) {
                    savedOrders.unshift(orderId);
                    localStorage.setItem('spagnolli_my_orders', JSON.stringify(savedOrders.slice(0, 10)));
                }
            } catch (e) { console.error(e); }
        }
      } catch (err: any) {
         console.error("Erro Conexão:", err);
         alert("Erro de conexão com o sistema: " + err.message);
      }
    }

    let message = `*NOVO PEDIDO ${orderId ? `#${orderId} ` : ''}- ${storeName}*\n`;
    message += `------------------------------\n`;
    
    items.forEach((item) => {
      const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0) : 0;
      const unitTotal = item.price + optionsPrice;
      message += `▪️ ${item.quantity}x ${item.name}`;
      if(item.code) message += ` (Cod: ${item.code})`;
      message += `\n   ${currencySymbol} ${(unitTotal * item.quantity).toFixed(2).replace('.', ',')}`;
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach(opt => { message += `\n   + ${opt.choiceName} (${opt.groupName})`; });
      }
      if (item.observation) message += `\n   _Obs: ${item.observation}_`;
      message += `\n`;
    });

    message += `------------------------------\n`;
    message += `*Subtotal:* ${currencySymbol} ${subtotal.toFixed(2).replace('.', ',')}\n`;
    
    if (appliedCoupon) {
       message += `🎟 *Cupom (${appliedCoupon.code}):* - ${currencySymbol} ${discountAmount.toFixed(2).replace('.', ',')}\n`;
    }

    if (deliveryType === 'delivery') {
      const feeText = (appliedCoupon?.type === 'free_shipping' || (freeShipping && calculatedFee !== null)) 
          ? 'GRÁTIS' 
          : (calculatedFee !== null ? `${currencySymbol} ${deliveryFee.toFixed(2).replace('.', ',')}` : 'A Consultar');
          
      const regionName = matchedRegionName || (unknownCepMode ? manualNeighborhood : 'Região');
      message += `*Entrega (${regionName}):* ${feeText}\n`;
    } else if (deliveryType === 'pickup') {
      message += `*Retirada no Balcão*\n`;
    } else if (deliveryType === 'table') {
      message += `*CONSUMO NA MESA ${tableNumber}*\n`;
    }
    
    message += `*TOTAL: ${currencySymbol} ${total.toFixed(2).replace('.', ',')}*\n`;
    message += `------------------------------\n`;
    
    message += `*DADOS DO CLIENTE:*\n`;
    message += `👤 Nome: ${customerName}\n`;
    
    if (deliveryType === 'delivery') {
      message += `📍 Endereço de Entrega:\n`;
      if (!unknownCepMode) message += `   CEP: ${cep}\n`;
      message += `   ${addressStreet}, ${addressNumber}\n`;
      message += `   Bairro: ${unknownCepMode ? manualNeighborhood : addressDistrict}\n`;
      if(!unknownCepMode) message += `   Cidade: ${addressCity}\n`;
      if (addressComplement) message += `   Comp: ${addressComplement}\n`;
    } else if (deliveryType === 'table') {
       message += `📍 *Mesa ${tableNumber}*\n`;
    }
    
    message += `💳 Pagamento: ${paymentMethod}`;
    if (paymentMethod === 'Dinheiro' && needChange) {
        message += ` (Troco para ${currencySymbol} ${changeFor})`;
    }
    message += `\n`;
    message += `\n_Enviado via Cardápio Digital_`;

    const encodedMessage = encodeURIComponent(message);
    let cleanNumber = whatsappNumber.replace(/\D/g, ''); 
    if (cleanNumber.length >= 10 && cleanNumber.length <= 11) cleanNumber = '55' + cleanNumber;
    
    const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

    setLastOrderUrl(url);
    setOrderSuccess(true);
    setIsSubmitting(false);
    if (onClearCart) onClearCart();
    
    // Use window.open to keep app state alive in background
    window.open(url, '_blank');
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={orderSuccess ? handleCloseSuccess : onClose} />

      <div className="relative w-full max-w-md bg-stone-50 dark:bg-stone-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-stone-800 dark:text-stone-100">
        
        {orderSuccess ? (
           <div className="flex flex-col h-full items-center justify-center p-6 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in">
                 <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-stone-900 dark:text-white">Pronto!</h2>
                 <p className="text-stone-500 dark:text-stone-400">
                    Seu pedido foi gerado. Se o WhatsApp não abriu automaticamente, clique abaixo:
                 </p>
              </div>
              <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 w-full">
                 <a href={lastOrderUrl} target="_blank" rel="noreferrer" className="w-full bg-italian-green text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg animate-pulse">
                    <MessageCircle className="w-6 h-6" /> Enviar no WhatsApp
                 </a>
              </div>
              <button onClick={handleCloseSuccess} className="text-stone-500 hover:text-stone-700 font-medium text-sm">Fechar</button>
           </div>
        ) : (
          <>
            <div className="p-4 bg-italian-red text-white flex items-center justify-between shadow-md shrink-0" style={{ backgroundColor: 'var(--color-primary)' }}>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <h2 className="font-bold text-lg">Seu Pedido {tableNumber ? `(Mesa ${tableNumber})` : ''}</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-3">
                <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm uppercase tracking-wider border-b border-stone-300 dark:border-stone-700 pb-2">Itens do Carrinho</h3>
                
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-stone-400 gap-3 py-8">
                      <ShoppingBag className="w-12 h-12 opacity-20" />
                      <p className="text-sm font-medium">Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    items.map((item, index) => {
                      const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0) : 0;
                      const unitPrice = item.price + optionsPrice;
                      return (
                        <div key={`${item.id}-${index}`} className="bg-white dark:bg-stone-800 p-3 rounded-lg shadow-sm border border-stone-300 dark:border-stone-700 flex gap-3">
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <h4 className="font-bold text-stone-900 dark:text-white flex-1 mr-2 leading-tight text-sm">
                                {item.quantity}x {item.name}
                              </h4>
                              <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 whitespace-nowrap">
                                {currencySymbol} {(unitPrice * item.quantity).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {item.selectedOptions.map((opt, i) => (
                                    <p key={i} className="text-[10px] text-stone-600 dark:text-stone-400 flex justify-between">
                                      <span>+ {opt.choiceName}</span>
                                      {opt.price > 0 && <span>(+{currencySymbol} {opt.price.toFixed(2)})</span>}
                                    </p>
                                ))}
                              </div>
                            )}
                            <div className="mt-1 group cursor-pointer" onClick={() => handleEditObservation(index, item.observation || '')}>
                              {item.observation ? (
                                <p className="text-[11px] text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 p-1.5 rounded border border-stone-300 dark:border-stone-600 flex items-center justify-between hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors">
                                  <span><span className="font-semibold">Obs:</span> {item.observation}</span>
                                  <Edit2 className="w-3 h-3 text-stone-500 group-hover:text-stone-700 dark:text-stone-500 dark:group-hover:text-stone-300" />
                                </p>
                              ) : (
                                <p className="text-[11px] text-stone-500 dark:text-stone-500 flex items-center gap-1 hover:text-stone-700 dark:hover:text-stone-300 transition-colors py-1">
                                  <Edit2 className="w-3 h-3" /> Adicionar observação
                                </p>
                              )}
                            </div>
                            <div className="flex items-end justify-between mt-2">
                              <div className="flex items-center border border-stone-300 dark:border-stone-700 rounded bg-stone-50 dark:bg-stone-900 h-7">
                                <button onClick={() => { if (!onUpdateQuantity) return; if (item.quantity <= 1) { if (window.confirm('Remover este item do carrinho?')) { onRemoveItem(index); } } else { onUpdateQuantity(index, item.quantity - 1); } }} className="w-8 h-full flex items-center justify-center text-stone-600 hover:text-red-600 dark:text-stone-400 dark:hover:text-red-400" disabled={!onUpdateQuantity}><Minus className="w-3 h-3" /></button>
                                <div className="w-8 text-center text-xs font-bold text-stone-900 dark:text-white border-x border-stone-300 dark:border-stone-700 h-full flex items-center justify-center bg-white dark:bg-stone-800">{item.quantity}</div>
                                <button onClick={() => onUpdateQuantity ? onUpdateQuantity(index, item.quantity + 1) : null} className="w-8 h-full flex items-center justify-center text-stone-600 hover:text-green-600 dark:text-stone-400 dark:hover:text-green-400" disabled={!onUpdateQuantity}><Plus className="w-3 h-3" /></button>
                              </div>
                            </div>
                          </div>
                          <button onClick={() => onRemoveItem(index)} className="text-stone-400 hover:text-red-600 self-start p-1 transition-colors dark:text-stone-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      );
                    })
                  )}
              </div>
              
              {upsellItems.length > 0 && (
                 <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 rounded-lg p-3 space-y-2 animate-in fade-in slide-in-from-right">
                    <h4 className="font-bold text-sm text-orange-900 dark:text-orange-300 flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Que tal aproveitar?</h4>
                    <div className="grid grid-cols-2 gap-2">
                       {upsellItems.map(prod => (
                          <div key={prod.id} className="bg-white dark:bg-stone-800 p-2 rounded border border-orange-200 dark:border-stone-700 flex flex-col justify-between h-full">
                             <div className="mb-2">
                                <p className="text-xs font-bold text-stone-900 dark:text-white line-clamp-1">{prod.name}</p>
                                <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">{currencySymbol} {prod.price.toFixed(2)}</p>
                             </div>
                             <button className="w-full bg-orange-100 hover:bg-orange-200 text-orange-900 text-xs font-bold py-1.5 rounded transition-colors" onClick={() => onAddToCart(prod, 1, '')}>+ Adicionar</button>
                          </div>
                       ))}
                    </div>
                 </div>
              )}

              {/* Checkout Form */}
              {items.length > 0 && (
                <div className="space-y-6">
                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm uppercase tracking-wider border-b border-stone-300 dark:border-stone-700 pb-2 flex items-center gap-2"><User className="w-4 h-4" /> Seus Dados</h3>
                      <div>
                          <label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">Nome Completo</label>
                          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Digite seu nome" className="w-full p-2.5 bg-white dark:bg-stone-800 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white focus:ring-1 focus:ring-italian-green outline-none placeholder-stone-500" />
                      </div>
                    </div>

                    {!tableNumber && (
                        <div className="space-y-3">
                            <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm uppercase tracking-wider border-b border-stone-300 dark:border-stone-700 pb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Entrega</h3>
                            <div className="flex bg-white dark:bg-stone-800 p-1 rounded-lg border border-stone-300 dark:border-stone-700">
                                <button onClick={() => setDeliveryType('delivery')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${deliveryType === 'delivery' ? 'bg-italian-green text-white shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}`}>Entrega</button>
                                <button onClick={() => setDeliveryType('pickup')} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${deliveryType === 'pickup' ? 'bg-italian-green text-white shadow-sm' : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700'}`}>Retirar</button>
                            </div>

                            {deliveryType === 'delivery' && (
                                <div className="bg-white dark:bg-stone-800 p-3 rounded-lg border border-stone-300 dark:border-stone-700 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {!unknownCepMode ? (
                                        <div>
                                            <label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">CEP</label>
                                            <div className="flex gap-2">
                                                <input type="text" value={cep} onChange={(e) => { const val = e.target.value.replace(/[^0-9-]/g, ''); if (val.length <= 9) setCep(val); }} onBlur={() => { if(cep.length >= 8) handleCepSearch(); }} placeholder="00000-000" className={`flex-1 p-2.5 bg-white dark:bg-stone-900 border rounded-lg text-sm text-stone-900 dark:text-white outline-none focus:border-italian-green placeholder-stone-500 ${cepError ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-800' : 'border-stone-400 dark:border-stone-700'}`} />
                                                <button onClick={handleCepSearch} disabled={isFetchingCep} className="bg-italian-green text-white px-3 rounded-lg flex items-center justify-center hover:bg-green-700 disabled:opacity-50">{isFetchingCep ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}</button>
                                            </div>
                                            {cepError && <p className="text-xs text-red-600 mt-1 font-bold">{cepError}</p>}
                                            <button onClick={() => { setUnknownCepMode(true); setCalculatedFee(null); setMatchedRegionName(''); }} className="text-xs text-blue-700 underline mt-2 hover:text-blue-900 font-medium">Não sei meu CEP</button>
                                            
                                            {calculatedFee !== null && !cepError && (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded text-xs text-green-900 dark:text-green-300 flex items-center gap-1">
                                                    {(appliedCoupon?.type === 'free_shipping' || freeShipping) ? <><span className="font-bold">Região Atendida:</span> {matchedRegionName} (Taxa: GRÁTIS)</> : <><span className="font-bold">Região Atendida:</span> {matchedRegionName} (Taxa: {currencySymbol} {calculatedFee.toFixed(2)})</>}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-bold text-stone-700 dark:text-stone-400">Bairro (Digite para buscar)</label>
                                                <button onClick={() => { setUnknownCepMode(false); setManualNeighborhood(''); setCalculatedFee(null); }} className="text-xs text-blue-700 underline font-medium">Voltar para CEP</button>
                                            </div>
                                            <input type="text" value={manualNeighborhood} onChange={(e) => setManualNeighborhood(e.target.value)} placeholder="Digite o nome do bairro" className="w-full p-2.5 bg-white dark:bg-stone-900 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none focus:border-italian-green placeholder-stone-500" />
                                            {calculatedFee !== null ? (
                                                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded text-xs text-green-900 dark:text-green-300 flex items-center gap-1">
                                                   {(appliedCoupon?.type === 'free_shipping' || freeShipping) ? <><span className="font-bold">Região:</span> {matchedRegionName} (Taxa: GRÁTIS)</> : <><span className="font-bold">Região:</span> {matchedRegionName} (Taxa: {currencySymbol} {calculatedFee.toFixed(2)})</>}
                                                </div>
                                            ) : manualNeighborhood.length > 2 ? (
                                                <div className="mt-2 p-2 bg-orange-50 border border-orange-300 rounded text-xs text-orange-900 flex items-start gap-2">
                                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                                    <span>Não encontramos uma taxa exata. Consulte o valor com o atendente ao finalizar.</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2"><label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">Rua</label><input type="text" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none" /></div>
                                        <div><label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">Número</label><input type="text" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none focus:bg-white dark:focus:bg-stone-800 focus:border-italian-green" placeholder="Nº" /></div>
                                    </div>
                                    {!unknownCepMode && (<div><label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">Bairro</label><input type="text" value={addressDistrict} onChange={(e) => setAddressDistrict(e.target.value)} className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none" /></div>)}
                                    {!unknownCepMode && (<div><label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">Cidade</label><input type="text" value={addressCity} readOnly className="w-full p-2 bg-stone-100 dark:bg-stone-900 border border-stone-300 dark:border-stone-800 rounded-lg text-sm outline-none text-stone-600 dark:text-stone-400 cursor-not-allowed" /></div>)}
                                    <div><label className="block text-xs font-bold text-stone-700 dark:text-stone-400 mb-1">Complemento (Opcional)</label><input type="text" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Ex: Apto 101, Fundos..." className="w-full p-2 bg-white dark:bg-stone-900 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white outline-none" /></div>
                                </div>
                            )}
                            {deliveryType === 'pickup' && (<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-900 rounded-lg text-xs text-yellow-900 dark:text-yellow-200 text-center font-medium">O endereço para retirada será enviado após a confirmação do pedido.</div>)}
                        </div>
                    )}
                    
                    {tableNumber && (
                       <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-lg border border-stone-300 dark:border-stone-700 text-center">
                          <Utensils className="w-6 h-6 mx-auto mb-2 text-italian-green" />
                          <p className="font-bold text-stone-900 dark:text-white">Consumo no Local</p>
                          <p className="text-sm text-stone-700 dark:text-stone-400">Você está pedindo para a <strong>Mesa {tableNumber}</strong>.</p>
                       </div>
                    )}

                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm uppercase tracking-wider border-b border-stone-300 dark:border-stone-700 pb-2 flex items-center gap-2"><Ticket className="w-4 h-4" /> Cupom de Desconto</h3>
                      {!appliedCoupon ? (
                        <div>
                          <div className="flex gap-2">
                            <input type="text" placeholder="Código do Cupom" className="flex-1 p-2 bg-white dark:bg-stone-800 border border-stone-400 dark:border-stone-700 rounded-lg text-sm text-stone-900 dark:text-white uppercase placeholder-stone-500" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                            <button onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode} className="bg-stone-800 text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-stone-700 disabled:opacity-50">{isValidatingCoupon ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Aplicar'}</button>
                          </div>
                          {couponError && <p className="text-xs text-red-600 mt-1 font-bold">{couponError}</p>}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-800 p-2 rounded-lg">
                          <div>
                            <span className="block font-bold text-green-900 dark:text-green-300 text-sm">{appliedCoupon.code}</span>
                            <span className="text-xs text-green-700 dark:text-green-400">
                               {appliedCoupon.type === 'free_shipping' ? 'Frete Grátis' : 
                                appliedCoupon.type === 'fixed' ? `Desconto de ${currencySymbol} ${appliedCoupon.discount_value}` : 
                                `${appliedCoupon.discount_value}% de desconto`}
                            </span>
                          </div>
                          <button onClick={removeCoupon} className="text-stone-500 hover:text-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-bold text-stone-800 dark:text-stone-200 text-sm uppercase tracking-wider border-b border-stone-300 dark:border-stone-700 pb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Pagamento</h3>
                      <div className="grid grid-cols-1 gap-2">
                          {availablePaymentMethods.map(method => (
                            <label key={method} className={`flex flex-col p-2.5 rounded-lg border cursor-pointer transition-colors ${paymentMethod === method ? 'bg-green-50 dark:bg-green-900/30 border-italian-green' : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'}`}>
                                <div className="flex items-center gap-3">
                                   <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={() => { setPaymentMethod(method); if (method !== 'Dinheiro') setNeedChange(false); }} className="text-italian-green focus:ring-italian-green" />
                                   <span className="text-sm font-bold text-stone-800 dark:text-stone-300">{method}</span>
                                </div>
                                {paymentMethod === 'Dinheiro' && method === 'Dinheiro' && (
                                   <div className="mt-2 pl-7 animate-in fade-in slide-in-from-top-1">
                                      <label className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-400 cursor-pointer mb-2 font-medium">
                                         <input type="checkbox" checked={needChange} onChange={(e) => setNeedChange(e.target.checked)} />
                                         Precisa de troco?
                                      </label>
                                      {needChange && (
                                         <input type="text" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="Troco para quanto? (Ex: 50,00)" className="w-full p-2 text-xs border border-stone-400 rounded dark:bg-stone-900 dark:border-stone-600 dark:text-white" />
                                      )}
                                   </div>
                                )}
                            </label>
                          ))}
                      </div>
                    </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white dark:bg-stone-800 border-t border-stone-300 dark:border-stone-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              {items.length > 0 && onClearCart && (
                <div className="flex justify-end mb-4">
                  <button onClick={onClearCart} className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"><Trash2 className="w-3 h-3" /> Limpar carrinho</button>
                </div>
              )}
              
              <div className="space-y-1 mb-4">
                <div className="flex justify-between items-center text-sm text-stone-600 dark:text-stone-400 font-medium">
                  <span>Subtotal</span>
                  <span>{currencySymbol} {subtotal.toFixed(2).replace('.', ',')}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between items-center text-sm text-green-700 font-bold">
                      <span>Desconto ({appliedCoupon.code})</span>
                      <span>- {currencySymbol} {discountAmount.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {deliveryType === 'delivery' && (
                  <div className="flex justify-between items-center text-sm text-stone-600 dark:text-stone-400 font-medium">
                      <span>Taxa de Entrega</span>
                      <span>
                        {(appliedCoupon?.type === 'free_shipping' || (freeShipping && calculatedFee !== null))
                             ? <span className="text-green-700 font-bold">GRÁTIS</span> 
                             : (calculatedFee !== null ? `${currencySymbol} ${calculatedFee.toFixed(2).replace('.', ',')}` : <span className="text-orange-600 font-bold">A Consultar</span>)
                        }
                      </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t border-stone-300 dark:border-stone-700">
                  <span className="text-stone-900 dark:text-white font-extrabold text-lg">Total</span>
                  <span className="text-xl font-extrabold text-italian-green">
                    {currencySymbol} {total.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={items.length === 0 || isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform active:scale-95 ${
                  items.length === 0 || isSubmitting
                    ? 'bg-stone-300 text-stone-500 cursor-not-allowed dark:bg-stone-700 dark:text-stone-400'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/30'
                }`}
              >
                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><MessageCircle className="w-6 h-6" /> Finalizar no WhatsApp</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
