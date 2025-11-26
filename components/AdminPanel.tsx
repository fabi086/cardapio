


import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon, DeliveryRegion, WeeklySchedule, Table } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Ticket, QrCode, Clock, CreditCard, LayoutDashboard, ShoppingBag, Palette, Phone, Share2, Calendar, Printer, Filter, ChevronDown, ChevronUp, AlertTriangle, User, Truck, Utensils, Minus, Type } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface AdminPanelProps {
  menuData: Category[];
  settings: StoreSettings;
  onUpdateProduct: (categoryId: string, productId: number, updates: Partial<Product>) => void;
  onAddProduct: (categoryId: string, product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (categoryId: string, productId: number) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  onResetMenu: () => void;
  onBack: () => void;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, updates: { name?: string; image?: string }) => void;
  onDeleteCategory: (id: string) => void;
}

const WEEKDAYS_PT = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo'
};

const FONTS_LIST = ['Outfit', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter'];

// Standard Input Style for Consistency
const INPUT_STYLE = "w-full p-3 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-italian-red focus:border-italian-red outline-none transition-all placeholder-stone-400";
const LABEL_STYLE = "block text-sm font-bold text-stone-700 mb-1";
const CARD_STYLE = "bg-white p-6 rounded-xl shadow-sm border border-stone-200";

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  menuData, 
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'coupons' | 'tables' | 'settings'>('dashboard');
  
  // Dashboard State
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardPeriod, setDashboardPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');
  
  // Order Management State
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [orderViewMode, setOrderViewMode] = useState<'list' | 'dining'>('list'); // 'list' or 'dining' (tables)
  const [isUpdatingOrder, setIsUpdatingOrder] = useState<number | null>(null);
  
  // Order Edit State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [orderEditForm, setOrderEditForm] = useState<{items: any[], total: number}>({ items: [], total: 0 });
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || '',
    image: '', price: 0, subcategory: '', ingredients: [], tags: [], additional_categories: []
  });

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Option Management
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<'single' | 'multiple'>('single');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({ type: 'percent', active: true });
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);

  // Tables State
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');

  // Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionPrice, setNewRegionPrice] = useState('');
  const [newRegionZips, setNewRegionZips] = useState('');
  const [newRegionExclusions, setNewRegionExclusions] = useState('');
  const [newRegionNeighborhoods, setNewRegionNeighborhoods] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Initialize settings form when props change
  useEffect(() => { 
    if (settings) {
      setSettingsForm(settings); 
    }
  }, [settings]);

  useEffect(() => {
    if (isAuthenticated && supabase) {
      // Fetch data immediately upon login
      fetchOrders();
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'tables') fetchTables();
    }
  }, [isAuthenticated, activeTab]);

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setOrders(data as Order[]);
  };

  const fetchCoupons = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as Coupon[]);
  };

  const fetchTables = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('tables').select('*').order('id', { ascending: true });
    if (data) setTables(data as Table[]);
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    if (!supabase) return;
    setIsUpdatingOrder(orderId);
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    } else {
      alert('Erro ao atualizar status');
    }
    setIsUpdatingOrder(null);
  };

  // --- ORDER EDIT LOGIC ---
  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setOrderEditForm({
      items: order.items ? JSON.parse(JSON.stringify(order.items)) : [], // Deep copy to avoid ref issues
      total: order.total
    });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const updatedItems = [...orderEditForm.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    recalculateOrderTotal(updatedItems);
  };

  const removeOrderItem = (index: number) => {
    const updatedItems = orderEditForm.items.filter((_, i) => i !== index);
    recalculateOrderTotal(updatedItems);
  };

  const addNewItemToOrder = () => {
    if (!newItemName || !newItemPrice) return;
    const newItem = {
      name: newItemName,
      price: parseFloat(newItemPrice),
      quantity: 1,
      selectedOptions: [],
      observation: 'Adicionado pelo Admin'
    };
    const updatedItems = [...orderEditForm.items, newItem];
    recalculateOrderTotal(updatedItems);
    setNewItemName('');
    setNewItemPrice('');
  };

  const recalculateOrderTotal = (items: any[]) => {
    // Recalculate subtotal from items
    const subtotal = items.reduce((acc, item) => {
      const optionsPrice = item.selectedOptions 
          ? item.selectedOptions.reduce((sum: number, opt: any) => sum + opt.price, 0)
          : 0;
      return acc + ((item.price + optionsPrice) * item.quantity);
    }, 0);

    // Re-apply delivery fee and discount from original order
    const fee = editingOrder?.delivery_fee || 0;
    const discount = editingOrder?.discount || 0;

    const newTotal = Math.max(0, (subtotal + fee) - discount);
    setOrderEditForm({ items, total: newTotal });
  };

  const saveOrderChanges = async () => {
    if (!editingOrder) return;
    
    // Optimistic Update
    const updatedOrder = { ...editingOrder, items: orderEditForm.items, total: orderEditForm.total };
    setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
    
    if (supabase) {
      const { error } = await supabase
        .from('orders')
        .update({ 
          items: orderEditForm.items,
          total: orderEditForm.total
        })
        .eq('id', editingOrder.id);

      if (error) {
        alert('Erro ao salvar no banco de dados, mas atualizado localmente.');
      }
    }
    
    setEditingOrder(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta');
    }
  };

  // --- DASHBOARD METRICS ---
  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const filteredOrders = orders.filter(order => {
       const orderDate = new Date(order.created_at);
       if (dashboardPeriod === 'today') return orderDate.toDateString() === now.toDateString();
       if (dashboardPeriod === 'week') {
         const weekAgo = new Date();
         weekAgo.setDate(now.getDate() - 7);
         return orderDate >= weekAgo;
       }
       if (dashboardPeriod === 'month') {
         const monthAgo = new Date();
         monthAgo.setMonth(now.getMonth() - 1);
         return orderDate >= monthAgo;
       }
       return true;
    });

    const totalRevenue = filteredOrders.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalOrders = filteredOrders.length;
    
    // Top Products
    const productCounts: Record<string, number> = {};
    filteredOrders.forEach(order => {
       if (Array.isArray(order.items)) {
          order.items.forEach((item: any) => {
             productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
          });
       }
    });
    const topProducts = Object.entries(productCounts)
       .sort((a, b) => b[1] - a[1])
       .slice(0, 5)
       .map(([name, count]) => ({ name, count }));

    return { totalRevenue, totalOrders, topProducts, filteredOrders };
  }, [orders, dashboardPeriod]);

  // --- Image Handling ---
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scaleSize = MAX_WIDTH / img.width;
          if (scaleSize < 1) {
             canvas.width = MAX_WIDTH;
             canvas.height = img.height * scaleSize;
          } else {
             canvas.width = img.width;
             canvas.height = img.height;
          }
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      try {
        const compressedBase64 = await compressImage(file);
        if (isNew) {
          setNewProductForm(prev => ({ ...prev, image: compressedBase64 }));
        } else {
          setEditForm(prev => ({ ...prev, image: compressedBase64 }));
        }
      } catch (err) {
        alert("Erro ao processar imagem");
      } finally {
        setIsProcessingImage(false);
      }
    }
  };

  // --- Product Management ---
  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm({ 
        ...product, 
        additional_categories: product.additional_categories || [] 
    });
  };

  const saveEdit = () => {
    if (editingProduct && editForm) {
      const catId = editForm.category_id || menuData.find(c => c.items.find(p => p.id === editingProduct))?.id || '';
      onUpdateProduct(catId, editingProduct, editForm);
      setEditingProduct(null);
      setEditForm({});
    }
  };

  const handleAddNewProduct = () => {
    if (!newProductForm.name || !newProductForm.price || !newProductForm.category) {
      alert('Preencha nome, preço e categoria principal');
      return;
    }
    const productToAdd = {
      name: newProductForm.name!,
      description: newProductForm.description || '',
      price: Number(newProductForm.price),
      image: newProductForm.image || '',
      category: newProductForm.category!,
      subcategory: newProductForm.subcategory || '',
      code: newProductForm.code || '',
      options: newProductForm.options || [],
      ingredients: newProductForm.ingredients || [],
      tags: newProductForm.tags || [],
      additional_categories: newProductForm.additional_categories || []
    };
    onAddProduct(newProductForm.category!, productToAdd);
    setIsAddingNew(false);
    setNewProductForm({ category: menuData[0]?.id || '', image: '', price: 0, subcategory: '', ingredients: [], tags: [], additional_categories: [] });
  };

  const toggleAdditionalCategory = (catId: string, isNew: boolean) => {
      if (isNew) {
          const current = newProductForm.additional_categories || [];
          if (current.includes(catId)) {
              setNewProductForm({...newProductForm, additional_categories: current.filter(c => c !== catId)});
          } else {
              setNewProductForm({...newProductForm, additional_categories: [...current, catId]});
          }
      } else {
          const current = editForm.additional_categories || [];
          if (current.includes(catId)) {
              setEditForm({...editForm, additional_categories: current.filter(c => c !== catId)});
          } else {
              setEditForm({...editForm, additional_categories: [...current, catId]});
          }
      }
  };

  // --- Options/Addons Logic ---
  const addOptionToForm = (isNew: boolean) => {
    if (!newOptionName) return;
    const newOption: ProductOption = {
      id: Date.now().toString(),
      name: newOptionName,
      type: newOptionType,
      required: false,
      choices: []
    };

    if (isNew) {
      setNewProductForm(prev => ({ ...prev, options: [...(prev.options || []), newOption] }));
    } else {
      setEditForm(prev => ({ ...prev, options: [...(prev.options || []), newOption] }));
    }
    setNewOptionName('');
  };

  const removeOptionFromForm = (optionId: string, isNew: boolean) => {
      if(isNew) {
          setNewProductForm(prev => ({ ...prev, options: (prev.options || []).filter(o => o.id !== optionId) }));
      } else {
          setEditForm(prev => ({ ...prev, options: (prev.options || []).filter(o => o.id !== optionId) }));
      }
  };

  const addChoiceToOption = (optionId: string, choiceName: string, choicePrice: string, isNew: boolean) => {
    if (!choiceName) return;
    const choice: ProductChoice = { name: choiceName, price: Number(choicePrice) };
    
    const updateOptions = (options: ProductOption[] = []) => {
      return options.map(opt => {
        if (opt.id === optionId) {
          return { ...opt, choices: [...opt.choices, choice] };
        }
        return opt;
      });
    };

    if (isNew) {
      setNewProductForm(prev => ({ ...prev, options: updateOptions(prev.options) }));
    } else {
      setEditForm(prev => ({ ...prev, options: updateOptions(prev.options) }));
    }
  };

  const removeChoiceFromOption = (optionId: string, choiceIndex: number, isNew: boolean) => {
      const updateOptions = (options: ProductOption[] = []) => {
          return options.map(opt => {
              if(opt.id === optionId) {
                  return { ...opt, choices: opt.choices.filter((_, idx) => idx !== choiceIndex) };
              }
              return opt;
          });
      };
      if(isNew) setNewProductForm(prev => ({ ...prev, options: updateOptions(prev.options) }));
      else setEditForm(prev => ({ ...prev, options: updateOptions(prev.options) }));
  };

  // --- Settings Logic ---
  const handleSaveSettings = () => {
    onUpdateSettings(settingsForm);
    alert('Configurações salvas!');
  };

  const handleAddRegion = () => {
    if (!newRegionName || !newRegionPrice) return;
    
    let neighborhoodsList: string[] = [];
    if (newRegionNeighborhoods.trim()) {
        neighborhoodsList = newRegionNeighborhoods.split(',').map(s => s.trim()).filter(s => s);
    } else {
        neighborhoodsList = [newRegionName.trim()];
    }

    const newRegion: DeliveryRegion = {
      id: Date.now().toString(),
      name: newRegionName,
      price: Number(newRegionPrice),
      zipRules: newRegionZips.split(',').map(s => s.trim()).filter(s => s),
      zipExclusions: newRegionExclusions.split(',').map(s => s.trim()).filter(s => s),
      neighborhoods: neighborhoodsList
    };
    
    const updatedRegions = [...(settingsForm.deliveryRegions || []), newRegion];
    setSettingsForm({ ...settingsForm, deliveryRegions: updatedRegions });
    setNewRegionName('');
    setNewRegionPrice('');
    setNewRegionZips('');
    setNewRegionExclusions('');
    setNewRegionNeighborhoods('');
  };

  const handleRemoveRegion = (id: string) => {
    const updatedRegions = settingsForm.deliveryRegions?.filter(r => r.id !== id) || [];
    setSettingsForm({ ...settingsForm, deliveryRegions: updatedRegions });
  };

  const handleAddPhone = () => {
      if(newPhone) {
          setSettingsForm({...settingsForm, phones: [...settingsForm.phones, newPhone]});
          setNewPhone('');
      }
  };
  const handleRemovePhone = (idx: number) => {
      setSettingsForm({...settingsForm, phones: settingsForm.phones.filter((_, i) => i !== idx)});
  };

  // --- Coupon Logic ---
  const handleSaveCoupon = async () => {
    if (!couponForm.code || !couponForm.discount_value) return;
    if (supabase) {
      const payload = { ...couponForm, code: couponForm.code.toUpperCase().trim(), discount_value: Number(couponForm.discount_value) };
      if (!payload.min_order_value) payload.min_order_value = 0;
      
      const { error } = await supabase.from('coupons').insert([payload]);
      if (!error) { 
        setCouponForm({ type: 'percent', active: true }); 
        setIsAddingCoupon(false); 
        fetchCoupons(); 
      } else { 
        alert('Erro ao criar cupom. Verifique se o código já existe.'); 
      }
    }
  };
  const handleDeleteCoupon = async (id: number) => { 
    if (window.confirm('Excluir cupom?')) { 
      if (supabase) { await supabase.from('coupons').delete().eq('id', id); fetchCoupons(); } 
    } 
  };

  // --- Table Logic ---
  const handleAddTable = async () => {
     if (!newTableNumber) return;
     if (supabase) {
        const { error } = await supabase.from('tables').insert([{ number: newTableNumber, active: true }]);
        if(!error) { setNewTableNumber(''); fetchTables(); }
     }
  };
  const handleDeleteTable = async (id: number) => { 
    if(window.confirm('Remover mesa?')) { 
      if(supabase) { await supabase.from('tables').delete().eq('id', id); fetchTables(); } 
    } 
  };
  const getQrCodeUrl = (tableNum: string) => {
     const origin = window.location.origin + window.location.pathname;
     const url = `${origin}?mesa=${tableNum}`;
     return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  };
  
  const printQrCode = (tableNum: string) => {
      const qrUrl = getQrCodeUrl(tableNum);
      const win = window.open('', '_blank');
      if (win) {
          win.document.write(`
            <html>
              <head><title>Mesa ${tableNum}</title></head>
              <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
                <h1 style="font-size: 40px; margin-bottom: 20px;">Mesa ${tableNum}</h1>
                <img src="${qrUrl}" style="width: 400px; height: 400px;" />
                <p style="margin-top:20px; font-size: 20px;">Aponte a câmera do celular</p>
                <script>window.print();</script>
              </body>
            </html>
          `);
          win.document.close();
      }
  };

  const activeTableOrders = useMemo(() => {
      if(orderViewMode !== 'dining') return {};
      const active = orders.filter(o => o.delivery_type === 'table' && o.status !== 'completed' && o.status !== 'cancelled');
      const grouped: Record<string, Order[]> = {};
      tables.forEach(t => { grouped[t.number] = [] }); // Init all tables
      active.forEach(o => {
          if(o.table_number) {
              if(!grouped[o.table_number]) grouped[o.table_number] = [];
              grouped[o.table_number].push(o);
          }
      });
      return grouped;
  }, [orders, orderViewMode, tables]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border border-stone-200">
          <h2 className="text-2xl font-bold mb-6 text-center text-stone-800">Acesso Administrativo</h2>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className={INPUT_STYLE}
            placeholder="Senha do Administrador" 
          />
          <button className="bg-italian-red text-white w-full py-3 rounded-lg font-bold hover:bg-red-700 transition-colors mt-4">
            Entrar no Sistema
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20 text-stone-800 font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-xl text-stone-800 hidden md:block">Gerenciar Sistema</h1>
            </div>
            <div className="flex gap-2">
               <button onClick={fetchOrders} className="p-2 bg-stone-100 border border-stone-200 hover:bg-stone-200 rounded-full text-stone-600" title="Atualizar Pedidos"><RefreshCw className="w-4 h-4"/></button>
               <button onClick={() => { if(window.confirm('Resetar cardápio para o padrão?')) onResetMenu(); }} className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded border border-red-100 hover:bg-red-100 font-bold">Resetar Tudo</button>
            </div>
          </div>

          <div className="flex space-x-1 md:space-x-6 overflow-x-auto hide-scrollbar pb-0">
             {[
               { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
               { id: 'orders', icon: ShoppingBag, label: 'Pedidos' },
               { id: 'menu', icon: Grid, label: 'Cardápio' },
               { id: 'coupons', icon: Ticket, label: 'Cupons' },
               { id: 'tables', icon: QrCode, label: 'Mesas' },
               { id: 'settings', icon: Settings, label: 'Config' },
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)} 
                 className={`flex items-center gap-2 px-2 py-3 text-sm font-bold transition-colors whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-italian-red text-italian-red' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
               >
                 <tab.icon className="w-4 h-4" /> {tab.label}
               </button>
             ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* --- DASHBOARD --- */}
        {activeTab === 'dashboard' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-end gap-2 mb-4">
                 {['today', 'week', 'month', 'all'].map(period => (
                    <button 
                      key={period}
                      onClick={() => setDashboardPeriod(period as any)} 
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors border ${dashboardPeriod === period ? 'bg-italian-red text-white border-italian-red' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                    >
                      {period === 'today' ? 'Hoje' : period === 'week' ? '7 Dias' : period === 'month' ? '30 Dias' : 'Geral'}
                    </button>
                 ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-sm font-bold uppercase flex items-center gap-2"><ShoppingBag className="w-4 h-4"/> Pedidos</h3>
                     <p className="text-3xl font-bold text-stone-800 mt-2">{dashboardMetrics.totalOrders}</p>
                  </div>
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-sm font-bold uppercase flex items-center gap-2"><CreditCard className="w-4 h-4"/> Receita</h3>
                     <p className="text-3xl font-bold text-green-600 mt-2">
                        {settings.currencySymbol} {dashboardMetrics.totalRevenue.toFixed(2)}
                     </p>
                  </div>
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-sm font-bold uppercase flex items-center gap-2"><Grid className="w-4 h-4"/> Produtos</h3>
                     <p className="text-3xl font-bold text-blue-600 mt-2">
                        {menuData.reduce((acc, cat) => acc + cat.items.length, 0)}
                     </p>
                  </div>
                  <div className={CARD_STYLE}>
                     <h3 className="text-stone-500 text-sm font-bold uppercase flex items-center gap-2"><Ticket className="w-4 h-4"/> Cupons</h3>
                     <p className="text-3xl font-bold text-purple-600 mt-2">{coupons.filter(c => c.active).length}</p>
                  </div>
              </div>

              {/* TOP PRODUCTS */}
              <div className={CARD_STYLE}>
                 <h3 className="font-bold text-lg mb-4 text-stone-800 flex items-center gap-2"><Utensils className="w-5 h-5"/> Mais Vendidos</h3>
                 {dashboardMetrics.topProducts.length > 0 ? (
                    <div className="space-y-4">
                       {dashboardMetrics.topProducts.map((prod, idx) => (
                          <div key={idx} className="flex items-center justify-between border-b border-stone-100 pb-2 last:border-0">
                             <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-gray-300 text-gray-800' : idx === 2 ? 'bg-orange-300 text-orange-900' : 'bg-stone-100 text-stone-500'}`}>{idx + 1}</span>
                                <span className="font-medium text-stone-700">{prod.name}</span>
                             </div>
                             <span className="text-sm font-bold text-stone-600">{prod.count} un.</span>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <p className="text-stone-400 text-center py-4">Nenhum dado de venda para este período.</p>
                 )}
              </div>
           </div>
        )}

        {/* --- ORDERS (CARD VIEW & DINING VIEW) --- */}
        {activeTab === 'orders' && (
           <div className="animate-in fade-in space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                 <div className="flex items-center gap-4">
                    <h2 className="font-bold text-lg flex items-center gap-2 text-stone-800"><ShoppingBag className="w-5 h-5"/> Gestão de Pedidos</h2>
                    <div className="bg-stone-100 p-1 rounded-lg flex">
                        <button onClick={() => setOrderViewMode('list')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${orderViewMode === 'list' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Lista</button>
                        <button onClick={() => setOrderViewMode('dining')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${orderViewMode === 'dining' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}>Salão / Mesas</button>
                    </div>
                 </div>
                 {orderViewMode === 'list' && (
                    <div className="flex gap-2 mt-3 md:mt-0 overflow-x-auto w-full md:w-auto pb-1 hide-scrollbar">
                        {['all', 'pending', 'preparing', 'delivery', 'completed'].map(status => (
                            <button 
                            key={status}
                            onClick={() => setOrderFilter(status)} 
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border ${orderFilter === status ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'}`}
                            >
                            {status === 'all' ? 'Todos' : status === 'pending' ? 'Pendentes' : status === 'preparing' ? 'Preparo' : status === 'delivery' ? 'Entrega' : 'Concluídos'}
                            </button>
                        ))}
                    </div>
                 )}
              </div>

              {orderViewMode === 'list' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {orders.filter(o => orderFilter === 'all' || o.status === orderFilter).map(order => (
                        <div key={order.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                        {/* Card Header */}
                        <div className={`p-4 flex justify-between items-start border-b border-stone-100 ${
                            order.status === 'pending' ? 'bg-yellow-50' : 
                            order.status === 'preparing' ? 'bg-blue-50' :
                            order.status === 'delivery' ? 'bg-orange-50' :
                            order.status === 'completed' ? 'bg-green-50' : 'bg-stone-50'
                        }`}>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-stone-800 text-lg">#{order.id}</span>
                                    {order.delivery_type === 'table' ? (
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Utensils className="w-3 h-3"/> Mesa {order.table_number}</span>
                                    ) : order.delivery_type === 'delivery' ? (
                                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Truck className="w-3 h-3"/> Entrega</span>
                                    ) : (
                                    <span className="bg-stone-100 text-stone-700 text-xs font-bold px-2 py-0.5 rounded-full">Retirada</span>
                                    )}
                                </div>
                                <div className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3"/> {new Date(order.created_at).toLocaleTimeString().slice(0,5)} - {new Date(order.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-italian-green text-xl">{settings.currencySymbol} {order.total.toFixed(2)}</p>
                                <p className="text-[10px] uppercase font-bold tracking-wider text-stone-500">{order.status === 'pending' ? 'Pendente' : order.status === 'preparing' ? 'Preparando' : order.status === 'delivery' ? 'Em Rota' : order.status === 'completed' ? 'Concluído' : 'Cancelado'}</p>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="p-4 bg-stone-50 border-b border-stone-100 text-sm">
                            <p className="font-bold flex items-center gap-2 text-stone-800 text-base"><User className="w-4 h-4 text-stone-400"/> {order.customer_name}</p>
                            {order.delivery_type === 'delivery' && (
                                <p className="text-stone-600 text-sm mt-1 flex items-start gap-2"><MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5"/> {order.address_street}, {order.address_number} - {order.address_district}</p>
                            )}
                            <p className="text-stone-600 text-sm mt-1 flex items-center gap-2"><CreditCard className="w-4 h-4 text-stone-400"/> {order.payment_method}</p>
                        </div>

                        {/* Items */}
                        <div className="p-4 flex-1 overflow-y-auto max-h-48 bg-white">
                            <ul className="space-y-3 text-sm">
                                {Array.isArray(order.items) && order.items.map((item: any, idx: number) => (
                                    <li key={idx} className="border-b border-stone-100 pb-2 last:border-0">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-stone-800">{item.quantity}x {item.name}</span>
                                        <span className="font-medium text-stone-600">{settings.currencySymbol} {item.price.toFixed(2)}</span>
                                    </div>
                                    {item.observation && <p className="text-xs text-red-500 italic mt-0.5">Obs: {item.observation}</p>}
                                    {item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0 && (
                                        <p className="text-xs text-stone-500 mt-0.5">
                                            + {item.selectedOptions.map((o: any) => o.choiceName).join(', ')}
                                        </p>
                                    )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="p-3 border-t border-stone-100 bg-stone-50 grid grid-cols-2 gap-3">
                            {(order.status === 'pending' || order.status === 'preparing') && (
                                <button 
                                    onClick={() => handleEditOrder(order)} 
                                    className="col-span-2 bg-white border border-stone-300 text-stone-700 py-2.5 rounded-lg text-sm font-bold hover:bg-stone-100 hover:border-stone-400 flex items-center justify-center gap-2 transition-all shadow-sm"
                                >
                                    <Edit3 className="w-4 h-4" /> Editar / Alterar Itens
                                </button>
                            )}

                            {order.status === 'pending' && (
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className="bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 shadow-sm transition-all">Aprovar (Preparo)</button>
                            )}
                            {order.status === 'preparing' && (
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'delivery')} className="bg-orange-500 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-orange-600 shadow-sm transition-all">Saiu p/ Entrega</button>
                            )}
                            {order.status === 'delivery' && (
                                <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 shadow-sm transition-all">Concluir</button>
                            )}
                            
                            {(order.status !== 'completed' && order.status !== 'cancelled') && (
                                <button onClick={() => { if(window.confirm('Cancelar este pedido?')) handleUpdateOrderStatus(order.id, 'cancelled'); }} className="bg-white border border-red-200 text-red-500 py-2.5 rounded-lg text-sm font-bold hover:bg-red-50 transition-all">Cancelar</button>
                            )}
                        </div>
                        </div>
                    ))}
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {tables.map(table => {
                          const activeOrders = orders.filter(o => o.delivery_type === 'table' && o.table_number === table.number && o.status !== 'completed' && o.status !== 'cancelled');
                          return (
                              <div key={table.id} className="bg-white rounded-xl shadow-sm border border-stone-200 flex flex-col min-h-[200px]">
                                  <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                                      <span className="font-bold text-lg text-stone-800">Mesa {table.number}</span>
                                      {activeOrders.length > 0 ? <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold">Ocupada</span> : <span className="text-xs bg-stone-200 text-stone-500 px-2 py-1 rounded-full">Livre</span>}
                                  </div>
                                  <div className="p-4 flex-1 overflow-y-auto max-h-60">
                                      {activeOrders.length > 0 ? (
                                          <div className="space-y-3">
                                              {activeOrders.map(order => (
                                                  <div key={order.id} className="border-b border-stone-100 pb-2 last:border-0">
                                                      <div className="flex justify-between items-start mb-1">
                                                          <span className="text-xs font-bold text-stone-800">Pedido #{order.id}</span>
                                                          <span className="text-[10px] text-stone-500">{new Date(order.created_at).toLocaleTimeString().slice(0,5)}</span>
                                                      </div>
                                                      <div className="text-xs text-stone-600">
                                                          {order.items.map((i:any, idx:number) => (
                                                              <div key={idx}>{i.quantity}x {i.name}</div>
                                                          ))}
                                                      </div>
                                                      <div className="mt-2 flex gap-2">
                                                          {order.status === 'pending' && <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className="flex-1 bg-blue-50 text-blue-600 text-[10px] py-1 rounded font-bold">Aprovar</button>}
                                                          {order.status === 'preparing' && <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className="flex-1 bg-green-50 text-green-600 text-[10px] py-1 rounded font-bold">Concluir</button>}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      ) : (
                                          <p className="text-stone-400 text-sm text-center pt-8">Mesa Livre</p>
                                      )}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}
              
              {/* ORDER EDIT MODAL */}
              {editingOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
                     <div className="p-5 bg-white border-b border-stone-200 flex justify-between items-center rounded-t-2xl sticky top-0 z-10">
                        <div>
                           <h2 className="font-bold text-xl text-stone-900 flex items-center gap-2"><Edit3 className="w-5 h-5 text-italian-red"/> Editar Pedido #{editingOrder.id}</h2>
                           <p className="text-sm text-stone-500">Adicione, remova ou altere itens.</p>
                        </div>
                        <button onClick={() => setEditingOrder(null)} className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                     </div>
                     
                     <div className="p-6 space-y-6 bg-stone-50 flex-1 overflow-y-auto">
                        {/* Items List */}
                        <div className="space-y-3">
                           <h3 className="font-bold text-stone-800 text-sm uppercase tracking-wider">Itens do Pedido</h3>
                           {orderEditForm.items.map((item, idx) => (
                              <div key={idx} className="flex flex-col gap-3 p-4 bg-white border border-stone-200 rounded-xl shadow-sm">
                                 <div className="flex gap-3">
                                    <div className="flex-1">
                                       <label className="text-[10px] font-bold text-stone-500 uppercase mb-1 block">Nome do Produto</label>
                                       <input 
                                          value={item.name} 
                                          onChange={(e) => updateOrderItem(idx, 'name', e.target.value)}
                                          className={INPUT_STYLE}
                                          placeholder="Nome do Item"
                                       />
                                    </div>
                                    <div className="w-24">
                                       <label className="text-[10px] font-bold text-stone-500 uppercase mb-1 block">Qtd</label>
                                       <div className="flex items-center border border-stone-300 rounded-lg bg-white h-[46px]">
                                          <button onClick={() => updateOrderItem(idx, 'quantity', Math.max(1, item.quantity - 1))} className="px-2 text-stone-500 hover:text-stone-800 h-full">-</button>
                                          <span className="flex-1 text-center font-bold text-stone-900">{item.quantity}</span>
                                          <button onClick={() => updateOrderItem(idx, 'quantity', item.quantity + 1)} className="px-2 text-stone-500 hover:text-stone-800 h-full">+</button>
                                       </div>
                                    </div>
                                 </div>
                                 
                                 <div className="flex gap-3 items-end">
                                    <div className="w-32">
                                       <label className="text-[10px] font-bold text-stone-500 uppercase mb-1 block">Preço Unit.</label>
                                       <div className="relative">
                                          <span className="absolute left-3 top-3 text-stone-500 font-bold text-sm">{settings.currencySymbol}</span>
                                          <input 
                                             type="number"
                                             value={item.price}
                                             onChange={(e) => updateOrderItem(idx, 'price', parseFloat(e.target.value))}
                                             className={`${INPUT_STYLE} pl-10`}
                                             placeholder="0.00"
                                          />
                                       </div>
                                    </div>
                                    <div className="flex-1">
                                       <label className="text-[10px] font-bold text-stone-500 uppercase mb-1 block">Observação</label>
                                       <input 
                                          value={item.observation || ''}
                                          onChange={(e) => updateOrderItem(idx, 'observation', e.target.value)}
                                          className={INPUT_STYLE}
                                          placeholder="Sem cebola, etc."
                                       />
                                    </div>
                                    <button 
                                       onClick={() => removeOrderItem(idx)} 
                                       className="h-[46px] w-[46px] flex items-center justify-center bg-red-50 border border-red-100 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                                       title="Remover Item"
                                    >
                                       <Trash2 className="w-5 h-5"/>
                                    </button>
                                 </div>
                              </div>
                           ))}

                           {/* Add New Item Block */}
                           <div className="p-4 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl">
                              <h4 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2"><Plus className="w-4 h-4"/> Adicionar Novo Item</h4>
                              <div className="flex gap-3 mb-3">
                                 <input 
                                    placeholder="Nome (Ex: Coca Cola)" 
                                    value={newItemName} 
                                    onChange={e => setNewItemName(e.target.value)} 
                                    className="flex-1 p-2 bg-white border border-blue-200 rounded-lg text-sm"
                                 />
                                 <input 
                                    placeholder="Preço (0.00)" 
                                    type="number" 
                                    value={newItemPrice} 
                                    onChange={e => setNewItemPrice(e.target.value)} 
                                    className="w-24 p-2 bg-white border border-blue-200 rounded-lg text-sm"
                                 />
                              </div>
                              <button 
                                 onClick={addNewItemToOrder} 
                                 className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors shadow-sm"
                              >
                                 Confirmar Adição
                              </button>
                           </div>
                        </div>
                     </div>

                     <div className="p-5 bg-white border-t border-stone-200 rounded-b-2xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-between items-center mb-4 text-lg">
                           <span className="font-bold text-stone-600">Novo Total:</span>
                           <span className="font-bold text-italian-green text-2xl">{settings.currencySymbol} {orderEditForm.total.toFixed(2)}</span>
                        </div>

                        <button onClick={saveOrderChanges} className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 shadow-lg text-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                           <Save className="w-5 h-5" /> Salvar Alterações
                        </button>
                     </div>
                  </div>
                </div>
              )}
           </div>
        )}

        {/* --- MENU MANAGEMENT --- */}
        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-stone-200">
                <input 
                  type="text" 
                  placeholder="Nome da Nova Categoria" 
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className={INPUT_STYLE}
                />
                <button 
                  onClick={() => { if(newCategoryName) { onAddCategory(newCategoryName); setNewCategoryName(''); } }}
                  className="bg-stone-800 text-white px-6 py-3 rounded-lg font-bold hover:bg-stone-900 transition-colors whitespace-nowrap"
                >
                  Adicionar Categoria
                </button>
             </div>

             {menuData.map(category => (
               <div key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                 <div className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       {editingCategoryId === category.id ? (
                          <div className="flex gap-2">
                             <input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="border p-1 rounded bg-white text-stone-800" />
                             <button onClick={() => { onUpdateCategory(category.id, { name: editCategoryName }); setEditingCategoryId(null); }} className="text-green-600 bg-green-100 p-1 rounded"><Check className="w-4 h-4" /></button>
                          </div>
                       ) : (
                          <h3 className="font-bold text-lg text-stone-800">{category.name} <span className="text-xs text-stone-500 bg-stone-200 px-2 py-0.5 rounded-full ml-2">{category.items.length} itens</span></h3>
                       )}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingCategoryId(category.id); setEditCategoryName(category.name); }} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition-colors"><Edit3 className="w-4 h-4"/></button>
                       <button onClick={() => onDeleteCategory(category.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                       <button onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)} className="p-2 text-stone-500 hover:bg-stone-200 rounded-lg transition-colors">
                          {expandedCategory === category.id ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                       </button>
                    </div>
                 </div>

                 {expandedCategory === category.id && (
                    <div className="p-6 bg-white">
                       <button 
                         onClick={() => { setNewProductForm({...newProductForm, category: category.id}); setIsAddingNew(true); }}
                         className="w-full py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 font-bold hover:bg-stone-50 hover:border-italian-red hover:text-italian-red transition-all mb-6 flex items-center justify-center gap-2"
                       >
                         <Plus className="w-5 h-5" /> Adicionar Novo Produto em "{category.name}"
                       </button>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.items.map(product => (
                             <div key={product.id} className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                                <div className="w-20 h-20 bg-stone-100 rounded-lg overflow-hidden shrink-0 border border-stone-100">
                                   {product.image ? (
                                      <img src={product.image} className="w-full h-full object-cover" />
                                   ) : (
                                      <div className="w-full h-full flex items-center justify-center text-stone-300"><ImageIcon className="w-8 h-8"/></div>
                                   )}
                                </div>
                                <div className="flex-1">
                                   <div className="flex justify-between items-start">
                                      <div>
                                         <h4 className="font-bold text-base text-stone-800">{product.name}</h4>
                                         <span className="font-mono text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{product.code || 'S/ Cod'}</span>
                                      </div>
                                      <p className="text-green-600 font-bold text-lg">{settings.currencySymbol} {product.price.toFixed(2)}</p>
                                   </div>
                                   <div className="flex gap-2 mt-3">
                                      <button onClick={() => startEditing(product)} className="flex-1 py-1.5 bg-stone-100 text-stone-600 text-xs font-bold rounded-lg hover:bg-stone-200 transition-colors">Editar</button>
                                      <button onClick={() => onDeleteProduct(category.id, product.id)} className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors">Excluir</button>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
               </div>
             ))}

             {/* PRODUCT MODAL - WHITE THEME */}
             {(isAddingNew || editingProduct) && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 flex flex-col">
                     <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-white rounded-t-2xl sticky top-0 z-10">
                        <h2 className="font-bold text-xl text-stone-900">{isAddingNew ? 'Cadastrar Novo Produto' : 'Editar Produto'}</h2>
                        <button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"><X className="w-6 h-6"/></button>
                     </div>
                     
                     <div className="p-8 space-y-6 bg-stone-50 flex-1 overflow-y-auto">
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="col-span-2">
                                 <label className={LABEL_STYLE}>Nome do Produto</label>
                                 <input 
                                    placeholder="Ex: Pizza de Calabresa" 
                                    value={isAddingNew ? newProductForm.name : editForm.name} 
                                    onChange={e => isAddingNew ? setNewProductForm({...newProductForm, name: e.target.value}) : setEditForm({...editForm, name: e.target.value})}
                                    className={INPUT_STYLE}
                                 />
                              </div>
                              <div>
                                 <label className={LABEL_STYLE}>Código (PDV)</label>
                                 <input 
                                    placeholder="Ex: 901" 
                                    value={isAddingNew ? newProductForm.code : editForm.code} 
                                    onChange={e => isAddingNew ? setNewProductForm({...newProductForm, code: e.target.value}) : setEditForm({...editForm, code: e.target.value})}
                                    className={INPUT_STYLE}
                                 />
                              </div>
                           </div>

                           <div>
                              <label className={LABEL_STYLE}>Descrição</label>
                              <textarea 
                                 placeholder="Descreva os ingredientes e detalhes..."
                                 className={`${INPUT_STYLE} h-24 resize-none`}
                                 value={isAddingNew ? newProductForm.description : editForm.description}
                                 onChange={e => isAddingNew ? setNewProductForm({...newProductForm, description: e.target.value}) : setEditForm({...editForm, description: e.target.value})}
                              />
                           </div>

                           <div className="grid grid-cols-2 gap-6">
                              <div>
                                 <label className={LABEL_STYLE}>Preço ({settings.currencySymbol})</label>
                                 <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={isAddingNew ? newProductForm.price : editForm.price} 
                                    onChange={e => isAddingNew ? setNewProductForm({...newProductForm, price: parseFloat(e.target.value)}) : setEditForm({...editForm, price: parseFloat(e.target.value)})}
                                    className={INPUT_STYLE}
                                 />
                              </div>
                              <div>
                                 <label className={LABEL_STYLE}>Categoria Principal</label>
                                 <select 
                                    value={isAddingNew ? newProductForm.category : editForm.category}
                                    onChange={e => isAddingNew ? setNewProductForm({...newProductForm, category: e.target.value}) : setEditForm({...editForm, category: e.target.value})}
                                    className={INPUT_STYLE}
                                 >
                                    {menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                 </select>
                              </div>
                           </div>
                           
                           {/* MULTIPLE CATEGORIES */}
                           <div>
                                <label className={LABEL_STYLE}>Categorias Adicionais (Aparecer em mais locais)</label>
                                <div className="flex flex-wrap gap-2 mt-2 p-3 bg-stone-50 rounded-lg border border-stone-200">
                                    {menuData.map(c => {
                                        const currentAdditional = isAddingNew ? (newProductForm.additional_categories || []) : (editForm.additional_categories || []);
                                        const isSelected = currentAdditional.includes(c.id);
                                        return (
                                            <button
                                                key={c.id}
                                                onClick={() => toggleAdditionalCategory(c.id, isAddingNew)}
                                                className={`text-xs px-2 py-1 rounded-full border transition-all ${isSelected ? 'bg-italian-red text-white border-italian-red' : 'bg-white text-stone-500 border-stone-300'}`}
                                            >
                                                {c.name} {isSelected && '✓'}
                                            </button>
                                        )
                                    })}
                                </div>
                           </div>
                        </div>

                        {/* Image Upload */}
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                           <label className={LABEL_STYLE}>Imagem do Produto</label>
                           <div className="border-2 border-dashed border-stone-300 rounded-xl p-6 text-center hover:bg-stone-50 transition-colors">
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, isAddingNew)} className="hidden" id="img-upload" />
                              <label htmlFor="img-upload" className="cursor-pointer flex flex-col items-center gap-2 w-full h-full">
                                 {isProcessingImage ? <RefreshCw className="w-8 h-8 animate-spin text-stone-400"/> : (
                                    (isAddingNew ? newProductForm.image : editForm.image) ? (
                                       <img src={isAddingNew ? newProductForm.image : editForm.image} className="h-40 object-contain rounded-lg shadow-sm" />
                                    ) : (
                                       <>
                                          <div className="bg-stone-100 p-4 rounded-full"><ImageIcon className="w-8 h-8 text-stone-400" /></div>
                                          <span className="text-sm font-bold text-stone-600">Clique para enviar uma foto</span>
                                          <span className="text-xs text-stone-400">JPG, PNG ou WebP</span>
                                       </>
                                    )
                                 )}
                              </label>
                           </div>
                        </div>

                        {/* Tags */}
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                           <label className={LABEL_STYLE}>Tags de Destaque</label>
                           <div className="flex flex-wrap gap-2 mt-2">
                              {['popular', 'new', 'vegetarian', 'spicy'].map(tag => {
                                 const currentTags = isAddingNew ? (newProductForm.tags || []) : (editForm.tags || []);
                                 const hasTag = currentTags.includes(tag);
                                 return (
                                    <button 
                                      key={tag}
                                      onClick={() => {
                                         const newTags = hasTag ? currentTags.filter(t => t !== tag) : [...currentTags, tag];
                                         if(isAddingNew) setNewProductForm({...newProductForm, tags: newTags});
                                         else setEditForm({...editForm, tags: newTags});
                                      }}
                                      className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${hasTag ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-300 hover:border-stone-400'}`}
                                    >
                                       {tag === 'popular' ? '★ Popular' : tag === 'new' ? '⚡ Novo' : tag === 'vegetarian' ? '🌿 Vegetariano' : '🔥 Picante'}
                                    </button>
                                 )
                              })}
                           </div>
                        </div>

                        {/* Options */}
                        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
                           <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg text-stone-800">Opções e Adicionais</h3>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">Variações e Extras</span>
                           </div>
                           
                           <div className="flex flex-col md:flex-row gap-3 mb-6 bg-stone-50 p-4 rounded-xl border border-stone-200">
                              <input placeholder="Nome do Grupo (Ex: Borda, Ponto da Carne)" value={newOptionName} onChange={e => setNewOptionName(e.target.value)} className={`${INPUT_STYLE} flex-1`} />
                              <div className="w-full md:w-48">
                                 <select value={newOptionType} onChange={(e:any) => setNewOptionType(e.target.value)} className={INPUT_STYLE}>
                                    <option value="single">Escolha Única (Radio)</option>
                                    <option value="multiple">Múltipla Escolha (Check)</option>
                                 </select>
                              </div>
                              <button onClick={() => addOptionToForm(isAddingNew)} className="bg-stone-800 text-white px-4 py-3 rounded-lg font-bold hover:bg-stone-900 shadow-sm flex items-center justify-center gap-2 whitespace-nowrap">
                                 <Plus className="w-4 h-4"/> Criar Grupo
                              </button>
                           </div>

                           <div className="space-y-4">
                              {((isAddingNew ? newProductForm.options : editForm.options) || []).map((opt, idx) => (
                                 <div key={idx} className="border border-stone-200 rounded-xl overflow-hidden">
                                    <div className="bg-stone-50 p-3 flex justify-between items-center border-b border-stone-200">
                                       <span className="font-bold text-stone-700 text-sm flex items-center gap-2">
                                           {opt.name} 
                                           <span className={`text-[10px] px-2 py-0.5 rounded-full border ${opt.type === 'single' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-purple-50 text-purple-600 border-purple-200'}`}>
                                               {opt.type === 'single' ? 'Escolha Única' : 'Múltipla Escolha'}
                                           </span>
                                       </span>
                                       <button onClick={() => removeOptionFromForm(opt.id, isAddingNew)} className="text-red-500 text-xs font-bold hover:bg-red-100 p-1 rounded transition-colors flex items-center gap-1">
                                           <Trash2 className="w-3 h-3" /> Remover Grupo
                                       </button>
                                    </div>
                                    <div className="p-4 space-y-2 bg-white">
                                       {opt.choices.map((c, cIdx) => (
                                          <div key={cIdx} className="flex justify-between text-sm text-stone-600 bg-stone-50 p-2 rounded border border-stone-100 items-center">
                                             <span className="font-bold">{c.name}</span>
                                             <div className="flex items-center gap-3">
                                                <span>+{settings.currencySymbol} {c.price.toFixed(2)}</span>
                                                <button onClick={() => removeChoiceFromOption(opt.id, cIdx, isAddingNew)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                             </div>
                                          </div>
                                       ))}
                                       <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                                          <input id={`new-choice-name-${opt.id}`} placeholder="Opção (Ex: Catupiry)" className={`${INPUT_STYLE} py-2 text-sm`} />
                                          <input id={`new-choice-price-${opt.id}`} placeholder="0.00" type="number" className={`${INPUT_STYLE} py-2 text-sm w-24`} />
                                          <button 
                                            onClick={() => {
                                               const nameInput = document.getElementById(`new-choice-name-${opt.id}`) as HTMLInputElement;
                                               const priceInput = document.getElementById(`new-choice-price-${opt.id}`) as HTMLInputElement;
                                               addChoiceToOption(opt.id, nameInput.value, priceInput.value, isAddingNew);
                                               nameInput.value = ''; priceInput.value = '';
                                            }}
                                            className="bg-green-100 text-green-700 px-3 rounded-lg text-sm font-bold border border-green-200 hover:bg-green-200"
                                          >Add</button>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                              {((isAddingNew ? newProductForm.options : editForm.options) || []).length === 0 && (
                                 <p className="text-center text-stone-400 text-sm italic py-2">Nenhuma opção adicionada.</p>
                              )}
                           </div>
                        </div>
                     </div>

                     <div className="p-5 bg-white border-t border-stone-200 sticky bottom-0 rounded-b-2xl">
                        <button 
                           onClick={isAddingNew ? handleAddNewProduct : saveEdit}
                           className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 shadow-lg text-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                           <Save className="w-5 h-5" /> {isAddingNew ? 'Cadastrar Produto' : 'Salvar Alterações'}
                        </button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* --- COUPONS --- */}
        {activeTab === 'coupons' && (
           <div className={CARD_STYLE}>
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900"><Ticket className="w-5 h-5 text-italian-red"/> Cupons de Desconto</h2>
                 <button onClick={() => setIsAddingCoupon(!isAddingCoupon)} className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors shadow-sm"><Plus className="w-4 h-4"/> Novo Cupom</button>
              </div>

              {isAddingCoupon && (
                 <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 space-y-4 mb-6 animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className={LABEL_STYLE}>Código</label>
                          <input placeholder="Ex: PROMO10" value={couponForm.code || ''} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className={`${INPUT_STYLE} uppercase`} />
                       </div>
                       <div>
                          <label className={LABEL_STYLE}>Tipo de Desconto</label>
                          <select value={couponForm.type} onChange={(e: any) => setCouponForm({...couponForm, type: e.target.value})} className={INPUT_STYLE}>
                             <option value="percent">Porcentagem (%)</option>
                             <option value="fixed">Valor Fixo ({settings.currencySymbol})</option>
                             <option value="free_shipping">Frete Grátis</option>
                          </select>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                          <label className={LABEL_STYLE}>{couponForm.type === 'percent' ? 'Porcentagem' : 'Valor'}</label>
                          <input type="number" placeholder="0" value={couponForm.discount_value || ''} onChange={e => setCouponForm({...couponForm, discount_value: parseFloat(e.target.value)})} className={INPUT_STYLE} disabled={couponForm.type === 'free_shipping'} />
                       </div>
                       <div>
                          <label className={LABEL_STYLE}>Pedido Mínimo</label>
                          <input type="number" placeholder="0.00" value={couponForm.min_order_value || ''} onChange={e => setCouponForm({...couponForm, min_order_value: parseFloat(e.target.value)})} className={INPUT_STYLE} />
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                       <div>
                          <label className={LABEL_STYLE}>Validade (Opcional)</label>
                          <input type="date" value={couponForm.end_date || ''} onChange={e => setCouponForm({...couponForm, end_date: e.target.value})} className={INPUT_STYLE} />
                       </div>
                       <div className="flex items-center gap-2 pb-3">
                          <input type="checkbox" className="w-5 h-5 text-italian-red rounded focus:ring-italian-red" checked={couponForm.active} onChange={e => setCouponForm({...couponForm, active: e.target.checked})} />
                          <label className="font-bold text-stone-700">Cupom Ativo</label>
                       </div>
                    </div>
                    <button onClick={handleSaveCoupon} className="bg-green-600 text-white w-full py-3 rounded-lg font-bold hover:bg-green-700 shadow-sm">Salvar Cupom</button>
                 </div>
              )}

              <div className="space-y-3">
                 {coupons.map(c => (
                    <div key={c.id} className="border border-stone-200 p-4 rounded-xl flex justify-between items-center bg-white hover:shadow-sm transition-shadow">
                       <div>
                          <p className="font-bold text-lg text-stone-800">{c.code} <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${c.active ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>{c.active ? 'Ativo' : 'Inativo'}</span></p>
                          <p className="text-sm text-stone-500 mt-1">
                             {c.type === 'free_shipping' ? 'Frete Grátis' : c.type === 'fixed' ? `${settings.currencySymbol} ${c.discount_value} OFF` : `${c.discount_value}% OFF`}
                             {c.min_order_value ? ` (Min: ${settings.currencySymbol} ${c.min_order_value})` : ''}
                          </p>
                       </div>
                       <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors"><Trash2 className="w-5 h-5" /></button>
                    </div>
                 ))}
                 {coupons.length === 0 && <div className="text-center text-stone-400 py-8 bg-stone-50 rounded-xl border border-stone-100"><Ticket className="w-10 h-10 mx-auto mb-2 opacity-20"/><p>Nenhum cupom criado.</p></div>}
              </div>
           </div>
        )}

        {/* --- TABLES --- */}
        {activeTab === 'tables' && (
            <div className={CARD_STYLE}>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-stone-900"><QrCode className="w-5 h-5 text-italian-red"/> Mesas & QR Codes</h2>
                </div>
                
                <div className="flex gap-4 mb-8 bg-stone-50 p-4 rounded-xl border border-stone-200">
                     <input type="text" placeholder="Número/Nome da Mesa" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} className={`${INPUT_STYLE} flex-1`} />
                     <button onClick={handleAddTable} className="bg-stone-800 text-white px-6 rounded-lg font-bold hover:bg-stone-900 transition-colors shadow-sm">Adicionar</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {tables.map(table => (
                        <div key={table.id} className="border border-stone-200 p-6 rounded-xl bg-white flex flex-col items-center hover:shadow-lg transition-shadow group">
                            <h3 className="font-bold text-xl text-stone-800 mb-2">Mesa {table.number}</h3>
                            <div className="bg-white p-2 rounded-lg border border-stone-100 mb-4">
                               <img src={getQrCodeUrl(table.number)} className="w-32 h-32 object-contain" />
                            </div>
                            <div className="flex gap-2 w-full">
                               <button onClick={() => printQrCode(table.number)} className="flex-1 bg-blue-50 text-blue-600 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100">Imprimir</button>
                               <button onClick={() => handleDeleteTable(table.id)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-100">Remover</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- SETTINGS TAB (RESTORED & ORGANIZED) --- */}
        {activeTab === 'settings' && (
           <div className="space-y-8 animate-in fade-in">
              
              {/* 1. GENERAL SETTINGS */}
              <div className={CARD_STYLE}>
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><Settings className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Informações Gerais</h2>
                        <p className="text-sm text-stone-500">Endereço, Contato e Moeda</p>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={LABEL_STYLE}>Nome da Loja</label>
                            <input 
                                type="text" 
                                value={settingsForm.name || ''} 
                                onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} 
                                className={INPUT_STYLE}
                            />
                        </div>
                        <div>
                            <label className={LABEL_STYLE}>WhatsApp Principal (Somente números)</label>
                            <input 
                                type="text" 
                                value={settingsForm.whatsapp || ''} 
                                onChange={e => setSettingsForm({...settingsForm, whatsapp: e.target.value})} 
                                className={INPUT_STYLE}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={LABEL_STYLE}>Endereço Completo</label>
                        <input 
                            type="text" 
                            value={settingsForm.address || ''} 
                            onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} 
                            className={INPUT_STYLE}
                            placeholder="Rua, Número, Bairro, Cidade"
                        />
                    </div>

                    <div>
                        <label className={LABEL_STYLE}>Telefones Adicionais</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {settingsForm.phones.map((p, idx) => (
                                <span key={idx} className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 border border-stone-200">
                                    <Phone className="w-3 h-3"/> {p}
                                    <button onClick={() => handleRemovePhone(idx)} className="text-red-500 hover:text-red-700"><X className="w-3 h-3"/></button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="Adicionar telefone..." className={`${INPUT_STYLE} max-w-xs`} />
                            <button onClick={handleAddPhone} className="bg-stone-800 text-white px-4 rounded-lg font-bold">Add</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={LABEL_STYLE}>Símbolo da Moeda</label>
                            <input 
                                type="text" 
                                value={settingsForm.currencySymbol || 'R$'} 
                                onChange={e => setSettingsForm({...settingsForm, currencySymbol: e.target.value})} 
                                className={INPUT_STYLE}
                            />
                        </div>
                    </div>
                 </div>
              </div>

              {/* 2. VISUAL & THEME */}
              <div className={CARD_STYLE}>
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><Palette className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Visual e Cores</h2>
                        <p className="text-sm text-stone-500">Personalize a aparência do seu cardápio</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={LABEL_STYLE}>Fonte do Sistema</label>
                        <select 
                            value={settingsForm.fontFamily || 'Outfit'} 
                            onChange={e => setSettingsForm({...settingsForm, fontFamily: e.target.value})}
                            className={INPUT_STYLE}
                        >
                            {FONTS_LIST.map(f => <option key={f} value={f} style={{fontFamily: f}}>{f}</option>)}
                        </select>
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className={LABEL_STYLE}>Cor Principal</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={settingsForm.colors?.primary || '#C8102E'} onChange={e => setSettingsForm({...settingsForm, colors:{...settingsForm.colors!, primary: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border border-stone-300"/>
                                <span className="text-xs font-mono bg-stone-100 px-2 py-1 rounded">{settingsForm.colors?.primary}</span>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_STYLE}>Cor Secundária</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={settingsForm.colors?.secondary || '#008C45'} onChange={e => setSettingsForm({...settingsForm, colors:{...settingsForm.colors!, secondary: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border border-stone-300"/>
                                <span className="text-xs font-mono bg-stone-100 px-2 py-1 rounded">{settingsForm.colors?.secondary}</span>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_STYLE}>Fundo do Cabeçalho</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={settingsForm.colors?.headerBackground || settingsForm.colors?.primary || '#C8102E'} onChange={e => setSettingsForm({...settingsForm, colors:{...settingsForm.colors!, headerBackground: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border border-stone-300"/>
                                <span className="text-xs font-mono bg-stone-100 px-2 py-1 rounded">{settingsForm.colors?.headerBackground}</span>
                            </div>
                        </div>
                        <div>
                            <label className={LABEL_STYLE}>Texto do Cabeçalho</label>
                            <div className="flex items-center gap-2">
                                <input type="color" value={settingsForm.colors?.headerText || '#FFFFFF'} onChange={e => setSettingsForm({...settingsForm, colors:{...settingsForm.colors!, headerText: e.target.value}})} className="h-10 w-10 rounded cursor-pointer border border-stone-300"/>
                                <span className="text-xs font-mono bg-stone-100 px-2 py-1 rounded">{settingsForm.colors?.headerText}</span>
                            </div>
                        </div>
                    </div>
                 </div>
              </div>

              {/* 3. DELIVERY SETTINGS */}
              <div className={CARD_STYLE}>
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="bg-green-100 p-2 rounded-lg text-green-600"><Truck className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Entrega e Taxas</h2>
                        <p className="text-sm text-stone-500">Gerencie regiões e custos de envio</p>
                    </div>
                 </div>

                 <div className="mb-6 p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <h4 className="font-bold text-stone-800 mb-3">Adicionar Nova Região</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <input placeholder="Nome (Ex: Centro)" value={newRegionName} onChange={e => setNewRegionName(e.target.value)} className={INPUT_STYLE} />
                        <input placeholder="Preço da Taxa (Ex: 5.00)" type="number" value={newRegionPrice} onChange={e => setNewRegionPrice(e.target.value)} className={INPUT_STYLE} />
                        <input placeholder="Faixas de CEP (Ex: 13295-000, 13295...)" value={newRegionZips} onChange={e => setNewRegionZips(e.target.value)} className={INPUT_STYLE} />
                        <input placeholder="Bairros (Ex: Centro, Jardim Alvorada)" value={newRegionNeighborhoods} onChange={e => setNewRegionNeighborhoods(e.target.value)} className={INPUT_STYLE} />
                    </div>
                    <button onClick={handleAddRegion} className="bg-stone-800 text-white px-4 py-2 rounded-lg font-bold text-sm">Adicionar Região</button>
                 </div>

                 <div className="space-y-3">
                    {settingsForm.deliveryRegions?.map(region => (
                        <div key={region.id} className="flex justify-between items-center p-3 border border-stone-200 rounded-lg hover:bg-stone-50">
                            <div>
                                <p className="font-bold text-stone-800">{region.name}</p>
                                <p className="text-xs text-stone-500">
                                    {region.neighborhoods?.join(', ')} 
                                    {region.zipRules && region.zipRules.length > 0 && ` | CEPs: ${region.zipRules.join(', ')}`}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-green-600">{settings.currencySymbol} {region.price.toFixed(2)}</span>
                                <button onClick={() => handleRemoveRegion(region.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-full"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        </div>
                    ))}
                 </div>
              </div>

              {/* 4. HOURS */}
              <div className={CARD_STYLE}>
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="bg-orange-100 p-2 rounded-lg text-orange-600"><Clock className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">Horários de Funcionamento</h2>
                        <p className="text-sm text-stone-500">Configure quando sua loja está aberta</p>
                    </div>
                 </div>
                 
                 <div className="space-y-4">
                    {Object.keys(WEEKDAYS_PT).map((dayKey) => {
                        const schedule = settingsForm.schedule || {} as WeeklySchedule;
                        const dayData = schedule[dayKey as keyof WeeklySchedule] || { isOpen: false, intervals: [] };
                        return (
                            <div key={dayKey} className="border border-stone-200 p-4 rounded-xl flex flex-col gap-3 bg-white hover:bg-stone-50 transition-colors">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-stone-700">{WEEKDAYS_PT[dayKey as keyof typeof WEEKDAYS_PT]}</span>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-sm text-stone-500">{dayData.isOpen ? 'Aberto' : 'Fechado'}</span>
                                    <input type="checkbox" className="w-5 h-5 accent-italian-green" checked={dayData.isOpen} onChange={(e) => {
                                        const newSchedule = { ...schedule };
                                        // @ts-ignore
                                        newSchedule[dayKey] = { ...dayData, isOpen: e.target.checked };
                                        setSettingsForm({ ...settingsForm, schedule: newSchedule });
                                    }} />
                                    </label>
                                </div>
                                {dayData.isOpen && (
                                    <div className="space-y-2 pl-4 border-l-2 border-stone-200">
                                    {dayData.intervals.map((int, i) => (
                                        <div key={i} className="flex gap-2 text-sm items-center">
                                            <input type="time" value={int.start} onChange={e => {
                                                const newInts = [...dayData.intervals]; newInts[i].start = e.target.value;
                                                const newSchedule = {...schedule}; 
                                                // @ts-ignore
                                                newSchedule[dayKey] = {...dayData, intervals: newInts};
                                                setSettingsForm({...settingsForm, schedule: newSchedule});
                                            }} className="border p-2 rounded bg-white border-stone-300" />
                                            <span className="text-stone-400">até</span>
                                            <input type="time" value={int.end} onChange={e => {
                                                const newInts = [...dayData.intervals]; newInts[i].end = e.target.value;
                                                const newSchedule = {...schedule};
                                                // @ts-ignore
                                                newSchedule[dayKey] = {...dayData, intervals: newInts};
                                                setSettingsForm({...settingsForm, schedule: newSchedule});
                                            }} className="border p-2 rounded bg-white border-stone-300" />
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const newInts = [...dayData.intervals, {start:'18:00', end:'23:00'}];
                                        const newSchedule = {...schedule};
                                        // @ts-ignore
                                        newSchedule[dayKey] = {...dayData, intervals: newInts};
                                        setSettingsForm({...settingsForm, schedule: newSchedule});
                                        }} className="text-xs text-blue-600 font-bold mt-1">+ Adicionar Turno</button>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                 </div>
              </div>

              {/* 5. SEO & SHARING */}
              <div className={CARD_STYLE}>
                 <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
                    <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><Share2 className="w-6 h-6"/></div>
                    <div>
                        <h2 className="text-xl font-bold text-stone-900">SEO & Compartilhamento</h2>
                        <p className="text-sm text-stone-500">Como seu link aparece no WhatsApp e Google</p>
                    </div>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <label className={LABEL_STYLE}>Título da Página</label>
                       <input 
                         value={settingsForm.seoTitle || ''} 
                         onChange={e => setSettingsForm({...settingsForm, seoTitle: e.target.value})}
                         className={INPUT_STYLE}
                         placeholder="Ex: Pizzaria do João - A Melhor da Cidade"
                       />
                    </div>
                    <div>
                       <label className={LABEL_STYLE}>Descrição Curta</label>
                       <textarea 
                         value={settingsForm.seoDescription || ''} 
                         onChange={e => setSettingsForm({...settingsForm, seoDescription: e.target.value})}
                         className={`${INPUT_STYLE} h-24 resize-none`}
                         placeholder="Descrição que aparece ao compartilhar o link..."
                       />
                    </div>
                    <div>
                       <label className={LABEL_STYLE}>URL da Imagem (Banner)</label>
                       <input 
                         value={settingsForm.seoBannerUrl || ''} 
                         onChange={e => setSettingsForm({...settingsForm, seoBannerUrl: e.target.value})}
                         className={INPUT_STYLE}
                         placeholder="https://..."
                       />
                    </div>
                 </div>
              </div>
              
              <div className="sticky bottom-4 z-20 pb-8">
                 <button onClick={handleSaveSettings} className="bg-green-600 text-white w-full py-4 rounded-xl font-bold hover:bg-green-700 shadow-xl text-lg flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                    <Save className="w-6 h-6" /> Salvar Todas Configurações
                 </button>
              </div>
           </div>
        )}

      </main>
    </div>
  );
};