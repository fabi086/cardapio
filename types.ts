export interface Product {
  id: number;
  code?: string; // The number on the menu (e.g., 901, 12)
  name: string;
  description: string;
  price: number;
  category: string;
  category_id?: string; // Para compatibilidade com banco de dados
  image?: string;
}

export interface Category {
  id: string;
  name: string;
  items: Product[];
}

export interface CartItem extends Product {
  quantity: number;
  observation?: string;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

export interface StoreSettings {
  name: string;
  logoUrl: string;
  whatsapp: string;
  address: string;
  openingHours: string;
  phones: string[];
}