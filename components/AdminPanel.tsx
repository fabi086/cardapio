import React, { useState, useEffect } from 'react';
import { Category, Product, StoreSettings } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, Plus, Settings, Trash2, Image as ImageIcon, Upload, Grid, MapPin, X, Check } from 'lucide-react';

interface AdminPanelProps {
  menuData: Category[];
  settings: StoreSettings;
  onUpdateProduct: (categoryId: string, productId: number, updates: Partial<Product>) => void;
  onAddProduct: (categoryId: string, product: Omit<Product, 'id'>) => void;
  onDeleteProduct: (categoryId: string, productId: number) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  onResetMenu: () => void;
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  menuData, 
  settings, 
  onUpdateProduct, 
  onAddProduct,
  onDeleteProduct,
  onUpdateSettings,
  onResetMenu, 
  onBack 
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'menu' | 'settings'>('menu');
  
  // Menu State
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({ 
    category: menuData[0]?.id || 'pizzas-salgadas',
    image: '',
    price: 0
  });

  // Settings State
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(settings);
  
  // Region Management State
  const [editingRegionId, setEditingRegionId] = useState<string | null>(null);
  const [newRegionName, setNewRegionName] = useState('');
  const [newRegionPrice, setNewRegionPrice] = useState('');
  const [newRegionZips, setNewRegionZips] = useState('');

