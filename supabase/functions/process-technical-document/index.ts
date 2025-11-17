import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Split text into chunks of roughly equal size
function chunkText(text: string, maxChunkSize = 1000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks.filter(chunk => chunk.length > 50);
}

// Extract text from PDF using external service
async function extractPDFText(pdfBuffer: ArrayBuffer): Promise<string> {
  // Use pdf.js via CDN for PDF parsing
  const formData = new FormData();
  formData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }));
  
  // For now, use a simpler approach with pdf-extract API
  // In production, you could use pdf.js or other libraries
  const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs');
  
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer) }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
}

// Generate embedding using Lovable AI (OpenAI compatible)
async function generateEmbedding(text: string): Promise<number[]> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.substring(0, 8000),
      dimensions: 768
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('Embedding API error:', error);
    throw new Error(`Failed to generate embedding: ${response.status}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    console.log('📄 Processing document:', documentId);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: document, error: docError } = await supabaseClient
      .from('technical_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    await supabaseClient
      .from('technical_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    console.log('📥 Downloading PDF...');
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('technical-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    console.log('📖 Extracting text from PDF...');
    const arrayBuffer = await fileData.arrayBuffer();
    const fullText = await extractPDFText(arrayBuffer);
    
    console.log(`✂️ Extracted ${fullText.length} characters`);
    
    const chunks = chunkText(fullText);
    console.log(`📦 Created ${chunks.length} chunks`);

    // Delete old embeddings
    await supabaseClient
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    // Process chunks with embeddings
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`🔢 Chunk ${i + 1}/${chunks.length}`);
      
      try {
        const embedding = await generateEmbedding(chunk);
        
        await supabaseClient
          .from('document_embeddings')
          .insert({
            document_id: documentId,
            content: chunk,
            chunk_index: i,
            embedding: embedding,
            metadata: { 
              source: document.title,
              page_estimate: Math.floor(i / 2) + 1
            },
          });
      } catch (error) {
        console.error(`Error on chunk ${i}:`, error);
      }
    }

    await supabaseClient
      .from('technical_documents')
      .update({ 
        status: 'ready', 
        processed_at: new Date().toISOString() 
      })
      .eq('id', documentId);

    console.log('✅ Processing complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunksProcessed: chunks.length,
        totalCharacters: fullText.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { documentId } = await req.json();
      await supabaseClient
        .from('technical_documents')
        .update({ 
          status: 'error', 
          error_message: error instanceof Error ? error.message : 'Unknown error' 
        })
        .eq('id', documentId);
    } catch (e) {
      console.error('Status update failed:', e);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
