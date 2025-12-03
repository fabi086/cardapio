

import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product, StoreSettings, Order, Coupon, Table, ProductOption, ProductChoice, DeliveryRegion } from '../types';
import { 
  Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, 
  Image as ImageIcon, Grid, MapPin, X, Check, Ticket, QrCode, 
  Clock, CreditCard, LayoutDashboard, ShoppingBag, Zap, LogOut, 
  Menu, ChevronDown, ChevronUp, TrendingUp, Users,
  Utensils, Bike, Store, List, Palette, Globe, Printer, Upload, FileImage
} from 'lucide-react';
import { supabase } from '../supabaseClient';

// --- HELPER COMPONENTS ---

interface CardProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', style, onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden ${className}`} style={style}>
    {children}
  </div>
);

const Button = ({ children, variant = 'primary', onClick, className = '', disabled = false, type = 'button' }: any) => {
  const baseStyle = "px-4 py-2 rounded-lg font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-stone-900 text-white hover:bg-stone-800 shadow-md",
    secondary: "bg-white text-stone-700 border border-stone-300 hover:bg-stone-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-md"
  };
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

const Input = ({ label, type = "text", ...props }: any) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">{label}</label>}
    {type === 'color' ? (
       <div className="flex items-center gap-2 border border-stone-300 p-1 rounded-lg bg-white h-[42px]">
          <input type="color" className="w-8 h-8 rounded cursor-pointer border-none p-0 shrink-0" {...props} />
          <span className="text-sm font-mono text-stone-600 uppercase truncate">{props.value}</span>
       </div>
    ) : (
       <input type={type} className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:ring-2 focus:ring-stone-800 focus:border-stone-800 outline-none transition-all placeholder-stone-400" {...props} />
    )}
  </div>
);

const Select = ({ label, children, ...props }: any) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">{label}</label>}
    <select className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:ring-2 focus:ring-stone-800 outline-none" {...props}>
      {children}
    </select>
  </div>
);

