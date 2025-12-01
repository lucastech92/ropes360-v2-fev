import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  damageTypes: Array<{
    type: string;
    severity: number;
    location: string;
    description: string;
  }>;
  overallSeverity: number;
  overallAssessment: string;
  recommendations: string[];
  suggestedAction: 'continue' | 'monitor' | 'replace';
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error('Imagem não fornecida');
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    console.log('Enviando imagem para análise...');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          {
            role: "system",
            content: `Você é um inspetor técnico especializado em cabos de aço conforme ISO 4309.
Analise imagens de cabos de aço e identifique TODOS os danos visíveis com máxima atenção aos detalhes.

⚠️ ATENÇÃO CRÍTICA PARA ARAMES ROMPIDOS:
Arames rompidos são o dano mais CRÍTICO para segurança. Examine a imagem meticulosamente procurando por:
- Pontas de arame salientes ou protuberantes da superfície do cabo
- Fios soltos, desfiados ou separados do corpo da perna
- Gaps, lacunas ou espaços vazios entre os arames da camada externa
- Extremidades de arame visíveis (cortadas, quebradas ou fraturadas)
- Arames que se destacam da estrutura helicoidal normal
- Irregularidades na continuidade dos arames externos
- Arames dobrados para fora ou em ângulos anormais
- Fragmentos de arame soltos ou semi-destacados

CRITÉRIOS ISO 4309 PARA ARAMES ROMPIDOS:
- SE houver QUALQUER indício de arames rompidos: severidade mínima de 60%
- 1-2 arames rompidos visíveis: severidade 60-70%, ação "monitor"
- 3-5 arames rompidos: severidade 70-85%, ação "replace"
- 6+ arames rompidos em 6d (6x diâmetro): severidade 90-100%, ação "replace" IMEDIATA
- Múltiplos arames rompidos concentrados: severidade 85-100%, ação "replace"

IMPORTANTE: Retorne APENAS um objeto JSON válido, sem texto adicional antes ou depois.
O JSON deve ter exatamente esta estrutura:
{
  "damageTypes": [
    {
      "type": "Nome do dano (ex: Corrosão, Arames rompidos, Abrasão, Deformação, Gaiola de passarinho)",
      "severity": número de 0 a 100,
      "location": "Externa/Interna, posição aproximada",
      "description": "Descrição detalhada do dano observado - conte arames rompidos se houver"
    }
  ],
  "overallSeverity": número de 0 a 100,
  "overallAssessment": "Avaliação geral em uma frase",
  "recommendations": ["Recomendação 1", "Recomendação 2"],
  "suggestedAction": "continue" ou "monitor" ou "replace",
  "confidence": número de 0 a 100
}

Critérios de avaliação:
- 0-30: Danos leves, operação normal
- 31-60: Danos moderados, monitoramento necessário
- 61-100: Danos severos, substituição recomendada

Tipos comuns de danos:
- Arames rompidos (PRIORIDADE MÁXIMA)
- Corrosão (interna/externa)
- Abrasão/desgaste
- Deformação (gaiola de passarinho, amassamento)
- Fadiga
- Redução de diâmetro`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem de cabo de aço com MÁXIMA ATENÇÃO aos arames rompidos. SEJA CONSERVADOR: se houver QUALQUER dúvida sobre arames rompidos, assuma que existem e conte-os. É preferível um falso positivo a ignorar um dano real que pode causar acidentes. Examine cada parte visível do cabo procurando por pontas salientes, fios soltos, gaps ou qualquer irregularidade. Retorne APENAS o JSON, sem texto adicional."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de taxa excedido. Tente novamente em alguns instantes.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes. Por favor, adicione fundos ao seu workspace.');
      }
      
      throw new Error(`Erro ao chamar API: ${response.status}`);
    }

    const data = await response.json();
    console.log('Resposta da API recebida');
    console.log('Resposta completa da IA:', JSON.stringify(data, null, 2));
    
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da API');
    }

    console.log('Conteúdo extraído:', content);

    // Extract JSON from the response, handling potential markdown code blocks
    let jsonContent = content.trim();
    
    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?$/g, '').trim();
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '').trim();
    }

    // Try to parse the JSON
    let analysis: AnalysisResult;
    try {
      analysis = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Erro ao fazer parse do JSON:', parseError);
      console.error('Conteúdo recebido:', content);
      throw new Error('Formato de resposta inválido da IA');
    }

    // Validate the structure
    if (!analysis.damageTypes || !Array.isArray(analysis.damageTypes)) {
      throw new Error('Estrutura de análise inválida');
    }

    console.log('Análise concluída com sucesso');
    console.log('Análise detalhada:', JSON.stringify(analysis, null, 2));

    return new Response(
      JSON.stringify({ success: true, analysis }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erro na função:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
