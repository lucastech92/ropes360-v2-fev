import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Get last user message
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Invalid message format');
    }

    let relevantChunks = [];
    let sources = [];

    // Simple text search in document chunks (fallback method)
    const { data: similarChunks, error: searchError } = await supabaseAdmin.rpc('search_document_content', {
      search_query: lastMessage.content,
      match_count: 5,
    });

    if (!searchError && similarChunks && similarChunks.length > 0) {
      relevantChunks = similarChunks.map((chunk: any) => chunk.content);
      sources.push({ type: 'iso_4309', sections: similarChunks.map((c: any) => c.metadata) });
    }

    // Check if question is about internal data
    const internalDataContext = await getInternalDataContext(lastMessage.content, supabaseClient);
    
    if (internalDataContext) {
      sources.push({ type: 'internal_data', data: internalDataContext });
    }

    // Build system prompt
    const systemPrompt = `Você é o Assistente Técnico do Hub Ropes360, especializado em cabos de aço.

REGRAS CRÍTICAS:
1. Responda APENAS com base na ISO 4309 (quando disponível) e dados internos da plataforma
2. NUNCA invente informações técnicas
3. Quando usar a ISO 4309, SEMPRE cite a seção ou trecho utilizado
4. Se a ISO 4309 não contiver a resposta, diga: "A ISO 4309 não descreve essa informação"
5. Para dados internos, apresente números exatos do banco de dados
6. Seja profissional, direto e técnico
7. Zero criatividade - apenas fatos

${relevantChunks.length > 0 ? `\n### CONTEXTO ISO 4309:\n${relevantChunks.join('\n\n')}` : ''}
${internalDataContext ? `\n### DADOS INTERNOS:\n${internalDataContext}` : ''}`;

    // Call Lovable AI for chat completion
    const chatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!chatResponse.ok) {
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error('AI response failed');
    }

    // Store sources for later retrieval
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (user && conversationId) {
      // Store user message
      await supabaseClient.from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: lastMessage.content,
      });
    }

    // Return streaming response with sources in headers
    return new Response(chatResponse.body, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/event-stream',
        'X-Sources': JSON.stringify(sources),
      },
    });

  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getInternalDataContext(question: string, supabase: any): Promise<string | null> {
  const lowerQuestion = question.toLowerCase();
  
  // Inventory/Almoxarifado queries
  if (lowerQuestion.includes('almoxarifado') || lowerQuestion.includes('estoque') || lowerQuestion.includes('inventário')) {
    const { data: inventory } = await supabase.from('inventory').select('*');
    
    if (inventory) {
      const totalItems = inventory.length;
      const totalQuantity = inventory.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      const lowStockItems = inventory.filter((item: any) => item.min_quantity && item.quantity < item.min_quantity);
      
      return `DADOS DO ALMOXARIFADO:
- Total de itens cadastrados: ${totalItems}
- Quantidade total em estoque: ${totalQuantity}
- Itens com estoque baixo: ${lowStockItems.length}
${lowStockItems.length > 0 ? `\nItens críticos:\n${lowStockItems.map((item: any) => `  - ${item.item_name}: ${item.quantity} (mínimo: ${item.min_quantity})`).join('\n')}` : ''}`;
    }
  }
  
  // Services queries
  if (lowerQuestion.includes('serviço') || lowerQuestion.includes('jbr') || lowerQuestion.includes('campo')) {
    const { data: services } = await supabase.from('services').select('*');
    
    if (services) {
      const activeServices = services.filter((s: any) => !s.data_termino || new Date(s.data_termino) > new Date());
      
      return `DADOS DE SERVIÇOS:
- Total de serviços: ${services.length}
- Serviços ativos: ${activeServices.length}
- Clientes distintos: ${new Set(services.map((s: any) => s.cliente)).size}`;
    }
  }
  
  // Maintenance queries
  if (lowerQuestion.includes('manutenção') || lowerQuestion.includes('equipamento')) {
    const { data: maintenance } = await supabase.from('maintenance_records').select('*');
    
    if (maintenance) {
      const pending = maintenance.filter((m: any) => m.status === 'pendente');
      const overdue = maintenance.filter((m: any) => 
        m.status === 'pendente' && new Date(m.scheduled_date) < new Date()
      );
      
      return `DADOS DE MANUTENÇÃO:
- Total de registros: ${maintenance.length}
- Manutenções pendentes: ${pending.length}
- Manutenções atrasadas: ${overdue.length}`;
    }
  }
  
  return null;
}