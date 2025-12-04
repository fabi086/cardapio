
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
  enableTableOrder?: boolean;
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
  tableNumber = null,
  enableTableOrder = false
}) => {
  // Checkout State
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup' | 'table'>('delivery');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [manualTableNumber, setManualTableNumber] = useState('');
  
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
    if (tableNumber && enableTableOrder) {
      setDeliveryType('table');
    } else if (deliveryType === 'table' && !enableTableOrder) {
      setDeliveryType('delivery');
    }
  }, [tableNumber, enableTableOrder, isOpen]);

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

      setAddressStreet(data.logouro || '');
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
    
    // Validate Mesa
    if (deliveryType === 'table' && !tableNumber && !manualTableNumber) {
        alert("Por favor, informe o número da mesa.");
        return;
    }

    // Validate Delivery
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
    const finalTableNumber = tableNumber || manualTableNumber;

    const cleanItems = items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      selectedOptions: i.selectedOptions || [],
      observation: i.observation || '',
      code: i.code || ''
    }));

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

    if (finalTableNumber && deliveryType === 'table') dbPayload.table_number = finalTableNumber;
    if (appliedCoupon) dbPayload.coupon_code = appliedCoupon.code;
    if (discountAmount > 0) dbPayload.discount = Number(discountAmount.toFixed(2));

    let saveSuccess = false;

    if (supabase) {
      try {
        const { data, error } = await supabase.from('orders').insert([dbPayload]).select();
        
        if (error) {
            console.error("Erro Supabase:", error);
            if(deliveryType === 'table') alert("Houve um problema ao enviar para a cozinha. Por favor chame o garçom.");
        } else if (data && data.length > 0) {
            orderId = data[0].id;
            saveSuccess = true;
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
         if(deliveryType === 'table') alert("Erro de conexão ao enviar para cozinha. Por favor, chame o garçom.");
      }
    }

    // Se for mesa, finaliza o fluxo aqui (com sucesso ou erro)
    if (deliveryType === 'table') {
        if (saveSuccess) {
            setOrderSuccess(true);
            if (onClearCart) onClearCart();
        }
        setIsSubmitting(false);
        return;
    }

    // Continua para o WhatsApp se for Delivery/Retirada
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
    <div className="fixed inset-0 z-50 flex justify-end font-sans">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={orderSuccess ? handleCloseSuccess : onClose} />

      <div className="relative w-full max-w-md bg-stone-50 dark:bg-stone-900 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 text-stone-800 dark:text-stone-100">
        
        {orderSuccess ? (
           <div className="flex flex-col h-full items-center justify-center p-6 text-center space-y-6">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center animate-in zoom-in">
                 <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <div className="space-y-2">
                 <h2 className="text-2xl font-bold text-stone-800 dark:text-white">{deliveryType === 'table' ? 'Pedido Enviado!' : 'Pedido Gerado!'}</h2>
                 <p className="text-stone-500 dark:text-stone-400">
                    {deliveryType === 'table' ? 'A cozinha já recebeu seu pedido.' : 'Seu pedido foi montado. Se o WhatsApp não abriu, clique abaixo:'}
                 </p>
              </div>
              
              {deliveryType !== 'table' && (
                  <div className="bg-white dark:bg-stone-800 p-4 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 w-full">
                     <a href={lastOrderUrl} target="_blank" rel="noreferrer" className="w-full bg-italian-green text-white py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors shadow-lg animate-pulse">
                        <MessageCircle className="w-6 h-6" /> Enviar no WhatsApp
                     </a>
                  </div>
              )}
              
              <button onClick={handleCloseSuccess} className="text-stone-400 hover:text-stone-600 font-medium text-sm">Fechar</button>
           </div>
        ) : (
          <>
            {/* Header Fixo */}
            <div className="h-16 px-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="bg-stone-100 dark:bg-stone-800 p-2 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-stone-700 dark:text-stone-300" />
                </div>
                <h2 className="font-bold text-lg">Seu Carrinho</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Conteúdo Rolável */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-stone-400 gap-3 py-10">
                      <ShoppingBag className="w-16 h-16 opacity-10" />
                      <p className="text-sm font-medium">Seu carrinho está vazio</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {items.map((item, index) => {
                            const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((sum, opt) => sum + opt.price, 0) : 0;
                            const unitPrice = item.price + optionsPrice;
                            return (
                                <div key={`${item.id}-${index}`} className="bg-white dark:bg-stone-800 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm">
                                    <div className="flex gap-4">
                                        {/* Qtd Control */}
                                        <div className="flex flex-col items-center justify-center border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-900 h-20 w-8 shrink-0">
                                            <button onClick={() => onUpdateQuantity && onUpdateQuantity(index, item.quantity + 1)} className="flex-1 w-full flex items-center justify-center text-stone-500 hover:text-green-600"><Plus className="w-3 h-3" /></button>
                                            <span className="font-bold text-sm">{item.quantity}</span>
                                            <button onClick={() => { if (!onUpdateQuantity) return; if (item.quantity <= 1) { if(confirm('Remover?')) onRemoveItem(index); } else { onUpdateQuantity(index, item.quantity - 1); } }} className="flex-1 w-full flex items-center justify-center text-stone-500 hover:text-red-600"><Minus className="w-3 h-3" /></button>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-sm text-stone-800 dark:text-white leading-tight truncate pr-2">{item.name}</h4>
                                                <span className="font-bold text-sm text-stone-800 dark:text-white">{currencySymbol} {(unitPrice * item.quantity).toFixed(2)}</span>
                                            </div>
                                            
                                            {item.selectedOptions && item.selectedOptions.length > 0 && (
                                                <div className="mb-2 space-y-0.5">
                                                    {item.selectedOptions.map((opt, i) => (
                                                        <p key={i} className="text-[10px] text-stone-500 dark:text-stone-400 flex justify-between">
                                                            <span>• {opt.choiceName}</span>
                                                        </p>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center mt-2">
                                                <button 
                                                    onClick={() => handleEditObservation(index, item.observation || '')}
                                                    className={`text-[10px] px-2 py-1 rounded border flex items-center gap-1 transition-colors ${item.observation ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' : 'bg-stone-50 border-stone-200 text-stone-400 hover:bg-stone-100 dark:bg-stone-800 dark:border-stone-700'}`}
                                                >
                                                    <Edit2 className="w-3 h-3" /> {item.observation ? 'Obs: ' + item.observation : 'Observação'}
                                                </button>
                                                <button onClick={() => onRemoveItem(index)} className="text-stone-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {items.length > 0 && (
                    <div className="bg-stone-100 dark:bg-stone-800/50 p-3 rounded-xl border border-dashed border-stone-300 dark:border-stone-700">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-stone-500 uppercase">Deseja adicionar?</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
                           {menuData?.find(c => c.id.includes('bebida'))?.items.slice(0, 3).map(prod => (
                               <button key={prod.id} onClick={() => onAddToCart(prod, 1, '')} className="flex-shrink-0 bg-white dark:bg-stone-800 p-2 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm w-28 text-left">
                                   <p className="text-xs font-bold truncate">{prod.name}</p>
                                   <p className="text-[10px] text-stone-500">{currencySymbol} {prod.price.toFixed(2)}</p>
                                   <div className="mt-1 text-[10px] text-center bg-green-50 text-green-700 rounded py-0.5 font-bold">Adicionar</div>
                               </button>
                           ))}
                        </div>
                    </div>
                )}

                {/* Form area */}
                {items.length > 0 && (
                    <div className="space-y-6 pb-2">
                         {/* Delivery Type Toggle */}
                         {!tableNumber && (
                             <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-lg flex text-sm font-bold">
                                 <button onClick={() => setDeliveryType('delivery')} className={`flex-1 py-2 rounded-md transition-all shadow-sm ${deliveryType === 'delivery' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white' : 'text-stone-500'}`}>Entrega</button>
                                 <button onClick={() => setDeliveryType('pickup')} className={`flex-1 py-2 rounded-md transition-all shadow-sm ${deliveryType === 'pickup' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white' : 'text-stone-500'}`}>Retirada</button>
                                 {enableTableOrder && <button onClick={() => setDeliveryType('table')} className={`flex-1 py-2 rounded-md transition-all shadow-sm ${deliveryType === 'table' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white' : 'text-stone-500'}`}>Mesa</button>}
                             </div>
                         )}

                         {/* Personal Info */}
                         <div className="space-y-3">
                             <h3 className="font-bold text-sm text-stone-800 dark:text-white flex items-center gap-2 border-b pb-1 dark:border-stone-700"><User className="w-4 h-4" /> Seus Dados</h3>
                             <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Seu Nome Completo" className="w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:border-stone-400" />
                             
                             {deliveryType === 'table' && !tableNumber && (
                                 <input type="text" value={manualTableNumber} onChange={(e) => setManualTableNumber(e.target.value)} placeholder="Número da Mesa" className="w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none focus:border-stone-400" />
                             )}
                         </div>

                         {/* Address Info */}
                         {deliveryType === 'delivery' && (
                             <div className="space-y-3">
                                 <h3 className="font-bold text-sm text-stone-800 dark:text-white flex items-center gap-2 border-b pb-1 dark:border-stone-700"><MapPin className="w-4 h-4" /> Endereço</h3>
                                 
                                 {!unknownCepMode ? (
                                    <div className="flex gap-2">
                                        <input type="text" value={cep} onChange={(e) => { const val = e.target.value.replace(/[^0-9-]/g, ''); if (val.length <= 9) setCep(val); }} onBlur={() => { if(cep.length >= 8) handleCepSearch(); }} placeholder="CEP (00000-000)" className={`flex-1 p-3 bg-white dark:bg-stone-800 border rounded-lg text-sm outline-none ${cepError ? 'border-red-300' : 'border-stone-200 dark:border-stone-700'}`} />
                                        <button onClick={handleCepSearch} disabled={isFetchingCep} className="bg-stone-100 dark:bg-stone-800 px-4 rounded-lg border border-stone-200 dark:border-stone-700 text-stone-500 hover:bg-stone-200">{isFetchingCep ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}</button>
                                    </div>
                                 ) : (
                                    <input type="text" value={manualNeighborhood} onChange={(e) => setManualNeighborhood(e.target.value)} placeholder="Bairro" className="w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm" />
                                 )}
                                 
                                 {cepError && <p className="text-xs text-red-500">{cepError}</p>}
                                 
                                 <div onClick={() => { setUnknownCepMode(!unknownCepMode); setCalculatedFee(null); }} className="text-xs text-blue-600 underline cursor-pointer">{unknownCepMode ? 'Tenho CEP' : 'Não sei meu CEP'}</div>

                                 <div className="grid grid-cols-4 gap-2">
                                     <input type="text" value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} placeholder="Rua" className="col-span-3 w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none" />
                                     <input type="text" value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} placeholder="Nº" className="col-span-1 w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none" />
                                 </div>
                                 {!unknownCepMode && <input type="text" value={addressDistrict} onChange={(e) => setAddressDistrict(e.target.value)} placeholder="Bairro" className="w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none" />}
                                 <input type="text" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Complemento (Ex: Apto 10)" className="w-full p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none" />
                             </div>
                         )}

                         {/* Payment */}
                         <div className="space-y-3">
                             <h3 className="font-bold text-sm text-stone-800 dark:text-white flex items-center gap-2 border-b pb-1 dark:border-stone-700"><CreditCard className="w-4 h-4" /> Pagamento</h3>
                             <div className="grid grid-cols-2 gap-2">
                                 {availablePaymentMethods.map(method => (
                                     <button 
                                        key={method} 
                                        onClick={() => { setPaymentMethod(method); if (method !== 'Dinheiro') setNeedChange(false); }}
                                        className={`p-3 rounded-lg border text-sm font-medium transition-colors text-left ${paymentMethod === method ? 'bg-stone-800 text-white border-stone-800' : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'}`}
                                     >
                                         {method}
                                     </button>
                                 ))}
                             </div>
                             {paymentMethod === 'Dinheiro' && (
                                <div className="p-3 bg-stone-100 dark:bg-stone-800 rounded-lg flex items-center gap-2 animate-in fade-in">
                                    <input type="checkbox" checked={needChange} onChange={(e) => setNeedChange(e.target.checked)} className="rounded" />
                                    <span className="text-sm">Precisa de troco?</span>
                                    {needChange && <input type="text" value={changeFor} onChange={(e) => setChangeFor(e.target.value)} placeholder="Para quanto?" className="ml-auto w-24 p-1 text-sm border rounded bg-white dark:bg-stone-900 dark:border-stone-600" />}
                                </div>
                             )}
                         </div>

                         {/* Coupon */}
                         <div className="space-y-2">
                            <div className="flex gap-2">
                                <input type="text" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} placeholder="Código do Cupom" className="flex-1 p-3 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-sm outline-none" />
                                <button onClick={handleApplyCoupon} disabled={isValidatingCoupon || !couponCode} className="bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-4 rounded-lg font-bold text-sm">{isValidatingCoupon ? '...' : 'Aplicar'}</button>
                            </div>
                            {couponError && <p className="text-xs text-red-500">{couponError}</p>}
                            {appliedCoupon && (
                                <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-2 rounded-lg text-sm flex justify-between items-center border border-green-200 dark:border-green-800">
                                    <span>Cupom <b>{appliedCoupon.code}</b> aplicado!</span>
                                    <button onClick={removeCoupon}><X className="w-4 h-4" /></button>
                                </div>
                            )}
                         </div>
                    </div>
                )}
            </div>

            {/* Footer Fixo */}
            {items.length > 0 && (
                <div className="p-4 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-20">
                    <div className="space-y-1 mb-4 text-sm">
                        <div className="flex justify-between text-stone-500 dark:text-stone-400">
                            <span>Subtotal</span>
                            <span>{currencySymbol} {subtotal.toFixed(2)}</span>
                        </div>
                        {appliedCoupon && (
                            <div className="flex justify-between text-green-600">
                                <span>Desconto</span>
                                <span>- {currencySymbol} {discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        {deliveryType === 'delivery' && (
                            <div className="flex justify-between text-stone-500 dark:text-stone-400">
                                <span>Entrega</span>
                                <span>
                                    {(appliedCoupon?.type === 'free_shipping' || (freeShipping && calculatedFee !== null)) ? 'Grátis' : calculatedFee !== null ? `${currencySymbol} ${calculatedFee.toFixed(2)}` : 'A Consultar'}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-lg text-stone-900 dark:text-white pt-2 border-t border-stone-100 dark:border-stone-700 mt-2">
                            <span>Total</span>
                            <span>{currencySymbol} {total.toFixed(2)}</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleCheckout} 
                        disabled={isSubmitting}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{deliveryType === 'table' ? <Utensils className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />} {deliveryType === 'table' ? 'Enviar para Cozinha' : 'Finalizar Pedido'}</>}
                    </button>
                    
                    {onClearCart && (
                        <button onClick={onClearCart} className="w-full text-center text-xs text-red-400 mt-3 hover:text-red-600">Esvaziar carrinho</button>
                    )}
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
