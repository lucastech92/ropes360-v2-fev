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
    const { documentId } = await req.json();
    console.log('Processing document:', documentId);
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get document info
    const { data: document, error: docError } = await supabaseClient
      .from('technical_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update status to processing
    await supabaseClient
      .from('technical_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    // Download the file
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('technical-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download document');
    }

    // Convert PDF to text (simplified - in production use proper PDF parsing)
    const arrayBuffer = await fileData.arrayBuffer();
    const text = new TextDecoder().decode(arrayBuffer);
    
    // Split into chunks (approximately 500 chars each)
    const chunkSize = 500;
    const chunks: string[] = [];
    
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }

    // Generate chunks and store them (without embeddings for now)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Store chunk without embedding (simplified version)
      await supabaseClient
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          content: chunk,
          chunk_index: i,
          metadata: { source: document.title },
        });
    }

    // Update document status to ready
    await supabaseClient
      .from('technical_documents')
      .update({ status: 'ready', processed_at: new Date().toISOString() })
      .eq('id', documentId);

    console.log('Document processed successfully:', { documentId, chunksProcessed: chunks.length });

    return new Response(
      JSON.stringify({ success: true, chunksProcessed: chunks.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing document:', error);
    
    // Try to update document status to error
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
    } catch (updateError) {
      console.error('Failed to update document status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});