import React, { useState, useEffect, useMemo } from 'react';
import { MENU_DATA, DEFAULT_SETTINGS, CATEGORY_IMAGES } from './data';
import { Product, CartItem, Category, StoreSettings, WeeklySchedule } from './types';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { AdminPanel } from './components/AdminPanel';
import { PromoBanner } from './components/PromoBanner';
import { InfoModal } from './components/InfoModal';
import { OnboardingGuide } from './components/OnboardingGuide';
import { PizzaBuilderModal } from './components/PizzaBuilderModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { ShoppingBag, Check, Loader2, Search, X, Filter, Clock, AlertCircle, HelpCircle, Leaf, Flame, Star, Zap, PieChart } from 'lucide-react';
import { supabase } from './supabaseClient';

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

// --- PHASE 1: ADVANCED SCHEDULE LOGIC ---
const DAYS_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const checkStoreOpenAdvanced = (schedule?: WeeklySchedule, timezone?: string): { isOpen: boolean, message: string } => {
  if (!schedule) return { isOpen: true, message: '' }; // Fallback to always open if no schedule

  try {
    // Get current time in store's timezone
    const timeZone = timezone || 'America/Sao_Paulo';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', { 
      timeZone, 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false,
      weekday: 'long'
    });
    
    // Hacky way to get parts because Intl API can be tricky across browsers
    // Better approach: create a Date object relative to the Timezone
    const tzDateString = now.toLocaleString('en-US', { timeZone });
    const tzDate = new Date(tzDateString);
    const dayIndex = tzDate.getDay(); // 0 = Sun
    const currentDayKey = DAYS_MAP[dayIndex] as keyof WeeklySchedule;
    
    const currentHour = tzDate.getHours();
    const currentMinute = tzDate.getMinutes();
    const currentTimeVal = currentHour * 60 + currentMinute;

    const daySchedule = schedule[currentDayKey];

    if (!daySchedule || !daySchedule.isOpen) {
       return { isOpen: false, message: 'Fechado hoje' };
    }

    // Check intervals
    const isOpenNow = daySchedule.intervals.some(interval => {
       const [startH, startM] = interval.start.split(':').map(Number);
       const [endH, endM] = interval.end.split(':').map(Number);
       
       const startVal = startH * 60 + startM;
       let endVal = endH * 60 + endM;
       
       // Handle crossing midnight (e.g. 18:00 to 02:00)
       // If end time is smaller than start time, assume it ends the next day
       // Note: This simple check only validates if "now" is within the start->midnight portion or midnight->end portion
       // Ideally, complex crossing midnight logic requires checking previous day's overflow. 
       // For simplicity in this version, we assume "End of day" is 23:59 or next day hours are separate.
       
       // If end is smaller, treat as up to midnight for this check (simplified)
       if (endVal < startVal) endVal = 24 * 60; 

       return currentTimeVal >= startVal && currentTimeVal < endVal;
    });

    if (isOpenNow) {
       return { isOpen: true, message: 'Aberto Agora' };
    } else {
       // Find next opening time today
       const nextInterval = daySchedule.intervals.find(interval => {
          const [startH, startM] = interval.start.split(':').map(Number);
          const startVal = startH * 60 + startM;
          return startVal > currentTimeVal;
       });

       if (nextInterval) {
          return { isOpen: false, message: `Fechado. Abre às ${nextInterval.start}` };
       } else {
          return { isOpen: false, message: 'Fechado por hoje' };
       }
    }

  } catch (e) {
    console.error("Error calculating schedule", e);
    return { isOpen: true, message: '' }; // Fail safe
  }
};

