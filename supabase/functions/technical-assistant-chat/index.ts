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
    console.log('🚀 Request received:', { messagesCount: messages?.length, conversationId });
    
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

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new Error('Invalid message format');
    }

    const userMessage = lastMessage.content;

    // Step 1: Translate query to English for better document matching
    console.log('🌐 Translating query for multi-language search...');
    
    const translationResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Extract key English search terms from user query. If already in English, return as-is. Return ONLY the search terms, nothing else.' 
          },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 50
      }),
    });

    let searchQuery = userMessage;
    if (translationResponse.ok) {
      const translationData = await translationResponse.json();
      searchQuery = translationData.choices?.[0]?.message?.content?.trim() || userMessage;
      console.log('🔤 Search terms:', searchQuery);
    }

    // Step 2: Search documents with English terms
    console.log('🔍 Searching for relevant document chunks...');
    
    const { data: chunks, error: searchError } = await supabaseAdmin.rpc(
      'search_document_content',
      { 
        search_query: searchQuery,
        match_count: 20
      }
    );

    console.log('🔎 RPC Response:', { 
      chunksCount: chunks?.length || 0, 
      hasError: !!searchError,
      error: searchError
    });

    if (searchError) {
      console.error('❌ Search error:', searchError);
    }

    const relevantChunks = chunks && chunks.length > 0 ? chunks : [];
    const sources = relevantChunks.length > 0 
      ? [{ type: 'technical_documents', sections: relevantChunks.map((c: any) => c.metadata) }]
      : [];
    
    console.log('📚 Retrieved chunks:', relevantChunks.length);

    const isoContext = relevantChunks.length > 0
      ? `\n### CONTEXTO DOS DOCUMENTOS TÉCNICOS (WIRELOCK, ISO 4309, ETC):\n${relevantChunks.map((c: any) => c.content).join('\n\n---\n\n')}\n### FIM DO CONTEXTO DOS DOCUMENTOS`
      : '';

    const systemPrompt = `Você é o Assistente Técnico do Hub Ropes360, especializado em cabos de aço e gestão operacional.

SUAS CAPACIDADES:
1. Consultar documentos técnicos (manuais Wirelock, normas como ISO 4309)
2. Acessar dados internos do inventário/almoxarifado  
3. Consultar informações de serviços e clientes
4. Verificar registros de manutenção

REGRAS CRÍTICAS - SIGA RIGOROSAMENTE:
1. **PRIORIDADE MÁXIMA**: Se a informação estiver no CONTEXTO DOS DOCUMENTOS TÉCNICOS abaixo, VOCÊ DEVE USAR EXATAMENTE ESSA INFORMAÇÃO
2. **NUNCA INVENTE dados técnicos, especificações, quantidades ou valores**
3. Se precisar de dados internos (inventário, serviços, manutenção), use as ferramentas disponíveis
4. Se NÃO tiver a informação nem nos documentos nem nos dados internos, diga: "Essa informação não está disponível nos documentos técnicos nem nos dados da plataforma"
5. Sempre cite a fonte específica (seção do documento, número da norma, etc)
${isoContext}

${isoContext ? '\n⚠️ ATENÇÃO: As informações acima são REAIS extraídas dos documentos técnicos. Use-as com PRECISÃO. NÃO invente valores diferentes.' : ''}`;

    // Define function calling tools
    const tools = [
      {
        type: "function",
        function: {
          name: "buscar_inventario",
          description: "Busca informações do inventário/almoxarifado. Use quando perguntar sobre estoque, itens, materiais, ferramentas, equipamentos, discos, peças ou quantidade de produtos.",
          parameters: {
            type: "object",
            properties: {
              item_filter: {
                type: "string",
                description: "Nome ou parte do nome do item a buscar (opcional)"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_servicos",
          description: "Busca informações sobre serviços, JBRs e clientes.",
          parameters: {
            type: "object",
            properties: {
              cliente_filter: {
                type: "string",
                description: "Nome do cliente para filtrar (opcional)"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_manutencao",
          description: "Busca registros de manutenção de equipamentos.",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      }
    ];

    // First AI call with tools
    console.log('🤖 Calling AI with function calling...');
    const initialResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
        tools: tools,
        tool_choice: 'auto'
      }),
    });

    if (!initialResponse.ok) {
      throw new Error(`AI response failed: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices[0].message;

    console.log('✅ AI decision:', { 
      hasToolCalls: !!assistantMessage.tool_calls,
      toolCallsCount: assistantMessage.tool_calls?.length || 0,
      tools: assistantMessage.tool_calls?.map((tc: any) => tc.function.name) || []
    });

    // Execute tools if AI requested them
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolMessages = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        console.log('🔧 Executing:', toolCall.function.name, 'Args:', toolCall.function.arguments);
        const args = JSON.parse(toolCall.function.arguments || '{}');
        let result = '';

        if (toolCall.function.name === 'buscar_inventario') {
          result = await executarBuscaInventario(supabaseAdmin, args.item_filter);
        } else if (toolCall.function.name === 'buscar_servicos') {
          result = await executarBuscaServicos(supabaseAdmin, args.cliente_filter);
        } else if (toolCall.function.name === 'buscar_manutencao') {
          result = await executarBuscaManutencao(supabaseAdmin);
        }

        console.log('📊 Tool result:', result.substring(0, 100) + '...');

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: result
        });

        sources.push({ type: 'internal_data', sections: [{ tool: toolCall.function.name }] });
      }

      // Second AI call with tool results
      console.log('🤖 Calling AI with tool results (streaming)...');
      const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            assistantMessage,
            ...toolMessages
          ],
          stream: true
        }),
      });

      if (!finalResponse.ok) {
        throw new Error(`AI final response failed: ${finalResponse.status}`);
      }

      // Store user message
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user && conversationId) {
        await supabaseAdmin.from('assistant_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastMessage.content,
          sources: sources.length > 0 ? sources : null
        });
      }

      return new Response(finalResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'X-Sources': JSON.stringify(sources)
        }
      });
    } else {
      // No tools needed
      const directResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
          stream: true
        }),
      });

      if (!directResponse.ok) {
        throw new Error(`AI direct response failed: ${directResponse.status}`);
      }

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user && conversationId) {
        await supabaseAdmin.from('assistant_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: lastMessage.content,
          sources: sources.length > 0 ? sources : null
        });
      }

      return new Response(directResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'X-Sources': JSON.stringify(sources)
        }
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function executarBuscaInventario(supabase: any, itemFilter?: string): Promise<string> {
  console.log('📦 Fetching inventory, filter:', itemFilter || 'none');
  const { data: inventory, error } = await supabase.from('inventory').select('*');
  
  if (error) {
    console.error('Error fetching inventory:', error);
    return 'Erro ao buscar inventário';
  }
  
  if (!inventory || inventory.length === 0) {
    return 'Não há itens no inventário';
  }

  const totalItems = inventory.length;
  const totalQty = inventory.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
  const lowStock = inventory.filter((item: any) => item.min_quantity && item.quantity < item.min_quantity);
  
  let matched = inventory;
  if (itemFilter) {
    const filterLower = itemFilter.toLowerCase();
    matched = inventory.filter((item: any) => 
      item.item_name.toLowerCase().includes(filterLower)
    );
    console.log(`Found ${matched.length} items matching "${itemFilter}"`);
  }

  let result = `📦 INVENTÁRIO:\n\n`;
  result += `Total: ${totalItems} itens\n`;
  result += `Estoque total: ${totalQty} unidades\n`;
  result += `Críticos: ${lowStock.length}\n`;

  if (itemFilter) {
    if (matched.length > 0) {
      result += `\n🔍 "${itemFilter}" - ${matched.length} encontrado(s):\n`;
      matched.forEach((item: any) => {
        result += `\n• ${item.item_name}\n`;
        result += `  Qtd: ${item.quantity || 0} ${item.unit || 'un'}\n`;
        if (item.location) result += `  Local: ${item.location}\n`;
        if (item.min_quantity) result += `  Mínimo: ${item.min_quantity}\n`;
      });
    } else {
      result += `\n⚠️ Nenhum item encontrado com "${itemFilter}"`;
    }
  }

  if (lowStock.length > 0) {
    result += `\n\n⚠️ CRÍTICOS:\n`;
    lowStock.forEach((item: any) => {
      result += `• ${item.item_name}: ${item.quantity}/${item.min_quantity}\n`;
    });
  }

  return result;
}

async function executarBuscaServicos(supabase: any, clienteFilter?: string): Promise<string> {
  let query = supabase.from('services').select('*');
  if (clienteFilter) query = query.ilike('cliente', `%${clienteFilter}%`);
  
  const { data: services, error } = await query;
  if (error || !services || services.length === 0) {
    return clienteFilter 
      ? `Nenhum serviço para "${clienteFilter}"`
      : 'Sem serviços cadastrados';
  }

  const active = services.filter((s: any) => !s.data_termino || new Date(s.data_termino) > new Date());
  const clients = new Set(services.map((s: any) => s.cliente)).size;
  
  let result = `🔧 SERVIÇOS:\n\n`;
  result += `Total: ${services.length}\n`;
  result += `Ativos: ${active.length}\n`;
  result += `Clientes: ${clients}\n`;

  if (clienteFilter && services.length > 0) {
    result += `\n📋 "${clienteFilter}":\n`;
    services.forEach((s: any) => {
      result += `\n• JBR: ${s.codigo_jbr}\n`;
      if (s.escopo?.length) result += `  Escopo: ${s.escopo.join(', ')}\n`;
      if (s.data_inicio) result += `  Início: ${new Date(s.data_inicio).toLocaleDateString('pt-BR')}\n`;
    });
  }

  return result;
}

async function executarBuscaManutencao(supabase: any): Promise<string> {
  const { data: maintenance, error } = await supabase.from('maintenance_records').select('*');
  
  if (error || !maintenance || maintenance.length === 0) {
    return 'Sem registros de manutenção';
  }

  const pending = maintenance.filter((m: any) => m.status === 'pendente');
  const inProgress = maintenance.filter((m: any) => m.status === 'em andamento');
  const overdue = maintenance.filter((m: any) => 
    m.status === 'pendente' && new Date(m.scheduled_date) < new Date()
  );
  
  let result = `🔨 MANUTENÇÃO:\n\n`;
  result += `Total: ${maintenance.length}\n`;
  result += `Pendentes: ${pending.length}\n`;
  result += `Em andamento: ${inProgress.length}\n`;
  result += `Atrasadas: ${overdue.length}\n`;

  if (overdue.length > 0) {
    result += `\n⚠️ ATRASADAS:\n`;
    overdue.forEach((m: any) => {
      result += `• ${m.equipment_name} (${m.equipment_code})\n`;
      result += `  Previsto: ${new Date(m.scheduled_date).toLocaleDateString('pt-BR')}\n`;
    });
  }

  return result;
}
