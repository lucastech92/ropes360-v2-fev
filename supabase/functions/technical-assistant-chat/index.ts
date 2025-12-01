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
    const { messages, conversationId, excelData, fileName } = await req.json();
    console.log('🚀 Request received:', { 
      messagesCount: messages?.length, 
      conversationId,
      hasExcelData: !!excelData,
      excelRows: excelData?.length || 0 
    });
    
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

    // Step 2: Search documents with improved text search
    console.log('🔍 Searching for relevant document chunks...');
    
    const { data: chunks, error: searchError } = await supabaseAdmin.rpc(
      'search_document_content',
      { 
        search_query: searchQuery,
        match_count: 20
      }
    );

    console.log('🔎 Search response:', { 
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
    
    // Log first 200 chars of each chunk for debugging
    if (relevantChunks.length > 0) {
      console.log('🔍 Chunk previews:');
      relevantChunks.slice(0, 5).forEach((c: any, i: number) => {
        console.log(`  Chunk ${i}: ${c.content.substring(0, 200)}...`);
      });
    }

    const isoContext = relevantChunks.length > 0
      ? `\n### CONTEXTO DOS DOCUMENTOS TÉCNICOS (WIRELOCK, ISO 4309, ETC):\n${relevantChunks.map((c: any) => c.content).join('\n\n---\n\n')}\n### FIM DO CONTEXTO DOS DOCUMENTOS`
      : '';

    const excelContext = excelData 
      ? `\n### DADOS EXCEL ENVIADOS PELO USUÁRIO:\nArquivo: ${fileName || 'planilha.xlsx'}\nLinhas: ${excelData.length}\nDados parseados:\n${JSON.stringify(excelData.slice(0, 5), null, 2)}${excelData.length > 5 ? `\n... e mais ${excelData.length - 5} linhas` : ''}\n\n⚠️ IMPORTANTE: Use a ferramenta 'importar_excel' para processar esses dados. SEMPRE mostre um preview primeiro (preview_only=true) e aguarde confirmação do usuário antes de importar.\n`
      : '';

    const systemPrompt = `Você é o Assistente Técnico do Hub Ropes360, especializado em cabos de aço e gestão operacional.

SUAS CAPACIDADES:
1. Consultar documentos técnicos (manuais Wirelock, normas como ISO 4309)
2. Acessar dados internos do inventário/almoxarife  
3. Consultar informações de serviços e clientes
4. Verificar registros de manutenção
5. Importar dados de planilhas Excel para o sistema

REGRAS CRÍTICAS:
1. **USE O CONTEXTO**: Se encontrou chunks relevantes abaixo, USE-OS para responder. Não diga "não tenho informação" se há contexto disponível.
2. **NUNCA INVENTE**: Só cite valores/especificações que estejam LITERALMENTE no contexto fornecido.
3. **CITE A FONTE**: Sempre mencione de onde veio a informação (ex: "Segundo o manual Wirelock...").
4. **FERRAMENTAS**: Para dados internos (inventário, serviços, manutenção), use as ferramentas disponíveis.
5. **SEM CONTEXTO**: Só diga "não disponível" se realmente NÃO houver contexto relevante abaixo.
${excelContext}${isoContext}

${isoContext ? '\n⚠️ IMPORTANTE: Você recebeu trechos de documentos técnicos acima. Analise-os cuidadosamente antes de responder. Se a resposta estiver lá, USE-A!' : ''}`;

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
              },
              list_all: {
                type: "boolean",
                description: "Se true, lista TODOS os itens com detalhes completos. Use quando o usuário pedir 'listar todos', 'mostrar tudo', 'lista completa', 'all items', etc."
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
      },
      {
        type: "function",
        function: {
          name: "buscar_padroes_relatorios",
          description: "Busca padrões aprendidos de relatórios históricos por tipo de escopo. Use quando perguntar sobre melhores práticas, problemas comuns, ou sugestões de melhoria para relatórios.",
          parameters: {
            type: "object",
            properties: {
              scope_type: {
                type: "string",
                description: "Tipo de escopo do serviço (ex: MRT, MPI, END, VT, PM, etc.)"
              },
              pattern_type: {
                type: "string",
                enum: ["best_practice", "common_issue", "recommendation", "all"],
                description: "Tipo de padrão a buscar: best_practice (melhores práticas), common_issue (problemas comuns), recommendation (recomendações), ou all (todos)"
              }
            },
            required: ["scope_type"]
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

    // Get user ID for tool execution
    const { data: { user } } = await supabaseClient.auth.getUser();
    const userId = user?.id || '';

    // Execute tools if AI requested them
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolMessages = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        console.log('🔧 Executing:', toolCall.function.name, 'Args:', toolCall.function.arguments);
        const args = JSON.parse(toolCall.function.arguments || '{}');
        let result = '';

        if (toolCall.function.name === 'buscar_inventario') {
          result = await executarBuscaInventario(supabaseAdmin, args.item_filter, args.list_all);
        } else if (toolCall.function.name === 'buscar_servicos') {
          result = await executarBuscaServicos(supabaseAdmin, args.cliente_filter);
        } else if (toolCall.function.name === 'buscar_manutencao') {
          result = await executarBuscaManutencao(supabaseAdmin);
        } else if (toolCall.function.name === 'buscar_padroes_relatorios') {
          result = await executarBuscaPadroesRelatorios(supabaseAdmin, args.scope_type, args.pattern_type);
        } else if (toolCall.function.name === 'importar_excel') {
          result = await executarImportacaoExcel(supabaseAdmin, args.target_table, args.data, args.preview_only, userId);
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

async function executarBuscaInventario(supabase: any, itemFilter?: string, listAll?: boolean): Promise<string> {
  console.log('📦 Fetching inventory, filter:', itemFilter || 'none', 'listAll:', listAll);
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

  // If list_all is true, list ALL items with details
  if (listAll) {
    result += `\n📋 LISTA COMPLETA (${totalItems} itens):\n`;
    inventory.forEach((item: any) => {
      const status = item.min_quantity && item.quantity < item.min_quantity ? '⚠️ CRÍTICO' : '✅ OK';
      result += `\n• ${item.item_name} - ${status}\n`;
      result += `  Qtd: ${item.quantity || 0} ${item.unit || 'un'}`;
      if (item.min_quantity) result += ` (mín: ${item.min_quantity})`;
      result += `\n`;
      if (item.location) result += `  Local: ${item.location}\n`;
      if (item.category) result += `  Categoria: ${item.category}\n`;
    });
  } else if (itemFilter) {
    // If filtering by name
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
  } else {
    // Just summary + critical items (original behavior)
    if (lowStock.length > 0) {
      result += `\n\n⚠️ CRÍTICOS:\n`;
      lowStock.forEach((item: any) => {
        result += `• ${item.item_name}: ${item.quantity}/${item.min_quantity}\n`;
      });
    }
  }

  return result;
}

async function executarImportacaoExcel(
  supabase: any, 
  targetTable: string, 
  data: any[], 
  previewOnly: boolean = true,
  userId: string
): Promise<string> {
  console.log('📊 Import Excel:', targetTable, 'rows:', data.length, 'preview:', previewOnly);
  
  if (!data || data.length === 0) {
    return '⚠️ Nenhum dado válido encontrado na planilha.';
  }

  // Check user permissions (only admin and moderator can import)
  const { data: userRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (roleError || !['admin', 'moderator'].includes(userRole?.role)) {
    return '🚫 Apenas administradores e moderadores podem importar dados.';
  }

  // Map and validate data based on target table
  let mappedData: any[] = [];
  let tableName = '';
  
  if (targetTable === 'inventory') {
    tableName = 'Inventário';
    mappedData = data.map((row: any) => ({
      item_name: row.item_name || row.nome || row.name || row['Nome do Item'] || '',
      quantity: parseInt(row.quantity || row.quantidade || row.qtd || row.qty || '0'),
      unit: row.unit || row.unidade || row.un || 'un',
      min_quantity: parseInt(row.min_quantity || row.minimo || row.min || row['Qtd Mínima'] || '0') || null,
      location: row.location || row.localizacao || row.local || row.Local || '',
      category: row.category || row.categoria || row.cat || '',
      notes: row.notes || row.observacoes || row.obs || '',
      updated_by: userId
    }));
  } else if (targetTable === 'services') {
    tableName = 'Serviços';
    mappedData = data.map((row: any) => ({
      codigo_jbr: row.codigo_jbr || row.codigo || row.jbr || row['Código JBR'] || '',
      cliente: row.cliente || row.client || row.customer || row.Cliente || '',
      escopo: Array.isArray(row.escopo) ? row.escopo : (row.escopo || row.scope || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      equipamentos: row.equipamentos || row.equipment || row.equipments || '',
      aplicacao: row.aplicacao || row.application || row.app || '',
      data_inicio: row.data_inicio || row.start_date || row.inicio || null,
      data_termino: row.data_termino || row.end_date || row.termino || null,
      outros_escopo: row.outros_escopo || row.outros || null,
      created_by: userId
    }));
  } else if (targetTable === 'maintenance_records') {
    tableName = 'Manutenção';
    mappedData = data.map((row: any) => ({
      equipment_name: row.equipment_name || row.equipamento || row.equipment || row['Nome do Equipamento'] || '',
      equipment_code: row.equipment_code || row.codigo || row.code || row['Código'] || '',
      maintenance_type: row.maintenance_type || row.tipo || row.type || 'Preventiva',
      priority: row.priority || row.prioridade || row.prior || 'Média',
      status: row.status || row.estado || 'Pendente',
      scheduled_date: row.scheduled_date || row.data_agendada || row.scheduled || new Date().toISOString(),
      description: row.description || row.descricao || row.desc || '',
      technician: row.technician || row.tecnico || row.tech || '',
      created_by: userId
    }));
  }

  // Filter out rows with empty required fields
  const validData = mappedData.filter(row => {
    if (targetTable === 'inventory') return row.item_name && row.item_name.trim() !== '';
    if (targetTable === 'services') return row.codigo_jbr && row.cliente;
    if (targetTable === 'maintenance_records') return row.equipment_name && row.equipment_code;
    return false;
  });

  if (validData.length === 0) {
    return '⚠️ Nenhum dado válido encontrado. Verifique se as colunas da planilha correspondem aos campos esperados.';
  }

  // If preview only, show the data that will be imported
  if (previewOnly) {
    let preview = `📊 PREVIEW - ${tableName} (${validData.length} registros válidos de ${data.length} total)\n\n`;
    
    if (targetTable === 'inventory') {
      preview += '| Item | Qtd | Unidade | Mín | Local |\n';
      preview += '|------|-----|---------|-----|-------|\n';
      validData.slice(0, 10).forEach(item => {
        preview += `| ${item.item_name} | ${item.quantity} | ${item.unit} | ${item.min_quantity || '-'} | ${item.location || '-'} |\n`;
      });
    } else if (targetTable === 'services') {
      preview += '| Código JBR | Cliente | Escopo |\n';
      preview += '|------------|---------|--------|\n';
      validData.slice(0, 10).forEach(item => {
        preview += `| ${item.codigo_jbr} | ${item.cliente} | ${Array.isArray(item.escopo) ? item.escopo.join(', ') : item.escopo} |\n`;
      });
    } else if (targetTable === 'maintenance_records') {
      preview += '| Equipamento | Código | Tipo | Prioridade | Status |\n';
      preview += '|-------------|--------|------|------------|--------|\n';
      validData.slice(0, 10).forEach(item => {
        preview += `| ${item.equipment_name} | ${item.equipment_code} | ${item.maintenance_type} | ${item.priority} | ${item.status} |\n`;
      });
    }
    
    if (validData.length > 10) {
      preview += `\n... e mais ${validData.length - 10} registros.\n`;
    }
    
    preview += `\n✅ Dados validados e prontos para importação!\n`;
    preview += `⚠️ Para confirmar a importação, responda: "sim, pode importar" ou "confirmar importação"`;
    
    return preview;
  }

  // Actually insert the data
  const { data: inserted, error } = await supabase
    .from(targetTable)
    .insert(validData)
    .select();

  if (error) {
    console.error('Import error:', error);
    return `❌ Erro ao importar dados: ${error.message}`;
  }

  return `✅ ${inserted.length} registros importados com sucesso para ${tableName}!`;
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

async function executarBuscaPadroesRelatorios(supabase: any, scopeType: string, patternType?: string): Promise<string> {
  console.log('📊 Fetching report patterns, scope:', scopeType, 'type:', patternType || 'all');
  
  let query = supabase
    .from('report_patterns')
    .select('*')
    .eq('scope_type', scopeType)
    .order('frequency', { ascending: false });
  
  if (patternType && patternType !== 'all') {
    query = query.eq('pattern_type', patternType);
  }
  
  const { data: patterns, error } = await query;
  
  if (error) {
    console.error('Error fetching patterns:', error);
    return `Erro ao buscar padrões para ${scopeType}`;
  }
  
  if (!patterns || patterns.length === 0) {
    return `Ainda não há padrões aprendidos para o escopo "${scopeType}". Envie relatórios para que eu possa aprender!`;
  }

  // Get knowledge base stats
  const { data: knowledge } = await supabase
    .from('report_knowledge')
    .select('quality_score')
    .eq('scope_type', scopeType);

  const avgScore = knowledge && knowledge.length > 0
    ? Math.round(knowledge.reduce((sum: number, k: any) => sum + (k.quality_score || 0), 0) / knowledge.length)
    : null;

  let result = `📊 PADRÕES APRENDIDOS - ${scopeType.toUpperCase()}\n\n`;
  result += `Base: ${knowledge?.length || 0} relatórios analisados\n`;
  if (avgScore) result += `Score médio: ${avgScore}/100\n`;
  result += `\n`;

  const bestPractices = patterns.filter((p: any) => p.pattern_type === 'best_practice');
  const commonIssues = patterns.filter((p: any) => p.pattern_type === 'common_issue');
  const recommendations = patterns.filter((p: any) => p.pattern_type === 'recommendation');

  if (bestPractices.length > 0) {
    result += `✅ MELHORES PRÁTICAS (${bestPractices.length}):\n`;
    bestPractices.slice(0, 5).forEach((p: any) => {
      result += `\n• ${p.description}\n`;
      result += `  Frequência: ${p.frequency}x | Score médio: ${Math.round(p.average_score || 0)}/100\n`;
    });
    result += `\n`;
  }

  if (commonIssues.length > 0) {
    result += `⚠️ PROBLEMAS COMUNS (${commonIssues.length}):\n`;
    commonIssues.slice(0, 5).forEach((p: any) => {
      result += `\n• ${p.description}\n`;
      result += `  Identificado em: ${p.frequency} relatórios\n`;
    });
    result += `\n`;
  }

  if (recommendations.length > 0) {
    result += `💡 RECOMENDAÇÕES (${recommendations.length}):\n`;
    recommendations.slice(0, 5).forEach((p: any) => {
      result += `\n• ${p.description}\n`;
      result += `  Baseado em: ${p.frequency} casos\n`;
    });
  }

  return result;
}
