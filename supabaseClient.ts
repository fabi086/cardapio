import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhjkmvaaukkplpsezeeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoamttdmFhdWtrcGxwc2V6ZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTY4NTksImV4cCI6MjA3OTU3Mjg1OX0.tcRGIq6L4Ntz02qc7qKzlgI7Ngqtk6iHEaq20xyAopU';

// Função segura para criar o cliente apenas se a URL for válida
const createSupabaseClient = () => {
  try {
    // Verifica se a URL parece válida (começa com http/https)
    if (!SUPABASE_URL || !SUPABASE_URL.startsWith('http')) {
      console.warn('Supabase não configurado corretamente. O app funcionará em modo offline.');
      return null;
    }
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.warn('Erro ao inicializar Supabase:', error);
    return null;
  }
};

export const supabase = createSupabaseClient();