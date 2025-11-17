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
    console.log('Request received:', { messagesCount: messages?.length, conversationId });
    
    const authHeader = req.headers.get('Authorization');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
    const internalDataContext = await getInternalDataContext(lastMessage.content, supabaseAdmin);
    
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
  
  console.log('Checking internal data for question:', lowerQuestion);
  
  // Inventory/Almoxarifado queries - expandir termos de busca para capturar mais variações
  if (lowerQuestion.includes('almoxarifado') || 
      lowerQuestion.includes('estoque') || 
      lowerQuestion.includes('inventário') || 
      lowerQuestion.includes('inventario') || // sem acento também
      lowerQuestion.includes('item') ||
      lowerQuestion.includes('disco') ||
      lowerQuestion.includes('peça') ||
      lowerQuestion.includes('material') ||
      lowerQuestion.includes('ferramenta') ||
      lowerQuestion.includes('equipamento') ||
      lowerQuestion.includes('quantidade') ||
      lowerQuestion.includes('tenho') ||
      lowerQuestion.includes('temos')) {
    
    console.log('Fetching inventory data...');
    const { data: inventory, error } = await supabase.from('inventory').select('*');
    
    if (error) {
      console.error('Error fetching inventory:', error);
      return null;
    }
    
    console.log('Inventory fetched:', inventory?.length || 0, 'items');
    
    if (inventory) {
      const totalItems = inventory.length;
      const totalQuantity = inventory.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      const lowStockItems = inventory.filter((item: any) => item.min_quantity && item.quantity < item.min_quantity);
      
      // Se a pergunta menciona um item específico, listar os detalhes desse item
      let specificItemInfo = '';
      const matchedItems = inventory.filter((item: any) => 
        lowerQuestion.includes(item.item_name.toLowerCase()) ||
        item.item_name.toLowerCase().includes(lowerQuestion.split(' ').find((word: string) => word.length > 3) || '')
      );
      
      console.log('Matched items:', matchedItems.length);
      
      if (matchedItems.length > 0) {
        specificItemInfo = `\n\nITENS ENCONTRADOS:\n${matchedItems.map((item: any) => 
          `  - ${item.item_name}: ${item.quantity || 0} ${item.unit || 'unidade(s)'} em estoque` +
          (item.location ? ` (Localização: ${item.location})` : '') +
          (item.min_quantity ? ` [Mínimo: ${item.min_quantity}]` : '')
        ).join('\n')}`;
      }
      
      const result = `DADOS DO ALMOXARIFADO:
- Total de itens cadastrados: ${totalItems}
- Quantidade total em estoque: ${totalQuantity}
- Itens com estoque baixo: ${lowStockItems.length}
${lowStockItems.length > 0 ? `\nItens críticos:\n${lowStockItems.map((item: any) => `  - ${item.item_name}: ${item.quantity} (mínimo: ${item.min_quantity})`).join('\n')}` : ''}${specificItemInfo}`;
      
      console.log('Returning inventory context with', result.length, 'characters');
      return result;
    }
  }
  
  // Services queries
  if (lowerQuestion.includes('serviço') || lowerQuestion.includes('jbr') || lowerQuestion.includes('campo') || lowerQuestion.includes('cliente')) {
    const { data: services, error } = await supabase.from('services').select('*');
    
    if (error) {
      console.error('Error fetching services:', error);
      return null;
    }
    
    if (services) {
      const activeServices = services.filter((s: any) => !s.data_termino || new Date(s.data_termino) > new Date());
      
      return `DADOS DE SERVIÇOS:
- Total de serviços: ${services.length}
- Serviços ativos: ${activeServices.length}
- Clientes distintos: ${new Set(services.map((s: any) => s.cliente)).size}`;
    }
  }
  
  // Maintenance queries
  if (lowerQuestion.includes('manutenção') || lowerQuestion.includes('equipamento') || lowerQuestion.includes('máquina')) {
    const { data: maintenance, error } = await supabase.from('maintenance_records').select('*');
    
    if (error) {
      console.error('Error fetching maintenance:', error);
      return null;
    }
    
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