  // SINCRONIZAÇÃO IMPORTANTE: Atualiza o formulário quando os dados externos mudam
  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Senha simples para demonstração
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta (Dica: admin123)');
    }
  };

  // --- MENU ACTIONS ---
  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm(product);
  };

  const saveEdit = (originalCategoryId: string) => {
    if (editingProduct && editForm) {
      onUpdateProduct(originalCategoryId, editingProduct, editForm);
      setEditingProduct(null);
      setEditForm({});
    }
  };

  const handleDelete = (categoryId: string, productId: number) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      onDeleteProduct(categoryId, productId);
    }
  };

  const handleAddNew = () => {
    if (!newProductForm.name || !newProductForm.price) {
      alert('Preencha pelo menos nome e preço.');
      return;
    }

    const categoryId = newProductForm.category || menuData[0].id;
    
    onAddProduct(categoryId, {
      name: newProductForm.name,
      description: newProductForm.description || '',
      price: Number(newProductForm.price),
      category: categoryId,
      image: newProductForm.image,
      code: newProductForm.code
    });

    setIsAddingNew(false);
    setNewProductForm({ category: menuData[0]?.id, image: '', price: 0 });
    alert('Produto adicionado!');
  };

  // --- SETTINGS ACTIONS ---
  const handleSaveSettings = () => {
    onUpdateSettings(settingsForm);
    alert('Configurações salvas e atualizadas no site!');
  };

  const handleAddRegion = () => {
    if (!newRegionName || !newRegionPrice) return;
    
    // Process ZIPs: Allow numbers and hyphens, remove other chars
    const zipArray = newRegionZips
      ? newRegionZips.split(',').map(z => z.trim().replace(/[^0-9-]/g, '')).filter(z => z.length > 0)
      : [];

    const newRegion = {
      // If editing, keep ID. If new, generate slug.
      id: editingRegionId || newRegionName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      name: newRegionName,
      price: parseFloat(newRegionPrice),
      zipPrefixes: zipArray
    };
    
    if (editingRegionId) {
      // Update existing region
      setSettingsForm({
        ...settingsForm,
        deliveryRegions: (settingsForm.deliveryRegions || []).map(r => r.id === editingRegionId ? newRegion : r)
      });
      // Reset edit mode
      setEditingRegionId(null);
    } else {
      // Add new region
      setSettingsForm({
        ...settingsForm,
        deliveryRegions: [...(settingsForm.deliveryRegions || []), newRegion]
      });
    }
    
    // Clear inputs
    setNewRegionName('');
    setNewRegionPrice('');
    setNewRegionZips('');
  };

  const startEditingRegion = (region: any) => {
    setEditingRegionId(region.id);
    setNewRegionName(region.name);
    setNewRegionPrice(region.price.toString());
    setNewRegionZips(region.zipPrefixes ? region.zipPrefixes.join(', ') : '');
  };

  const cancelEditingRegion = () => {
    setEditingRegionId(null);
    setNewRegionName('');
    setNewRegionPrice('');
    setNewRegionZips('');
  };

  const handleRemoveRegion = (id: string) => {
    if (window.confirm('Remover esta região de entrega?')) {
      setSettingsForm({
        ...settingsForm,
        deliveryRegions: (settingsForm.deliveryRegions || []).filter(r => r.id !== id)
      });
      if (editingRegionId === id) cancelEditingRegion();
    }
  };

  // --- IMAGE UTILS ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (isNew) {
          setNewProductForm({ ...newProductForm, image: reader.result as string });
        } else {
          setEditForm({ ...editForm, image: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-stone-100 pb-20">
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

          <div className="flex space-x-4 border-b border-stone-700">
             <button 
                onClick={() => setActiveTab('menu')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === 'menu' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Grid className="w-4 h-4" /> Cardápio
             </button>
             <button 
                onClick={() => setActiveTab('settings')}
                className={`pb-2 px-2 flex items-center gap-2 text-sm font-bold transition-colors ${activeTab === 'settings' ? 'text-italian-green border-b-2 border-italian-green' : 'text-stone-400 hover:text-white'}`}
             >
                <Settings className="w-4 h-4" /> Configurações
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* --- TAB: SETTINGS --- */}
        {activeTab === 'settings' && (
           <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 animate-in fade-in slide-in-from-bottom-2 space-y-8">
              
              {/* Basic Info */}
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-italian-red" /> Dados do Estabelecimento
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 mb-2">
                      <strong>Dica:</strong> As alterações feitas aqui atualizam o nome, logo e rodapé do site instantaneamente. Use esta área para personalizar a marca do seu negócio.
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">Nome do Estabelecimento</label>
                      <input 
                        type="text" 
                        value={settingsForm.name} 
                        onChange={(e) => setSettingsForm({...settingsForm, name: e.target.value})}
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 focus:ring-1 focus:ring-italian-green"
                      />
                  </div>
                  <div>
                      <label className="block text-sm font-bold text-stone-700 mb-1">WhatsApp de Pedidos</label>
                      <input 
                        type="text" 
                        value={settingsForm.whatsapp} 
                        onChange={(e) => setSettingsForm({...settingsForm, whatsapp: e.target.value})}
                        placeholder="Ex: 5511999999999"
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 focus:ring-1 focus:ring-italian-green"
                      />
                      <p className="text-[10px] text-stone-500 mt-1">
                        Preferência: Apenas números com DDD (ex: 5511999999999).
                      </p>
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Logo URL (Link da Imagem)</label>
                      <input 
                        type="text" 
                        value={settingsForm.logoUrl} 
                        onChange={(e) => setSettingsForm({...settingsForm, logoUrl: e.target.value})}
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 focus:ring-1 focus:ring-italian-green"
                        placeholder="/logo.png ou https://..."
                      />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Endereço Completo</label>
                      <input 
                        type="text" 
                        value={settingsForm.address} 
                        onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})}
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 focus:ring-1 focus:ring-italian-green"
                      />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Horário de Funcionamento</label>
                      <input 
                        type="text" 
                        value={settingsForm.openingHours} 
                        onChange={(e) => setSettingsForm({...settingsForm, openingHours: e.target.value})}
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 focus:ring-1 focus:ring-italian-green"
                      />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-stone-700 mb-1">Telefones (Separar por vírgula)</label>
                      <input 
                        type="text" 
                        value={settingsForm.phones.join(', ')} 
                        onChange={(e) => setSettingsForm({...settingsForm, phones: e.target.value.split(',').map(s => s.trim())})}
                        className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 focus:ring-1 focus:ring-italian-green"
                      />
                  </div>
                </div>
              </div>

              <hr className="border-stone-200" />

              {/* Delivery Regions */}
              <div>
                <h2 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                   <MapPin className="w-5 h-5 text-italian-red" /> Taxas de Entrega por CEP
                </h2>
                
                <div className={`p-4 rounded-lg border mb-4 transition-colors ${editingRegionId ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'}`}>
                   {editingRegionId && (
                      <div className="flex items-center gap-2 mb-3 text-orange-700 text-sm font-bold">
                        <Edit3 className="w-4 h-4" /> Editando Região
                      </div>
                   )}
                   <div className="space-y-3">
                      <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-8 md:col-span-9">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Nome da Região/Bairro</label>
                           <input 
                              type="text" 
                              value={newRegionName}
                              onChange={(e) => setNewRegionName(e.target.value)}
                              placeholder="Ex: Centro"
                              className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm"
                           />
                        </div>
                        <div className="col-span-4 md:col-span-3">
                           <label className="block text-xs font-bold text-stone-500 mb-1">Taxa (R$)</label>
                           <input 
                              type="number" 
                              value={newRegionPrice}
                              onChange={(e) => setNewRegionPrice(e.target.value)}
                              placeholder="0.00"
                              className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm"
                           />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-12 gap-3 items-end">
                         <div className="col-span-10">
                           <label className="block text-xs font-bold text-stone-500 mb-1">CEPs (Separados por vírgula)</label>
                           <input 
                              type="text" 
                              value={newRegionZips}
                              onChange={(e) => setNewRegionZips(e.target.value)}
                              placeholder="Ex: 13295-000, 13200"
                              className="w-full p-2 bg-white border border-stone-300 rounded-md text-sm"
                           />
                           <p className="text-[10px] text-stone-400 mt-1">
                             O sistema verificará se o CEP do cliente começa com um destes números. Hifens são opcionais.
                           </p>
                         </div>
                         <div className="col-span-2 flex gap-1">
                           {editingRegionId && (
                             <button 
                                onClick={cancelEditingRegion}
                                className="flex-1 p-2 bg-white border border-stone-300 text-stone-500 rounded-md text-sm font-bold hover:bg-stone-100 flex items-center justify-center h-[38px]"
                                title="Cancelar Edição"
                             >
                                <X className="w-4 h-4" />
                             </button>
                           )}
                           <button 
                              onClick={handleAddRegion}
                              className={`flex-1 p-2 rounded-md text-sm font-bold flex items-center justify-center h-[38px] transition-colors ${
                                editingRegionId 
                                  ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                                  : 'bg-italian-green hover:bg-green-700 text-white'
                              }`}
                              title={editingRegionId ? "Atualizar Região" : "Adicionar Região"}
                           >
                              {editingRegionId ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                           </button>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="space-y-2">
                  {(settingsForm.deliveryRegions || []).map((region, idx) => (
                    <div key={idx} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-white border rounded-lg shadow-sm gap-2 ${editingRegionId === region.id ? 'border-orange-300 ring-1 ring-orange-300 bg-orange-50' : 'border-stone-200'}`}>
                      <div className="flex-1">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-800">{region.name}</span>
                            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full border border-stone-200">
                               {region.zipPrefixes && region.zipPrefixes.length > 0 
                                  ? `${region.zipPrefixes.length} CEPs` 
                                  : 'Sem restrição de CEP'}
                            </span>
                         </div>
                         {region.zipPrefixes && region.zipPrefixes.length > 0 && (
                            <p className="text-xs text-stone-500 mt-1 truncate max-w-md">
                               CEPs: {region.zipPrefixes.join(', ')}
                            </p>
                         )}
                      </div>
                      
                      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                        <span className="font-bold text-green-600 mr-2">R$ {region.price.toFixed(2)}</span>
                        
                        <button 
                          onClick={() => startEditingRegion(region)}
                          className="text-stone-400 hover:text-orange-500 p-1.5 hover:bg-orange-50 rounded"
                          title="Editar Região"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => handleRemoveRegion(region.id)}
                          className="text-stone-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded"
                          title="Remover Região"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!settingsForm.deliveryRegions || settingsForm.deliveryRegions.length === 0) && (
                    <p className="text-center text-sm text-stone-400 italic py-4">Nenhuma região cadastrada.</p>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-stone-100">
                  <button 
                      onClick={handleSaveSettings}
                      className="px-6 py-2.5 bg-italian-green text-white rounded-lg font-bold shadow-md hover:bg-green-700 flex items-center gap-2"
                  >
                      <Save className="w-5 h-5" /> Salvar Configurações
                  </button>
              </div>
           </div>
        )}

        {/* --- TAB: MENU --- */}
        {activeTab === 'menu' && (
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
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Categoria</label>
                        <select 
                           value={newProductForm.category}
                           onChange={(e) => setNewProductForm({...newProductForm, category: e.target.value})}
                           className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                        >
                           {menuData.map(cat => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                           ))}
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Código (Opcional)</label>
                        <input type="text" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" 
                           value={newProductForm.code || ''} onChange={e => setNewProductForm({...newProductForm, code: e.target.value})} />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Nome</label>
                        <input type="text" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" 
                           value={newProductForm.name || ''} onChange={e => setNewProductForm({...newProductForm, name: e.target.value})} />
                     </div>
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Descrição</label>
                        <textarea className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg h-20 resize-none" 
                           value={newProductForm.description || ''} onChange={e => setNewProductForm({...newProductForm, description: e.target.value})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Preço (R$)</label>
                        <input type="number" step="0.01" className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg" 
                           value={newProductForm.price} onChange={e => setNewProductForm({...newProductForm, price: parseFloat(e.target.value)})} />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Imagem</label>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="w-full text-xs" />
                     </div>
                  </div>
                  <button onClick={handleAddNew} className="mt-4 w-full bg-italian-green text-white py-2 rounded-lg font-bold hover:bg-green-700">
                     Confirmar e Adicionar
                  </button>
               </div>
            )}

            {menuData.map((category) => (
              <div key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden mb-4">
                <button 
                  onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
                  className="w-full px-4 py-4 flex items-center justify-between bg-white hover:bg-stone-50 transition-colors text-left border-b border-stone-100"
                >
                  <h3 className="font-bold text-lg text-stone-800">{category.name} <span className="text-xs text-stone-400 font-normal ml-2">({category.items.length} itens)</span></h3>
                </button>

                {expandedCategory === category.id && (
                  <div className="divide-y divide-stone-100">
                    {category.items.map((item) => (
                      <div key={item.id} className="p-4 bg-stone-50/50">
                        {editingProduct === item.id ? (
                          <div className="space-y-4 bg-white p-4 rounded-lg border border-italian-green shadow-md animate-in fade-in zoom-in-95 duration-200">
                            {/* CATEGORY SELECTOR IN EDIT */}
                            <div className="mb-2">
                               <label className="block text-xs font-bold text-italian-red mb-1">Mover para Categoria</label>
                               <select 
                                  value={editForm.category}
                                  onChange={(e) => setEditForm({...editForm, category: e.target.value})}
                                  className="w-full p-2 bg-red-50 border border-red-200 rounded-md text-stone-800 text-sm focus:ring-1 focus:ring-italian-red"
                               >
                                  {menuData.map(cat => (
                                     <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                               </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-stone-700 mb-1">Nome</label>
                                <input 
                                  type="text" 
                                  value={editForm.name || ''} 
                                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                  className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm focus:ring-1 focus:ring-italian-green outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">Preço (R$)</label>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  value={editForm.price || 0} 
                                  onChange={(e) => setEditForm({...editForm, price: parseFloat(e.target.value)})}
                                  className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm focus:ring-1 focus:ring-italian-green outline-none"
                                />
                              </div>
                            </div>
                            
                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">Descrição</label>
                              <textarea 
                                value={editForm.description || ''} 
                                onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                className="w-full p-2.5 bg-white border border-stone-300 rounded-md text-stone-900 text-sm h-24 resize-none focus:ring-1 focus:ring-italian-green outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-1">
                                <ImageIcon className="w-4 h-4" /> Imagem
                              </label>
                              
                              <div className="flex items-start gap-4 p-3 bg-stone-50 rounded-lg border border-stone-200 border-dashed">
                                {editForm.image ? (
                                  <div className="relative group shrink-0">
                                    <div className="h-16 w-16 rounded-lg overflow-hidden border border-stone-300 shadow-sm">
                                      <img src={editForm.image} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <button 
                                      onClick={() => setEditForm({...editForm, image: ''})}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                      title="Remover imagem"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="h-16 w-16 rounded-lg bg-stone-200 flex items-center justify-center text-stone-400 border border-stone-300 shrink-0">
                                    <ImageIcon className="w-6 h-6 opacity-50" />
                                  </div>
                                )}

                                <div className="flex-1">
                                  <label className="cursor-pointer flex flex-col items-center justify-center w-full h-16 border-2 border-stone-300 border-dashed rounded-lg bg-white hover:bg-stone-50 transition-colors group">
                                    <div className="flex flex-col items-center justify-center">
                                      <p className="text-[10px] text-stone-500">Clique para enviar</p>
                                    </div>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(e)}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between gap-3 pt-2 border-t border-stone-100">
                              <button 
                                onClick={() => handleDelete(category.id, item.id)}
                                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-bold flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" /> Excluir
                              </button>
                              <div className="flex gap-2">
                                 <button onClick={() => setEditingProduct(null)} className="px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 text-sm font-bold shadow-sm">
                                    Cancelar
                                 </button>
                                 <button onClick={() => saveEdit(category.id)} className="px-4 py-2 text-white bg-italian-green rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm flex items-center gap-2">
                                    <Save className="w-4 h-4" /> Salvar
                                 </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="h-14 w-14 rounded-lg bg-stone-100 shrink-0 overflow-hidden border border-stone-200">
                                {item.image ? (
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                                    <ImageIcon className="w-6 h-6" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-stone-800 truncate text-base">{item.name}</h4>
                                <div className="flex items-center gap-2">
                                   <p className="text-sm font-semibold text-italian-green mt-0.5">R$ {item.price.toFixed(2)}</p>
                                   {item.code && <span className="text-[10px] bg-stone-100 text-stone-500 px-1 rounded">{item.code}</span>}
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => startEditing(item)}
                              className="p-2.5 text-stone-400 hover:text-italian-green hover:bg-green-50 rounded-lg transition-colors"
                              title="Editar produto"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
};