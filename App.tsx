import React, { useState, useRef, useEffect } from 'react';
import { MENU_DATA } from './data'; // Fallback data
import { Product, CartItem, Category } from './types';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { ShoppingBag, Check, Loader2 } from 'lucide-react';
import { supabase } from './supabaseClient';

// Helper to validate loaded cart items
const isValidCartItem = (item: any): item is CartItem => {
  return (
    item &&
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.price === 'number' &&
    typeof item.quantity === 'number' &&
    item.quantity > 0
  );
};

function App() {
  // --- STATE MANAGEMENT FOR MENU DATA (Supabase Backend) ---
  const [menuData, setMenuData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch menu from Supabase or Fallback
  const fetchMenu = async () => {
    setLoading(true);

    // MODO OFFLINE / FALLBACK
    if (!supabase) {
      console.log('Modo Offline: Carregando dados locais.');
      setMenuData(MENU_DATA);
      setError('Modo Offline (Configure o Supabase para salvar na nuvem)');
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar Categorias
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('order_index');

      if (catError) throw catError;

      // 2. Buscar Produtos
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*');

      if (prodError) throw prodError;

      // 3. Estruturar os dados (Relacionar Produtos às Categorias)
      if (categories && products) {
        const structuredMenu: Category[] = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          items: products.filter((prod: any) => prod.category_id === cat.id).sort((a: any, b: any) => a.id - b.id)
        }));
        setMenuData(structuredMenu);
        setError(null);
      }
    } catch (err: any) {
      console.error('Erro ao buscar cardápio:', err);
      // Se falhar (ex: credenciais erradas mesmo com URL válida), usa o local
      setMenuData(MENU_DATA);
      setError('Erro de conexão. Exibindo dados locais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // --- APP STATE ---
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('spagnolli_cart');
      if (!savedCart) return [];
      
      const parsed = JSON.parse(savedCart);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidCartItem).map(item => ({
          ...item,
          observation: item.observation || ''
        }));
      }
      return [];
    } catch (error) {
      console.error("Error loading cart from localStorage:", error);
      try { localStorage.removeItem('spagnolli_cart'); } catch(e) {}
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isCartAnimating, setIsCartAnimating] = useState(false);

  // Set initial active category once menu loads
  useEffect(() => {
    if (menuData.length > 0 && !activeCategory) {
      setActiveCategory(menuData[0].id);
    }
  }, [menuData]);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('spagnolli_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart to localStorage:", error);
    }
  }, [cartItems]);

  // Hide toast
  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // --- ADMIN ACTIONS ---
  const handleUpdateProduct = async (categoryId: string, productId: number, updates: Partial<Product>) => {
    // Otimista: Atualiza a UI imediatamente
    setMenuData(prevMenu => {
      return prevMenu.map(cat => {
        if (cat.id !== categoryId) return cat;
        return {
          ...cat,
          items: cat.items.map(prod => {
            if (prod.id !== productId) return prod;
            return { ...prod, ...updates };
          })
        };
      });
    });

    if (!supabase) {
      alert('Modo Offline: Alteração realizada apenas localmente (temporário).');
      return;
    }

    try {
      // Persiste no Supabase
      const { error } = await supabase
        .from('products')
        .update({
          name: updates.name,
          price: updates.price,
          description: updates.description,
          image: updates.image
        })
        .eq('id', productId);

      if (error) throw error;
      
      alert('Produto salvo na nuvem com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar no Supabase:', err);
      alert('Erro ao salvar online. Verifique sua conexão ou credenciais.');
      fetchMenu(); // Reverte para o estado do servidor em caso de erro
    }
  };

  const handleResetMenu = () => {
    if(window.confirm('Recarregar dados originais?')) {
      fetchMenu();
    }
  };

  // --- CART ACTIONS ---
  const addToCart = (product: Product, quantity: number, observation: string) => {
    const normalizedObservation = (observation || '').trim();

    setCartItems(prev => {
      const existingItemIndex = prev.findIndex(
        item => item.id === product.id && (item.observation || '').trim() === normalizedObservation
      );

      if (existingItemIndex >= 0) {
        const newItems = [...prev];
        const currentItem = newItems[existingItemIndex];
        newItems[existingItemIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + quantity
        };
        return newItems;
      } else {
        return [...prev, { ...product, quantity, observation: normalizedObservation }];
      }
    });
    
    setShowToast(true);
    setIsCartAnimating(true);
    setTimeout(() => setIsCartAnimating(false), 300);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      if (window.confirm('Remover este item do carrinho?')) {
        removeFromCart(index);
      }
      return;
    }
    setCartItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity: newQuantity };
      return newItems;
    });
  };

  const updateObservation = (index: number, newObservation: string) => {
    setCartItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], observation: newObservation };
      return newItems;
    });
  };

  const removeFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (window.confirm('Tem certeza que deseja esvaziar o carrinho?')) {
      setCartItems([]);
      setIsCartOpen(false);
    }
  };

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const headerOffset = 120;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((acc, item) => acc + (item.price * (item.quantity || 0)), 0);

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-italian-red animate-spin" />
        <p className="text-stone-500 font-display">Carregando cardápio...</p>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <AdminPanel 
        menuData={menuData}
        onUpdateProduct={handleUpdateProduct}
        onResetMenu={handleResetMenu}
        onBack={() => setView('customer')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 pb-24 md:pb-0 font-sans relative">
      <Header 
        cartCount={totalItems} 
        onOpenCart={() => setIsCartOpen(true)} 
        animateCart={isCartAnimating}
      />
      
      {error && (
        <div className="bg-yellow-100 border-b border-yellow-200 text-yellow-800 px-4 py-2 text-xs text-center">
          {error}
        </div>
      )}
      
      <CategoryNav 
        categories={menuData} 
        activeCategory={activeCategory}
        onSelectCategory={handleCategorySelect}
      />

      <main className="max-w-5xl mx-auto px-4 pt-6">
        {/* Banner Area */}
        <div className="bg-gradient-to-r from-stone-900 to-stone-800 text-white rounded-2xl p-6 mb-8 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
             <span className="bg-italian-red text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Novidade</span>
             <h2 className="text-3xl font-display">Bateu a fome?</h2>
             <p className="text-stone-300 max-w-md">
               Escolha sua pizza favorita e receba no conforto da sua casa. 
               A verdadeira tradição italiana em Itupeva.
             </p>
          </div>
          <div className="w-32 h-32 md:w-40 md:h-40 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white/10 shadow-inner relative overflow-hidden">
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80')] bg-cover bg-center opacity-90"></div>
          </div>
        </div>

        <div className="space-y-10">
          {menuData.map((category) => (
            <section 
              key={category.id} 
              id={`category-${category.id}`}
              className="scroll-mt-32"
            >
              <h2 className="text-2xl font-bold text-stone-800 mb-4 pl-2 border-l-4 border-italian-red">
                {category.name}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAddToCart={addToCart} 
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>

      <Footer onOpenAdmin={() => setView('admin')} />

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onUpdateQuantity={updateQuantity}
        onUpdateObservation={updateObservation}
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right duration-300 pointer-events-none">
          <div className="bg-italian-green text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-full">
              <Check className="w-4 h-4" />
            </div>
            <span className="font-medium">Item adicionado ao carrinho!</span>
          </div>
        </div>
      )}

      {/* Floating Cart Button */}
      {totalItems > 0 && !isCartOpen && (
        <>
          {/* Mobile Bottom Bar */}
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-40">
            <button 
              onClick={() => setIsCartOpen(true)}
              className={`w-full bg-italian-green text-white py-3 px-6 rounded-xl shadow-xl shadow-green-900/20 flex items-center justify-between animate-in slide-in-from-bottom-4 duration-300 ring-2 ring-white/20 transition-transform ${isCartAnimating ? 'scale-105 bg-green-600' : ''}`}
            >
              <div className="flex flex-col items-start text-left">
                <span className="text-xs font-light text-green-100">Total estimado</span>
                <span className="font-bold text-lg">R$ {totalPrice.toFixed(2).replace('.', ',')}</span>
              </div>
              <div className={`flex items-center gap-2 bg-green-700/50 px-3 py-1.5 rounded-lg transition-transform duration-300 ${isCartAnimating ? 'scale-110' : ''}`}>
                <ShoppingBag className="w-5 h-5" />
                <span className="font-bold">{totalItems}</span>
              </div>
            </button>
          </div>

          {/* Desktop Floating Button */}
          <div className="hidden md:block fixed bottom-8 right-8 z-40">
            <button
              onClick={() => setIsCartOpen(true)}
              className={`bg-italian-green text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-110 transition-all hover:bg-green-700 group relative ${isCartAnimating ? 'scale-125 bg-green-600' : ''}`}
            >
              <ShoppingBag className={`w-8 h-8 group-hover:animate-pulse ${isCartAnimating ? 'animate-bounce' : ''}`} />
              <span className="absolute -top-2 -right-2 bg-italian-red text-white text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white">
                {totalItems}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;