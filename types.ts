export interface Product {
  id: number;
  code?: string; // The number on the menu (e.g., 901, 12)
  name: string;
  description: string;
  price: number;
  category: string;
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