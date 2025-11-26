
import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon, DeliveryRegion, WeeklySchedule, Table } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Ticket, QrCode, Clock, CreditCard, LayoutDashboard, ShoppingBag, Palette, Phone } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'menu' | 'coupons' | 'tables' | 'appearance' | 'hours' | 'settings'>('dashboard');
  
  // Dashboard State
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || '',
    image: '', price: 0, subcategory: '', ingredients: [], tags: []
  });

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');

  // Option Management
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<'single' | 'multiple'>('single');
  const [tempIngredient, setTempIngredient] = useState('');

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
  const [tempPhone, setTempPhone] = useState('');
  const [tempPayment, setTempPayment] = useState('');

  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => { setSettingsForm(settings); }, [settings]);

  useEffect(() => {
    if (isAuthenticated && supabase) {
      if (activeTab === 'orders' || activeTab === 'dashboard') {
        fetchOrders();
      }
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'tables') fetchTables();
    }
  }, [isAuthenticated, activeTab]);

  const fetchOrders = async () => {
    if (!supabase) return;
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta');
    }
  };

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
    setEditForm({ ...product });
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
      alert('Preencha nome, preço e categoria');
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
      tags: newProductForm.tags || []
    };
    onAddProduct(newProductForm.category!, productToAdd);
    setIsAddingNew(false);
    setNewProductForm({ category: menuData[0]?.id || '', image: '', price: 0, subcategory: '', ingredients: [], tags: [] });
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

  // --- Settings Logic ---
  const handleSaveSettings = () => {
    onUpdateSettings(settingsForm);
    alert('Configurações salvas!');
  };

  const handleAddRegion = () => {
    if (!newRegionName || !newRegionPrice) return;
    
    // Logic: If neighborhoods is empty, use the Name as the neighborhood
    let neighborhoodsList: string[] = [];
    if (newRegionNeighborhoods.trim()) {
        neighborhoodsList = newRegionNeighborhoods.split(',').map(s => s.trim()).filter(s => s);
    } else {
        // Auto-fill neighborhood with region name for ease of use
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
     return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  };
  const getTableLink = (tableNum: string) => {
     const origin = window.location.origin + window.location.pathname;
     return `${origin}?mesa=${tableNum}`;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <h2 className="text-2xl font-bold mb-6 text-center text-stone-800">Acesso Administrativo</h2>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="border p-3 rounded-lg w-full mb-4 outline-none focus:ring-2 focus:ring-italian-red" 
            placeholder="Senha do Administrador" 
          />
          <button className="bg-italian-red text-white w-full py-3 rounded-lg font-bold hover:bg-red-700 transition-colors">
            Entrar no Sistema
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-20 text-stone-800 font-sans">
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-lg hidden md:block">Gerenciar Sistema</h1>
            </div>
            <div className="flex gap-2">
               <button onClick={fetchOrders} className="p-2 bg-stone-800 hover:bg-stone-700 rounded-full" title="Atualizar Pedidos"><RefreshCw className="w-4 h-4"/></button>
               <button onClick={() => { if(window.confirm('Resetar cardápio para o padrão?')) onResetMenu(); }} className="text-xs bg-red-900/50 px-3 py-1.5 rounded border border-red-800 hover:bg-red-900">Resetar Tudo</button>
            </div>
          </div>

          <div className="flex space-x-1 md:space-x-2 overflow-x-auto hide-scrollbar pb-1">
             {[
               { id: 'dashboard', icon: LayoutDashboard, label: 'Dash' },
               { id: 'orders', icon: ShoppingBag, label: 'Pedidos' },
               { id: 'menu', icon: Grid, label: 'Cardápio' },
               { id: 'coupons', icon: Ticket, label: 'Cupons' },
               { id: 'tables', icon: QrCode, label: 'Mesas' },
               { id: 'appearance', icon: Palette, label: 'Visual' },
               { id: 'hours', icon: Clock, label: 'Horários' },
               { id: 'settings', icon: Settings, label: 'Config' },
             ].map(tab => (
               <button 
                 key={tab.id}
                 onClick={() => setActiveTab(tab.id as any)} 
                 className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold transition-colors whitespace-nowrap ${activeTab === tab.id ? 'bg-stone-100 text-stone-900' : 'text-stone-400 hover:text-white hover:bg-stone-800'}`}
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
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                 <h3 className="text-stone-500 text-sm font-bold uppercase">Total de Pedidos</h3>
                 <p className="text-3xl font-bold text-stone-800 mt-2">{orders.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                 <h3 className="text-stone-500 text-sm font-bold uppercase">Receita Estimada</h3>
                 <p className="text-3xl font-bold text-green-600 mt-2">
                    {settings.currencySymbol} {orders.reduce((acc, order) => acc + order.total, 0).toFixed(2)}
                 </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                 <h3 className="text-stone-500 text-sm font-bold uppercase">Produtos no Menu</h3>
                 <p className="text-3xl font-bold text-blue-600 mt-2">
                    {menuData.reduce((acc, cat) => acc + cat.items.length, 0)}
                 </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                 <h3 className="text-stone-500 text-sm font-bold uppercase">Cupons Ativos</h3>
                 <p className="text-3xl font-bold text-purple-600 mt-2">{coupons.filter(c => c.active).length}</p>
              </div>
           </div>
        )}

        {/* --- ORDERS --- */}
        {activeTab === 'orders' && (
           <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
                 <h2 className="font-bold text-lg">Últimos Pedidos</h2>
                 <span className="text-xs text-stone-500">Mostrando os últimos 50</span>
              </div>
              <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-stone-100 text-stone-600 font-bold">
                       <tr>
                          <th className="p-3">#ID</th>
                          <th className="p-3">Cliente</th>
                          <th className="p-3">Tipo</th>
                          <th className="p-3">Total</th>
                          <th className="p-3">Data</th>
                          <th className="p-3">Status</th>
                       </tr>
                    </thead>
                    <tbody>
                       {orders.map(order => (
                          <tr key={order.id} className="border-b border-stone-100 hover:bg-stone-50">
                             <td className="p-3 font-mono text-stone-500">#{order.id}</td>
                             <td className="p-3 font-medium">{order.customer_name}</td>
                             <td className="p-3">
                                {order.delivery_type === 'table' ? `Mesa ${order.table_number}` : 
                                 order.delivery_type === 'delivery' ? 'Entrega' : 'Retirada'}
                             </td>
                             <td className="p-3 font-bold text-green-600">{settings.currencySymbol} {order.total.toFixed(2)}</td>
                             <td className="p-3 text-stone-500">{new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString().slice(0,5)}</td>
                             <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                   order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                   order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                   'bg-yellow-100 text-yellow-700'
                                }`}>
                                   {order.status === 'pending' ? 'Pendente' : order.status}
                                </span>
                             </td>
                          </tr>
                       ))}
                       {orders.length === 0 && (
                          <tr><td colSpan={6} className="p-8 text-center text-stone-400">Nenhum pedido encontrado.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>
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
                  className="border p-2 rounded-lg flex-1"
                />
                <button 
                  onClick={() => { if(newCategoryName) { onAddCategory(newCategoryName); setNewCategoryName(''); } }}
                  className="bg-stone-800 text-white px-4 py-2 rounded-lg font-bold hover:bg-stone-900"
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
                             <input value={editCategoryName} onChange={e => setEditCategoryName(e.target.value)} className="border p-1 rounded" />
                             <button onClick={() => { onUpdateCategory(category.id, { name: editCategoryName }); setEditingCategoryId(null); }} className="text-green-600"><Check className="w-4 h-4" /></button>
                          </div>
                       ) : (
                          <h3 className="font-bold text-lg">{category.name} <span className="text-xs text-stone-400 bg-stone-200 px-2 rounded-full">{category.items.length}</span></h3>
                       )}
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => { setEditingCategoryId(category.id); setEditCategoryName(category.name); }} className="p-1 text-stone-400 hover:text-stone-600"><Edit3 className="w-4 h-4"/></button>
                       <button onClick={() => onDeleteCategory(category.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                       <button onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)} className="p-1 text-stone-400 hover:text-stone-600 bg-stone-200 rounded">
                          {expandedCategory === category.id ? 'Ocultar' : 'Ver Produtos'}
                       </button>
                    </div>
                 </div>

                 {expandedCategory === category.id && (
                    <div className="p-4 bg-stone-50/50">
                       <button 
                         onClick={() => { setNewProductForm({...newProductForm, category: category.id}); setIsAddingNew(true); }}
                         className="w-full py-3 border-2 border-dashed border-stone-300 rounded-lg text-stone-500 font-bold hover:bg-stone-50 hover:border-stone-400 transition-colors mb-4 flex items-center justify-center gap-2"
                       >
                         <Plus className="w-5 h-5" /> Adicionar Produto em {category.name}
                       </button>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.items.map(product => (
                             <div key={product.id} className="bg-white p-3 rounded-lg border border-stone-200 flex gap-3">
                                <div className="w-16 h-16 bg-stone-100 rounded-md overflow-hidden shrink-0">
                                   {product.image && <img src={product.image} className="w-full h-full object-cover" />}
                                </div>
                                <div className="flex-1">
                                   <div className="flex justify-between">
                                      <h4 className="font-bold text-sm">{product.name}</h4>
                                      <span className="font-mono text-xs text-stone-400">{product.code}</span>
                                   </div>
                                   <p className="text-green-600 font-bold text-sm">{settings.currencySymbol} {product.price.toFixed(2)}</p>
                                   <div className="flex gap-2 mt-2">
                                      <button onClick={() => startEditing(product)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100">Editar</button>
                                      <button onClick={() => onDeleteProduct(category.id, product.id)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">Excluir</button>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
               </div>
             ))}

             {/* PRODUCT FORM MODAL (Add/Edit) */}
             {(isAddingNew || editingProduct) && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                     <div className="p-4 border-b border-stone-100 flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 className="font-bold text-xl">{isAddingNew ? 'Novo Produto' : 'Editar Produto'}</h2>
                        <button onClick={() => { setIsAddingNew(false); setEditingProduct(null); }} className="p-2 hover:bg-stone-100 rounded-full"><X className="w-6 h-6"/></button>
                     </div>
                     
                     <div className="p-6 space-y-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <input 
                             placeholder="Código (Ex: 901)" 
                             value={isAddingNew ? newProductForm.code : editForm.code} 
                             onChange={e => isAddingNew ? setNewProductForm({...newProductForm, code: e.target.value}) : setEditForm({...editForm, code: e.target.value})}
                             className="border p-2 rounded"
                           />
                           <input 
                             placeholder="Nome do Produto" 
                             value={isAddingNew ? newProductForm.name : editForm.name} 
                             onChange={e => isAddingNew ? setNewProductForm({...newProductForm, name: e.target.value}) : setEditForm({...editForm, name: e.target.value})}
                             className="border p-2 rounded"
                           />
                        </div>
                        
                        <textarea 
                           placeholder="Descrição"
                           className="w-full border p-2 rounded h-20"
                           value={isAddingNew ? newProductForm.description : editForm.description}
                           onChange={e => isAddingNew ? setNewProductForm({...newProductForm, description: e.target.value}) : setEditForm({...editForm, description: e.target.value})}
                        />

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-xs font-bold text-stone-500 mb-1">Preço</label>
                              <input 
                                type="number" 
                                value={isAddingNew ? newProductForm.price : editForm.price} 
                                onChange={e => isAddingNew ? setNewProductForm({...newProductForm, price: parseFloat(e.target.value)}) : setEditForm({...editForm, price: parseFloat(e.target.value)})}
                                className="border p-2 rounded w-full"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-stone-500 mb-1">Categoria</label>
                              <select 
                                value={isAddingNew ? newProductForm.category : editForm.category}
                                onChange={e => isAddingNew ? setNewProductForm({...newProductForm, category: e.target.value}) : setEditForm({...editForm, category: e.target.value})}
                                className="border p-2 rounded w-full"
                              >
                                 {menuData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                              </select>
                           </div>
                        </div>

                        {/* Image Upload */}
                        <div className="border-2 border-dashed border-stone-200 rounded-lg p-4 text-center">
                           <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, isAddingNew)} className="hidden" id="img-upload" />
                           <label htmlFor="img-upload" className="cursor-pointer flex flex-col items-center gap-2">
                              {isProcessingImage ? <RefreshCw className="w-8 h-8 animate-spin text-stone-400"/> : (
                                 (isAddingNew ? newProductForm.image : editForm.image) ? (
                                    <img src={isAddingNew ? newProductForm.image : editForm.image} className="h-32 object-contain" />
                                 ) : (
                                    <>
                                       <ImageIcon className="w-8 h-8 text-stone-400" />
                                       <span className="text-sm text-stone-500">Clique para enviar imagem</span>
                                    </>
                                 )
                              )}
                           </label>
                        </div>

                        {/* Tags Management */}
                        <div>
                           <label className="block text-xs font-bold text-stone-500 mb-2">Tags de Filtro</label>
                           <div className="flex gap-2">
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
                                      className={`px-3 py-1 rounded-full text-xs font-bold border ${hasTag ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-600 border-stone-200'}`}
                                    >
                                       {tag === 'popular' ? 'Popular' : tag === 'new' ? 'Novo' : tag === 'vegetarian' ? 'Vegetariano' : 'Picante'}
                                    </button>
                                 )
                              })}
                           </div>
                        </div>

                        {/* Options / Addons Management */}
                        <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                           <h3 className="font-bold text-sm mb-3">Opções de Personalização</h3>
                           
                           {/* Add New Option Group */}
                           <div className="flex gap-2 mb-4">
                              <input placeholder="Nome da Opção (Ex: Borda)" value={newOptionName} onChange={e => setNewOptionName(e.target.value)} className="border p-2 rounded flex-1 text-sm" />
                              <select value={newOptionType} onChange={(e:any) => setNewOptionType(e.target.value)} className="border p-2 rounded text-sm">
                                 <option value="single">Escolha Única (Radio)</option>
                                 <option value="multiple">Múltipla Escolha (Check)</option>
                              </select>
                              <button onClick={() => addOptionToForm(isAddingNew)} className="bg-stone-800 text-white px-3 rounded text-sm"><Plus className="w-4 h-4"/></button>
                           </div>

                           {/* List Existing Options */}
                           <div className="space-y-4">
                              {((isAddingNew ? newProductForm.options : editForm.options) || []).map((opt, idx) => (
                                 <div key={idx} className="bg-white p-3 rounded border border-stone-200">
                                    <div className="flex justify-between font-bold text-sm mb-2">
                                       <span>{opt.name} ({opt.type === 'single' ? '1 escolha' : 'Múltiplas'})</span>
                                       <button className="text-red-500 text-xs">Remover</button>
                                    </div>
                                    <div className="pl-2 space-y-2 border-l-2 border-stone-100">
                                       {opt.choices.map((c, cIdx) => (
                                          <div key={cIdx} className="text-xs flex justify-between">
                                             <span>{c.name}</span>
                                             <span>+{settings.currencySymbol} {c.price.toFixed(2)}</span>
                                          </div>
                                       ))}
                                       <div className="flex gap-2 mt-2">
                                          <input id={`new-choice-name-${opt.id}`} placeholder="Item" className="border p-1 rounded text-xs flex-1" />
                                          <input id={`new-choice-price-${opt.id}`} placeholder="0.00" type="number" className="border p-1 rounded text-xs w-16" />
                                          <button 
                                            onClick={() => {
                                               const nameInput = document.getElementById(`new-choice-name-${opt.id}`) as HTMLInputElement;
                                               const priceInput = document.getElementById(`new-choice-price-${opt.id}`) as HTMLInputElement;
                                               addChoiceToOption(opt.id, nameInput.value, priceInput.value, isAddingNew);
                                               nameInput.value = ''; priceInput.value = '';
                                            }}
                                            className="bg-green-100 text-green-700 px-2 rounded text-xs font-bold"
                                          >Add</button>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>

                        <button 
                           onClick={isAddingNew ? handleAddNewProduct : saveEdit}
                           className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-lg"
                        >
                           {isAddingNew ? 'Cadastrar Produto' : 'Salvar Alterações'}
                        </button>
                     </div>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* --- COUPONS TAB --- */}
        {activeTab === 'coupons' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Ticket className="w-5 h-5 text-italian-red"/> Cupons de Desconto</h2>
                 <button onClick={() => setIsAddingCoupon(!isAddingCoupon)} className="bg-stone-900 text-white px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1"><Plus className="w-4 h-4"/> Novo Cupom</button>
              </div>

              {isAddingCoupon && (
                 <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <input type="text" placeholder="Código (ex: PROMO10)" value={couponForm.code || ''} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className="border p-2 rounded uppercase" />
                       <select value={couponForm.type} onChange={(e: any) => setCouponForm({...couponForm, type: e.target.value})} className="border p-2 rounded">
                          <option value="percent">Porcentagem (%)</option>
                          <option value="fixed">Valor Fixo ({settings.currencySymbol})</option>
                          <option value="free_shipping">Frete Grátis</option>
                       </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <input type="number" placeholder={couponForm.type === 'percent' ? "Porcentagem (ex: 10)" : "Valor do Desconto"} value={couponForm.discount_value || ''} onChange={e => setCouponForm({...couponForm, discount_value: parseFloat(e.target.value)})} className="border p-2 rounded" disabled={couponForm.type === 'free_shipping'} />
                       <input type="number" placeholder={`Pedido Mínimo (${settings.currencySymbol})`} value={couponForm.min_order_value || ''} onChange={e => setCouponForm({...couponForm, min_order_value: parseFloat(e.target.value)})} className="border p-2 rounded" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                       <input type="date" placeholder="Validade" value={couponForm.end_date || ''} onChange={e => setCouponForm({...couponForm, end_date: e.target.value})} className="border p-2 rounded" />
                       <div className="flex items-center gap-2 pl-2">
                          <input type="checkbox" checked={couponForm.active} onChange={e => setCouponForm({...couponForm, active: e.target.checked})} />
                          <label>Ativo</label>
                       </div>
                    </div>
                    <button onClick={handleSaveCoupon} className="bg-green-600 text-white w-full py-2 rounded font-bold hover:bg-green-700">Salvar Cupom</button>
                 </div>
              )}

              <div className="space-y-2">
                 {coupons.map(c => (
                    <div key={c.id} className="border p-3 rounded-lg flex justify-between items-center hover:bg-stone-50">
                       <div>
                          <p className="font-bold text-lg">{c.code} <span className={`text-xs px-2 py-0.5 rounded-full ${c.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.active ? 'Ativo' : 'Inativo'}</span></p>
                          <p className="text-sm text-stone-600">
                             {c.type === 'free_shipping' ? 'Frete Grátis' : c.type === 'fixed' ? `${settings.currencySymbol} ${c.discount_value} OFF` : `${c.discount_value}% OFF`}
                             {c.min_order_value ? ` (Min: ${settings.currencySymbol} ${c.min_order_value})` : ''}
                          </p>
                       </div>
                       <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 ))}
                 {coupons.length === 0 && <p className="text-center text-stone-500 py-4">Nenhum cupom criado.</p>}
              </div>
           </div>
        )}

        {/* --- TABLES TAB --- */}
        {activeTab === 'tables' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><QrCode className="w-5 h-5 text-italian-red"/> Mesas & QR Codes</h2>
                 <div className="flex gap-2">
                   <div className="flex items-center gap-2">
                      <input type="checkbox" checked={settingsForm.enableTableOrder} onChange={e => setSettingsForm({...settingsForm, enableTableOrder: e.target.checked})} className="toggle" />
                      <span className="text-sm">Pedidos na Mesa</span>
                   </div>
                   <button onClick={handleSaveSettings} className="text-xs bg-blue-100 text-blue-700 px-2 rounded">Salvar Status</button>
                 </div>
              </div>
              
              <div className="flex gap-2">
                 <input type="text" placeholder="Número/Nome da Mesa (ex: 10)" value={newTableNumber} onChange={e => setNewTableNumber(e.target.value)} className="border p-2 rounded flex-1" />
                 <button onClick={handleAddTable} className="bg-green-600 text-white px-4 rounded font-bold hover:bg-green-700">Adicionar</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {tables.map(table => (
                    <div key={table.id} className="border p-4 rounded-lg flex flex-col items-center text-center bg-stone-50">
                       <h3 className="font-bold text-lg mb-2">Mesa {table.number}</h3>
                       <div className="bg-white p-2 rounded shadow-sm mb-3">
                          <img src={getQrCodeUrl(table.number)} alt={`QR Mesa ${table.number}`} className="w-32 h-32" />
                       </div>
                       <div className="text-xs text-stone-500 mb-3 break-all bg-white p-1 rounded border w-full">
                          {getTableLink(table.number)}
                       </div>
                       <button onClick={() => handleDeleteTable(table.id)} className="text-red-500 text-sm hover:underline">Remover Mesa</button>
                    </div>
                 ))}
                 {tables.length === 0 && <p className="text-stone-500 col-span-3 text-center py-8">Nenhuma mesa cadastrada.</p>}
              </div>
           </div>
        )}

        {/* --- APPEARANCE TAB --- */}
        {activeTab === 'appearance' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Palette className="w-5 h-5"/> Aparência & Cores</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div>
                    <label className="block text-sm font-bold mb-2">Cor Principal (Botões e Destaques)</label>
                    <div className="flex items-center gap-4">
                       <input 
                         type="color" 
                         value={settingsForm.colors?.primary || '#C8102E'}
                         onChange={(e) => setSettingsForm({...settingsForm, colors: { ...settingsForm.colors!, primary: e.target.value }})}
                         className="h-12 w-24 cursor-pointer"
                       />
                       <span className="font-mono bg-stone-100 px-2 py-1 rounded">{settingsForm.colors?.primary}</span>
                    </div>
                 </div>
                 <div>
                    <label className="block text-sm font-bold mb-2">Cor Secundária (Detalhes)</label>
                    <div className="flex items-center gap-4">
                       <input 
                         type="color" 
                         value={settingsForm.colors?.secondary || '#008C45'}
                         onChange={(e) => setSettingsForm({...settingsForm, colors: { ...settingsForm.colors!, secondary: e.target.value }})}
                         className="h-12 w-24 cursor-pointer"
                       />
                       <span className="font-mono bg-stone-100 px-2 py-1 rounded">{settingsForm.colors?.secondary}</span>
                    </div>
                 </div>
              </div>

              <div className="mt-8 border-t pt-6">
                 <h3 className="font-bold mb-4">Pré-visualização do Botão</h3>
                 <button 
                   className="px-6 py-3 rounded-xl font-bold text-white shadow-lg"
                   style={{ backgroundColor: settingsForm.colors?.primary }}
                 >
                    Botão Principal
                 </button>
              </div>

              <button onClick={handleSaveSettings} className="bg-green-600 text-white w-full py-3 rounded font-bold hover:bg-green-700 mt-4">Salvar Cores</button>
           </div>
        )}

        {/* --- HOURS TAB --- */}
        {activeTab === 'hours' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2"><Clock className="w-5 h-5"/> Horário de Funcionamento</h2>
              <p className="text-sm text-stone-500">Configure os intervalos de funcionamento para cada dia da semana. Se estiver vazio, será considerado FECHADO.</p>

              <div className="space-y-4">
                 {Object.keys(WEEKDAYS_PT).map((dayKey) => {
                    const schedule = settingsForm.schedule || {} as WeeklySchedule;
                    const dayData = schedule[dayKey as keyof WeeklySchedule] || { isOpen: false, intervals: [] };

                    return (
                       <div key={dayKey} className="border p-4 rounded-lg bg-stone-50">
                          <div className="flex justify-between items-center mb-2">
                             <h3 className="font-bold">{WEEKDAYS_PT[dayKey as keyof typeof WEEKDAYS_PT]}</h3>
                             <label className="flex items-center gap-2 cursor-pointer">
                                <span className="text-sm">Aberto?</span>
                                <input 
                                  type="checkbox" 
                                  checked={dayData.isOpen}
                                  onChange={(e) => {
                                     const newSchedule = { ...schedule };
                                     // @ts-ignore
                                     newSchedule[dayKey] = { ...dayData, isOpen: e.target.checked };
                                     setSettingsForm({ ...settingsForm, schedule: newSchedule });
                                  }}
                                />
                             </label>
                          </div>
                          
                          {dayData.isOpen && (
                             <div className="space-y-2">
                                {dayData.intervals.map((int, idx) => (
                                   <div key={idx} className="flex gap-2 items-center">
                                      <input 
                                        type="time" 
                                        value={int.start} 
                                        onChange={(e) => {
                                           const newIntervals = [...dayData.intervals];
                                           newIntervals[idx].start = e.target.value;
                                           const newSchedule = { ...schedule };
                                           // @ts-ignore
                                           newSchedule[dayKey] = { ...dayData, intervals: newIntervals };
                                           setSettingsForm({ ...settingsForm, schedule: newSchedule });
                                        }}
                                        className="border p-1 rounded"
                                      />
                                      <span>às</span>
                                      <input 
                                        type="time" 
                                        value={int.end}
                                        onChange={(e) => {
                                           const newIntervals = [...dayData.intervals];
                                           newIntervals[idx].end = e.target.value;
                                           const newSchedule = { ...schedule };
                                           // @ts-ignore
                                           newSchedule[dayKey] = { ...dayData, intervals: newIntervals };
                                           setSettingsForm({ ...settingsForm, schedule: newSchedule });
                                        }}
                                        className="border p-1 rounded"
                                      />
                                      <button 
                                         onClick={() => {
                                            const newIntervals = dayData.intervals.filter((_, i) => i !== idx);
                                            const newSchedule = { ...schedule };
                                            // @ts-ignore
                                            newSchedule[dayKey] = { ...dayData, intervals: newIntervals };
                                            setSettingsForm({ ...settingsForm, schedule: newSchedule });
                                         }}
                                         className="text-red-500 hover:bg-red-50 p-1 rounded"
                                      ><Trash2 className="w-4 h-4"/></button>
                                   </div>
                                ))}
                                <button 
                                  onClick={() => {
                                     const newIntervals = [...dayData.intervals, { start: '18:00', end: '23:00' }];
                                     const newSchedule = { ...schedule };
                                     // @ts-ignore
                                     newSchedule[dayKey] = { ...dayData, intervals: newIntervals };
                                     setSettingsForm({ ...settingsForm, schedule: newSchedule });
                                  }}
                                  className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-2"
                                >
                                  <Plus className="w-3 h-3"/> Adicionar Turno
                                </button>
                             </div>
                          )}
                       </div>
                    );
                 })}
              </div>
              <button onClick={handleSaveSettings} className="bg-green-600 text-white w-full py-3 rounded font-bold hover:bg-green-700 mt-4">Salvar Horários</button>
           </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
           <div className="space-y-6 animate-in fade-in">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Settings className="w-5 h-5"/> Configurações Gerais</h2>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                       <label className="block text-sm font-bold mb-1">Nome da Loja</label>
                       <input 
                         type="text" 
                         value={settingsForm.name} 
                         onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} 
                         className="border w-full p-2 rounded" 
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-bold mb-1">WhatsApp Principal (55119...)</label>
                       <input 
                         type="text" 
                         value={settingsForm.whatsapp} 
                         onChange={e => setSettingsForm({...settingsForm, whatsapp: e.target.value})} 
                         className="border w-full p-2 rounded" 
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-bold mb-1">Moeda (Símbolo)</label>
                       <input 
                         type="text" 
                         value={settingsForm.currencySymbol || 'R$'} 
                         onChange={e => setSettingsForm({...settingsForm, currencySymbol: e.target.value})} 
                         className="border w-full p-2 rounded" 
                         placeholder="Ex: R$, €, $"
                       />
                    </div>
                    <div>
                       <label className="block text-sm font-bold mb-1">Fuso Horário</label>
                       <select 
                         value={settingsForm.timezone || 'America/Sao_Paulo'} 
                         onChange={e => setSettingsForm({...settingsForm, timezone: e.target.value})} 
                         className="border w-full p-2 rounded"
                       >
                         <option value="America/Sao_Paulo">Brasil (São Paulo)</option>
                         <option value="Europe/Lisbon">Portugal (Lisboa)</option>
                         <option value="America/New_York">EUA (New York)</option>
                       </select>
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold mb-1">Endereço Completo</label>
                    <textarea 
                      value={settingsForm.address} 
                      onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} 
                      className="border w-full p-2 rounded h-20" 
                    />
                 </div>
              </div>

              {/* Delivery Regions */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
                 <h2 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5"/> Taxas de Entrega</h2>
                 
                 <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <h3 className="font-bold text-sm mb-3">Adicionar Nova Região</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                       <input 
                         placeholder="Nome (Ex: Centro)" 
                         value={newRegionName} 
                         onChange={e => setNewRegionName(e.target.value)} 
                         className="border p-2 rounded text-stone-900 bg-white"
                       />
                       <input 
                         type="number" 
                         placeholder="Preço da Entrega" 
                         value={newRegionPrice} 
                         onChange={e => setNewRegionPrice(e.target.value)} 
                         className="border p-2 rounded text-stone-900 bg-white"
                       />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                       <input 
                         placeholder="CEPs/Faixas (Ex: 13295-000, 13295...)" 
                         value={newRegionZips} 
                         onChange={e => setNewRegionZips(e.target.value)} 
                         className="border p-2 rounded text-stone-900 bg-white"
                       />
                       <input 
                         placeholder="Excluir CEPs (Ex: 13295-999)" 
                         value={newRegionExclusions} 
                         onChange={e => setNewRegionExclusions(e.target.value)} 
                         className="border p-2 rounded text-stone-900 bg-white"
                       />
                    </div>
                    <div className="mb-3">
                        <input 
                         placeholder="Bairros (Separados por vírgula). Se vazio, usa o Nome." 
                         value={newRegionNeighborhoods} 
                         onChange={e => setNewRegionNeighborhoods(e.target.value)} 
                         className="border p-2 rounded w-full text-stone-900 bg-white"
                       />
                    </div>
                    <button onClick={handleAddRegion} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">Adicionar Região</button>
                 </div>

                 <div className="space-y-2">
                    {settingsForm.deliveryRegions?.map(region => (
                       <div key={region.id} className="flex justify-between items-center border p-3 rounded hover:bg-stone-50">
                          <div>
                             <p className="font-bold">{region.name} - {settings.currencySymbol} {region.price.toFixed(2)}</p>
                             <p className="text-xs text-stone-500">CEPs: {region.zipRules?.join(', ') || 'Todos'}</p>
                             {region.neighborhoods && <p className="text-xs text-stone-400">Bairros: {region.neighborhoods.join(', ')}</p>}
                          </div>
                          <button onClick={() => handleRemoveRegion(region.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button>
                       </div>
                    ))}
                 </div>
              </div>

              {/* SEO Settings */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 space-y-4">
                 <h2 className="text-xl font-bold flex items-center gap-2"><Share2 className="w-5 h-5"/> SEO & Compartilhamento (WhatsApp)</h2>
                 
                 <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-lg text-sm mb-4">
                    Configure como o link do seu cardápio aparecerá quando enviado no WhatsApp, Facebook, etc.
                 </div>

                 <div>
                    <label className="block text-sm font-bold mb-1">Título da Página (Nome da Loja)</label>
                    <input 
                       value={settingsForm.seoTitle || ''} 
                       onChange={e => setSettingsForm({...settingsForm, seoTitle: e.target.value})} 
                       className="border w-full p-2 rounded"
                       placeholder="Ex: Spagnolli Pizzaria - O melhor sabor"
                    />
                 </div>
                 
                 <div>
                    <label className="block text-sm font-bold mb-1">Descrição Curta</label>
                    <textarea 
                       value={settingsForm.seoDescription || ''} 
                       onChange={e => setSettingsForm({...settingsForm, seoDescription: e.target.value})} 
                       className="border w-full p-2 rounded h-20"
                       placeholder="Ex: Peça as melhores pizzas e esfihas de Itupeva diretamente pelo nosso cardápio digital."
                    />
                 </div>

                 <div>
                    <label className="block text-sm font-bold mb-1 flex items-center gap-2">
                       <ImageIcon className="w-4 h-4" /> Imagem de Compartilhamento (Banner)
                    </label>
                    <div className="border-2 border-dashed border-stone-300 rounded-lg p-4 text-center hover:bg-stone-50 transition-colors">
                       {settingsForm.seoBannerUrl ? (
                          <div className="relative group">
                             <img src={settingsForm.seoBannerUrl} alt="Preview" className="h-40 w-full object-cover rounded-md mb-2" />
                             <button 
                                onClick={() => setSettingsForm({...settingsForm, seoBannerUrl: ''})}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                             >
                                <Trash2 className="w-4 h-4" />
                             </button>
                          </div>
                       ) : (
                          <div className="py-4">
                             <p className="text-stone-400 text-sm mb-2">Nenhuma imagem selecionada</p>
                          </div>
                       )}
                       
                       <div className="flex justify-center">
                          <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">
                             <Upload className="w-4 h-4" /> Escolher arquivo
                             <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden"
                                onChange={async (e) => {
                                   const file = e.target.files?.[0];
                                   if(file) {
                                      try {
                                         const base64 = await compressImage(file);
                                         setSettingsForm({...settingsForm, seoBannerUrl: base64});
                                      } catch(err) { alert('Erro ao processar imagem'); }
                                   }
                                }}
                             />
                          </label>
                       </div>
                       <p className="text-xs text-stone-500 mt-2">Recomendado: Imagem horizontal (1200x630px).<br/>Essa imagem aparecerá como miniatura ao enviar o link.</p>
                    </div>
                 </div>
              </div>

              <button onClick={handleSaveSettings} className="bg-green-600 text-white w-full py-4 rounded-xl font-bold hover:bg-green-700 shadow-lg text-lg">
                 Salvar Todas Configurações
              </button>
           </div>
        )}
      </main>
    </div>
  );
};
