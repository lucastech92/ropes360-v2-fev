import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry logic for transient AI gateway errors
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      // Return if successful or client error (4xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      // Retry on server errors (5xx)
      if (response.status >= 500 && i < maxRetries - 1) {
        const waitTime = 1000 * Math.pow(2, i); // Exponential backoff
        console.log(`⚠️ AI gateway returned ${response.status}, retrying in ${waitTime}ms (attempt ${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      return response;
    } catch (error) {
      if (i < maxRetries - 1) {
        const waitTime = 1000 * Math.pow(2, i);
        console.log(`⚠️ Network error, retrying in ${waitTime}ms (attempt ${i + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed after ${maxRetries} retries`);
}

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
    
    const translationResponse = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      ? `\n### 🚨 DADOS EXCEL DETECTADOS - AÇÃO OBRIGATÓRIA:\nArquivo: ${fileName || 'planilha.xlsx'}\nLinhas: ${excelData.length}\nDados parseados:\n${JSON.stringify(excelData.slice(0, 5), null, 2)}${excelData.length > 5 ? `\n... e mais ${excelData.length - 5} linhas` : ''}

⚠️ VOCÊ DEVE OBRIGATORIAMENTE:
1. Chamar a ferramenta 'importar_excel' com preview_only=true IMEDIATAMENTE
2. NÃO responda sobre o conteúdo sem usar a ferramenta primeiro
3. Se o usuário não especificou a tabela de destino, pergunte: inventory (inventário), services (serviços) ou maintenance_records (manutenção)
4. Mostre o preview dos dados mapeados e aguarde confirmação antes de importar definitivamente\n`
      : '';

    const systemPrompt = `Você é o Assistente Técnico do Hub Ropes360, com ACESSO COMPLETO a toda a plataforma.

SUAS CAPACIDADES - ACESSO TOTAL À PLATAFORMA:
1. 📄 Documentos técnicos (manuais Wirelock, normas ISO 4309, procedimentos)
2. 📦 Inventário/Almoxarifado (consumíveis e equipamentos)
3. 🔧 Serviços/JBRs (projetos, clientes, escopos, status, datas)
4. 🔨 Manutenção (registros, calibrações, preventivas)
5. ✅ Checklists (templates, itens, quantidades)
6. 🚚 Alocações de equipamentos (checkout/checkin, destinos)
7. 📁 Documentos da empresa (procedimentos, treinamentos)
8. 👥 Usuários e colaboradores (equipe, perfis, funções)
9. 📅 Folha de ponto (registros de presença, tipos de trabalho)
10. 📊 Padrões de relatórios (melhores práticas aprendidas)
11. 📥 Importação de Excel para o sistema

REGRAS CRÍTICAS:
1. **USE AS FERRAMENTAS**: Para dados da plataforma, SEMPRE use as ferramentas disponíveis. Não diga "não tenho acesso" - você TEM acesso!
2. **CONTEXTO DE DOCUMENTOS**: Se encontrou chunks relevantes abaixo, USE-OS para responder.
3. **NUNCA INVENTE**: Só cite valores que estejam LITERALMENTE nos dados retornados.
4. **CITE A FONTE**: Sempre mencione de onde veio a informação.
5. **PERGUNTE SE PRECISAR**: Se a ferramenta precisa de parâmetros, pergunte ao usuário.
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
          description: "Busca informações sobre serviços/JBRs, incluindo serviços ativos, em andamento, finalizados, clientes, escopos. Use para perguntas sobre 'serviços em andamento', 'quantos serviços', 'quais clientes', etc.",
          parameters: {
            type: "object",
            properties: {
              cliente_filter: {
                type: "string",
                description: "Nome do cliente para filtrar (opcional)"
              },
              status_filter: {
                type: "string",
                enum: ["todos", "ativos", "finalizados", "futuros"],
                description: "Filtrar por status: 'ativos' (em andamento agora), 'finalizados' (já concluídos), 'futuros' (ainda não iniciados), 'todos' (padrão)"
              },
              list_all: {
                type: "boolean",
                description: "Se true, lista todos os serviços com detalhes completos"
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
      },
      {
        type: "function",
        function: {
          name: "importar_excel",
          description: "FERRAMENTA OBRIGATÓRIA quando há dados Excel. Importa dados de planilha Excel para o sistema. CRITICAL: Quando detectar dados Excel no contexto (seção 'DADOS EXCEL DETECTADOS'), você DEVE chamar esta função IMEDIATAMENTE com preview_only=true para mostrar o preview ao usuário ANTES de qualquer outra resposta. Não responda sobre o Excel sem executar esta ferramenta primeiro.",
          parameters: {
            type: "object",
            properties: {
              target_table: {
                type: "string",
                enum: ["inventory", "services", "maintenance_records"],
                description: "Tabela de destino: inventory (inventário), services (serviços), maintenance_records (manutenção). Se não especificado pelo usuário, pergunte antes de continuar."
              },
              preview_only: {
                type: "boolean",
                description: "SEMPRE use true na primeira chamada para mostrar preview. Só use false após confirmação explícita do usuário."
              }
            },
            required: ["target_table"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_checklists",
          description: "Busca checklists e seus itens. Use para perguntas sobre checklists de entrada/saída, templates, itens de checklist, quantidades.",
          parameters: {
            type: "object",
            properties: {
              service_tag: {
                type: "string",
                description: "Código JBR do serviço para filtrar checklists (opcional)"
              },
              tipo: {
                type: "string",
                enum: ["todos", "entrada", "saida", "templates"],
                description: "Tipo de checklist: 'entrada', 'saida', 'templates' (apenas templates), ou 'todos'"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_alocacoes",
          description: "Busca alocações de equipamentos - quais equipamentos estão emprestados, onde estão, quem retirou. Use para 'equipamentos em uso', 'quem está com tal equipamento', 'equipamentos fora da base'.",
          parameters: {
            type: "object",
            properties: {
              apenas_ativos: {
                type: "boolean",
                description: "Se true, mostra apenas equipamentos ainda não devolvidos"
              },
              service_id: {
                type: "string",
                description: "ID do serviço para filtrar alocações (opcional)"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_documentos",
          description: "Busca documentos armazenados no sistema (procedimentos, treinamentos, relatórios). Use para perguntas sobre documentos da empresa, arquivos disponíveis.",
          parameters: {
            type: "object",
            properties: {
              categoria: {
                type: "string",
                description: "Categoria do documento (procedimentos_oficiais, treinamento, modelos_relatorios, etc.)"
              },
              titulo_filter: {
                type: "string",
                description: "Filtrar por título ou parte do título"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_usuarios",
          description: "Busca informações sobre usuários e colaboradores da plataforma. Use para perguntas sobre equipe, funcionários, quem trabalha em qual serviço.",
          parameters: {
            type: "object",
            properties: {
              incluir_perfis: {
                type: "boolean",
                description: "Se true, inclui informações detalhadas dos perfis (empresa, cargo)"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "buscar_folha_ponto",
          description: "Busca registros de folha de ponto/timesheet. Use para perguntas sobre presença, quem está offshore, home office, viagem, férias, etc.",
          parameters: {
            type: "object",
            properties: {
              periodo: {
                type: "string",
                enum: ["hoje", "semana", "mes"],
                description: "Período para buscar: 'hoje', 'semana' (últimos 7 dias), 'mes' (último mês)"
              },
              tipo_checkin: {
                type: "string",
                enum: ["home_office", "offshore", "travel", "base", "day_off", "vacation"],
                description: "Filtrar por tipo de check-in"
              }
            }
          }
        }
      }
    ];

    // First AI call with tools
    console.log('🤖 Calling AI with function calling...');
    const initialResponse = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
          result = await executarBuscaServicos(supabaseAdmin, args.cliente_filter, args.status_filter, args.list_all);
        } else if (toolCall.function.name === 'buscar_manutencao') {
          result = await executarBuscaManutencao(supabaseAdmin);
        } else if (toolCall.function.name === 'buscar_padroes_relatorios') {
          result = await executarBuscaPadroesRelatorios(supabaseAdmin, args.scope_type, args.pattern_type);
        } else if (toolCall.function.name === 'importar_excel') {
          result = await executarImportacaoExcel(supabaseAdmin, args.target_table, excelData || [], args.preview_only ?? true, userId);
        } else if (toolCall.function.name === 'buscar_checklists') {
          result = await executarBuscaChecklists(supabaseAdmin, args.service_tag, args.tipo);
        } else if (toolCall.function.name === 'buscar_alocacoes') {
          result = await executarBuscaAlocacoes(supabaseAdmin, args.apenas_ativos, args.service_id);
        } else if (toolCall.function.name === 'buscar_documentos') {
          result = await executarBuscaDocumentos(supabaseAdmin, args.categoria, args.titulo_filter);
        } else if (toolCall.function.name === 'buscar_usuarios') {
          result = await executarBuscaUsuarios(supabaseAdmin, args.incluir_perfis);
        } else if (toolCall.function.name === 'buscar_folha_ponto') {
          result = await executarBuscaFolhaPonto(supabaseAdmin, args.periodo, args.tipo_checkin);
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
      const finalResponse = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      const directResponse = await fetchWithRetry('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
  console.log('📊 Import Excel:', targetTable, 'rows:', data?.length || 0, 'preview:', previewOnly);
  
  // Validate data
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '⚠️ Nenhum dado válido encontrado na planilha. Certifique-se de anexar um arquivo Excel.';
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

  // Detect pivoted structure (rows as columns, like MRT equipment table)
  // Generic detection: Check if first column contains descriptive labels (field names)
  const firstRow = data[0] || {};
  const keys = Object.keys(firstRow);
  const firstColKey = keys[0] || '';
  const firstColValues = data.slice(0, 5).map((row: any) => String(row[firstColKey] || '').trim().toLowerCase());
  
  // Common attribute keywords that indicate pivoted structure
  const pivotIndicators = [
    'fabricante', 'manufacturer', 'modelo', 'model', 'equipamento', 'equipment',
    'sn', 'serial', 'cor', 'color', 'ano', 'year', 'status', 'aquisição', 'acquisition',
    'conexao', 'connection', 'cabo', 'cable', 'quantidade', 'contador', 'counter',
    'frame', 'calibração', 'calibration', 'acessórios', 'accessories', 'sensor'
  ];
  
  const isPivoted = firstColValues.some(val => 
    pivotIndicators.some(indicator => val.includes(indicator))
  ) && keys.length > 2; // Must have multiple columns
  
  console.log('🔍 Structure detection:', { isPivoted, firstColKey, sampleValues: firstColValues });

  // Map and validate data based on target table
  let mappedData: any[] = [];
  let tableName = '';
  
  if (targetTable === 'inventory') {
    tableName = 'Inventário';
    
    // Handle pivoted structure (equipment in columns)
    if (isPivoted) {
      console.log('🔄 Detected pivoted structure - transposing data...');
      
      // Get all equipment columns (excluding first column which contains labels)
      const equipmentCols = keys.filter(key => key !== firstColKey);
      
      for (const col of equipmentCols) {
        const equipment: any = {};
        
        // Extract all field-value pairs for this equipment
        data.forEach((row: any) => {
          const fieldLabel = String(row[firstColKey] || '').trim();
          const value = row[col];
          
          if (fieldLabel && value !== undefined && value !== null && value !== '') {
            equipment[fieldLabel] = value;
          }
        });
        
        // Skip if no meaningful data
        if (Object.keys(equipment).length < 2) continue;
        
        // Intelligently map to inventory fields
        const itemName = 
          equipment['Equipamento'] || 
          equipment['Equipment'] || 
          equipment['Modelo'] || 
          equipment['Model'] ||
          Object.values(equipment)[0]; // First non-empty value
        
        if (!itemName) continue;
        
        const manufacturer = equipment['Fabricante'] || equipment['Manufacturer'] || '';
        const fullName = manufacturer ? `${itemName} - ${manufacturer}` : itemName;
        
        // Build notes from all other fields
        const noteFields: string[] = [];
        Object.entries(equipment).forEach(([key, val]) => {
          const lowerKey = key.toLowerCase();
          if (!['equipamento', 'equipment', 'modelo', 'model', 'fabricante', 'manufacturer'].includes(lowerKey)) {
            if (val) noteFields.push(`${key}: ${val}`);
          }
        });
        
        mappedData.push({
          item_name: fullName,
          quantity: 1,
          unit: 'un',
          location: equipment['Local'] || equipment['Location'] || 'Almoxarifado',
          category: equipment['Categoria'] || equipment['Category'] || 'Equipamento',
          notes: noteFields.join(' | '),
          updated_by: userId
        });
      }
      
      console.log(`✅ Transposed ${equipmentCols.length} columns into ${mappedData.length} inventory items`);
    } else {
      // Normal structure (columns as headers)
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
    }
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
      preview += '| Item | Qtd | Unidade | Local | Observações |\n';
      preview += '|------|-----|---------|-------|-------------|\n';
      validData.slice(0, 10).forEach(item => {
        const notes = item.notes && item.notes.length > 40 
          ? item.notes.substring(0, 37) + '...' 
          : item.notes || '-';
        preview += `| ${item.item_name} | ${item.quantity} | ${item.unit} | ${item.location || '-'} | ${notes} |\n`;
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

async function executarBuscaServicos(supabase: any, clienteFilter?: string, statusFilter?: string, listAll?: boolean): Promise<string> {
  console.log('🔧 Fetching services, cliente:', clienteFilter, 'status:', statusFilter, 'listAll:', listAll);
  
  let query = supabase.from('services').select('*');
  if (clienteFilter) query = query.ilike('cliente', `%${clienteFilter}%`);
  
  const { data: services, error } = await query;
  if (error || !services || services.length === 0) {
    return clienteFilter 
      ? `Nenhum serviço para "${clienteFilter}"`
      : 'Sem serviços cadastrados';
  }

  const now = new Date();
  const active = services.filter((s: any) => {
    const inicio = s.data_inicio ? new Date(s.data_inicio) : null;
    const termino = s.data_termino ? new Date(s.data_termino) : null;
    return (!inicio || inicio <= now) && (!termino || termino >= now);
  });
  const finished = services.filter((s: any) => s.data_termino && new Date(s.data_termino) < now);
  const future = services.filter((s: any) => s.data_inicio && new Date(s.data_inicio) > now);
  const clients = new Set(services.map((s: any) => s.cliente)).size;
  
  // Filter by status
  let filtered = services;
  if (statusFilter === 'ativos') filtered = active;
  else if (statusFilter === 'finalizados') filtered = finished;
  else if (statusFilter === 'futuros') filtered = future;
  
  let result = `🔧 SERVIÇOS:\n\n`;
  result += `Total: ${services.length}\n`;
  result += `Em andamento (ativos): ${active.length}\n`;
  result += `Finalizados: ${finished.length}\n`;
  result += `Futuros (não iniciados): ${future.length}\n`;
  result += `Clientes únicos: ${clients}\n`;

  if (listAll || statusFilter || clienteFilter) {
    const displayList = filtered.slice(0, listAll ? 50 : 15);
    result += `\n📋 ${statusFilter ? statusFilter.toUpperCase() : 'SERVIÇOS'} (${filtered.length}):\n`;
    displayList.forEach((s: any) => {
      const statusEmoji = active.includes(s) ? '🟢' : finished.includes(s) ? '✅' : '📅';
      result += `\n${statusEmoji} JBR: ${s.codigo_jbr}\n`;
      result += `   Cliente: ${s.cliente}\n`;
      if (s.local) result += `   Local: ${s.local}\n`;
      if (s.escopo?.length) result += `   Escopo: ${s.escopo.join(', ')}\n`;
      if (s.data_inicio) result += `   Início: ${new Date(s.data_inicio).toLocaleDateString('pt-BR')}\n`;
      if (s.data_termino) result += `   Término: ${new Date(s.data_termino).toLocaleDateString('pt-BR')}\n`;
    });
    if (filtered.length > displayList.length) {
      result += `\n... e mais ${filtered.length - displayList.length} serviços.\n`;
    }
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

// ================== NOVAS FUNÇÕES DE ACESSO À PLATAFORMA ==================

async function executarBuscaChecklists(supabase: any, serviceTag?: string, tipo?: string): Promise<string> {
  console.log('✅ Fetching checklists, service:', serviceTag, 'tipo:', tipo);
  
  let query = supabase.from('checklists').select(`
    *,
    checklist_items (*)
  `);
  
  if (serviceTag) query = query.ilike('service_tag', `%${serviceTag}%`);
  if (tipo === 'templates') query = query.eq('is_template', true);
  else if (tipo === 'entrada') query = query.eq('checklist_type', 'entrada');
  else if (tipo === 'saida') query = query.eq('checklist_type', 'saida');
  
  const { data: checklists, error } = await query;
  
  if (error || !checklists || checklists.length === 0) {
    return serviceTag 
      ? `Nenhum checklist encontrado para "${serviceTag}"`
      : 'Sem checklists cadastrados';
  }

  const templates = checklists.filter((c: any) => c.is_template);
  const entrada = checklists.filter((c: any) => c.checklist_type === 'entrada');
  const saida = checklists.filter((c: any) => c.checklist_type === 'saida');
  
  let result = `✅ CHECKLISTS:\n\n`;
  result += `Total: ${checklists.length}\n`;
  result += `Templates: ${templates.length}\n`;
  result += `Entrada: ${entrada.length}\n`;
  result += `Saída: ${saida.length}\n`;

  checklists.slice(0, 15).forEach((c: any) => {
    const tipoEmoji = c.is_template ? '📋' : c.checklist_type === 'entrada' ? '📥' : '📤';
    result += `\n${tipoEmoji} ${c.name}\n`;
    if (c.service_tag) result += `   JBR: ${c.service_tag}\n`;
    if (c.description) result += `   Descrição: ${c.description}\n`;
    result += `   Itens: ${c.checklist_items?.length || 0}\n`;
  });

  return result;
}

async function executarBuscaAlocacoes(supabase: any, apenasAtivos?: boolean, serviceId?: string): Promise<string> {
  console.log('🚚 Fetching allocations, ativos:', apenasAtivos, 'service:', serviceId);
  
  let query = supabase.from('inventory_allocations').select(`
    *,
    inventory:inventory_item_id (item_name, code),
    services:service_id (codigo_jbr, cliente)
  `);
  
  if (apenasAtivos) query = query.is('checkin_date', null);
  if (serviceId) query = query.eq('service_id', serviceId);
  
  const { data: allocations, error } = await query.order('checkout_date', { ascending: false });
  
  if (error || !allocations || allocations.length === 0) {
    return 'Sem alocações de equipamentos registradas';
  }

  const active = allocations.filter((a: any) => !a.checkin_date);
  const returned = allocations.filter((a: any) => a.checkin_date);
  
  let result = `🚚 ALOCAÇÕES DE EQUIPAMENTOS:\n\n`;
  result += `Total: ${allocations.length}\n`;
  result += `Em uso (não devolvidos): ${active.length}\n`;
  result += `Devolvidos: ${returned.length}\n`;

  if (active.length > 0) {
    result += `\n⚠️ EQUIPAMENTOS EM USO:\n`;
    active.slice(0, 20).forEach((a: any) => {
      result += `\n• ${a.inventory?.item_name || 'Item desconhecido'}\n`;
      if (a.destination) result += `   Destino: ${a.destination}\n`;
      if (a.services?.codigo_jbr) result += `   JBR: ${a.services.codigo_jbr} (${a.services.cliente})\n`;
      result += `   Saída: ${new Date(a.checkout_date).toLocaleDateString('pt-BR')}\n`;
      result += `   Condição: ${a.condition_on_checkout}\n`;
    });
  }

  return result;
}

async function executarBuscaDocumentos(supabase: any, categoria?: string, tituloFilter?: string): Promise<string> {
  console.log('📁 Fetching documents, categoria:', categoria, 'titulo:', tituloFilter);
  
  let query = supabase.from('documents').select('*');
  
  if (categoria) query = query.eq('category', categoria);
  if (tituloFilter) query = query.ilike('title', `%${tituloFilter}%`);
  
  const { data: documents, error } = await query.order('uploaded_at', { ascending: false });
  
  if (error || !documents || documents.length === 0) {
    return categoria 
      ? `Nenhum documento na categoria "${categoria}"`
      : 'Sem documentos cadastrados';
  }

  // Group by category
  const byCategory: { [key: string]: any[] } = {};
  documents.forEach((d: any) => {
    if (!byCategory[d.category]) byCategory[d.category] = [];
    byCategory[d.category].push(d);
  });
  
  let result = `📁 DOCUMENTOS:\n\n`;
  result += `Total: ${documents.length}\n`;
  result += `Categorias: ${Object.keys(byCategory).length}\n\n`;

  Object.entries(byCategory).forEach(([cat, docs]) => {
    result += `📂 ${cat.replace(/_/g, ' ').toUpperCase()} (${docs.length}):\n`;
    docs.slice(0, 5).forEach((d: any) => {
      result += `  • ${d.title}\n`;
      if (d.expiry_date) {
        const expiry = new Date(d.expiry_date);
        const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 30) result += `    ⚠️ Expira em ${daysLeft} dias\n`;
      }
    });
    if (docs.length > 5) result += `  ... e mais ${docs.length - 5}\n`;
    result += `\n`;
  });

  return result;
}

async function executarBuscaUsuarios(supabase: any, incluirPerfis?: boolean): Promise<string> {
  console.log('👥 Fetching users, perfis:', incluirPerfis);
  
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*');
  
  if (rolesError || !roles || roles.length === 0) {
    return 'Sem usuários cadastrados';
  }

  let profiles: any[] = [];
  if (incluirPerfis) {
    const { data } = await supabase.from('user_profiles').select('*');
    profiles = data || [];
  }

  const admins = roles.filter((r: any) => r.role === 'admin');
  const moderators = roles.filter((r: any) => r.role === 'moderator');
  const inspectors = roles.filter((r: any) => r.role === 'inspector');
  const approved = roles.filter((r: any) => r.approved);
  const pending = roles.filter((r: any) => !r.approved);
  
  let result = `👥 USUÁRIOS:\n\n`;
  result += `Total: ${roles.length}\n`;
  result += `Aprovados: ${approved.length}\n`;
  result += `Pendentes: ${pending.length}\n`;
  result += `\nPor função:\n`;
  result += `  Admins: ${admins.length}\n`;
  result += `  Moderadores: ${moderators.length}\n`;
  result += `  Inspetores: ${inspectors.length}\n`;

  if (incluirPerfis && profiles.length > 0) {
    result += `\n📋 PERFIS DETALHADOS:\n`;
    profiles.slice(0, 20).forEach((p: any) => {
      const userRole = roles.find((r: any) => r.user_id === p.user_id);
      result += `\n• ${p.full_name || 'Sem nome'}\n`;
      if (p.email) result += `   Email: ${p.email}\n`;
      if (p.company) result += `   Empresa: ${p.company}\n`;
      if (p.position) result += `   Cargo: ${p.position}\n`;
      if (userRole) result += `   Função: ${userRole.role} ${userRole.approved ? '✅' : '⏳'}\n`;
    });
  }

  return result;
}

async function executarBuscaFolhaPonto(supabase: any, periodo?: string, tipoCheckin?: string): Promise<string> {
  console.log('📅 Fetching time entries, periodo:', periodo, 'tipo:', tipoCheckin);
  
  let query = supabase.from('time_entries').select('*');
  
  const now = new Date();
  if (periodo === 'hoje') {
    const today = now.toISOString().split('T')[0];
    query = query.eq('entry_date', today);
  } else if (periodo === 'semana') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('entry_date', weekAgo);
  } else if (periodo === 'mes') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    query = query.gte('entry_date', monthAgo);
  }
  
  if (tipoCheckin) query = query.eq('check_in_type', tipoCheckin);
  
  const { data: entries, error } = await query.order('entry_date', { ascending: false });
  
  if (error || !entries || entries.length === 0) {
    return 'Sem registros de folha de ponto encontrados';
  }

  // Get user profiles for names
  const userIds = [...new Set(entries.map((e: any) => e.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, full_name')
    .in('user_id', userIds);
  
  const profileMap: { [key: string]: string } = {};
  profiles?.forEach((p: any) => {
    profileMap[p.user_id] = p.full_name || 'Sem nome';
  });

  // Count by type
  const byType: { [key: string]: number } = {};
  entries.forEach((e: any) => {
    byType[e.check_in_type] = (byType[e.check_in_type] || 0) + 1;
  });
  
  const typeLabels: { [key: string]: string } = {
    home_office: '🏠 Home Office',
    offshore: '🚢 Offshore',
    travel: '✈️ Viagem',
    base: '🏢 Base',
    day_off: '🌴 Folga',
    vacation: '🏖️ Férias'
  };
  
  let result = `📅 FOLHA DE PONTO${periodo ? ` (${periodo})` : ''}:\n\n`;
  result += `Total de registros: ${entries.length}\n\n`;
  result += `Por tipo:\n`;
  Object.entries(byType).forEach(([type, count]) => {
    result += `  ${typeLabels[type] || type}: ${count}\n`;
  });

  result += `\n📋 ÚLTIMOS REGISTROS:\n`;
  entries.slice(0, 15).forEach((e: any) => {
    const userName = profileMap[e.user_id] || 'Usuário';
    result += `\n• ${new Date(e.entry_date).toLocaleDateString('pt-BR')} - ${userName}\n`;
    result += `   ${typeLabels[e.check_in_type] || e.check_in_type}\n`;
    if (e.notes) result += `   Obs: ${e.notes}\n`;
  });

  return result;
}
