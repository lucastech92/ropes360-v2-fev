import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function extractPDFText(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Use unpdf which is Deno-compatible and doesn't require workers
    const { extractText } = await import('https://esm.sh/unpdf@0.11.0');
    
    const result = await extractText(new Uint8Array(pdfBuffer));
    const text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;
    return text || '';
  } catch (error) {
    console.error('PDF parsing error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMsg}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();
    console.log('📄 Processing document:', documentId);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: document, error: docError } = await supabaseAdmin
      .from('technical_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    await supabaseAdmin
      .from('technical_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    console.log('📥 Downloading PDF...');
    const { data: fileData, error: downloadError } = await supabaseAdmin
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
    
    if (fullText.length < 100) {
      throw new Error('PDF text extraction failed or document is empty');
    }
    
    const chunks = chunkText(fullText);
    console.log(`📦 Created ${chunks.length} chunks`);

    // Delete existing embeddings for this document
    await supabaseAdmin
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    // Generate embeddings for each chunk using Lovable AI
    console.log('🔮 Generating embeddings for', chunks.length, 'chunks...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const embeddings = [];
    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];
      
      try {
        // Generate embedding using Lovable AI
        const embeddingResponse = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: chunk,
          }),
        });

        if (!embeddingResponse.ok) {
          const errorText = await embeddingResponse.text();
          console.error(`Error generating embedding for chunk ${index}:`, errorText);
          throw new Error(`Embedding API error: ${embeddingResponse.status}`);
        }

        const embeddingData = await embeddingResponse.json();
        const embeddingVector = embeddingData.data[0].embedding;

        embeddings.push({
          document_id: documentId,
          content: chunk,
          chunk_index: index,
          embedding: JSON.stringify(embeddingVector), // Store as JSON string for vector type
          metadata: {
            chunk_index: index,
            total_chunks: chunks.length,
            document_title: document.title,
            document_type: document.document_type,
            char_count: chunk.length,
          },
        });

        console.log(`✅ Generated embedding ${index + 1}/${chunks.length}`);
      } catch (error) {
        console.error(`Failed to generate embedding for chunk ${index}:`, error);
        throw error;
      }
    }

    // Insert all embeddings at once
    console.log('💾 Storing embeddings in database...');
    const { error: insertError } = await supabaseAdmin
      .from('document_embeddings')
      .insert(embeddings);

    if (insertError) {
      console.error('Error inserting embeddings:', insertError);
      throw insertError;
    }

    await supabaseAdmin
      .from('technical_documents')
      .update({ 
        status: 'ready',
        processed_at: new Date().toISOString()
      })
      .eq('id', documentId);

    console.log('✅ Document processed successfully');
    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        totalChars: fullText.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    
    try {
      const { documentId } = await req.json();
      if (documentId) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );
        
        await supabaseAdmin
          .from('technical_documents')
          .update({ 
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
          .eq('id', documentId);
      }
    } catch (e) {
      console.error('Error updating document status:', e);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
