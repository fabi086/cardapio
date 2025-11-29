
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xhjkmvaaukkplpsezeeb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoamttdmFhdWtrcGxwc2V6ZWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTY4NTksImV4cCI6MjA3OTU3Mjg1OX0.tcRGIq6L4Ntz02qc7qKzlgI7Ngqtk6iHEaq20xyAopU';

let supabaseInstance = null;

try {
  // Verifica se a URL e a Key parecem válidas antes de tentar criar o cliente
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.startsWith('http')) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      db: {
        schema: 'public',
      },
    });
  } else {
    console.warn('Supabase: Credenciais ausentes ou inválidas. Iniciando em Modo Offline.');
  }
} catch (error) {
  console.error('Supabase: Erro fatal na inicialização.', error);
  // Mantém null para que o App use o fallback local
}

export const supabase = supabaseInstance;
