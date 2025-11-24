
import React, { useState } from 'react';
import { Category, Product } from '../types';
import { Save, ArrowLeft, RefreshCw, Edit3, X, Check, ChevronDown, ChevronRight, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';

interface AdminPanelProps {
  menuData: Category[];
  onUpdateProduct: (categoryId: string, productId: number, updates: Partial<Product>) => void;
  onResetMenu: () => void;
  onBack: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ menuData, onUpdateProduct, onResetMenu, onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Senha simples para demonstração
      setIsAuthenticated(true);
    } else {
      alert('Senha incorreta (Dica: admin123)');
    }
  };

  const startEditing = (product: Product) => {
    setEditingProduct(product.id);
    setEditForm(product);
  };

  const saveEdit = (categoryId: string) => {
    if (editingProduct) {
      onUpdateProduct(categoryId, editingProduct, editForm);
      setEditingProduct(null);
      setEditForm({});
    }
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setEditForm({});
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setEditForm({ ...editForm, image: '' });
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-lg">Gerenciar Cardápio</h1>
          </div>
          <button 
            onClick={() => {
              if(window.confirm('Isso irá restaurar o cardápio original e apagar todas as suas alterações. Continuar?')) {
                onResetMenu();
              }
            }}
            className="flex items-center gap-2 text-xs bg-red-900/50 hover:bg-red-900 px-3 py-1.5 rounded border border-red-800 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Resetar
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {menuData.map((category) => (
          <div key={category.id} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
            <button 
              onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}
              className="w-full px-4 py-4 flex items-center justify-between bg-white hover:bg-stone-50 transition-colors text-left border-b border-stone-100"
            >
              <h3 className="font-bold text-lg text-stone-800">{category.name}</h3>
              {expandedCategory === category.id ? <ChevronDown className="w-5 h-5 text-stone-400" /> : <ChevronRight className="w-5 h-5 text-stone-400" />}
            </button>

            {expandedCategory === category.id && (
              <div className="divide-y divide-stone-100">
                {category.items.map((item) => (
                  <div key={item.id} className="p-4 bg-stone-50/50">
                    {editingProduct === item.id ? (
                      <div className="space-y-4 bg-white p-4 rounded-lg border border-italian-green shadow-md animate-in fade-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-stone-700 mb-1">Nome do Produto</label>
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
                            <ImageIcon className="w-4 h-4" /> Imagem do Produto
                          </label>
                          
                          <div className="flex items-start gap-4 p-3 bg-stone-50 rounded-lg border border-stone-200 border-dashed">
                            {editForm.image ? (
                              <div className="relative group shrink-0">
                                <div className="h-24 w-24 rounded-lg overflow-hidden border border-stone-300 shadow-sm">
                                  <img src={editForm.image} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                                <button 
                                  onClick={removeImage}
                                  className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                  title="Remover imagem"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="h-24 w-24 rounded-lg bg-stone-200 flex items-center justify-center text-stone-400 border border-stone-300 shrink-0">
                                <ImageIcon className="w-8 h-8 opacity-50" />
                              </div>
                            )}

                            <div className="flex-1">
                              <label className="cursor-pointer flex flex-col items-center justify-center w-full h-24 border-2 border-stone-300 border-dashed rounded-lg bg-white hover:bg-stone-50 transition-colors group">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Upload className="w-6 h-6 text-stone-400 group-hover:text-italian-green mb-1" />
                                  <p className="mb-1 text-xs text-stone-500"><span className="font-semibold">Clique para enviar</span></p>
                                  <p className="text-[10px] text-stone-400">JPG, PNG (Max 2MB)</p>
                                </div>
                                <input 
                                  type="file" 
                                  className="hidden" 
                                  accept="image/*"
                                  onChange={handleImageUpload}
                                />
                              </label>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-stone-100">
                          <button onClick={cancelEdit} className="px-4 py-2 text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 text-sm font-bold shadow-sm">
                            Cancelar
                          </button>
                          <button onClick={() => saveEdit(category.id)} className="px-4 py-2 text-white bg-italian-green rounded-lg hover:bg-green-700 text-sm font-bold shadow-sm flex items-center gap-2">
                            <Save className="w-4 h-4" /> Salvar Alterações
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-4 bg-white p-3 rounded-lg border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
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
                            <p className="text-sm font-semibold text-italian-green mt-0.5">R$ {item.price.toFixed(2)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => startEditing(item)}
                          className="p-2.5 text-stone-500 hover:text-italian-red hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
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
      </main>
    </div>
  );
};
