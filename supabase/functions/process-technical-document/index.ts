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
  const pdfjsLib = await import('https://esm.sh/pdfjs-dist@4.0.379/build/pdf.min.mjs');
  
  // Configure worker source for server-side environment
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
  
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }
  
  return fullText;
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

    await supabaseAdmin
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    console.log(`📝 Storing ${chunks.length} chunks...`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const { error: embeddingError } = await supabaseAdmin
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          content: chunk,
          chunk_index: i,
          metadata: {
            document_title: document.title,
            document_type: document.document_type,
            total_chunks: chunks.length,
            char_count: chunk.length
          }
        });

      if (embeddingError) {
        console.error(`Error storing chunk ${i}:`, embeddingError);
        throw embeddingError;
      }
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