function App() {
  const [menuData, setMenuData] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState('all'); // 'all' or categoryId
  const [activeTags, setActiveTags] = useState<string[]>([]);

  // Info Modal State
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [storeStatus, setStoreStatus] = useState({ isOpen: true, message: '' });

  // Guide State
  const [showGuide, setShowGuide] = useState(false);

  // Pizza Builder State
  const [isPizzaBuilderOpen, setIsPizzaBuilderOpen] = useState(false);
  const [pizzaBuilderCategory, setPizzaBuilderCategory] = useState<string>('');
  const [pizzaBuilderFirstHalf, setPizzaBuilderFirstHalf] = useState<Product | null>(null);

  // Order Tracker State
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);

  // Theme State
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // --- PHASE 2: APPLY VISUAL THEME ---
  useEffect(() => {
    if (storeSettings.colors) {
      const root = document.documentElement;
      root.style.setProperty('--color-primary', storeSettings.colors.primary);
      root.style.setProperty('--color-secondary', storeSettings.colors.secondary);
      // You could also set background colors here if needed
    }
  }, [storeSettings.colors]);

  // Atualiza o título da página e as Meta Tags de Compartilhamento (WhatsApp)
  useEffect(() => {
    // Prioridade: SEO Title > Nome da Loja > Padrão
    const pageTitle = storeSettings.seoTitle?.trim() ? storeSettings.seoTitle : (storeSettings.name || 'Cardápio Digital');
    document.title = pageTitle;

    // Helper to safely update meta tags
    const updateMetaTag = (selector: string, content: string) => {
      if (!content) return;

      let element = document.querySelector(selector);
      if (!element) {
        element = document.createElement('meta');
        
        if (selector.startsWith('meta[property')) {
           const property = selector.replace("meta[property='", "").replace("']", "");
           element.setAttribute('property', property);
        } else if (selector.startsWith('meta[name')) {
           const name = selector.replace("meta[name='", "").replace("']", "");
           element.setAttribute('name', name);
        }
        
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Update Open Graph Tags
    updateMetaTag("meta[property='og:title']", pageTitle);
    updateMetaTag("meta[property='og:description']", storeSettings.seoDescription || '');
    if (storeSettings.seoBannerUrl) {
       updateMetaTag("meta[property='og:image']", storeSettings.seoBannerUrl);
    }
    
    // Update Standard Description
    updateMetaTag("meta[name='description']", storeSettings.seoDescription || '');

  }, [storeSettings]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  // Check store status when settings load
  useEffect(() => {
     // Use Advanced Check if schedule exists, otherwise legacy string check logic could go here
     if (storeSettings.schedule) {
        setStoreStatus(checkStoreOpenAdvanced(storeSettings.schedule, storeSettings.timezone));
     } else if (storeSettings.openingHours) {
        // Fallback logic could be re-implemented here if needed, 
        // but for now let's assume if no schedule obj, it's open.
        setStoreStatus({ isOpen: true, message: '' });
     }
     
     if (storeSettings.enableGuide !== false) {
       const hasSeenGuide = localStorage.getItem('hasSeenGuide_v1');
       if (!hasSeenGuide) {
         setTimeout(() => setShowGuide(true), 1500);
       }
     }
  }, [storeSettings]);

  const closeGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenGuide_v1', 'true');
  };

  const restartGuide = () => {
    setShowGuide(true);
  };

  const openPizzaBuilder = (categoryId: string, firstHalf: Product | null = null) => {
    setPizzaBuilderCategory(categoryId);
    setPizzaBuilderFirstHalf(firstHalf);
    setIsPizzaBuilderOpen(true);
  };

  const fetchData = async () => {
    setLoading(true);

    if (!supabase) {
      setMenuData(MENU_DATA);
      setStoreSettings(DEFAULT_SETTINGS);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const { data: categories, error: catError } = await supabase
        .from('categories')
        .select('*')
        .order('order_index');
      
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*');

      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .order('id', { ascending: true }) 
        .limit(1)
        .maybeSingle();

      if (catError) throw catError;
      if (prodError) throw prodError;
      if (settingsError) throw settingsError;

      if (categories && products) {
        const structuredMenu: Category[] = categories.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          image: cat.image || CATEGORY_IMAGES[cat.id] || null,
          items: products
            .filter((prod: any) => prod.category_id === cat.id)
            .sort((a: any, b: any) => a.id - b.id)
            .map((prod: any) => {
              let opts = prod.options;
              if (typeof opts === 'string') {
                try { opts = JSON.parse(opts); } catch(e) { opts = []; }
              }
              const ingredients = Array.isArray(prod.ingredients) ? prod.ingredients : [];
              const tags = Array.isArray(prod.tags) ? prod.tags : [];
              return { ...prod, options: opts || [], ingredients, tags };
            })
        }));
        setMenuData(structuredMenu);
      }

      if (settingsData) {
        setSettingsId(settingsData.id);
        
        let deliveryRegions = settingsData.delivery_regions;
        if (typeof deliveryRegions === 'string') {
          try {
            deliveryRegions = JSON.parse(deliveryRegions);
          } catch (e) {
            deliveryRegions = DEFAULT_SETTINGS.deliveryRegions;
          }
        }

        let schedule = settingsData.schedule;
        if (typeof schedule === 'string') {
           try { schedule = JSON.parse(schedule); } catch(e) { schedule = DEFAULT_SETTINGS.schedule; }
        }

        let colors = settingsData.colors;
        if (typeof colors === 'string') {
           try { colors = JSON.parse(colors); } catch(e) { colors = DEFAULT_SETTINGS.colors; }
        }

        setStoreSettings({
            name: settingsData.name || DEFAULT_SETTINGS.name,
            whatsapp: settingsData.whatsapp || DEFAULT_SETTINGS.whatsapp,
            logoUrl: settingsData.logo_url || DEFAULT_SETTINGS.logoUrl,
            address: settingsData.address || DEFAULT_SETTINGS.address,
            openingHours: settingsData.opening_hours || DEFAULT_SETTINGS.openingHours,
            schedule: schedule || DEFAULT_SETTINGS.schedule,
            phones: (settingsData.phones && Array.isArray(settingsData.phones)) ? settingsData.phones : DEFAULT_SETTINGS.phones,
            paymentMethods: (settingsData.payment_methods && Array.isArray(settingsData.payment_methods)) ? settingsData.payment_methods : DEFAULT_SETTINGS.paymentMethods,
            deliveryRegions: Array.isArray(deliveryRegions) ? deliveryRegions : DEFAULT_SETTINGS.deliveryRegions,
            enableGuide: settingsData.enable_guide ?? true,
            freeShipping: settingsData.free_shipping ?? false,
            currencySymbol: settingsData.currency_symbol || DEFAULT_SETTINGS.currencySymbol,
            timezone: settingsData.timezone || DEFAULT_SETTINGS.timezone,
            colors: colors || DEFAULT_SETTINGS.colors,
            seoTitle: settingsData.seo_title || DEFAULT_SETTINGS.seoTitle,
            seoDescription: settingsData.seo_description || DEFAULT_SETTINGS.seoDescription,
            seoBannerUrl: settingsData.seo_banner_url || DEFAULT_SETTINGS.seoBannerUrl,
        });
      } else {
        setStoreSettings(DEFAULT_SETTINGS);
      }
      
      setError(null);

    } catch (err: any) {
      if (err.code === '42P01' || err.code === 'PGRST205') { 
         setMenuData(MENU_DATA);
         setStoreSettings(DEFAULT_SETTINGS);
         setError(null);
         setLoading(false);
         return;
      }
      console.error('Erro ao buscar dados:', JSON.stringify(err, null, 2));
      setMenuData(MENU_DATA);
      setStoreSettings(DEFAULT_SETTINGS);
      setError('Usando dados locais temporariamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Deep Link Handling
  useEffect(() => {
    if (!loading && menuData.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#product-')) {
        setTimeout(() => {
          const element = document.querySelector(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const card = element.closest('.group') || element.parentElement;
            if (card) {
               card.classList.add('ring-4', 'ring-italian-red', 'ring-opacity-50');
               setTimeout(() => card.classList.remove('ring-4', 'ring-italian-red', 'ring-opacity-50'), 2500);
            }
          }
        }, 1000);
      }
    }
  }, [loading, menuData]);

  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('spagnolli_cart');
      if (!savedCart) return [];
      const parsed = JSON.parse(savedCart);
      if (Array.isArray(parsed)) {
        return parsed.filter(isValidCartItem).map(item => ({
          ...item,
          observation: item.observation || '',
          selectedOptions: item.selectedOptions || []
        }));
      }
      return [];
    } catch (error) {
      return [];
    }
  });
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [isCartAnimating, setIsCartAnimating] = useState(false);

  useEffect(() => {
    if (menuData.length > 0 && !activeCategory) {
      const firstContentCategory = menuData.find(c => c.id !== 'promocoes') || menuData[0];
      if (firstContentCategory) setActiveCategory(firstContentCategory.id);
    }
  }, [menuData]);

  useEffect(() => {
    try {
      localStorage.setItem('spagnolli_cart', JSON.stringify(cartItems));
    } catch (error) {
      console.error("Failed to save cart:", error);
    }
  }, [cartItems]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // --- ACTIONS ---
  const handleUpdateProduct = async (catId: string, pId: number, updates: Partial<Product>) => {
     setMenuData(prev => prev.map(c => {
        if(c.id !== catId) return c;
        return { ...c, items: c.items.map(p => p.id === pId ? {...p, ...updates} : p) };
     }));
     if (supabase) {
        const payload: any = { ...updates };
        if (updates.options) payload.options = JSON.stringify(updates.options);
        if (updates.tags) payload.tags = updates.tags;
        await supabase.from('products').update(payload).eq('id', pId);
     }
  };

  const handleAddProduct = async (catId: string, product: Omit<Product, 'id'>) => {
     const tempId = Date.now();
     setMenuData(prev => prev.map(c => {
        if(c.id === catId) return { ...c, items: [...c.items, { ...product, id: tempId, category: catId }]};
        return c;
     }));
     if(supabase) {
        const payload: any = { 
           ...product, 
           category_id: catId,
           options: JSON.stringify(product.options || []),
           tags: product.tags || []
        };
        await supabase.from('products').insert([payload]);
        fetchData();
     }
  };

  const handleDeleteProduct = async (catId: string, pId: number) => {
     setMenuData(prev => prev.map(c => {
        if(c.id === catId) return { ...c, items: c.items.filter(p => p.id !== pId) };
        return c;
     }));
     if(supabase) await supabase.from('products').delete().eq('id', pId);
  };

  const handleUpdateSettings = async (newSettings: StoreSettings) => {
     setStoreSettings(newSettings);
     if (supabase) {
        const payload = { 
          name: newSettings.name,
          whatsapp: newSettings.whatsapp,
          address: newSettings.address,
          opening_hours: newSettings.openingHours,
          schedule: JSON.stringify(newSettings.schedule || {}),
          phones: newSettings.phones,
          logo_url: newSettings.logoUrl,
          delivery_regions: JSON.stringify(newSettings.deliveryRegions || []),
          enable_guide: newSettings.enableGuide,
          payment_methods: newSettings.paymentMethods,
          free_shipping: newSettings.freeShipping,
          currency_symbol: newSettings.currencySymbol,
          timezone: newSettings.timezone,
          colors: JSON.stringify(newSettings.colors || {}),
          seo_title: newSettings.seoTitle,
          seo_description: newSettings.seoDescription,
          seo_banner_url: newSettings.seoBannerUrl
       };
       if (settingsId) await supabase.from('settings').update(payload).eq('id', settingsId);
       else {
          const { data } = await supabase.from('settings').insert([payload]).select();
          if(data) setSettingsId(data[0].id);
       }
     }
  };

  const handleResetMenu = () => { fetchData(); };
  const handleAddCategory = (name: string) => { /* ... */ };
  
  const handleUpdateCategory = async (id: string, updates: { name?: string; image?: string }) => {
     setMenuData(prev => prev.map(cat => 
        cat.id === id ? { ...cat, ...updates } : cat
     ));
     if(supabase) {
        await supabase.from('categories').update(updates).eq('id', id);
     }
  };
  
  const handleDeleteCategory = (id: string) => { /* ... */ };

  // --- CART ACTIONS ---
  const addToCart = (product: Product, quantity: number = 1, observation: string = '', selectedOptions?: CartItem['selectedOptions']) => {
    // Allowed even if store is closed (per request)
    // No checking for storeStatus here.
    
    const normalizedObservation = (observation || '').trim();
    const optionsKey = selectedOptions ? JSON.stringify(selectedOptions.sort((a,b) => a.choiceName.localeCompare(b.choiceName))) : '';

    setCartItems(prev => {
      const existingItemIndex = prev.findIndex(item => {
        const itemOptionsKey = item.selectedOptions ? JSON.stringify(item.selectedOptions.sort((a,b) => a.choiceName.localeCompare(b.choiceName))) : '';
        return item.id === product.id && (item.observation || '').trim() === normalizedObservation && itemOptionsKey === optionsKey;
      });

      if (existingItemIndex >= 0) {
        const newItems = [...prev];
        newItems[existingItemIndex] = { ...newItems[existingItemIndex], quantity: newItems[existingItemIndex].quantity + quantity };
        return newItems;
      } else {
        return [...prev, { ...product, quantity, observation: normalizedObservation, selectedOptions }];
      }
    });
    setShowToast(true);
    setIsCartAnimating(true);
    setTimeout(() => setIsCartAnimating(false), 300);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) {
      if (window.confirm('Remover item?')) removeFromCart(index);
      return;
    }
    setCartItems(prev => {
      const n = [...prev]; n[index].quantity = newQuantity; return n;
    });
  };

  const updateObservation = (index: number, newObs: string) => {
    setCartItems(prev => { const n = [...prev]; n[index].observation = newObs; return n; });
  };

  const removeFromCart = (index: number) => setCartItems(prev => prev.filter((_, i) => i !== index));
  const clearCart = () => { if (window.confirm('Esvaziar carrinho?')) { setCartItems([]); setIsCartOpen(false); }};

  const handleCategorySelect = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`category-${id}`);
    if (element) {
      const headerOffset = 200;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  const totalItems = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const totalPrice = cartItems.reduce((acc, item) => {
     const optionsPrice = item.selectedOptions ? item.selectedOptions.reduce((s,o) => s + o.price, 0) : 0;
     return acc + ((item.price + optionsPrice) * (item.quantity || 0));
  }, 0);

  const promoCategory = menuData.find(c => c.id === 'promocoes');
  const activePromotions = promoCategory ? promoCategory.items : [];

  // --- FILTER LOGIC ---
  const displayCategories = useMemo(() => {
    return menuData
      .map(cat => {
        const filteredItems = cat.items.filter(item => {
           // 1. Tag Filter
           if (activeTags.length > 0) {
              const itemTags = item.tags || [];
              const hasAllTags = activeTags.every(tag => itemTags.includes(tag));
              if (!hasAllTags) return false;
           }

           // 2. Search Filter
           if (searchTerm) {
              const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              const searchTerms = normalize(searchTerm).split(/\s+/).filter(t => t.length > 0);
              if (searchTerms.length === 0) return true;

              const itemSearchableText = normalize([
                 item.name, item.description || '', item.code || '', item.subcategory || '',
                 (item.ingredients || []).join(' '), cat.name
              ].join(' '));

              return searchTerms.every(term => itemSearchableText.includes(term));
           }
           return true;
        });
        return { ...cat, items: filteredItems };
      })
      .filter(cat => {
         if (searchScope !== 'all' && cat.id !== searchScope) return false;
         if (cat.id === 'promocoes' && !searchTerm && activeTags.length === 0) return false;
         return true;
      });
  }, [menuData, searchTerm, searchScope, activeTags]);

  // Auto-scroll effect
  useEffect(() => {
    if (searchTerm && displayCategories.length > 0) {
       const timer = setTimeout(() => {
          const firstCat = displayCategories.find(c => c.items.length > 0);
          if (firstCat) {
             const el = document.getElementById(`category-${firstCat.id}`);
             if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
       }, 500);
       return () => clearTimeout(timer);
    }
  }, [searchTerm, displayCategories]);

  const toggleTag = (tagId: string) => {
    setActiveTags(prev => prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId]);
  };

  const navCategories = menuData.filter(cat => cat.id !== 'promocoes').filter(cat => searchScope === 'all' || cat.id === searchScope);

  // Helper to get pizzas for builder
  const pizzasForBuilder = menuData
    .find(c => c.id === pizzaBuilderCategory)
    ?.items || [];

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin" /></div>;

  if (view === 'admin') return <AdminPanel menuData={menuData} settings={storeSettings} onUpdateProduct={handleUpdateProduct} onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct} onUpdateSettings={handleUpdateSettings} onAddCategory={handleAddCategory} onUpdateCategory={handleUpdateCategory} onDeleteCategory={handleDeleteCategory} onResetMenu={handleResetMenu} onBack={() => setView('customer')} />;

  let firstProductFound = false;

  return (
    <div className="min-h-screen bg-stone-100 dark:bg-stone-900 pb-24 md:pb-0 font-sans transition-colors duration-300">
      {showGuide && <OnboardingGuide onClose={closeGuide} />}
      {!storeStatus.isOpen && <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold sticky top-0 z-50"><Clock className="w-4 h-4 inline mr-2" /> {storeStatus.message}</div>}

      <Header 
        cartCount={totalItems} 
        onOpenCart={() => setIsCartOpen(true)} 
        animateCart={isCartAnimating} 
        storeName={storeSettings.name} 
        logoUrl={storeSettings.logoUrl} 
        isDarkMode={isDarkMode} 
        onToggleTheme={toggleTheme} 
        whatsapp={storeSettings.whatsapp} 
        phone={storeSettings.phones[0] || ''} 
        onOpenInfo={() => setIsInfoModalOpen(true)} 
        isOpenNow={storeStatus.isOpen} 
        onOpenTracker={() => setIsTrackerOpen(true)}
      />
      
      {error && <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-xs text-center">{error}</div>}
      <CategoryNav categories={navCategories} activeCategory={activeCategory} onSelectCategory={handleCategorySelect} />

      <main className="max-w-5xl mx-auto px-4 pt-6">
        <div id="tour-search" className="relative w-full max-w-3xl mx-auto mb-6">
           {/* Search Logic... */}
           <div className="flex flex-col md:flex-row gap-3 mb-3">
             <div className="relative flex-1">
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nome, ingrediente ou código..." className="w-full pl-10 pr-10 py-3 bg-white border rounded-xl shadow-sm text-sm dark:bg-stone-800 dark:border-stone-700 dark:text-white outline-none focus:ring-2 focus:ring-italian-green" />
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>}
             </div>
             <div className="relative min-w-[160px]">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><Filter className="w-4 h-4 text-stone-500" /></div>
                <select value={searchScope} onChange={(e) => setSearchScope(e.target.value)} className="w-full h-full pl-9 pr-8 py-3 bg-white border rounded-xl shadow-sm text-sm appearance-none outline-none focus:ring-2 focus:ring-italian-green dark:bg-stone-800 dark:border-stone-700 dark:text-white cursor-pointer">
                   <option value="all">Todas Categorias</option>
                   {menuData.filter(c => c.id !== 'promocoes').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
             </div>
           </div>
           
           {/* Quick Filters */}
           <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              <button onClick={() => toggleTag('popular')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${activeTags.includes('popular') ? 'bg-yellow-400 text-yellow-900 border-yellow-500' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'}`}><Star className="w-3 h-3" /> Mais Pedidos</button>
              <button onClick={() => toggleTag('new')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${activeTags.includes('new') ? 'bg-blue-500 text-white border-blue-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'}`}><Zap className="w-3 h-3" /> Novidades</button>
              <button onClick={() => toggleTag('vegetarian')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${activeTags.includes('vegetarian') ? 'bg-green-500 text-white border-green-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'}`}><Leaf className="w-3 h-3" /> Vegetarianos</button>
              <button onClick={() => toggleTag('spicy')} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${activeTags.includes('spicy') ? 'bg-red-500 text-white border-red-600' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700'}`}><Flame className="w-3 h-3" /> Picantes</button>
           </div>
        </div>

        {!searchTerm && searchScope === 'all' && activeTags.length === 0 && activePromotions.length > 0 && <PromoBanner promotions={activePromotions} onAddToCart={(p) => addToCart(p, 1, '')} />}

        <div className="space-y-10">
          {displayCategories.map((category) => {
            const hasSubcategories = category.items.some(item => !!item.subcategory);
            const groupedItems: Record<string, Product[]> = {};
            let ungroupedItems: Product[] = [];
            if (hasSubcategories) {
               category.items.forEach(item => {
                  if (item.subcategory) {
                     if (!groupedItems[item.subcategory]) groupedItems[item.subcategory] = [];
                     groupedItems[item.subcategory].push(item);
                  } else ungroupedItems.push(item);
               });
            }

            if (category.items.length === 0) return null;

            // Logic to determine if we should show Half-Half options
            const isPizzaCategory = category.id.includes('pizza') || category.name.toLowerCase().includes('pizza');

            return (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-64">
                <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4 pl-2 border-l-4 border-italian-red flex items-center gap-2">
                  {category.name}
                  {(searchTerm || activeTags.length > 0) && <span className="text-xs bg-italian-green text-white px-2 py-0.5 rounded-full font-normal">{category.items.length}</span>}
                </h2>
                
                {/* Meia a Meia Trigger Button - Show only for Pizza categories and when no search/filter active */}
                {!searchTerm && activeTags.length === 0 && isPizzaCategory && (
                  <div className="mb-6">
                    <button 
                      onClick={() => openPizzaBuilder(category.id)}
                      className="w-full bg-gradient-to-r from-italian-red to-red-700 text-white p-4 rounded-xl shadow-md flex items-center justify-between group hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-full">
                          <PieChart className="w-8 h-8 text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-lg leading-tight">Crie sua Pizza Meia a Meia</h3>
                          <p className="text-white/80 text-xs">Escolha 2 sabores diferentes</p>
                        </div>
                      </div>
                      <div className="bg-white text-italian-red px-4 py-2 rounded-full text-sm font-bold group-hover:scale-105 transition-transform">
                        Montar Agora
                      </div>
                    </button>
                  </div>
                )}

                {hasSubcategories ? (
                   <div className="space-y-6">
                      {ungroupedItems.length > 0 && (
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {ungroupedItems.map((product) => {
                             const isFirst = !firstProductFound;
                             if (isFirst) firstProductFound = true;
                             return (
                               <ProductCard 
                                 key={product.id} 
                                 product={product} 
                                 onAddToCart={addToCart} 
                                 id={isFirst ? "tour-product-card" : undefined}
                                 allowHalfHalf={isPizzaCategory}
                                 onOpenPizzaBuilder={(p) => openPizzaBuilder(category.id, p)}
                               />
                             );
                           })}
                         </div>
                      )}
                      {Object.entries(groupedItems).map(([sub, products]) => (
                         <div key={sub}>
                            <h3 className="text-lg font-bold text-stone-600 dark:text-stone-400 mb-3 ml-1 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-stone-400 rounded-full"></span>{sub}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                               {products.map((product) => (
                                 <ProductCard 
                                   key={product.id} 
                                   product={product} 
                                   onAddToCart={addToCart}
                                   allowHalfHalf={isPizzaCategory}
                                   onOpenPizzaBuilder={(p) => openPizzaBuilder(category.id, p)}
                                 />
                               ))}
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {category.items.map((product) => {
                       const isFirst = !firstProductFound;
                       if (isFirst) firstProductFound = true;
                       return (
                         <ProductCard 
                           key={product.id} 
                           product={product} 
                           onAddToCart={addToCart} 
                           id={isFirst ? "tour-product-card" : undefined}
                           allowHalfHalf={isPizzaCategory}
                           onOpenPizzaBuilder={(p) => openPizzaBuilder(category.id, p)}
                         />
                       );
                     })}
                   </div>
                )}
              </section>
            );
          })}
          {displayCategories.length === 0 && (
             <div className="bg-stone-50 border border-stone-200 rounded-lg p-8 text-center dark:bg-stone-800 dark:border-stone-700">
                <p className="text-stone-500 font-medium dark:text-stone-400 text-lg">Nenhum produto encontrado.</p>
                <p className="text-sm text-stone-400 mt-2">Tente buscar por outro termo ou remova os filtros.</p>
             </div>
          )}
        </div>
      </main>

      <Footer onOpenAdmin={() => setView('admin')} settings={storeSettings} />
      
      {storeSettings.enableGuide && (
         <div className="fixed bottom-24 left-4 md:bottom-8 md:left-8 z-30">
             <button onClick={restartGuide} className="bg-white text-italian-green p-2 rounded-full shadow-lg border border-stone-200 hover:scale-105 transition-transform" title="Ajuda"><HelpCircle className="w-6 h-6" /></button>
         </div>
      )}

      <CartDrawer 
        isOpen={isCartOpen} 
        onClose={() => setIsCartOpen(false)} 
        items={cartItems} 
        onRemoveItem={removeFromCart} 
        onClearCart={clearCart} 
        onUpdateQuantity={updateQuantity} 
        onUpdateObservation={updateObservation} 
        onAddToCart={addToCart}
        whatsappNumber={storeSettings.whatsapp} 
        storeName={storeSettings.name} 
        deliveryRegions={storeSettings.deliveryRegions || []} 
        paymentMethods={storeSettings.paymentMethods} 
        freeShipping={storeSettings.freeShipping} 
        menuData={menuData}
      />
      <InfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} settings={storeSettings} isOpenNow={storeStatus.isOpen} />
      <PizzaBuilderModal isOpen={isPizzaBuilderOpen} onClose={() => setIsPizzaBuilderOpen(false)} availablePizzas={pizzasForBuilder} onAddToCart={addToCart} initialFirstHalf={pizzaBuilderFirstHalf} />
      <OrderTrackerModal isOpen={isTrackerOpen} onClose={() => setIsTrackerOpen(false)} />

      {showToast && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-right duration-300 pointer-events-none">
          <div className="bg-italian-green text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="bg-white/20 p-1 rounded-full"><Check className="w-4 h-4" /></div>
            <span className="font-medium">Item adicionado ao carrinho!</span>
          </div>
        </div>
      )}

      {/* ... Floating Cart ... */}
      {totalItems > 0 && !isCartOpen && (
        <>
          <div className="fixed bottom-4 left-4 right-4 md:hidden z-40">
            <button onClick={() => setIsCartOpen(true)} className={`w-full bg-italian-green text-white py-3 px-6 rounded-xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-4 ${isCartAnimating ? 'scale-105 bg-green-600' : ''}`}>
              <div className="flex flex-col items-start text-left"><span className="text-xs font-light text-green-100">Total</span><span className="font-bold text-lg">R$ {totalPrice.toFixed(2).replace('.', ',')}</span></div>
              <div className={`flex items-center gap-2 bg-green-700/50 px-3 py-1.5 rounded-lg ${isCartAnimating ? 'scale-110' : ''}`}><ShoppingBag className="w-5 h-5" /><span className="font-bold">{totalItems}</span></div>
            </button>
          </div>
          <div className="hidden md:block fixed bottom-8 right-8 z-40">
            <button onClick={() => setIsCartOpen(true)} className={`bg-italian-green text-white w-16 h-16 rounded-full shadow-xl flex items-center justify-center hover:scale-110 group ${isCartAnimating ? 'scale-125 bg-green-600' : ''}`}>
              <ShoppingBag className={`w-8 h-8 group-hover:animate-pulse ${isCartAnimating ? 'animate-bounce' : ''}`} />
              <span className="absolute -top-2 -right-2 bg-italian-red text-white text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full border-2 border-white dark:border-stone-800">{totalItems}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;