const Badge = ({ children, color = 'gray' }: { children?: React.ReactNode, color?: string }) => {
   const colors: any = {
      gray: 'bg-stone-100 text-stone-600',
      green: 'bg-green-100 text-green-700',
      red: 'bg-red-100 text-red-700',
      blue: 'bg-blue-100 text-blue-700',
      yellow: 'bg-yellow-100 text-yellow-800',
      purple: 'bg-purple-100 text-purple-700'
   };
   return <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${colors[color] || colors.gray}`}>{children}</span>
};

// --- IMAGE UPLOAD HELPER ---
const ImageInput = ({ label, value, onChange, roundPreview = false }: { label: string, value: string, onChange: (val: string) => void, roundPreview?: boolean }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_WIDTH = 400; // Resize to sensible max
                const MAX_HEIGHT = 400;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                
                // Compress to JPEG 70% quality
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                onChange(dataUrl);
                setUploading(false);
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="w-full">
            <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">{label}</label>
            <div className="flex gap-3 items-start">
                <div className={`w-16 h-16 shrink-0 bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center ${roundPreview ? 'rounded-full' : 'rounded-lg'}`}>
                    {value ? (
                        <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                        <ImageIcon className="w-6 h-6 text-stone-300" />
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                        <Input placeholder="Cole o link da imagem..." value={value} onChange={(e: any) => onChange(e.target.value)} />
                        <label className="bg-stone-100 hover:bg-stone-200 text-stone-600 border border-stone-200 px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-center min-w-[50px]">
                            {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                        </label>
                    </div>
                    <p className="text-[10px] text-stone-400">Cole uma URL ou clique no ícone para enviar do dispositivo (será redimensionado automaticamente).</p>
                </div>
            </div>
        </div>
    );
};

// --- TYPES ---

interface AdminPanelProps {
  menuData: Category[];
  settings: StoreSettings;
  onUpdateProduct: (categoryId: string, productId: number, updates: Partial<Product>) => void;
  onAddProduct: (categoryId: string, product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (categoryId: string, productId: number) => void;
  onUpdateSettings: (settings: StoreSettings) => Promise<void>;
  onResetMenu: () => void;
  onBack: () => void;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, updates: { name?: string; image?: string }) => void;
  onDeleteCategory: (id: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  preparing: 'Preparando',
  delivery: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

// --- MAIN COMPONENT ---

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  menuData: initialMenuData, 
  settings, 
  onUpdateProduct, 
  onAddProduct, 
  onDeleteProduct, 
  onUpdateSettings,
  onResetMenu,
  onBack,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'coupons' | 'tables' | 'settings' | 'integrations'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA STATES ---
  const [orders, setOrders] = useState<Order[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<Category[]>(initialMenuData);
  
  // --- UI STATES ---
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // --- FILTER STATES (Dashboard & Orders) ---
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

  // --- FORMS STATES ---
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  
  // --- MODALS ---
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Partial<Product>>({});
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  // Init Data
  useEffect(() => {
    if (isAuthenticated && supabase) {
      fetchOrders();
      fetchCoupons();
      fetchTables();
      const sub = supabase.channel('admin-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchOrders)
          .subscribe();
      return () => { supabase.removeChannel(sub); };
    }
  }, [isAuthenticated]);

  useEffect(() => { setMenu(initialMenuData); }, [initialMenuData]);
  useEffect(() => { if(settings) setSettingsForm(settings); }, [settings]);

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300);
    if (data) setOrders(data as Order[]);
  };

  const fetchCoupons = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('coupons').select('*').order('id', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
  };

  const fetchTables = async () => {
    if (!supabase) return;
    try {
        const { data, error } = await supabase.from('tables').select('*').order('number');
        if (!error && data) {
            setTables(data as Table[]);
        }
    } catch (e) {
        console.error(e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') setIsAuthenticated(true);
    else alert('Senha incorreta');
  };

  // --- DASHBOARD LOGIC ---
  const getFilteredOrders = () => {
     const now = new Date();
     return orders.filter(o => {
        const orderDate = new Date(o.created_at);
        if (dateRange === 'today') return orderDate.toDateString() === now.toDateString();
        if (dateRange === 'week') { const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return orderDate >= weekAgo; }
        if (dateRange === 'month') return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        return true;
     });
  };

  const dashboardStats = useMemo(() => {
     const filtered = getFilteredOrders();
     const validOrders = filtered.filter(o => o.status !== 'cancelled');
     const totalSales = validOrders.reduce((acc, o) => acc + (o.total || 0), 0);
     const count = filtered.length;
     
     const byType = {
        delivery: validOrders.filter(o => o.delivery_type === 'delivery').length,
        pickup: validOrders.filter(o => o.delivery_type === 'pickup').length,
        table: validOrders.filter(o => o.delivery_type === 'table').length
     };
     
     // Top Products
     const productCounts: Record<string, number> = {};
     validOrders.forEach(order => {
         // Protection against null items
         if (Array.isArray(order.items)) {
             order.items.forEach(item => {
                if (item && item.name) {
                    productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
                }
             });
         }
     });
     
     const topProducts = Object.entries(productCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([name, qtd]) => ({ name, qtd }));

     return { totalSales, count, byType, topProducts };
  }, [orders, dateRange]);

  // --- CRUD ACTIONS ---

  const updateOrderStatus = async (id: number, status: string) => {
    if (supabase) await supabase.from('orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
    if (selectedOrder && selectedOrder.id === id) setSelectedOrder(prev => prev ? {...prev, status: status as any} : null);
  };

  const handleSaveProduct = () => {
    if (!productForm.name || !productForm.price) {
        alert("Nome e Preço são obrigatórios");
        return;
    }

    if (editingProduct) {
       onUpdateProduct(editingProduct.category_id || activeCategoryId || '', editingProduct.id, productForm);
    } else if (activeCategoryId) {
       onAddProduct(activeCategoryId, productForm as any);
    }
    setIsProductModalOpen(false);
    setProductForm({});
    setEditingProduct(null);
  };
  
  const openProductModal = (categoryId: string, product?: Product) => {
    setActiveCategoryId(categoryId);
    if (product) {
      setEditingProduct(product);
      setProductForm({ ...product });
    } else {
      setEditingProduct(null);
      setProductForm({
        category_id: categoryId,
        price: 0,
        name: '',
        description: '',
        options: [],
        ingredients: [],
        tags: []
      });
    }
    setIsProductModalOpen(true);
  };

  const openOrderModal = (order: Order) => {
      setSelectedOrder(order);
      setIsOrderModalOpen(true);
  };

  const toggleCategory = (catId: string) => {
      setExpandedCategories(prev => 
          prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
      );
  };

  // Helper function to safely update nested color state
  const updateColorMode = (mode: 'light' | 'dark', key: string, value: string) => {
      const currentColors = settingsForm.colors || { primary: '#C8102E', secondary: '#008C45' };
      const currentModes = currentColors.modes || {
          light: { background: '#f5f5f4', cardBackground: '#ffffff', text: '#292524', cardText: '#1c1917', border: '#e7e5e4' },
          dark: { background: '#0c0a09', cardBackground: '#1c1917', text: '#f5f5f4', cardText: '#ffffff', border: '#292524' }
      };

      setSettingsForm({
          ...settingsForm,
          colors: {
              ...currentColors,
              modes: {
                  ...currentModes,
                  [mode]: {
                      ...currentModes[mode],
                      [key]: value
                  }
              }
          }
      });
  };

  // --- RENDERERS ---

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
         <h2 className="text-2xl font-bold text-stone-800">Dashboard</h2>
         <div className="flex bg-white rounded-lg p-1 border border-stone-200">
            {(['today', 'week', 'month', 'all'] as const).map(range => (
               <button 
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors uppercase ${dateRange === range ? 'bg-stone-900 text-white shadow-sm' : 'text-stone-500 hover:bg-stone-100'}`}
               >
                  {range === 'today' ? 'Hoje' : range === 'week' ? '7 Dias' : range === 'month' ? 'Mês' : 'Total'}
               </button>
            ))}
         </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border-l-4 border-l-green-500">
          <p className="text-stone-500 text-xs font-bold uppercase mb-1">Faturamento ({dateRange === 'today' ? 'Hoje' : dateRange})</p>
          <p className="text-3xl font-bold text-stone-800">R$ {dashboardStats.totalSales.toFixed(2)}</p>
        </Card>
        <Card className="p-6 border-l-4 border-l-blue-500">
          <p className="text-stone-500 text-xs font-bold uppercase mb-1">Pedidos Totais</p>
          <p className="text-3xl font-bold text-stone-800">{dashboardStats.count}</p>
        </Card>
        <Card className="p-6 border-l-4 border-l-orange-500">
          <p className="text-stone-500 text-xs font-bold uppercase mb-1">Canais de Venda</p>
          <div className="flex items-end gap-2 text-sm">
             <div className="flex flex-col"><span className="font-bold text-xl">{dashboardStats.byType.delivery}</span><span className="text-xs text-stone-400">Delivery</span></div>
             <span className="text-stone-300 mb-2">|</span>
             <div className="flex flex-col"><span className="font-bold text-xl">{dashboardStats.byType.pickup}</span><span className="text-xs text-stone-400">Balcão</span></div>
             <span className="text-stone-300 mb-2">|</span>
             <div className="flex flex-col"><span className="font-bold text-xl">{dashboardStats.byType.table}</span><span className="text-xs text-stone-400">Mesa</span></div>
          </div>
        </Card>
        <Card className="p-6 border-l-4 border-l-purple-500">
          <p className="text-stone-500 text-xs font-bold uppercase mb-1">Ticket Médio</p>
          <p className="text-3xl font-bold text-stone-800">
             R$ {(dashboardStats.count > 0 ? dashboardStats.totalSales / dashboardStats.count : 0).toFixed(2)}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Card className="lg:col-span-2 p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Ranking de Mais Vendidos</h3>
            {dashboardStats.topProducts.length === 0 ? (
               <p className="text-stone-400 text-sm text-center py-8">Nenhuma venda no período.</p>
            ) : (
               <div className="space-y-3">
                  {dashboardStats.topProducts.map((prod, i) => (
                     <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100 hover:bg-stone-100 transition-colors">
                        <div className="flex items-center gap-3">
                           <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i===0?'bg-yellow-500':i===1?'bg-stone-400':'bg-orange-700'}`}>
                              {i+1}
                           </div>
                           <span className="font-medium text-stone-700">{prod.name}</span>
                        </div>
                        <span className="font-bold text-sm bg-white px-2 py-1 rounded border border-stone-200">{prod.qtd} vendidos</span>
                     </div>
                  ))}
               </div>
            )}
         </Card>
         <Card className="p-6">
            <h3 className="font-bold text-lg mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-3">
               <Button variant="secondary" onClick={() => setActiveTab('menu')} className="h-20 flex-col gap-2">
                  <Utensils className="w-6 h-6 text-orange-500" /> Cardápio
               </Button>
               <Button variant="secondary" onClick={() => setActiveTab('orders')} className="h-20 flex-col gap-2">
                  <List className="w-6 h-6 text-blue-500" /> Pedidos
               </Button>
               <Button variant="secondary" onClick={() => setActiveTab('coupons')} className="h-20 flex-col gap-2">
                  <Ticket className="w-6 h-6 text-green-500" /> Cupons
               </Button>
               <Button variant="secondary" onClick={() => setActiveTab('settings')} className="h-20 flex-col gap-2">
                  <Settings className="w-6 h-6 text-stone-500" /> Ajustes
               </Button>
            </div>
         </Card>
      </div>
    </div>
  );

  const renderOrders = () => {
     const filteredOrders = orders.filter(o => {
        if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
        return true;
     });

     return (
        <div className="space-y-6 animate-in fade-in h-full flex flex-col">
           <div className="flex flex-col md:flex-row justify-between items-center gap-4">
             <h2 className="text-2xl font-bold text-stone-800">Gerenciamento de Pedidos</h2>
             <div className="flex gap-2">
                <Button variant="secondary" onClick={fetchOrders}><RefreshCw className="w-4 h-4" /> Atualizar</Button>
             </div>
           </div>

           {/* Filters */}
           <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {['all', 'pending', 'preparing', 'delivery', 'completed', 'cancelled'].map(st => (
                 <button 
                    key={st} 
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all border ${
                       orderStatusFilter === st 
                       ? 'bg-stone-900 text-white border-stone-900 shadow-md' 
                       : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                    }`}
                 >
                    {st === 'all' ? 'Todos' : STATUS_LABELS[st]}
                 </button>
              ))}
           </div>

           <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-y-auto pb-20">
              {filteredOrders.length === 0 ? (
                 <div className="col-span-full text-center py-10 text-stone-400">Nenhum pedido encontrado.</div>
              ) : (
                 filteredOrders.map(order => (
                    <Card 
                       key={order.id} 
                       className="cursor-pointer hover:shadow-md transition-all border-l-4 group relative" 
                       style={{ borderLeftColor: order.status === 'pending' ? '#eab308' : order.status === 'cancelled' ? '#ef4444' : order.status === 'completed' ? '#22c55e' : '#3b82f6' }}
                       onClick={() => openOrderModal(order)}
                    >
                       <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                             <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">#{order.id}</span>
                                {order.table_number && <Badge color="purple">Mesa {order.table_number}</Badge>}
                             </div>
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                             }`}>
                                {STATUS_LABELS[order.status]}
                             </span>
                          </div>
                          
                          <div className="flex items-start gap-3 mb-3">
                             <div className="bg-stone-100 p-2 rounded-lg text-stone-500">
                                {order.delivery_type === 'delivery' ? <Bike className="w-5 h-5" /> : order.delivery_type === 'pickup' ? <Store className="w-5 h-5" /> : <Utensils className="w-5 h-5" />}
                             </div>
                             <div>
                                <p className="font-bold text-stone-800 leading-tight">{order.customer_name}</p>
                                <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                                   <Clock className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString().slice(0, 5)} - {new Date(order.created_at).toLocaleDateString()}
                                </p>
                             </div>
                          </div>

                          <div className="border-t border-stone-100 pt-3 mt-2">
                             <div className="flex justify-between items-center">
                                <span className="text-xs text-stone-500">{Array.isArray(order.items) ? order.items.length : 0} itens</span>
                                <span className="font-bold text-stone-800">R$ {(order.total || 0).toFixed(2)}</span>
                             </div>
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none" />
                       </div>
                    </Card>
                 ))
              )}
           </div>
        </div>
     );
  };

  const renderMenu = () => (
     <div className="space-y-6 animate-in fade-in pb-20">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-stone-800">Cardápio Digital</h2>
          <Button onClick={() => {
              const name = prompt("Nome da Nova Categoria:");
              if (name) onAddCategory(name);
          }}><Plus className="w-4 h-4" /> Nova Categoria</Button>
        </div>

        <div className="space-y-4">
           {menu.map(cat => {
              const isExpanded = expandedCategories.includes(cat.id);
              return (
                <div key={cat.id} className="bg-white rounded-xl border border-stone-200 shadow-sm transition-shadow">
                   <div 
                      className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-stone-50' : 'bg-white hover:bg-stone-50'}`}
                      onClick={() => toggleCategory(cat.id)}
                   >
                      <div className="flex items-center gap-3">
                         {cat.image ? <img src={cat.image} className="w-10 h-10 rounded object-cover" /> : <div className="w-10 h-10 bg-stone-100 rounded flex items-center justify-center"><ImageIcon className="w-5 h-5 text-stone-400" /></div>}
                         <h3 className="font-bold text-lg text-stone-800">{cat.name}</h3>
                         <span className="text-xs bg-stone-100 px-2 py-0.5 rounded text-stone-500">{cat.items.length} itens</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="flex gap-1 mr-2" onClick={e => e.stopPropagation()}>
                             <button onClick={() => { const newName = prompt("Novo nome:", cat.name); if(newName) onUpdateCategory(cat.id, {name: newName}); }} className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit3 className="w-4 h-4" /></button>
                             <button onClick={() => { if(confirm("Excluir categoria e todos os produtos?")) onDeleteCategory(cat.id); }} className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          {isExpanded ? <ChevronUp className="w-5 h-5 text-stone-400" /> : <ChevronDown className="w-5 h-5 text-stone-400" />}
                      </div>
                   </div>
                   
                   {isExpanded && (
                       <div className="border-t border-stone-200 bg-white">
                          <div className="p-3 bg-stone-50 border-b border-stone-100 flex justify-end">
                             <button onClick={() => openProductModal(cat.id)} className="bg-stone-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-stone-800 shadow-sm"><Plus className="w-3 h-3" /> Adicionar Produto</button>
                          </div>
                          <div className="divide-y divide-stone-100">
                             {cat.items.map((product, index) => (
                                <div key={`${product.id}-${index}`} className="p-3 flex items-center justify-between hover:bg-stone-50 transition-colors group">
                                   <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 bg-stone-100 rounded-lg overflow-hidden relative shrink-0 border border-stone-200">
                                         {product.image ? <img src={product.image} className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-stone-300" />}
                                      </div>
                                      <div>
                                         <p className="font-bold text-sm text-stone-800">{product.name} {product.code && <span className="text-xs font-mono bg-stone-100 px-1 rounded text-stone-500 border border-stone-200">#{product.code}</span>}</p>
                                         <p className="text-xs text-stone-500">R$ {product.price.toFixed(2)}</p>
                                      </div>
                                   </div>
                                   <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openProductModal(cat.id, product)} className="p-2 bg-white border border-stone-200 rounded text-stone-600 hover:text-blue-600 hover:border-blue-300"><Edit3 className="w-4 h-4" /></button>
                                      <button onClick={() => onDeleteProduct(cat.id, product.id)} className="p-2 bg-white border border-stone-200 rounded text-stone-600 hover:text-red-600 hover:border-red-300"><Trash2 className="w-4 h-4" /></button>
                                   </div>
                                </div>
                             ))}
                             {cat.items.length === 0 && <div className="p-8 text-center text-stone-400 text-sm italic">Nenhum produto nesta categoria.</div>}
                          </div>
                       </div>
                   )}
                </div>
              );
           })}
        </div>
     </div>
  );

  const renderCoupons = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-stone-800">Cupons de Desconto</h2>
          <Button onClick={async () => {
              const code = prompt("Código do Cupom (ex: BEMVINDO10):");
              if (!code) return;
              const val = prompt("Valor do Desconto (ex: 10):");
              if (!val) return;
              const type = confirm("É porcentagem? (Ok = Sim, Cancelar = Não, valor fixo)") ? 'percent' : 'fixed';
              
              if(supabase) {
                 await supabase.from('coupons').insert([{ 
                    code: code.toUpperCase(), 
                    discount_value: parseFloat(val), 
                    type, 
                    active: true 
                 }]);
                 fetchCoupons();
              }
          }}><Plus className="w-4 h-4" /> Novo Cupom</Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
           {coupons.map(coupon => (
              <Card key={coupon.id} className="p-4 flex flex-col justify-between">
                 <div>
                    <div className="flex justify-between items-start mb-2">
                       <span className="font-mono font-bold text-lg bg-stone-100 px-2 rounded border border-stone-300">{coupon.code}</span>
                       <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${coupon.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {coupon.active ? 'Ativo' : 'Inativo'}
                       </span>
                    </div>
                    <p className="text-stone-600 text-sm mb-4">
                       Desconto: <strong>{coupon.discount_value}{coupon.type === 'percent' ? '%' : ' R$'}</strong>
                    </p>
                 </div>
                 <div className="flex gap-2 mt-auto">
                    <Button variant="secondary" className="flex-1 text-xs" onClick={async () => {
                       if(supabase) await supabase.from('coupons').update({ active: !coupon.active }).eq('id', coupon.id);
                       fetchCoupons();
                    }}>{coupon.active ? 'Desativar' : 'Ativar'}</Button>
                    <Button variant="danger" className="flex-1 text-xs" onClick={async () => {
                       if(confirm("Excluir cupom?") && supabase) {
                          await supabase.from('coupons').delete().eq('id', coupon.id);
                          fetchCoupons();
                       }
                    }}><Trash2 className="w-3 h-3" /></Button>
                 </div>
              </Card>
           ))}
        </div>
     </div>
  );

  const printQrCode = (number: string, id: number) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${window.location.origin}?mesa=${number}`;
      const win = window.open('', '', 'width=400,height=600');
      if (win) {
          win.document.write(`
              <html>
                <head>
                    <title>Mesa ${number} - QR Code</title>
                    <style>
                        body { font-family: sans-serif; text-align: center; padding: 20px; }
                        h1 { font-size: 40px; margin-bottom: 10px; }
                        p { font-size: 18px; color: #666; }
                        img { margin: 20px auto; border: 1px solid #ddd; padding: 10px; }
                        .footer { margin-top: 20px; font-size: 12px; color: #999; }
                    </style>
                </head>
                <body>
                    <h1>Mesa ${number}</h1>
                    <p>Escaneie para ver o cardápio</p>
                    <img src="${qrUrl}" width="250" height="250" />
                    <div class="footer">${window.location.host}</div>
                    <script>window.print();</script>
                </body>
              </html>
          `);
          win.document.close();
      }
  };

  const renderTables = () => (
     <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
             <h2 className="text-2xl font-bold text-stone-800">Mesas & QR Codes</h2>
             <Button onClick={async () => {
                const num = prompt("Número da Mesa:");
                if(num && supabase) {
                    await supabase.from('tables').insert([{ number: num, active: true }]);
                    fetchTables();
                }
             }}><Plus className="w-4 h-4" /> Adicionar Mesa</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
           {tables.map(table => (
              <Card key={table.id} className="p-4 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow relative group">
                 <button 
                    onClick={async () => {
                        if(confirm("Excluir mesa?") && supabase) {
                            await supabase.from('tables').delete().eq('id', table.id);
                            fetchTables();
                        }
                    }}
                    className="absolute top-2 right-2 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                     <Trash2 className="w-4 h-4" />
                 </button>
                 <div className="w-16 h-16 bg-stone-900 text-white rounded-2xl flex items-center justify-center font-display text-2xl mb-3 shadow-lg">
                    {table.number}
                 </div>
                 <h3 className="font-bold text-sm">Mesa {table.number}</h3>
                 <div className="mt-3 flex gap-2 w-full">
                    <button onClick={() => printQrCode(table.number, table.id)} className="flex-1 bg-stone-100 hover:bg-stone-200 p-2 rounded text-stone-600 flex justify-center" title="Imprimir QR"><QrCode className="w-4 h-4" /></button>
                 </div>
              </Card>
           ))}
        </div>
     </div>
  );

  const renderSettings = () => (
     <div className="space-y-6 animate-in fade-in pb-20">
        <div className="flex justify-between items-center">
           <h2 className="text-2xl font-bold text-stone-800">Configurações</h2>
           <Button onClick={async () => { setIsSaving(true); await onUpdateSettings(settingsForm); setIsSaving(false); alert('Salvo!'); }} disabled={isSaving}>
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar Alterações
           </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
           <Card className="p-6 space-y-4">
              <h3 className="font-bold border-b border-stone-100 pb-2 mb-4 flex items-center gap-2 text-stone-800"><Palette className="w-4 h-4" /> Identidade Visual</h3>
              <Input label="Nome da Loja" value={settingsForm.name} onChange={(e: any) => setSettingsForm({...settingsForm, name: e.target.value})} />
              
              <ImageInput 
                 label="Logo da Loja" 
                 value={settingsForm.logoUrl} 
                 onChange={(val) => setSettingsForm({...settingsForm, logoUrl: val})} 
                 roundPreview={true}
              />
              
              <ImageInput 
                 label="Favicon (Ícone da Aba)" 
                 value={settingsForm.faviconUrl || ''} 
                 onChange={(val) => setSettingsForm({...settingsForm, faviconUrl: val})} 
              />
              
              {/* Cores Principais */}
              <div className="grid grid-cols-2 gap-4">
                 <Input label="Cor Primária" type="color" value={settingsForm.colors?.primary || '#C8102E'} onChange={(e: any) => setSettingsForm({...settingsForm, colors: { ...settingsForm.colors, primary: e.target.value } as any})} />
                 <Input label="Cor Secundária" type="color" value={settingsForm.colors?.secondary || '#008C45'} onChange={(e: any) => setSettingsForm({...settingsForm, colors: { ...settingsForm.colors, secondary: e.target.value } as any})} />
              </div>
              
              {/* Botões dos Cards */}
              <div className="border-t border-stone-100 pt-4 mt-2">
                 <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">Botões dos Cards (Produto)</h4>
                 <div className="grid grid-cols-2 gap-4">
                    <Input label="Fundo do Botão" type="color" value={settingsForm.colors?.cardButtonBackground || settingsForm.colors?.primary || '#C8102E'} onChange={(e: any) => setSettingsForm({...settingsForm, colors: { ...settingsForm.colors, cardButtonBackground: e.target.value } as any})} />
                    <Input label="Texto do Botão" type="color" value={settingsForm.colors?.cardButtonText || '#FFFFFF'} onChange={(e: any) => setSettingsForm({...settingsForm, colors: { ...settingsForm.colors, cardButtonText: e.target.value } as any})} />
                 </div>
              </div>

              {/* Tema Claro */}
              <div className="border-t border-stone-100 pt-4 mt-2">
                 <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">☀️ Modo Claro (Light)</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Input label="Fundo da Página" type="color" value={settingsForm.colors?.modes?.light?.background || '#f5f5f4'} onChange={(e: any) => updateColorMode('light', 'background', e.target.value)} />
                    <Input label="Fundo dos Cards" type="color" value={settingsForm.colors?.modes?.light?.cardBackground || '#ffffff'} onChange={(e: any) => updateColorMode('light', 'cardBackground', e.target.value)} />
                    <Input label="Cor do Texto" type="color" value={settingsForm.colors?.modes?.light?.text || '#292524'} onChange={(e: any) => updateColorMode('light', 'text', e.target.value)} />
                    <Input label="Texto dos Cards" type="color" value={settingsForm.colors?.modes?.light?.cardText || '#1c1917'} onChange={(e: any) => updateColorMode('light', 'cardText', e.target.value)} />
                    <Input label="Bordas" type="color" value={settingsForm.colors?.modes?.light?.border || '#e7e5e4'} onChange={(e: any) => updateColorMode('light', 'border', e.target.value)} />
                 </div>
              </div>

              {/* Tema Escuro */}
              <div className="border-t border-stone-100 pt-4 mt-2">
                 <h4 className="text-sm font-bold text-stone-800 mb-3 flex items-center gap-2">🌑 Modo Escuro (Dark)</h4>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <Input label="Fundo da Página" type="color" value={settingsForm.colors?.modes?.dark?.background || '#0c0a09'} onChange={(e: any) => updateColorMode('dark', 'background', e.target.value)} />
                    <Input label="Fundo dos Cards" type="color" value={settingsForm.colors?.modes?.dark?.cardBackground || '#1c1917'} onChange={(e: any) => updateColorMode('dark', 'cardBackground', e.target.value)} />
                    <Input label="Cor do Texto" type="color" value={settingsForm.colors?.modes?.dark?.text || '#f5f5f4'} onChange={(e: any) => updateColorMode('dark', 'text', e.target.value)} />
                    <Input label="Texto dos Cards" type="color" value={settingsForm.colors?.modes?.dark?.cardText || '#ffffff'} onChange={(e: any) => updateColorMode('dark', 'cardText', e.target.value)} />
                    <Input label="Bordas" type="color" value={settingsForm.colors?.modes?.dark?.border || '#292524'} onChange={(e: any) => updateColorMode('dark', 'border', e.target.value)} />
                 </div>
              </div>
           </Card>

           <div className="space-y-6">
               <Card className="p-6 space-y-4">
                  <h3 className="font-bold border-b border-stone-100 pb-2 mb-4 flex items-center gap-2 text-stone-800"><Globe className="w-4 h-4" /> SEO & Compartilhamento</h3>
                  <div className="space-y-3">
                      <Input label="Título da Página (SEO)" value={settingsForm.seoTitle || ''} onChange={(e: any) => setSettingsForm({...settingsForm, seoTitle: e.target.value})} placeholder="Ex: Spagnolli Pizzaria - A Melhor da Cidade" />
                      
                      <div className="w-full">
                        <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">Descrição (SEO & WhatsApp)</label>
                        <textarea rows={3} className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:ring-2 focus:ring-stone-800 outline-none" value={settingsForm.seoDescription || ''} onChange={(e: any) => setSettingsForm({...settingsForm, seoDescription: e.target.value})} placeholder="Descrição curta que aparece no Google e ao compartilhar o link..." />
                      </div>

                      <ImageInput 
                         label="Imagem de Compartilhamento (Banner)" 
                         value={settingsForm.seoBannerUrl || ''} 
                         onChange={(val) => setSettingsForm({...settingsForm, seoBannerUrl: val})} 
                      />
                  </div>
               </Card>

               <Card className="p-6 space-y-4">
                  <h3 className="font-bold border-b border-stone-100 pb-2 mb-4 flex items-center gap-2 text-stone-800"><Store className="w-4 h-4" /> Contato & Local</h3>
                  <Input label="WhatsApp (Ex: 5511999999999)" value={settingsForm.whatsapp} onChange={(e: any) => setSettingsForm({...settingsForm, whatsapp: e.target.value})} />
                  <div className="w-full">
                    <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">Endereço Completo</label>
                    <textarea rows={3} className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:ring-2 focus:ring-stone-800 outline-none" value={settingsForm.address} onChange={(e: any) => setSettingsForm({...settingsForm, address: e.target.value})} />
                  </div>
               </Card>

               <Card className="p-6 space-y-4">
                  <h3 className="font-bold border-b border-stone-100 pb-2 mb-4 flex items-center gap-2 text-stone-800"><Clock className="w-4 h-4" /> Funcionamento</h3>
                  <Input label="Texto de Horário" value={settingsForm.openingHours} onChange={(e: any) => setSettingsForm({...settingsForm, openingHours: e.target.value})} />
                  <div className="space-y-3 pt-2">
                     <label className="flex items-center gap-3 cursor-pointer p-3 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors bg-white">
                        <input type="checkbox" checked={settingsForm.enableTableOrder} onChange={e => setSettingsForm({...settingsForm, enableTableOrder: e.target.checked})} className="w-5 h-5 rounded text-stone-900" />
                        <span className="text-sm font-bold text-stone-800">Habilitar Pedidos na Mesa</span>
                     </label>
                  </div>
               </Card>
           </div>
           
           <Card className="lg:col-span-2 p-6 space-y-4">
               <h3 className="font-bold border-b border-stone-100 pb-2 mb-4 flex items-center gap-2 text-stone-800"><Zap className="w-4 h-4" /> Integrações (IA & API)</h3>
               <div className="grid md:grid-cols-2 gap-4">
                  <Input type="password" label="OpenAI API Key" value={settingsForm.openaiApiKey || ''} onChange={(e: any) => setSettingsForm({...settingsForm, openaiApiKey: e.target.value})} placeholder="sk-..." />
                  <Input label="Evolution API URL" value={settingsForm.evolutionApiUrl || ''} onChange={(e: any) => setSettingsForm({...settingsForm, evolutionApiUrl: e.target.value})} />
               </div>
               <div className="w-full">
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1.5">Prompt do Sistema (Cérebro da IA)</label>
                  <textarea rows={5} className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 focus:ring-2 focus:ring-stone-800 outline-none font-mono" value={settingsForm.aiSystemPrompt || ''} onChange={(e: any) => setSettingsForm({...settingsForm, aiSystemPrompt: e.target.value})} placeholder="Instruções para o assistente..." />
               </div>
           </Card>
        </div>
     </div>
  );

  const OrderDetailModal = () => {
     if (!selectedOrder) return null;
     return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOrderModalOpen(false)} />
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                 <div>
                    <h3 className="font-bold text-lg">Pedido #{selectedOrder.id}</h3>
                    <p className="text-xs text-stone-500">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                 </div>
                 <button onClick={() => setIsOrderModalOpen(false)}><X className="w-6 h-6 text-stone-400" /></button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                 <div className="flex items-center justify-between bg-stone-50 p-3 rounded-lg border border-stone-200">
                    <span className="font-bold text-sm text-stone-600">Status Atual:</span>
                    <Select 
                       value={selectedOrder.status} 
                       onChange={(e: any) => updateOrderStatus(selectedOrder.id, e.target.value)}
                       className="w-auto py-1 px-3 border-2 border-stone-300"
                    >
                       {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </Select>
                 </div>

                 <div className="grid md:grid-cols-2 gap-6">
                    <div>
                       <h4 className="font-bold text-stone-800 mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Cliente</h4>
                       <p className="text-sm">{selectedOrder.customer_name}</p>
                    </div>
                    <div>
                       <h4 className="font-bold text-stone-800 mb-2 flex items-center gap-2">
                          {selectedOrder.delivery_type === 'delivery' ? <Bike className="w-4 h-4"/> : selectedOrder.delivery_type === 'table' ? <Utensils className="w-4 h-4"/> : <Store className="w-4 h-4"/>}
                          {selectedOrder.delivery_type === 'delivery' ? 'Entrega' : selectedOrder.delivery_type === 'table' ? 'Mesa' : 'Retirada'}
                       </h4>
                       {selectedOrder.delivery_type === 'table' ? (
                          <p className="text-xl font-bold text-purple-600">Mesa {selectedOrder.table_number}</p>
                       ) : (
                          <p className="text-sm text-stone-600">
                             {selectedOrder.address_street}, {selectedOrder.address_number} - {selectedOrder.address_district}
                          </p>
                       )}
                    </div>
                 </div>

                 <div>
                    <h4 className="font-bold text-stone-800 mb-2 border-b pb-1">Itens do Pedido</h4>
                    <ul className="space-y-3">
                       {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, i: number) => (
                          <li key={i} className="flex justify-between items-start text-sm">
                             <div>
                                <span className="font-bold mr-2">{item.quantity}x</span>
                                {item.name}
                                {item.observation && <p className="text-xs text-orange-600 ml-6 mt-1 bg-orange-50 inline-block px-1 rounded">Obs: {item.observation}</p>}
                             </div>
                             <span className="font-mono">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                       ))}
                    </ul>
                 </div>

                 <div className="border-t border-stone-200 pt-4 flex flex-col items-end gap-1">
                     <div className="flex justify-between w-full md:w-1/2 text-lg font-bold mt-2 pt-2 border-t border-stone-100">
                        <span>Total</span>
                        <span>R$ {selectedOrder.total.toFixed(2)}</span>
                     </div>
                     <p className="text-xs text-stone-400 uppercase mt-1">Pagamento: {selectedOrder.payment_method}</p>
                 </div>
              </div>

              <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-2">
                 <Button variant="secondary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir</Button>
                 <Button onClick={() => setIsOrderModalOpen(false)}>Fechar</Button>
              </div>
           </div>
        </div>
     );
  };

  const ProductEditorModal = () => {
     return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsProductModalOpen(false)} />
           <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                 <h3 className="font-bold text-lg">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h3>
                 <button onClick={() => setIsProductModalOpen(false)}><X className="w-6 h-6 text-stone-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                  <Input label="Nome" value={productForm.name || ''} onChange={(e: any) => setProductForm({...productForm, name: e.target.value})} />
                  <Input label="Descrição" value={productForm.description || ''} onChange={(e: any) => setProductForm({...productForm, description: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                      <Input type="number" label="Preço" value={productForm.price || ''} onChange={(e: any) => setProductForm({...productForm, price: parseFloat(e.target.value)})} />
                      <Input label="Código" value={productForm.code || ''} onChange={(e: any) => setProductForm({...productForm, code: e.target.value})} />
                  </div>
                  <Input label="Imagem URL" value={productForm.image || ''} onChange={(e: any) => setProductForm({...productForm, image: e.target.value})} />
              </div>
              <div className="p-4 border-t border-stone-100 flex justify-end gap-2 bg-stone-50">
                 <Button variant="secondary" onClick={() => setIsProductModalOpen(false)}>Cancelar</Button>
                 <Button onClick={handleSaveProduct}>Salvar</Button>
              </div>
           </div>
        </div>
     );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-stone-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg transform rotate-3">
              <LayoutDashboard className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-stone-800">Acesso Administrativo</h2>
            <p className="text-stone-500 text-sm mt-1">Gerencie sua loja com segurança</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input type="password" label="Senha de Acesso" value={password} onChange={(e: any) => setPassword(e.target.value)} placeholder="••••••" autoFocus />
            <Button className="w-full py-3" onClick={handleLogin}>Entrar no Painel</Button>
          </form>
          <button onClick={onBack} className="w-full mt-6 text-stone-500 text-sm hover:text-stone-800 flex items-center justify-center gap-1.5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar para a Loja
          </button>
        </div>
      </div>
    );
  }

  const MenuLink = ({ id, icon: Icon, label }: any) => (
    <button 
      onClick={() => { setActiveTab(id); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${activeTab === id ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:bg-stone-800 hover:text-white'}`}
    >
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-red-600' : ''}`} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex font-sans text-stone-800">
       {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
       
       <aside className={`fixed lg:relative inset-y-0 left-0 w-72 bg-stone-900 text-white p-6 transform transition-transform z-30 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl lg:shadow-none`}>
          <div className="flex items-center gap-3 mb-10 px-2">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/50">
                  <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                  <h1 className="font-bold text-lg leading-tight">Painel Admin</h1>
                  <p className="text-xs text-stone-400">Gerenciamento Pro</p>
              </div>
          </div>
          
          <nav className="flex-1 space-y-1">
             <MenuLink id="dashboard" icon={LayoutDashboard} label="Visão Geral" />
             <MenuLink id="orders" icon={ShoppingBag} label="Pedidos" />
             <MenuLink id="menu" icon={Utensils} label="Cardápio" />
             <MenuLink id="tables" icon={Grid} label="Mesas" />
             <MenuLink id="coupons" icon={Ticket} label="Cupons" />
             <MenuLink id="settings" icon={Settings} label="Configurações" />
          </nav>

          <button onClick={onBack} className="flex items-center gap-2 px-4 py-3 text-stone-400 hover:text-white hover:bg-stone-800 rounded-xl transition-colors mt-auto">
             <LogOut className="w-5 h-5" /> Sair
          </button>
       </aside>

       <main className="flex-1 h-screen overflow-y-auto relative">
          <header className="bg-white border-b border-stone-200 p-4 lg:hidden flex justify-between items-center sticky top-0 z-10 shadow-sm">
             <div className="font-bold text-lg">Painel Admin</div>
             <button onClick={() => setIsSidebarOpen(true)} className="p-2 bg-stone-100 rounded-lg"><Menu className="w-6 h-6" /></button>
          </header>

          <div className="p-4 sm:p-8 max-w-7xl mx-auto pb-24">
             {activeTab === 'dashboard' && renderDashboard()}
             {activeTab === 'orders' && renderOrders()}
             {activeTab === 'menu' && renderMenu()}
             {activeTab === 'coupons' && renderCoupons()}
             {activeTab === 'tables' && renderTables()}
             {activeTab === 'settings' && renderSettings()}
             {activeTab === 'integrations' && renderSettings()} 
          </div>
       </main>

       {isOrderModalOpen && <OrderDetailModal />}
       {isProductModalOpen && <ProductEditorModal />}
    </div>
  );
};