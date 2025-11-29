import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Request received for analyze-report');
    
    const authHeader = req.headers.get('Authorization');
    console.log('📋 Auth header present:', !!authHeader);

    // Client for reading data (uses anon key with optional auth)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      }
    );

    // Admin client for writing data (uses service role)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Try to get user, but don't fail if not authenticated
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      userId = user?.id || null;
      console.log('👤 User ID:', userId || 'anonymous');
    } catch (e) {
      console.log('⚠️ Auth check failed, continuing as anonymous');
    }

    const { reportId, fileBase64, fileName, scopeType, client } = await req.json();
    console.log('📄 Processing:', { reportId, fileName, scopeType, client });

    let reportData: any = null;
    let fileContent = '';

    // Get report data from database or file
    if (reportId) {
      const { data, error } = await supabaseClient
        .from('inspection_reports')
        .select('*')
        .eq('id', reportId)
        .single();
      
      if (error) throw error;
      reportData = data;
      fileContent = JSON.stringify(data.report_data, null, 2);
    } else if (fileBase64) {
      // For PDF files, we'll analyze the structure
      fileContent = `Arquivo PDF: ${fileName}`;
    }

    // Get existing patterns for this scope type
    const { data: patterns } = await supabaseClient
      .from('report_patterns')
      .select('*')
      .eq('scope_type', scopeType || 'general');

    const bestPractices = patterns?.filter(p => p.pattern_type === 'best_practice') || [];
    const commonIssues = patterns?.filter(p => p.pattern_type === 'common_issue') || [];

    // Call Lovable AI to analyze the report
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare system prompt with context
    const systemPrompt = `Você é um especialista em análise de qualidade de relatórios de inspeção técnica.

ESCOPO: ${scopeType || 'Geral'}
CLIENTE: ${client || 'Não especificado'}

MELHORES PRÁTICAS CONHECIDAS PARA ESTE ESCOPO:
${bestPractices.map(bp => `- ${bp.description} (frequência: ${bp.frequency}x)`).join('\n')}

PROBLEMAS COMUNS IDENTIFICADOS EM OUTROS RELATÓRIOS:
${commonIssues.map(ci => `- ${ci.description} (frequência: ${ci.frequency}x)`).join('\n')}

Analise o relatório fornecido e retorne uma avaliação estruturada.`;

    const userPrompt = `Por favor, analise este relatório de inspeção técnica e forneça:

1. SCORE DE QUALIDADE (0-100): Baseado em:
   - Completude das informações
   - Clareza e objetividade
   - Qualidade técnica
   - Aderência às normas
   - Organização e formatação

2. PONTOS FORTES (3-5 itens): O que está bem feito no relatório

3. ÁREAS DE MELHORIA (3-5 itens): Sugestões concretas e acionáveis

4. PADRÕES IDENTIFICADOS: Novos padrões que podem ser aprendidos deste relatório (tipo e descrição)

5. DADOS EXTRAÍDOS: Informações estruturadas importantes do relatório`;

    // Prepare content array for multimodal request
    const contentArray: any[] = [
      { type: 'text', text: userPrompt }
    ];

    // Add document content - use multimodal for files, text for JSON data
    if (fileBase64) {
      // For files (PDF, DOCX, etc), send as base64 for visual analysis
      const mimeType = fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 
                       fileName.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                       fileName.toLowerCase().endsWith('.xlsx') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                       'application/octet-stream';
      contentArray.push({
        type: 'image_url',
        image_url: { url: `data:${mimeType};base64,${fileBase64}` }
      });
      console.log('📎 Sending file for visual analysis:', fileName, mimeType);
    } else if (fileContent) {
      // For JSON data from database
      contentArray[0].text += `\n\nCONTEÚDO DO RELATÓRIO:\n${fileContent}`;
    }

    console.log('🤖 Calling AI with tool calling for structured output...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentArray }
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_report",
            description: "Analisar relatório de inspeção técnica e retornar dados estruturados",
            parameters: {
              type: "object",
              properties: {
                quality_score: {
                  type: "number",
                  description: "Score de qualidade geral de 0-100 baseado em completude, precisão e clareza"
                },
                strengths: {
                  type: "array",
                  items: { type: "string" },
                  description: "Lista de pontos fortes específicos encontrados no relatório"
                },
                improvements: {
                  type: "array",
                  items: { type: "string" },
                  description: "Lista de sugestões concretas para melhorar o relatório"
                },
                extracted_data: {
                  type: "object",
                  description: "Dados estruturados extraídos do relatório (IDs de equipamentos, datas, medições, etc.)"
                },
                new_patterns: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { 
                        type: "string", 
                        enum: ["best_practice", "common_issue"],
                        description: "Tipo de padrão identificado" 
                      },
                      description: { 
                        type: "string", 
                        description: "Descrição detalhada do padrão" 
                      }
                    },
                    required: ["type", "description"]
                  },
                  description: "Padrões ou temas recorrentes identificados"
                }
              },
              required: ["quality_score", "strengths", "improvements"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "analyze_report" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    console.log('🤖 AI raw response:', JSON.stringify(aiData, null, 2));

    // Extract analysis from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('❌ No tool call in AI response:', aiData);
      throw new Error('AI não retornou análise estruturada');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('✅ AI analysis complete. Score:', analysis.quality_score);

    // Validate required fields
    if (typeof analysis.quality_score !== 'number' || !Array.isArray(analysis.strengths) || !Array.isArray(analysis.improvements)) {
      console.error('❌ AI response missing required fields:', analysis);
      throw new Error('Análise incompleta da IA - campos obrigatórios ausentes');
    }

    // Ensure quality_score is in valid range
    if (analysis.quality_score < 0 || analysis.quality_score > 100) {
      console.warn('⚠️ Quality score out of range, clamping:', analysis.quality_score);
      analysis.quality_score = Math.max(0, Math.min(100, analysis.quality_score));
    }

    // Store the knowledge using admin client
    const { data: knowledge, error: knowledgeError } = await adminClient
      .from('report_knowledge')
      .insert({
        report_id: reportId,
        uploaded_file_path: fileName,
        scope_type: scopeType || 'general',
        client: client,
        extracted_data: analysis.extracted_data || {},
        quality_score: analysis.quality_score,
        strengths: analysis.strengths || [],
        improvements: analysis.improvements || [],
        created_by: userId,
      })
      .select()
      .single();

    if (knowledgeError) {
      console.error('❌ Error storing knowledge:', knowledgeError);
    } else {
      console.log('💾 Knowledge stored with ID:', knowledge?.id);
    }

    // Update or create patterns using admin client
    if (analysis.new_patterns && Array.isArray(analysis.new_patterns)) {
      console.log('🔄 Processing', analysis.new_patterns.length, 'new patterns');
      for (const pattern of analysis.new_patterns) {
        const { data: existing } = await adminClient
          .from('report_patterns')
          .select('*')
          .eq('scope_type', scopeType || 'general')
          .eq('pattern_type', pattern.type)
          .ilike('description', pattern.description)
          .single();

        if (existing) {
          // Update frequency and average score
          await adminClient
            .from('report_patterns')
            .update({
              frequency: existing.frequency + 1,
              average_score: ((existing.average_score || 0) * existing.frequency + analysis.quality_score) / (existing.frequency + 1),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
          console.log('📈 Updated pattern:', pattern.type);
        } else {
          // Create new pattern
          await adminClient
            .from('report_patterns')
            .insert({
              scope_type: scopeType || 'general',
              pattern_type: pattern.type,
              description: pattern.description,
              frequency: 1,
              average_score: analysis.quality_score,
              examples: [{ report_id: reportId, knowledge_id: knowledge?.id }],
            });
          console.log('✨ Created new pattern:', pattern.type);
        }
      }
    }

    // Get comparison with average
    const { data: allKnowledge } = await supabaseClient
      .from('report_knowledge')
      .select('quality_score')
      .eq('scope_type', scopeType || 'general');

    const avgScore = allKnowledge && allKnowledge.length > 0
      ? allKnowledge.reduce((sum, k) => sum + (k.quality_score || 0), 0) / allKnowledge.length
      : null;

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          ...analysis,
          knowledge_id: knowledge?.id,
          comparison: {
            your_score: analysis.quality_score,
            average_score: avgScore ? Math.round(avgScore) : null,
            total_reports_analyzed: allKnowledge?.length || 0,
          }
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in analyze-report:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
