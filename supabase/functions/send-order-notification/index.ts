// FIX: Use the correct type reference for Supabase Edge Functions to include Deno runtime types.
// Fix: Corrected the path to the Deno type definitions. The previous path was incorrect, leading to errors where the 'Deno' object was not recognized.
// Fix: Updated the type reference to a specific version to resolve Deno type errors.
/// <reference types="https://esm.sh/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'https://esm.sh/web-push@3.6.7'

// --- CONFIGURE SUAS CHAVES AQUI ---
// Chaves VAPID que você gerou
const VAPID_PUBLIC_KEY = 'BHk2e8GCT1rman0EBVAbb-7SHHg4bkOraHTytnSuCsAvP09oJ_LbeVTPxnLf1axl25ykS52WCo0wJaMcMzR59uw'; 
const VAPID_PRIVATE_KEY = 'j3n0PevcPn3jKKpjEy0NbT8GUo5xzBd20l6HdJCe034';
const ADMIN_EMAIL = 'seu-email@exemplo.com'; // Coloque seu email aqui

webpush.setVapidDetails(
  `mailto:${ADMIN_EMAIL}`,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

Deno.serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // O 'record' vem do gatilho do banco de dados (o novo pedido)
    const { record: newOrder } = await req.json();

    // Busca todas as inscrições de administradores na tabela
    const { data: subscriptions, error } = await supabaseClient
      .from('push_subscriptions')
      .select('subscription_details')
      .eq('user_role', 'admin');

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Nenhum admin inscrito para notificações.");
      return new Response(JSON.stringify({ message: 'Nenhum admin inscrito.' }), { status: 200 });
    }

    // Monta o payload (conteúdo) da notificação
    const notificationPayload = JSON.stringify({
      title: `Novo Pedido #${newOrder.id}!`,
      body: `Cliente: ${newOrder.customer_name} - Total: R$ ${newOrder.total.toFixed(2)}`,
      icon: '/logo192.png',
      data: { url: '/#admin' } // Link que abrirá ao clicar na notificação
    });

    // Envia a notificação para cada dispositivo inscrito
    const promises = subscriptions.map(s => 
      webpush.sendNotification(s.subscription_details, notificationPayload)
    );

    await Promise.allSettled(promises);

    return new Response(JSON.stringify({ message: 'Notificações enviadas!' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Erro na Edge Function:', err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
