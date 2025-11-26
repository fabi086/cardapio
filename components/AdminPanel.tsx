
import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon, DeliveryRegion, WeeklySchedule, DaySchedule, Table } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Layers, Megaphone, Tag, List, HelpCircle, Utensils, Phone, CreditCard, Truck, Receipt, ClipboardList, Clock, Printer, Ticket, LayoutDashboard, DollarSign, TrendingUp, ShoppingBag, Calendar, PieChart, BarChart3, Filter, Ban, Star, Zap, Leaf, Flame, Loader2, Share2, Globe, Palette, Moon, Sun, QrCode } from 'lucide-react';
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
  onAddCategory?: (name: string) => void;
  onUpdateCategory?: (id: string, updates: { name?: string; image?: string }) => void;
  onDeleteCategory?: (id: string) => void;
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
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'categories' | 'orders' | 'coupons' | 'dashboard' | 'appearance' | 'hours' | 'tables'>('dashboard');
  
  // Dashboard Date Filter
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');

  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || 'pizzas-salgadas',
    image: '', price: 0, subcategory: '', ingredients: [], tags: []
  });

  // Ingredient State
  const [tempIngredient, setTempIngredient] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active'>('active');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  // Coupon Form
  const [couponForm, setCouponForm] = useState<Partial<Coupon>>({ type: 'percent', active: true });
  const [isAddingCoupon, setIsAddingCoupon] = useState(false);

  // Tables State
  const [tables, setTables] = useState<Table[]>([]);
  const [newTableNumber, setNewTableNumber] = useState('');

  // Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  const [tempPhone, setTempPhone] = useState('');
  const [tempPayment, setTempPayment] = useState('');

  // Region Management State
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionPrice, setNewRegionPrice] = useState('');
  const [newRegionZips, setNewRegionZips] = useState('');
  const [newRegionExclusions, setNewRegionExclusions] = useState('');
  const [newRegionNeighborhoods, setNewRegionNeighborhoods] = useState('');

  // Option Management
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<'single' | 'multiple'>('single');

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryImage, setEditCategoryImage] = useState('');

  const [isProcessingImage, setIsProcessingImage] = useState(false);

  useEffect(() => { setSettingsForm(settings); }, [settings]);

  useEffect(() => {
    if (isAuthenticated && supabase) {
      if (activeTab === 'orders' || activeTab === 'dashboard') {
        fetchOrders();
        if (activeTab === 'orders') {
           const interval = setInterval(fetchOrders, 15000); 
           return () => clearInterval(interval);
        }
      }
      if (activeTab === 'coupons') fetchCoupons();
      if (activeTab === 'tables') fetchTables();
    }
  }, [isAuthenticated, activeTab, orderFilter, dateFilter, customDate]);

  const fetchOrders = async () => { /* ... existing fetch logic ... */ };
  const fetchCoupons = async () => { try { const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }); if (data) setCoupons(data as Coupon[]); } catch (err) { console.error(err); } };
  const fetchTables = async () => { try { const { data } = await supabase.from('tables').select('*').order('id', { ascending: true }); if (data) setTables(data as Table[]); } catch (err) { console.error(err); } };

  // --- Coupon Logic ---
  const handleSaveCoupon = async () => {
    if (!couponForm.code || !couponForm.discount_value) return;
    if (supabase) {
      const payload = { ...couponForm, code: couponForm.code.toUpperCase().trim(), discount_value: Number(couponForm.discount_value) };
      if (!payload.min_order_value) payload.min_order_value = 0;
      
      const { error } = await supabase.from('coupons').insert([payload]);
      if (!error) { setCouponForm({ type: 'percent', active: true }); setIsAddingCoupon(false); fetchCoupons(); } 
      else { alert('Erro ao criar cupom. Verifique o código.'); }
    }
  };
  const handleDeleteCoupon = async (id: number) => { if (window.confirm('Excluir cupom?')) { if (supabase) { await supabase.from('coupons').delete().eq('id', id); fetchCoupons(); } } };

  // --- Table Logic ---
  const handleAddTable = async () => {
     if (!newTableNumber) return;
     if (supabase) {
        const { error } = await supabase.from('tables').insert([{ number: newTableNumber, active: true }]);
        if(!error) { setNewTableNumber(''); fetchTables(); }
     }
  };
  const handleDeleteTable = async (id: number) => { if(window.confirm('Remover mesa?')) { if(supabase) { await supabase.from('tables').delete().eq('id', id); fetchTables(); } } };

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (password === 'admin123') { setIsAuthenticated(true); } else { alert('Senha incorreta'); } };
  
  // ... (Keep existing image compression and other helpers) ...
  const compressImage = (file: File): Promise<string> => { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target?.result as string; img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width; if (scaleSize < 1) { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; } else { canvas.width = img.width; canvas.height = img.height; } const ctx = canvas.getContext('2d'); ctx?.drawImage(img, 0, 0, canvas.width, canvas.height); const dataUrl = canvas.toDataURL('image/jpeg', 0.7); resolve(dataUrl); }; }; }); };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => { const file = e.target.files?.[0]; if (file) { setIsProcessingImage(true); try { const compressedBase64 = await compressImage(file); if (isNew) { setNewProductForm(prev => ({ ...prev, image: compressedBase64 })); } else { setEditForm(prev => ({ ...prev, image: compressedBase64 })); } } catch (err) { alert("Erro ao processar imagem"); } finally { setIsProcessingImage(false); } } };
  const handleSaveSettings = () => { onUpdateSettings(settingsForm); alert('Configurações salvas!'); };
  // ... (Other standard handlers) ...

  const getQrCodeUrl = (tableNum: string) => {
     const origin = window.location.origin + window.location.pathname;
     const url = `${origin}?mesa=${tableNum}`;
     return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
  };
  
  const getTableLink = (tableNum: string) => {
     const origin = window.location.origin + window.location.pathname;
     return `${origin}?mesa=${tableNum}`;
  };

  if (!isAuthenticated) return ( /* Login Form */ <div className="min-h-screen bg-stone-100 flex items-center justify-center"><form onSubmit={handleLogin} className="bg-white p-8 rounded shadow"><input type="password" value={password} onChange={e=>setPassword(e.target.value)} className="border p-2 mb-2 w-full" placeholder="Senha"/><button className="bg-red-600 text-white w-full py-2">Entrar</button></form></div> );

  return (
    <div className="min-h-screen bg-stone-100 pb-20 text-stone-800">
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-md">
         {/* ... Header Content ... */}
         <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors"><ArrowLeft className="w-5 h-5" /></button>
              <h1 className="font-bold text-lg hidden md:block">Gerenciar Sistema</h1>
            </div>
            <button onClick={() => { if(window.confirm('Resetar tudo?')) { onResetMenu(); } }} className="text-xs bg-red-900/50 px-3 py-1.5 rounded border border-red-800">Resetar Tudo</button>
          </div>

          <div className="flex space-x-2 md:space-x-4 border-b border-stone-700 overflow-x-auto hide-scrollbar">
             <button onClick={() => setActiveTab('dashboard')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'dashboard' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Dashboard</button>
             <button onClick={() => setActiveTab('orders')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'orders' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Pedidos</button>
             <button onClick={() => setActiveTab('menu')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'menu' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Cardápio</button>
             <button onClick={() => setActiveTab('coupons')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'coupons' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Cupons</button>
             <button onClick={() => setActiveTab('tables')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'tables' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Mesas</button>
             <button onClick={() => setActiveTab('appearance')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'appearance' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Aparência</button>
             <button onClick={() => setActiveTab('hours')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'hours' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Horários</button>
             <button onClick={() => setActiveTab('settings')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'settings' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400'}`}>Config</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        
        {/* --- TAB: TABLES --- */}
        {activeTab === 'tables' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in space-y-6">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold flex items-center gap-2"><QrCode className="w-5 h-5 text-italian-red"/> Mesas & QR Codes</h2>
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

        {/* --- TAB: COUPONS --- */}
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
                          {c.end_date && <p className="text-xs text-stone-400">Válido até: {new Date(c.end_date).toLocaleDateString()}</p>}
                       </div>
                       <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 ))}
                 {coupons.length === 0 && <p className="text-center text-stone-500 py-4">Nenhum cupom criado.</p>}
              </div>
           </div>
        )}

        {/* ... (Other Tabs from previous code - Appearance, Hours, Settings, Dashboard, Menu, etc.) ... */}
        {/* Just rendering appearance tab again for completeness if needed or falling back to standard structure */}
        
        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in space-y-6">
              <h2 className="text-xl font-bold">Configurações Gerais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold mb-1">Nome da Loja</label>
                    <input type="text" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} className="border w-full p-2 rounded" />
                 </div>
                 <div>
                    <label className="block text-sm font-bold mb-1">Moeda (Símbolo)</label>
                    <input type="text" value={settingsForm.currencySymbol || 'R$'} onChange={e => setSettingsForm({...settingsForm, currencySymbol: e.target.value})} className="border w-full p-2 rounded" />
                 </div>
              </div>
              {/* ... Delivery Regions ... */}
              {/* ... Save Button ... */}
              <button onClick={handleSaveSettings} className="bg-green-600 text-white px-6 py-2 rounded font-bold w-full">Salvar</button>
           </div>
        )}
      </main>
    </div>
  );
};
