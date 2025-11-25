
import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings, ProductOption, ProductChoice, Order, Coupon } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check, Layers, Megaphone, Tag, List, HelpCircle, Utensils, Phone, CreditCard, Truck, Receipt, ClipboardList, Clock, Printer, Ticket } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'menu' | 'settings' | 'categories' | 'orders' | 'coupons'>('orders');
  
  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || 'pizzas-salgadas',
    image: '',
    price: 0,
    subcategory: '',
    ingredients: []
  });

  // Ingredient State
  const [tempIngredient, setTempIngredient] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState<'all' | 'active'>('active');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('');

  // Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  
  // Settings List Helpers
  const [tempPhone, setTempPhone] = useState('');
  const [tempPayment, setTempPayment] = useState('');

  // Region Management State
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionPrice, setNewRegionPrice] = useState('');
  const [newRegionZips, setNewRegionZips] = useState('');

  // Option Management State
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionType, setNewOptionType] = useState<'single' | 'multiple'>('single');

  // Category State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryImage, setEditCategoryImage] = useState('');

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Fetch data when tabs change
  useEffect(() => {
    if (isAuthenticated && supabase) {
      if (activeTab === 'orders') {
        fetchOrders();
        const interval = setInterval(fetchOrders, 15000); 
        return () => clearInterval(interval);
      }
      if (activeTab === 'coupons') {
        fetchCoupons();
      }
    }
  }, [isAuthenticated, activeTab, orderFilter]);

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });
      
      if (orderFilter === 'active') {
        query = query.in('status', ['pending', 'preparing', 'delivery']);
      }
      
      const { data, error } = await query;
      
      if (data) {
        setOrders(data as Order[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
      if (data) setCoupons(data as Coupon[]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCouponCode || !newCouponDiscount) return;
    if (supabase) {
      const { error } = await supabase.from('coupons').insert([{
        code: newCouponCode.toUpperCase().trim(),
        discount_percent: parseFloat(newCouponDiscount),
        active: true
      }]);
      
      if (!error) {
        setNewCouponCode('');
        setNewCouponDiscount('');
        fetchCoupons();
      } else {
        alert('Erro ao criar cupom. Verifique se o código já existe.');
      }
    }
  };

  const handleDeleteCoupon = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir este cupom?')) {
      if (supabase) {
        await supabase.from('coupons').delete().eq('id', id);
        fetchCoupons();
      }
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    if (supabase) {
      await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    }
  };

  const handlePrintOrder = (order: Order) => {
    // Tenta abrir a janela. Se falhar (bloqueador de popup), avisa o usuário.
    const printWindow = window.open('', '_blank', 'width=380,height=600,left=200,top=200');
    
    if (!printWindow) {
      alert("⚠️ O navegador bloqueou a janela de impressão.\n\nPor favor, permita pop-ups para este site ou tente novamente.");
      return;
    }

    // Formatar itens para impressão
    const itemsHtml = order.items.map((item: any) => {
      let optionsHtml = '';
      if (item.selectedOptions && item.selectedOptions.length > 0) {
        optionsHtml = `<div class="options">
          ${item.selectedOptions.map((opt: any) => `+ ${opt.choiceName}`).join('<br/>')}
        </div>`;
      }
      
      // Calculate unit total including options
      const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((s:any, o:any) => s + o.price, 0) : 0;
      const unitTotal = item.price + optionsPrice;
      const itemTotal = unitTotal * item.quantity;

      return `
        <div class="item">
          <div class="item-header">
            <span class="qty">${item.quantity}x</span>
            <span class="name">${item.name}</span>
          </div>
          ${optionsHtml}
          ${item.observation ? `<div class="obs">⚠️ OBS: ${item.observation}</div>` : ''}
           <div class="price-row">R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${order.id}</title>
          <style>
            @media print {
              @page { margin: 0; size: 80mm auto; }
              body { margin: 0; padding: 10px; }
            }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 12px; 
              width: 100%; 
              max-width: 80mm; 
              margin: 0 auto; 
              padding: 10px; 
              color: #000;
              background: #fff;
            }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .title { font-size: 16px; font-weight: bold; margin: 0; text-transform: uppercase; }
            .subtitle { font-size: 11px; margin-top: 5px; }
            .order-id { font-size: 18px; font-weight: bold; margin-top: 5px; border: 1px solid #000; display: inline-block; padding: 2px 8px; }
            
            .info { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .customer { font-weight: bold; font-size: 14px; text-transform: uppercase; }
            .address { margin-top: 5px; font-size: 12px; line-height: 1.4; }
            
            .items { margin-bottom: 10px; }
            .item { margin-bottom: 10px; border-bottom: 1px dotted #ccc; padding-bottom: 5px; }
            .item:last-child { border-bottom: none; }
            .item-header { font-weight: bold; font-size: 13px; display: flex; gap: 5px; }
            .qty { white-space: nowrap; }
            .options { font-size: 11px; padding-left: 20px; color: #333; margin-top: 2px; }
            .obs { font-weight: bold; font-size: 11px; margin-top: 2px; background: #eee; padding: 2px; }
            .price-row { text-align: right; font-weight: bold; margin-top: 2px; }

            .totals { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; text-align: right; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 12px; }
            .final-total { font-size: 18px; font-weight: bold; margin-top: 8px; border-top: 1px solid #000; pt-2; }
            
            .payment { text-align: center; margin-top: 15px; border: 1px solid #000; padding: 5px; font-weight: bold; font-size: 12px; text-transform: uppercase; background: #eee; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${settings.name}</h1>
            <div class="subtitle">${new Date(order.created_at).toLocaleString('pt-BR')}</div>
            <div class="order-id">PEDIDO #${order.id}</div>
          </div>
          
          <div class="info">
            <div>CLIENTE:</div>
            <div class="customer">${order.customer_name}</div>
            ${order.delivery_type === 'delivery' 
              ? `<div class="address">
                  <strong>ENTREGA:</strong><br/>
                  ${order.address_street}, ${order.address_number}<br/>
                  ${order.address_district}<br/>
                  ${order.address_city}
                  ${order.address_complement ? `<br/>Comp: ${order.address_complement}` : ''}
                </div>`
              : '<div class="address" style="text-align:center; font-size:14px; margin-top:5px;">📍 RETIRADA NO BALCÃO</div>'
            }
          </div>

          <div class="items">
            ${itemsHtml}
          </div>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>R$ ${(order.total - order.delivery_fee + order.discount).toFixed(2).replace('.', ',')}</span>
            </div>
             ${order.discount > 0 ? `
            <div class="total-row">
              <span>Desconto (${order.coupon_code || 'CUPOM'}):</span>
              <span>- R$ ${order.discount.toFixed(2).replace('.', ',')}</span>
            </div>` : ''}
            <div class="total-row">
              <span>Taxa Entrega:</span>
              <span>R$ {order.delivery_fee.toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="total-row final-total">
              <span>TOTAL:</span>
              <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          <div class="payment">
            Pagamento: ${order.payment_method}
          </div>
          
          <div class="footer">
            Desenvolvido por Cardápio Digital<br/>
            . . .
          </div>
          
          <script>
            // Auto print logic
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close(); // Importante para o navegador terminar de carregar
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { 
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta (Dica: admin123)');
    }
  };

  // ... (Helper functions for Settings/Ingredients/Category remain same) ...
  const addPhone = () => {
    if (tempPhone.trim()) { setSettingsForm(prev => ({...prev, phones: [...prev.phones, tempPhone.trim()]})); setTempPhone(''); }
  };
  const removePhone = (index: number) => { setSettingsForm(prev => ({...prev, phones: prev.phones.filter((_, i) => i !== index)})); };
  const addPaymentMethod = () => {
    if (tempPayment.trim()) { setSettingsForm(prev => ({...prev, paymentMethods: [...(prev.paymentMethods || []), tempPayment.trim()]})); setTempPayment(''); }
  };
  const removePaymentMethod = (index: number) => { setSettingsForm(prev => ({...prev, paymentMethods: (prev.paymentMethods || []).filter((_, i) => i !== index)})); };
  const addIngredientToNew = () => {
    if (tempIngredient.trim()) { setNewProductForm(prev => ({...prev, ingredients: [...(prev.ingredients || []), tempIngredient.trim()]})); setTempIngredient(''); }
  };
  const removeIngredientFromNew = (index: number) => { setNewProductForm(prev => ({...prev, ingredients: (prev.ingredients || []).filter((_, i) => i !== index)})); };
  const addIngredientToEdit = () => {
    if (tempIngredient.trim()) { setEditForm(prev => ({...prev, ingredients: [...(prev.ingredients || []), tempIngredient.trim()]})); setTempIngredient(''); }
  };
  const removeIngredientFromEdit = (index: number) => { setEditForm(prev => ({...prev, ingredients: (prev.ingredients || []).filter((_, i) => i !== index)})); };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { isNew ? setNewProductForm({ ...newProductForm, image: reader.result as string }) : setEditForm({ ...editForm, image: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };
  const handleCategoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => { setEditCategoryImage(reader.result as string); }; reader.readAsDataURL(file); }
  };

  const startEditing = (product: Product) => { setEditingProduct(product.id); setEditForm(JSON.parse(JSON.stringify(product))); setTempIngredient(''); };
  const saveEdit = (originalCategoryId: string) => { if (editingProduct && editForm) { onUpdateProduct(originalCategoryId, editingProduct, editForm); setEditingProduct(null); setEditForm({}); } };
  const handleDelete = (categoryId: string, productId: number) => { if (window.confirm('Tem certeza que deseja excluir este produto?')) { onDeleteProduct(categoryId, productId); } };
  const handleAddNew = () => {
    if (!newProductForm.name || !newProductForm.price) { alert('Preencha pelo menos nome e preço.'); return; }
    const categoryId = newProductForm.category || menuData[0].id;
    onAddProduct(categoryId, { name: newProductForm.name, description: newProductForm.description || '', price: Number(newProductForm.price), category: categoryId, image: newProductForm.image, code: newProductForm.code, subcategory: newProductForm.subcategory, ingredients: newProductForm.ingredients || [] });
    setIsAddingNew(false); setNewProductForm({ category: menuData[0]?.id, image: '', price: 0, subcategory: '', ingredients: [] }); alert('Produto adicionado!');
  };
  const handleAddOptionGroup = () => {
    if (!newOptionName) return;
    const newGroup: ProductOption = { id: Date.now().toString(), name: newOptionName, type: newOptionType, required: false, choices: [] };
    setEditForm(prev => ({...prev, options: [...(prev.options || []), newGroup]})); setNewOptionName('');
  };
  const handleRemoveOptionGroup = (groupId: string) => { setEditForm(prev => ({...prev, options: (prev.options || []).filter(o => o.id !== groupId)})); };
  const handleAddChoice = (groupId: string) => {
    const name = window.prompt("Nome da opção (ex: Catupiry):"); if (!name) return;
    const priceStr = window.prompt("Preço adicional (digite 0 para grátis):", "0"); if (priceStr === null) return;
    const price = parseFloat(priceStr.replace(',', '.')) || 0;
    setEditForm(prev => ({...prev, options: (prev.options || []).map(opt => { if (opt.id === groupId) { return { ...opt, choices: [...opt.choices, { name, price }] }; } return opt; })}));
  };
  const handleRemoveChoice = (groupId: string, choiceIndex: number) => {
    setEditForm(prev => ({...prev, options: (prev.options || []).map(opt => { if (opt.id === groupId) { return { ...opt, choices: opt.choices.filter((_, idx) => idx !== choiceIndex) }; } return opt; })}));
  };
  const handleSaveSettings = () => { onUpdateSettings(settingsForm); alert('Configurações salvas e atualizadas no site!'); };
  const handleAddRegion = () => {
    if (!newRegionName || !newRegionPrice) return;
    const zipArray = newRegionZips ? newRegionZips.split(',').map(z => z.trim().replace(/[^0-9-]/g, '')).filter(z => z.length > 0) : [];
    const newRegion = { id: editingRegionId || newRegionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), name: newRegionName, price: parseFloat(newRegionPrice), zipPrefixes: zipArray };
    if (editingRegionId) { setSettingsForm({ ...settingsForm, deliveryRegions: (settingsForm.deliveryRegions || []).map(r => r.id === editingRegionId ? newRegion : r) }); setEditingRegionId(null); } else { setSettingsForm({ ...settingsForm, deliveryRegions: [...(settingsForm.deliveryRegions || []), newRegion] }); }
    setNewRegionName(''); setNewRegionPrice(''); setNewRegionZips('');
  };
  const startEditingRegion = (region: any) => { setEditingRegionId(region.id); setNewRegionName(region.name); setNewRegionPrice(region.price.toString()); setNewRegionZips(region.zipPrefixes ? region.zipPrefixes.join(', ') : ''); };
  const cancelEditingRegion = () => { setEditingRegionId(null); setNewRegionName(''); setNewRegionPrice(''); setNewRegionZips(''); };
  const handleRemoveRegion = (id: string) => { if (window.confirm('Remover esta região de entrega?')) { setSettingsForm({ ...settingsForm, deliveryRegions: (settingsForm.deliveryRegions || []).filter(r => r.id !== id) }); if (editingRegionId === id) cancelEditingRegion(); } };
  const triggerAddCategory = () => { if (newCategoryName && onAddCategory) { onAddCategory(newCategoryName); setNewCategoryName(''); alert('Categoria adicionada!'); } };
  const triggerUpdateCategory = () => { if (editingCategoryId && onUpdateCategory) { onUpdateCategory(editingCategoryId, { name: editCategoryName, image: editCategoryImage }); setEditingCategoryId(null); setEditCategoryName(''); setEditCategoryImage(''); } };
  const startEditingCategory = (category: Category) => { setEditingCategoryId(category.id); setEditCategoryName(category.name); setEditCategoryImage(category.image || ''); };
  const cancelEditingCategory = () => { setEditingCategoryId(null); setEditCategoryName(''); setEditCategoryImage(''); };
  const triggerDeleteCategory = (id: string) => { if (onDeleteCategory) { onDeleteCategory(id); } };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-800 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-stone-200">
          <h2 className="text-2xl font-display text-italian-red mb-6 text-center">Área Administrativa</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-1">Senha de Acesso</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 bg-white border border-stone-300 rounded-lg text-stone-900 focus:ring-2 focus:ring-italian-green focus:border-transparent outline-none shadow-sm"
                placeholder="Digite a senha"
              />
            </div>
            <button type="submit" className="w-full bg-italian-red text-white py-3 rounded-lg font-bold hover:bg-red-700 transition-colors shadow-md">
              Entrar
            </button>
            <button type="button" onClick={onBack} className="w-full text-stone-500 text-sm hover:underline mt-2 text-center">
              Voltar para o Cardápio
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-20 text-stone-800">
      <header className="bg-stone-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-bold text-lg hidden md:block">Gerenciar Sistema</h1>
            </div>
            <button 
              onClick={() => {
                if(window.confirm('Isso irá restaurar o cardápio original e apagar todas as suas alterações. Continuar?')) {
                  onResetMenu();
                }
              }}
              className="flex items-center gap-2 text-xs bg-red-900/50 hover:bg-red-900 px-3 py-1.5 rounded border border-red-800 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Resetar Tudo
            </button>
          </div>

          <div className="flex space-x-2 md:space-x-4 border-b border-stone-700 overflow-x-auto hide-scrollbar">
             <button 
                onClick={() => setActiveTab('orders')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <ClipboardList className="w-4 h-4" /> Pedidos
             </button>
             <button 
                onClick={() => setActiveTab('coupons')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'coupons' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Ticket className="w-4 h-4" /> Cupons
             </button>
             <button 
                onClick={() => setActiveTab('menu')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'menu' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Grid className="w-4 h-4" /> Cardápio
             </button>
             <button 
                onClick={() => setActiveTab('categories')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <List className="w-4 h-4" /> Categorias
             </button>
             <button 
                onClick={() => setActiveTab('settings')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Settings className="w-4 h-4" /> Configurações
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        
        {/* --- TAB: ORDERS (KDS) --- */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold flex items-center gap-2">
                   <ClipboardList className="w-6 h-6 text-italian-red"/> Pedidos Recebidos
                </h2>
                <div className="bg-white rounded-lg p-1 border border-stone-200 flex">
                   <button 
                     onClick={() => setOrderFilter('active')}
                     className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${orderFilter === 'active' ? 'bg-italian-green text-white' : 'text-stone-500'}`}
                   >
                      Ativos
                   </button>
                   <button 
                     onClick={() => setOrderFilter('all')}
                     className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${orderFilter === 'all' ? 'bg-italian-green text-white' : 'text-stone-500'}`}
                   >
                      Todos
                   </button>
                </div>
             </div>

             {ordersLoading && orders.length === 0 ? (
               <div className="text-center py-12 text-stone-400">Carregando pedidos...</div>
             ) : orders.length === 0 ? (
               <div className="text-center py-12 bg-white rounded-xl border border-stone-200">
                  <ClipboardList className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                  <p className="text-stone-500 font-medium">Nenhum pedido encontrado.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {orders.map(order => (
                   <div key={order.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${order.status === 'completed' ? 'border-stone-200 opacity-70' : 'border-italian-red/20 ring-1 ring-italian-red/5'}`}>
                      <div className="p-4 border-b border-stone-100 flex justify-between items-start bg-stone-50">
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <span className="font-bold text-lg">#{order.id}</span>
                               <span className="text-xs text-stone-500 bg-white px-2 py-0.5 rounded border border-stone-200">
                                 {new Date(order.created_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                               </span>
                            </div>
                            <p className="font-bold text-stone-800">{order.customer_name}</p>
                         </div>
                         <div className="flex flex-col items-end gap-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${
                               order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                               order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                               order.status === 'delivery' ? 'bg-orange-100 text-orange-800' :
                               'bg-green-100 text-green-800'
                            }`}>
                               {order.status === 'pending' && 'Pendente'}
                               {order.status === 'preparing' && 'Em Preparo'}
                               {order.status === 'delivery' && 'Saiu p/ Entrega'}
                               {order.status === 'completed' && 'Concluído'}
                            </span>
                            <button 
                               onClick={() => handlePrintOrder(order)}
                               className="flex items-center gap-1 text-xs bg-stone-800 text-white px-2 py-1 rounded hover:bg-stone-700 transition-colors"
                            >
                               <Printer className="w-3 h-3" /> Imprimir
                            </button>
                         </div>
                      </div>

                      <div className="p-4 space-y-3">
                         <div className="space-y-2">
                            {order.items.map((item: any, idx: number) => {
                               const itemTotal = (item.price + (item.selectedOptions ? item.selectedOptions.reduce((s:any, o:any) => s + o.price, 0) : 0)) * item.quantity;
                               return (
                                 <div key={idx} className="flex justify-between items-start text-sm">
                                    <div className="flex-1">
                                       <span className="font-bold">{item.quantity}x {item.name}</span>
                                       {item.selectedOptions && item.selectedOptions.length > 0 && (
                                          <div className="text-xs text-stone-500 pl-2 border-l-2 border-stone-200 mt-1">
                                             {item.selectedOptions.map((opt:any, i:number) => (
                                                <div key={i}>+ {opt.choiceName}</div>
                                             ))}
                                          </div>
                                       )}
                                       {item.observation && (
                                          <p className="text-xs text-red-600 font-bold mt-1 bg-red-50 p-1 rounded inline-block">Obs: {item.observation}</p>
                                       )}
                                    </div>
                                    <span className="font-medium text-stone-600">R$ {itemTotal.toFixed(2)}</span>
                                 </div>
                               );
                            })}
                         </div>

                         <div className="border-t border-stone-100 pt-3 flex flex-col gap-1 text-sm">
                            <div className="flex justify-between text-stone-500">
                               <span>Entrega ({order.delivery_type === 'pickup' ? 'Balcão' : 'Motoboy'})</span>
                               <span>R$ {order.delivery_fee.toFixed(2)}</span>
                            </div>
                            {order.discount > 0 && (
                               <div className="flex justify-between text-green-600 font-bold">
                                  <span>Desconto ({order.coupon_code})</span>
                                  <span>- R$ {order.discount.toFixed(2)}</span>
                               </div>
                            )}
                            <div className="flex justify-between font-bold text-lg text-italian-red">
                               <span>Total</span>
                               <span>R$ {order.total.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                               <CreditCard className="w-3 h-3" /> Pagamento: {order.payment_method}
                            </div>
                            {order.delivery_type === 'delivery' && (
                               <div className="text-xs text-stone-500 mt-1 bg-stone-50 p-2 rounded">
                                  <strong>Entrega:</strong> {order.address_street}, {order.address_number} - {order.address_district}
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="bg-stone-50 p-2 grid grid-cols-4 gap-1">
                         <button onClick={() => handleUpdateOrderStatus(order.id, 'pending')} className={`p-2 rounded text-xs font-bold ${order.status === 'pending' ? 'bg-white shadow text-yellow-600' : 'text-stone-400 hover:bg-stone-200'}`}>Pendente</button>
                         <button onClick={() => handleUpdateOrderStatus(order.id, 'preparing')} className={`p-2 rounded text-xs font-bold ${order.status === 'preparing' ? 'bg-white shadow text-blue-600' : 'text-stone-400 hover:bg-stone-200'}`}>Preparo</button>
                         <button onClick={() => handleUpdateOrderStatus(order.id, 'delivery')} className={`p-2 rounded text-xs font-bold ${order.status === 'delivery' ? 'bg-white shadow text-orange-600' : 'text-stone-400 hover:bg-stone-200'}`}>Entrega</button>
                         <button onClick={() => handleUpdateOrderStatus(order.id, 'completed')} className={`p-2 rounded text-xs font-bold ${order.status === 'completed' ? 'bg-white shadow text-green-600' : 'text-stone-400 hover:bg-stone-200'}`}>Concluir</button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* --- TAB: COUPONS --- */}
        {activeTab === 'coupons' && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
             <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
               <Ticket className="w-5 h-5 text-italian-red" /> Gerenciar Cupons de Desconto
             </h2>

             {/* Create Coupon Form */}
             <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                 <h3 className="font-bold text-sm text-stone-700 mb-3">Criar Novo Cupom</h3>
                 <div className="flex gap-3">
                   <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="CÓDIGO (Ex: BEMVINDO10)" 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900 uppercase font-bold"
                        value={newCouponCode}
                        onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      />
                   </div>
                   <div className="w-32">
                      <input 
                        type="number" 
                        placeholder="% Desc" 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-lg text-sm text-stone-900"
                        value={newCouponDiscount}
                        onChange={(e) => setNewCouponDiscount(e.target.value)}
                      />
                   </div>
                   <button 
                     onClick={handleAddCoupon}
                     className="bg-italian-green text-white px-4 rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
                   >
                     <Plus className="w-4 h-4" /> Criar
                   </button>
                 </div>
                 <p className="text-xs text-stone-500 mt-2">O desconto será aplicado sobre o subtotal do pedido (não inclui entrega).</p>
             </div>

             {/* Coupons List */}
             <div className="space-y-2">
               <h3 className="font-bold text-sm text-stone-700">Cupons Ativos</h3>
               {coupons.length === 0 ? (
                 <p className="text-sm text-stone-400 italic">Nenhum cupom criado.</p>
               ) : (
                 <div className="grid gap-2">
                   {coupons.map(coupon => (
                     <div key={coupon.id} className="flex justify-between items-center p-3 bg-white border border-stone-200 rounded-lg shadow-sm">
                        <div className="flex items-center gap-3">
                           <div className="bg-green-100 p-2 rounded text-green-700">
                             <Ticket className="w-5 h-5" />
                           </div>
                           <div>
                              <div className="font-bold text-stone-800 text-lg">{coupon.code}</div>
                              <div className="text-xs text-stone-500 font-medium">{coupon.discount_percent}% de desconto</div>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteCoupon(coupon.id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                          title="Excluir Cupom"
                        >
                           <Trash2 className="w-5 h-5" />
                        </button>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </div>
        )}

        {/* --- TAB: CATEGORIES --- */}
        {activeTab === 'categories' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
              <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2">
                <List className="w-5 h-5 text-italian-red" /> Gerenciar Categorias
              </h2>
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200">
                 <h3 className="font-bold text-sm text-stone-700 mb-2">Adicionar Nova Categoria</h3>
                 <div className="flex gap-2">
                   <input 
                     type="text" 
                     placeholder="Nome da categoria (ex: Vinhos)" 
                     className="flex-1 p-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900"
                     value={newCategoryName}
                     onChange={(e) => setNewCategoryName(e.target.value)}
                   />
                   <button 
                     onClick={triggerAddCategory}
                     className="bg-italian-green text-white px-4 rounded-lg text-sm font-bold hover:bg-green-700"
                   >
                     Adicionar
                   </button>
                 </div>
              </div>
              <div className="space-y-2">
                 {menuData.filter(c => c.id !== 'promocoes').map((cat) => (
                    <div key={cat.id} className="p-3 bg-white border border-stone-200 rounded-lg">
                       {editingCategoryId === cat.id ? (
                          <div className="space-y-3">
                             <div className="grid gap-2">
                                <label className="text-xs font-bold text-stone-500">Nome da Categoria</label>
                                <input 
                                  type="text" 
                                  value={editCategoryName}
                                  onChange={(e) => setEditCategoryName(e.target.value)}
                                  className="w-full p-2 bg-white border border-stone-300 rounded-lg text-sm text-stone-900"
                                />
                             </div>
                             <div className="grid gap-2">
                                <label className="text-xs font-bold text-stone-500">Imagem de Capa</label>
                                <div className="flex items-center gap-3">
                                   <div className="w-16 h-12 rounded bg-stone-100 border border-stone-200 overflow-hidden">
                                      {editCategoryImage ? (
                                         <img src={editCategoryImage} className="w-full h-full object-cover" />
                                      ) : (
                                         <ImageIcon className="w-full h-full p-3 text-stone-300" />
                                      )}
                                   </div>
                                   <input 
                                     type="file" 
                                     className="text-xs text-stone-500"
                                     onChange={handleCategoryImageUpload}
                                   />
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={triggerUpdateCategory} className="bg-italian-green text-white px-3 py-1.5 rounded text-sm font-bold">Salvar</button>
                                <button onClick={cancelEditingCategory} className="bg-stone-200 text-stone-700 px-3 py-1.5 rounded text-sm font-bold">Cancelar</button>
                             </div>
                          </div>
                       ) : (
                          <div className="flex justify-between items-center">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-8 rounded bg-stone-100 border border-stone-200 overflow-hidden">
                                   {cat.image ? (
                                      <img src={cat.image} className="w-full h-full object-cover" />
                                   ) : (
                                      <div className="w-full h-full flex items-center justify-center text-stone-300">
                                         <ImageIcon className="w-4 h-4" />
                                      </div>
                                   )}
                                </div>
                                <div>
                                   <span className="font-bold text-stone-800 block">{cat.name}</span>
                                   <span className="text-xs text-stone-400">({cat.items.length} produtos)</span>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => startEditingCategory(cat)}
                                  className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                                  title="Editar Categoria"
                                >
                                   <Edit3 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => triggerDeleteCategory(cat.id)}
                                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded"
                                  title="Excluir Categoria"
                                >
                                   <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                       )}
                    </div>
                 ))}
              </div>
           </div>
        )}

        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
              {/* Settings Form Content */}
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-italian-red" /> Dados do Estabelecimento
                </h2>
                
                {/* Guide Toggle */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-blue-900 flex items-center gap-2">
                         <HelpCircle className="w-5 h-5" /> Guia de Uso (Tour)
                      </h3>
                      <p className="text-xs text-blue-700 mt-1">
                         Ative para mostrar um tutorial passo-a-passo para novos visitantes.
                      </p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settingsForm.enableGuide !== false} 
                        onChange={(e) => setSettingsForm({...settingsForm, enableGuide: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                   </label>
                </div>

                {/* Free Shipping Toggle */}
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6 flex items-center justify-between">
                   <div>
                      <h3 className="font-bold text-green-900 flex items-center gap-2">
                         <Truck className="w-5 h-5" /> Frete Grátis Global
                      </h3>
                      <p className="text-xs text-green-700 mt-1">
                         Ative para zerar a taxa de entrega de todas as regiões (útil para testes ou promoções).
                      </p>
                   </div>
                   <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settingsForm.freeShipping === true} 
                        onChange={(e) => setSettingsForm({...settingsForm, freeShipping: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-italian-green"></div>
                   </label>
                </div>

                {/* Form Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* ... (Existing Settings Inputs - Same as before but ensuring contrast) ... */}
                   <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">Nome</label>
                      <input 
                        type="text" 
                        value={settingsForm.name} 
                        onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                   <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">WhatsApp</label>
                      <input 
                        type="text" 
                        value={settingsForm.whatsapp} 
                        onChange={(e) => setSettingsForm({...settingsForm, whatsapp: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Endereço</label>
                      <textarea 
                        rows={3} 
                        value={settingsForm.address} 
                        onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Horário de Funcionamento</label>
                      <textarea 
                        rows={2}
                        value={settingsForm.openingHours} 
                        onChange={(e) => setSettingsForm({...settingsForm, openingHours: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                        placeholder="Ex: Aberto todos os dias das 18h às 23h"
                      />
                   </div>
                   
                   {/* Phone Management */}
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-italian-red" /> Telefones
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                          placeholder="Ex: (11) 99999-9999"
                          value={tempPhone}
                          onChange={(e) => setTempPhone(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addPhone()}
                        />
                        <button onClick={addPhone} className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {settingsForm.phones.map((ph, i) => (
                           <span key={i} className="bg-stone-100 text-stone-600 text-sm px-3 py-1.5 rounded-full border border-stone-200 flex items-center gap-2">
                             {ph} <button onClick={() => removePhone(i)} className="hover:text-red-500"><X className="w-4 h-4"/></button>
                           </span>
                         ))}
                      </div>
                   </div>

                   {/* Payment Methods */}
                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-italian-red" /> Formas de Pagamento
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input 
                          type="text" 
                          className="flex-1 p-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900"
                          placeholder="Ex: Vale Refeição, Pix, etc."
                          value={tempPayment}
                          onChange={(e) => setTempPayment(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addPaymentMethod()}
                        />
                        <button onClick={addPaymentMethod} className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-3 rounded-lg text-sm font-bold"><Plus className="w-4 h-4"/></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         {(settingsForm.paymentMethods || []).map((pm, i) => (
                           <span key={i} className="bg-green-50 text-green-800 text-sm px-3 py-1.5 rounded-full border border-green-200 flex items-center gap-2">
                             {pm} <button onClick={() => removePaymentMethod(i)} className="hover:text-red-500"><X className="w-4 h-4"/></button>
                           </span>
                         ))}
                      </div>
                   </div>

                   <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">URL do Logo</label>
                      <input 
                        type="text" 
                        value={settingsForm.logoUrl} 
                        onChange={(e) => setSettingsForm({...settingsForm, logoUrl: e.target.value})} 
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm"
                      />
                   </div>
                </div>
              </div>

              <hr className="border-stone-200" />
              
              <div>
                 <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                   <MapPin className="w-5 h-5 text-italian-red" /> Taxas de Entrega
                </h2>
                
                {/* Region Editing Form */}
                <div className={`p-4 rounded-lg border mb-4 transition-colors ${editingRegionId ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'}`}>
                   <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-8 md:col-span-9">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Nome</label>
                           <input type="text" value={newRegionName} onChange={(e) => setNewRegionName(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm text-stone-900"/>
                        </div>
                        <div className="col-span-4 md:col-span-3">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Taxa</label>
                           <input type="number" value={newRegionPrice} onChange={(e) => setNewRegionPrice(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm text-stone-900"/>
                        </div>
                      </div>
                      <div className="grid grid-cols-12 gap-3 items-end">
                         <div className="col-span-10">
                           <label className="block text-xs font-bold text-stone-500 mb-1">CEPs (separados por vírgula)</label>
                           <input type="text" value={newRegionZips} onChange={(e) => setNewRegionZips(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm text-stone-900" placeholder="Ex: 13295-000, 13295-001"/>
                         </div>
                         <div className="col-span-2 flex gap-1">
                           <button onClick={handleAddRegion} className="flex-1 p-2 bg-italian-green text-white rounded-md flex items-center justify-center">
                              {editingRegionId ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4"/>}
                           </button>
                         </div>
                      </div>
                   </div>
                </div>
                <div className="space-y-2">
                   {(settingsForm.deliveryRegions || []).map((region, idx) => (
                      <div key={idx} className="flex justify-between p-3 bg-white border rounded-lg">
                         <div>
                            <span className="font-bold">{region.name}</span> <span className="text-green-600">R$ {region.price}</span>
                            {region.zipPrefixes && region.zipPrefixes.length > 0 && (
                               <div className="text-xs text-stone-400 mt-1">CEPs: {region.zipPrefixes.join(', ')}</div>
                            )}
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => startEditingRegion(region)} className="p-1 hover:text-blue-500"><Edit3 className="w-4 h-4"/></button>
                            <button onClick={() => handleRemoveRegion(region.id)} className="p-1 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                         </div>
                      </div>
                   ))}
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-stone-100">
                  <button onClick={handleSaveSettings} className="px-6 py-2.5 bg-italian-green text-white rounded-lg font-bold hover:bg-green-700">Salvar Configurações</button>
              </div>
           </div>
        )}

        {/* --- TAB: MENU (Product Editing) --- */}
        {activeTab === 'menu' && (
          // ... (Keep existing menu code) ...
          <>
            <button 
               onClick={() => setIsAddingNew(!isAddingNew)}
               className="w-full py-3 bg-white border-2 border-dashed border-stone-300 text-stone-500 rounded-xl hover:border-italian-green hover:text-italian-green transition-colors font-bold flex items-center justify-center gap-2 mb-6"
            >
               {isAddingNew ? <Trash2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
               {isAddingNew ? 'Cancelar Adição' : 'Adicionar Novo Produto'}
            </button>

            {isAddingNew && (
               <div className="bg-white p-6 rounded-xl shadow-lg border border-italian-green mb-6 animate-in slide-in-from-top-4">
                  <h3 className="font-bold text-lg mb-4 text-stone-800">Novo Produto</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nome</label>
                        <input type="text" value={newProductForm.name || ''} onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Preço</label>
                        <input type="number" step="0.01" value={newProductForm.price || ''} onChange={(e) => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Descrição</label>
                        <textarea value={newProductForm.description || ''} onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" rows={2}></textarea>
                     </div>
                     <div className="md:col-span-2 border-t border-stone-100 pt-3">
                        <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-italian-red" /> Imagem do Produto
                        </label>
                        <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-lg border border-stone-200">
                            {newProductForm.image ? (
                              <img src={newProductForm.image} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-stone-200 bg-white" />
                            ) : (
                              <div className="h-16 w-16 flex items-center justify-center bg-stone-100 rounded-md border border-stone-200 text-stone-400">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <div className="flex-1">
                              <input 
                                type="file" 
                                className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-italian-green file:text-white hover:file:bg-green-700 cursor-pointer"
                                accept="image/*" 
                                onChange={(e) => handleImageUpload(e, true)} 
                              />
                              <p className="text-[10px] text-stone-400 mt-1">Recomendado: Imagens quadradas ou retangulares (JPG/PNG)</p>
                            </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Categoria</label>
                        <select value={newProductForm.category || ''} onChange={(e) => setNewProductForm({...newProductForm, category: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900">
                           {menuData.filter(c => c.id !== 'promocoes').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Subcategoria (Opcional)</label>
                        <input type="text" placeholder="Ex: Long Neck, Lata" value={newProductForm.subcategory || ''} onChange={(e) => setNewProductForm({...newProductForm, subcategory: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                     </div>
                     
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Ingredientes</label>
                        <div className="flex gap-2 mb-2">
                          <input 
                             type="text" 
                             className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                             placeholder="Ex: Mussarela, Tomate"
                             value={tempIngredient}
                             onChange={(e) => setTempIngredient(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && addIngredientToNew()}
                          />
                          <button onClick={addIngredientToNew} className="bg-stone-200 text-stone-700 px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(newProductForm.ingredients || []).map((ing, i) => (
                             <span key={i} className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full border border-stone-200 flex items-center gap-1">
                               {ing} <button onClick={() => removeIngredientFromNew(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                             </span>
                          ))}
                        </div>
                     </div>
                  </div>
                  <button onClick={handleAddNew} className="w-full mt-4 bg-italian-green text-white py-2 rounded-lg font-bold hover:bg-green-700">Salvar Produto</button>
               </div>
            )}

            <div className="space-y-6">
              {menuData.filter(c => c.id !== 'promocoes').map((category) => (
                <div key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                  <div 
                    className="p-4 bg-stone-50 border-b border-stone-200 flex justify-between items-center cursor-pointer hover:bg-stone-100 transition-colors"
                    onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  >
                    <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                       {category.name} <span className="text-xs bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full">{category.items.length}</span>
                    </h3>
                    <div className={`transform transition-transform ${expandedCategory === category.id ? 'rotate-180' : ''}`}>
                      <Utensils className="w-5 h-5 text-stone-400" />
                    </div>
                  </div>
                  
                  {expandedCategory === category.id && (
                    <div className="p-4 space-y-4">
                      {category.items.length === 0 ? (
                        <p className="text-center text-stone-400 py-4 text-sm">Nenhum produto nesta categoria.</p>
                      ) : (
                        category.items.map((product) => (
                          <div key={product.id} className="border border-stone-100 rounded-lg p-4 hover:border-stone-300 transition-colors">
                            {editingProduct === product.id ? (
                              <div className="space-y-4 animate-in fade-in">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Nome</label>
                                      <input type="text" value={editForm.name || ''} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                                   </div>
                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Preço</label>
                                      <input type="number" step="0.01" value={editForm.price || ''} onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                                   </div>
                                   <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Descrição</label>
                                      <textarea value={editForm.description || ''} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" rows={2}></textarea>
                                   </div>
                                   
                                   {/* EDIT IMAGE UPLOAD SECTION */}
                                   <div className="md:col-span-2 border-t border-stone-100 pt-3">
                                      <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-italian-red" /> Imagem do Produto
                                      </label>
                                      <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-lg border border-stone-200">
                                          {editForm.image ? (
                                            <img src={editForm.image} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-stone-200 bg-white" />
                                          ) : (
                                            <div className="h-16 w-16 flex items-center justify-center bg-stone-100 rounded-md border border-stone-200 text-stone-400">
                                              <ImageIcon className="w-6 h-6" />
                                            </div>
                                          )}
                                          <div className="flex-1">
                                            <input 
                                              type="file" 
                                              className="w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-italian-green file:text-white hover:file:bg-green-700 cursor-pointer"
                                              accept="image/*" 
                                              onChange={(e) => handleImageUpload(e, false)} 
                                            />
                                            <p className="text-[10px] text-stone-400 mt-1">Recomendado: Imagens quadradas ou retangulares (JPG/PNG)</p>
                                          </div>
                                      </div>
                                   </div>

                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Categoria</label>
                                      <select value={editForm.category || ''} onChange={(e) => setEditForm({...editForm, category: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900">
                                         {menuData.filter(c => c.id !== 'promocoes').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                      </select>
                                   </div>
                                   <div>
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Subcategoria (Opcional)</label>
                                      <input type="text" value={editForm.subcategory || ''} onChange={(e) => setEditForm({...editForm, subcategory: e.target.value})} className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900" />
                                   </div>

                                   {/* Ingredients for Editing */}
                                   <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1">Ingredientes</label>
                                      <div className="flex gap-2 mb-2">
                                        <input 
                                           type="text" 
                                           className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-900"
                                           placeholder="Ex: Mussarela, Tomate"
                                           value={tempIngredient}
                                           onChange={(e) => setTempIngredient(e.target.value)}
                                           onKeyDown={(e) => e.key === 'Enter' && addIngredientToEdit()}
                                        />
                                        <button onClick={addIngredientToEdit} className="bg-stone-200 text-stone-700 px-3 rounded-lg"><Plus className="w-4 h-4"/></button>
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        {(editForm.ingredients || []).map((ing, i) => (
                                           <span key={i} className="bg-stone-100 text-stone-600 text-xs px-2 py-1 rounded-full border border-stone-200 flex items-center gap-1">
                                             {ing} <button onClick={() => removeIngredientFromEdit(i)} className="hover:text-red-500"><X className="w-3 h-3"/></button>
                                           </span>
                                        ))}
                                      </div>
                                   </div>
                                </div>
                                
                                <div className="border-t border-stone-100 pt-4 mt-4">
                                   <div className="flex justify-between items-center mb-4">
                                      <h4 className="font-bold text-sm text-stone-700 flex items-center gap-2"><Layers className="w-4 h-4"/> Personalização (Bordas/Adicionais)</h4>
                                   </div>
                                   
                                   <div className="space-y-4 mb-4">
                                      {(editForm.options || []).map((option) => (
                                         <div key={option.id} className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                                            <div className="flex justify-between items-center mb-2">
                                               <span className="font-bold text-sm text-stone-800">{option.name} <span className="text-xs font-normal text-stone-500">({option.type === 'single' ? 'Escolha Única' : 'Múltipla Escolha'})</span></span>
                                               <button onClick={() => handleRemoveOptionGroup(option.id)} className="text-red-500 hover:text-red-700 text-xs font-bold">Remover Grupo</button>
                                            </div>
                                            <div className="space-y-1 pl-2 border-l-2 border-stone-200">
                                               {option.choices.map((choice, idx) => (
                                                  <div key={idx} className="flex justify-between text-sm">
                                                     <span className="text-stone-600">{choice.name}</span>
                                                     <div className="flex items-center gap-2">
                                                        <span className="text-stone-500 font-mono text-xs">+R$ {choice.price.toFixed(2)}</span>
                                                        <button onClick={() => handleRemoveChoice(option.id, idx)} className="text-stone-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                                                     </div>
                                                  </div>
                                               ))}
                                               <button onClick={() => handleAddChoice(option.id)} className="text-xs text-italian-green font-bold mt-2 hover:underline">+ Adicionar Opção</button>
                                            </div>
                                         </div>
                                      ))}
                                   </div>

                                   <div className="flex gap-2 items-end bg-stone-50 p-3 rounded-lg border border-stone-200">
                                      <div className="flex-1">
                                         <label className="block text-xs font-bold text-stone-400 mb-1">Novo Grupo</label>
                                         <input type="text" placeholder="Ex: Borda" value={newOptionName} onChange={(e) => setNewOptionName(e.target.value)} className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900"/>
                                      </div>
                                      <div className="w-32">
                                          <label className="block text-xs font-bold text-stone-400 mb-1">Tipo</label>
                                          <select value={newOptionType} onChange={(e) => setNewOptionType(e.target.value as any)} className="w-full p-2 bg-white border border-stone-300 rounded-lg text-xs text-stone-900">
                                             <option value="single">Única (Radio)</option>
                                             <option value="multiple">Múltipla (Check)</option>
                                          </select>
                                      </div>
                                      <button onClick={handleAddOptionGroup} className="bg-stone-800 text-white px-3 py-2 rounded-lg text-xs font-bold">Criar</button>
                                   </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                  <button onClick={() => saveEdit(category.id)} className="flex-1 bg-italian-green text-white py-2 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" /> Salvar Alterações
                                  </button>
                                  <button onClick={() => setEditingProduct(null)} className="px-4 bg-stone-200 text-stone-600 rounded-lg font-bold hover:bg-stone-300">
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                  <div className="w-16 h-16 bg-stone-100 rounded-md overflow-hidden shrink-0">
                                    {product.image ? (
                                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon className="w-full h-full p-4 text-stone-300" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-stone-800">{product.name}</h4>
                                    <p className="text-sm text-stone-500 line-clamp-1">{product.description}</p>
                                    <p className="text-italian-green font-bold mt-1">R$ {product.price.toFixed(2).replace('.', ',')}</p>
                                    {product.ingredients && product.ingredients.length > 0 && (
                                       <div className="flex flex-wrap gap-1 mt-1">
                                          {product.ingredients.map((ing, i) => (
                                             <span key={i} className="text-[10px] bg-stone-100 px-1.5 rounded text-stone-500">{ing}</span>
                                          ))}
                                       </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => startEditing(product)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                                    <Edit3 className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => handleDelete(category.id, product.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};
