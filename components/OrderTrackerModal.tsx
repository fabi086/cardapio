
import React, { useEffect, useState } from 'react';
import { X, Clock, CheckCircle, Package, Truck, ChefHat, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Order } from '../types';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({ isOpen, onClose }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const savedOrders = JSON.parse(localStorage.getItem('spagnolli_my_orders') || '[]');
      
      if (savedOrders.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .in('id', savedOrders)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error('Erro ao buscar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchMyOrders();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyOrders();
      const interval = setInterval(fetchMyOrders, 15000); // Poll every 15s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusStep = (status: string) => {
    switch(status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'delivery': return 3;
      case 'completed': return 4;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const getStatusInfo = (status: string) => {
    switch(status) {
      case 'pending': return { label: 'Aguardando Confirmação', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', bar: 'bg-yellow-400' };
      case 'preparing': return { label: 'Em Preparo', icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-100', bar: 'bg-blue-500' };
      case 'delivery': return { label: 'Saiu para Entrega', icon: Truck, color: 'text-orange-600', bg: 'bg-orange-100', bar: 'bg-orange-500' };
      case 'completed': return { label: 'Pedido Entregue', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', bar: 'bg-green-500' };
      case 'cancelled': return { label: 'Cancelado', icon: X, color: 'text-red-600', bg: 'bg-red-100', bar: 'bg-red-500' };
      default: return { label: 'Desconhecido', icon: AlertCircle, color: 'text-stone-600', bg: 'bg-stone-100', bar: 'bg-stone-300' };
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        <div className="p-4 bg-italian-red text-white flex justify-between items-center">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Package className="w-5 h-5" /> Meus Pedidos
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleManualRefresh} 
              className={`p-1.5 hover:bg-white/20 rounded-full transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
              title="Atualizar"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && orders.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
               <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
               <p className="text-sm">Buscando seus pedidos...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-stone-500 dark:text-stone-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum pedido recente encontrado.</p>
            </div>
          ) : (
            orders.map(order => {
              const info = getStatusInfo(order.status);
              const step = getStatusStep(order.status);
              const isDelivery = order.delivery_type === 'delivery';

              return (
                <div key={order.id} className="bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                       <span className="font-bold text-stone-800 dark:text-white">Pedido #{order.id}</span>
                       <p className="text-xs text-stone-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${info.bg} ${info.color} flex items-center gap-1`}>
                       <info.icon className="w-3 h-3" /> {info.label}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  {step > 0 && (
                    <div className="relative h-2 bg-stone-200 dark:bg-stone-700 rounded-full mb-4 overflow-hidden">
                       <div 
                         className={`absolute top-0 left-0 h-full transition-all duration-500 ${info.bar}`} 
                         style={{ width: `${(step / 4) * 100}%` }} 
                       />
                    </div>
                  )}

                  <div className="text-sm text-stone-600 dark:text-stone-300 border-t border-stone-200 dark:border-stone-700 pt-3">
                     <div className="flex justify-between mb-1">
                        <span>Total:</span>
                        <span className="font-bold text-italian-green">R$ {order.total.toFixed(2)}</span>
                     </div>
                     <div className="flex justify-between text-xs text-stone-500">
                        <span>Itens:</span>
                        <span>{order.items.length} itens</span>
                     </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-3 bg-stone-100 dark:bg-stone-800 text-center text-xs text-stone-500">
           Atualizado automaticamente a cada 15s
        </div>
      </div>
    </div>
  );
};
