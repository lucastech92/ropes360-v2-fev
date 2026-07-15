import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Bot, Send, Upload, FileText, Database, Loader2, CheckCircle2, AlertCircle, Clock, Camera, X, Image as ImageIcon } from "lucide-react";
interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}
const AssistenteTecnico = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [analyzingDocument, setAnalyzingDocument] = useState(false);
  const [pendingExcelData, setPendingExcelData] = useState<any[] | null>(null);
  const [pendingExcelFileName, setPendingExcelFileName] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    checkUserRole();
    loadDocuments();
    createConversation();
  }, []);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth"
    });
  }, [messages]);
  const checkUserRole = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) return;
    const {
      data: roles
    } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    setIsAdmin(roles?.some(r => r.role === 'admin') || false);
  };
  const loadDocuments = async () => {
    const {
      data,
      error
    } = await (supabase as any).from('technical_documents').select('*').order('uploaded_at', {
      ascending: false
    });
    if (!error && data) {
      setDocuments(data);
    }
  };
  const createConversation = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found');
      return;
    }
    console.log('Creating conversation for user:', user.id);
    const {
      data,
      error
    } = await (supabase as any).from('assistant_conversations').insert({
      user_id: user.id,
      title: 'Nova Conversa'
    }).select().single();
    if (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erro ao inicializar conversa",
        description: error.message,
        variant: "destructive"
      });
      return;
    }
    if (data) {
      console.log('Conversation created:', data.id);
      setConversationId(data.id);
    }
  };
  const handleUploadDocument = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const file = formData.get('document') as File;
      const title = formData.get('title') as string;
      const knowledgeType = formData.get('knowledge_type') as string || 'internal_procedure';
      const revision = formData.get('revision') as string;
      const effectiveDate = formData.get('effective_date') as string;
      const expiryDate = formData.get('expiry_date') as string;
      const clientName = formData.get('client_name') as string;
      if (!file || !title) {
        throw new Error('Arquivo e título são obrigatórios');
      }
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload file to storage (sanitize filename)
      const sanitizedFileName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^\w\s.-]/g, '_') // Replace special chars with underscore
      .replace(/\s+/g, '_'); // Replace spaces with underscore

      const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('technical-documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Create document record
      const {
        data: document,
        error: docError
      } = await (supabase as any).from('technical_documents').insert({
        title,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        uploaded_by: user.id,
        document_type: knowledgeType === 'standard' ? 'iso_4309' : knowledgeType,
        knowledge_type: knowledgeType,
        authority_rank: ({ standard: 10, internal_procedure: 20, client_requirement: 30, manufacturer_manual: 40, historical_report: 50, other: 60 } as Record<string, number>)[knowledgeType] || 60,
        revision: revision || null,
        effective_date: effectiveDate || null,
        expiry_date: expiryDate || null,
        client_name: clientName || null,
        approval_status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        is_active: true
      }).select().single();
      if (docError) throw docError;

      // Process document using Supabase functions invoke
      console.log('📤 Iniciando processamento do documento:', document.id);
      toast({
        title: "Processando documento",
        description: "Extraindo texto e gerando embeddings... Isso pode levar alguns minutos."
      });
      try {
        const {
          data: processData,
          error: processError
        } = await supabase.functions.invoke('process-technical-document', {
          body: {
            documentId: document.id
          }
        });
        if (processError) {
          console.error('❌ Erro ao processar documento:', processError);
          toast({
            title: "Erro no processamento",
            description: "O documento foi salvo mas o processamento falhou. Tente novamente.",
            variant: "destructive"
          });
        } else {
          console.log('✅ Documento processado com sucesso:', processData);
          toast({
            title: "Documento processado!",
            description: `${processData.chunksProcessed} chunks criados (${processData.totalCharacters} caracteres extraídos)`
          });
        }
      } catch (err) {
        console.error('❌ Erro na chamada da função:', err);
        toast({
          title: "Erro",
          description: "Falha ao processar documento.",
          variant: "destructive"
        });
      }
      setUploadDialogOpen(false);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar documento",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  const handleDocumentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      setSelectedDocument(file);
    } else {
      toast({
        title: "Formato não suportado",
        description: "Por favor, envie um arquivo PDF, DOCX ou XLSX",
        variant: "destructive"
      });
    }
  };
  const clearDocument = () => {
    setSelectedDocument(null);
    if (documentInputRef.current) {
      documentInputRef.current.value = '';
    }
  };
  const analyzeDocument = async (file: File, scopeType?: string, client?: string) => {
    try {
      setAnalyzingDocument(true);
      let fileBase64: string | undefined;
      let fileContent: string | undefined;

      // For PDFs, send as base64 for visual analysis
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        fileBase64 = await base64Promise;
      }
      // For DOCX, extract text using mammoth
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({
          arrayBuffer
        });
        fileContent = result.value;
        console.log('📄 Extracted text from DOCX:', fileContent.substring(0, 200) + '...');
      }
      // For XLSX, extract text from all sheets
      else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array'
        });
        let extractedText = '';
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const sheetText = XLSX.utils.sheet_to_txt(worksheet);
          extractedText += `\n\n=== ${sheetName} ===\n${sheetText}`;
        });
        fileContent = extractedText;
        console.log('📊 Extracted text from XLSX:', fileContent.substring(0, 200) + '...');
      }
      const {
        data,
        error
      } = await supabase.functions.invoke('analyze-report', {
        body: {
          fileBase64,
          fileContent,
          fileName: file.name,
          scopeType: scopeType || 'general',
          client: client
        }
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error analyzing document:', error);
      throw error;
    } finally {
      setAnalyzingDocument(false);
    }
  };
  const formatReportAnalysis = (analysis: any) => {
    const {
      quality_score,
      strengths,
      improvements,
      comparison
    } = analysis;
    let result = `## 📊 Análise de Relatório Completa\n\n`;
    result += `**Score de Qualidade:** ${quality_score}/100 `;
    result += quality_score >= 80 ? '🟢 Excelente' : quality_score >= 60 ? '🟡 Bom' : '🟠 Precisa Melhorar';
    result += `\n\n`;
    if (comparison && comparison.average_score) {
      result += `**Comparação:**\n`;
      result += `- Seu relatório: ${comparison.your_score}/100\n`;
      result += `- Média do escopo: ${comparison.average_score}/100\n`;
      result += `- Total analisados: ${comparison.total_reports_analyzed} relatórios\n\n`;
    }
    if (strengths && strengths.length > 0) {
      result += `### ✅ Pontos Fortes:\n`;
      strengths.forEach((strength: string) => {
        result += `- ${strength}\n`;
      });
      result += `\n`;
    }
    if (improvements && improvements.length > 0) {
      result += `### ⚠️ Sugestões de Melhoria:\n`;
      improvements.forEach((improvement: string) => {
        result += `- ${improvement}\n`;
      });
    }
    return result;
  };
  const analyzeImage = async (imageBase64: string) => {
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('analyze-cable-image', {
        body: {
          imageBase64
        }
      });
      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      throw error;
    }
  };
  const formatAnalysisResult = (analysis: any) => {
    const {
      overallSeverity,
      suggestedAction,
      damageTypes,
      recommendations,
      overallAssessment,
      confidence
    } = analysis;
    let result = `## 📊 Análise de Imagem Completa\n\n`;
    result += `**Severidade Geral:** ${overallSeverity}% - ${overallSeverity < 30 ? 'Leve' : overallSeverity < 60 ? 'Moderada' : 'Severa'}\n`;
    result += `**Ação Sugerida:** ${suggestedAction === 'continue' ? '✅ Continuar em Uso' : suggestedAction === 'monitor' ? '⚠️ Monitorar Regularmente' : '🔴 Substituir Imediatamente'}\n`;
    result += `**Confiança:** ${confidence}%\n\n`;
    if (damageTypes && damageTypes.length > 0) {
      result += `### Danos Detectados:\n`;
      damageTypes.forEach((damage: any) => {
        result += `- **${damage.type}** (${damage.severity}%): ${damage.description}\n`;
      });
      result += `\n`;
    }
    if (overallAssessment) {
      result += `### Avaliação:\n${overallAssessment}\n\n`;
    }
    if (recommendations && recommendations.length > 0) {
      result += `### Recomendações:\n`;
      recommendations.forEach((rec: string) => {
        result += `- ${rec}\n`;
      });
    }
    return result;
  };
  const sendMessage = async () => {
    console.log('sendMessage called', {
      inputMessage,
      conversationId,
      hasImage: !!selectedImage,
      hasDocument: !!selectedDocument
    });

    // Allow sending if there's either a message, an image, or a document
    if (!inputMessage.trim() && !selectedImage && !selectedDocument || !conversationId) {
      console.log('Validation failed', {
        hasInput: !!inputMessage.trim(),
        hasConversation: !!conversationId
      });
      if (!conversationId) {
        toast({
          title: "Erro",
          description: "Aguarde a inicialização da conversa...",
          variant: "destructive"
        });
      }
      return;
    }

    // Handle Excel import if document is XLSX
    if (selectedDocument && selectedDocument.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      // Auto-fill message if empty
      const messageContent = inputMessage.trim() || "Analise essa planilha Excel e mostre um preview dos dados para importação.";
      const documentMessage: Message = {
        role: 'user',
        content: messageContent
      };
      setMessages(prev => [...prev, documentMessage]);
      setInputMessage("");
      setIsLoading(true);

      // Show parsing message
      const parsingMsg: Message = {
        role: 'assistant',
        content: '📊 Analisando planilha Excel...'
      };
      setMessages(prev => [...prev, parsingMsg]);
      try {
        // Parse Excel file
        const XLSX = await import('xlsx');
        const arrayBuffer = await selectedDocument.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, {
          type: 'array'
        });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with header row
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log('📊 Parsed Excel data:', jsonData);

        // Save to pending state for subsequent messages
        setPendingExcelData(jsonData);
        setPendingExcelFileName(selectedDocument.name);

        // Send to bot with parsed data
        const messagesWithExcel = [...messages.filter(m => m.role !== 'assistant' || m.content !== parsingMsg.content), documentMessage];

        // Get user session token
        const {
          data: {
            session
          }
        } = await supabase.auth.getSession();
        const userToken = session?.access_token;
        if (!userToken) {
          throw new Error('Usuário não autenticado');
        }
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-assistant-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            messages: messagesWithExcel,
            conversationId,
            excelData: jsonData,
            // Send parsed data
            fileName: selectedDocument.name
          })
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantResponse = '';

        // Remove parsing message, add streaming message
        setMessages(prev => {
          const filtered = prev.filter(m => m.content !== parsingMsg.content);
          return [...filtered, {
            role: 'assistant',
            content: ''
          }];
        });
        if (reader) {
          while (true) {
            const {
              done,
              value
            } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices[0]?.delta?.content;
                  if (content) {
                    assistantResponse += content;
                    setMessages(prev => {
                      const newMessages = [...prev];
                      newMessages[newMessages.length - 1] = {
                        role: 'assistant',
                        content: assistantResponse
                      };
                      return newMessages;
                    });
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        }

        // Check if import was successful and clear pending data
        if (assistantResponse.includes('importados com sucesso') || assistantResponse.includes('✅')) {
          setPendingExcelData(null);
          setPendingExcelFileName(null);
        }
      } catch (error: any) {
        console.error('Error processing Excel:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `❌ Erro ao processar planilha: ${error.message}`
          };
          return newMessages;
        });
        toast({
          title: "Erro ao processar Excel",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        clearDocument();
      }
      return;
    }

    // Handle document analysis if document is present (PDF/DOCX for report analysis)
    if (selectedDocument) {
      const documentMessage: Message = {
        role: 'user',
        content: inputMessage.trim() || `📄 Relatório enviado para análise: ${selectedDocument.name}`
      };
      setMessages(prev => [...prev, documentMessage]);
      setInputMessage("");
      setIsLoading(true);

      // Show analyzing message
      const analyzingMsg: Message = {
        role: 'assistant',
        content: '🔍 Analisando relatório...'
      };
      setMessages(prev => [...prev, analyzingMsg]);
      try {
        const result = await analyzeDocument(selectedDocument);
        if (result.success && result.analysis) {
          const analysisText = formatReportAnalysis(result.analysis);

          // Replace analyzing message with actual analysis
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: analysisText
            };
            return newMessages;
          });

          // Save to database
          const {
            data: {
              user
            }
          } = await supabase.auth.getUser();
          if (user) {
            await supabase.from('assistant_messages').insert([{
              conversation_id: conversationId,
              role: 'user',
              content: documentMessage.content
            }, {
              conversation_id: conversationId,
              role: 'assistant',
              content: analysisText
            }]);
          }
        } else {
          throw new Error('Falha na análise do relatório');
        }
      } catch (error: any) {
        console.error('Error analyzing document:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: `❌ Erro ao analisar relatório: ${error.message}`
          };
          return newMessages;
        });
        toast({
          title: "Erro na análise",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        clearDocument();
      }
      return;
    }

    // Handle image analysis if image is present
    if (selectedImage && imagePreview) {
      const imageMessage: Message = {
        role: 'user',
        content: inputMessage.trim() || '📷 Imagem enviada para análise'
      };
      setMessages(prev => [...prev, imageMessage]);
      setInputMessage("");
      setIsLoading(true);
      setAnalyzingImage(true);
      try {
        // Save user message
        await (supabase as any).from('assistant_messages').insert({
          conversation_id: conversationId,
          role: 'user',
          content: imageMessage.content
        });

        // Show analyzing message
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '🔍 Analisando imagem...'
        }]);

        // Analyze image
        const analysisResult = await analyzeImage(imagePreview);
        if (analysisResult.success) {
          const formattedResult = formatAnalysisResult(analysisResult.analysis);

          // Update last message with analysis result
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              role: 'assistant',
              content: formattedResult
            };
            return newMessages;
          });

          // Save assistant message
          await (supabase as any).from('assistant_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: formattedResult
          });
          toast({
            title: "Análise Concluída",
            description: "A imagem foi analisada com sucesso."
          });
        } else {
          throw new Error(analysisResult.error || 'Erro ao analisar imagem');
        }
      } catch (error: any) {
        // Remove analyzing message and show error
        setMessages(prev => prev.slice(0, -1));
        toast({
          title: "Erro ao analisar imagem",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
        setAnalyzingImage(false);
        clearImage();
      }
      return;
    }

    // Regular text message
    const userMessage: Message = {
      role: 'user',
      content: inputMessage
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);
    try {
      // Salvar mensagem do usuário
      await (supabase as any).from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: inputMessage
      });

      // Get user session token
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      const userToken = session?.access_token;
      if (!userToken) {
        throw new Error('Usuário não autenticado');
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-assistant-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId,
          // Include pending Excel data if exists
          excelData: pendingExcelData,
          fileName: pendingExcelFileName
        })
      });
      if (!response.ok || !response.body) throw new Error('Failed to start stream');
      let assistantContent = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const {
          done,
          value
        } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, {
          stream: true
        });
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? {
                    ...m,
                    content: assistantContent
                  } : m);
                }
                return [...prev, {
                  role: 'assistant',
                  content: assistantContent
                }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save assistant message
      console.log('Saving assistant message:', {
        conversationId,
        contentLength: assistantContent.length
      });
      const {
        error: saveError
      } = await (supabase as any).from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent
      });
      if (saveError) {
        console.error('Error saving assistant message:', saveError);
      } else {
        console.log('Assistant message saved successfully');
      }

      // Check if import was successful and clear pending data
      if (assistantContent.includes('importados com sucesso') || assistantContent.includes('✅')) {
        setPendingExcelData(null);
        setPendingExcelFileName(null);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };
  return <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Bot className="h-8 w-8 text-primary" />
                Assistente Técnico (Beta)
              </h1>
              <p className="text-muted-foreground mt-2">
                Consulte a ISO 4309 e dados internos da plataforma
              </p>
            </div>
            
            {isAdmin && <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar fonte técnica
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar Documento Técnico</DialogTitle>
                    <DialogDescription>
                      Cadastre uma fonte aprovada para respostas fundamentadas da IA.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título do Documento</Label>
                      <Input id="title" name="title" placeholder="ISO 4309 - 2023" required />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Tipo de fonte</Label>
                        <Select name="knowledge_type" defaultValue="internal_procedure">
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Norma</SelectItem>
                            <SelectItem value="internal_procedure">Procedimento interno</SelectItem>
                            <SelectItem value="client_requirement">Requisito do cliente</SelectItem>
                            <SelectItem value="manufacturer_manual">Manual do fabricante</SelectItem>
                            <SelectItem value="historical_report">Relatório histórico</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label htmlFor="revision">Revisão/edição</Label><Input id="revision" name="revision" placeholder="Ex.: 2023 ou Rev. 04" /></div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div><Label htmlFor="effective_date">Vigente desde</Label><Input id="effective_date" name="effective_date" type="date" /></div>
                      <div><Label htmlFor="expiry_date">Validade (opcional)</Label><Input id="expiry_date" name="expiry_date" type="date" /></div>
                    </div>
                    <div><Label htmlFor="client_name">Cliente específico (opcional)</Label><Input id="client_name" name="client_name" placeholder="Deixe vazio para uso geral" /></div>
                    <div>
                      <Label htmlFor="document">Arquivo PDF</Label>
                      <Input id="document" name="document" type="file" accept=".pdf" required />
                    </div>
                    <Button type="submit" disabled={uploading} className="w-full">
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Enviar Documento
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>}
          </div>
        </div>

        <Tabs defaultValue="chat" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="space-y-4">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="border-b">
                <CardTitle>Conversa</CardTitle>
                <CardDescription>
                  Faça perguntas sobre cabos de aço ou dados internos
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && <div className="text-center text-muted-foreground py-12">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Inicie uma conversa com o Assistente Técnico</p>
                        <p className="text-sm mt-2">
                          Exemplos: "Quais são os critérios de descarte da ISO 4309?" ou "Quantos itens no almoxarifado?"
                        </p>
                      </div>}
                    
                    {messages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.sources && msg.sources.length > 0 && <div className="mt-2 pt-2 border-t border-border/20">
                              <p className="mb-1 text-xs font-medium">Fontes consultadas</p>
                              <div className="flex gap-2 flex-wrap">
                                {msg.sources.flatMap((source, sourceIndex) => source.type === 'technical_documents' && Array.isArray(source.sections)
                                  ? source.sections.filter((section: any, index: number, all: any[]) => all.findIndex(item => item.document_id === section.document_id) === index).map((section: any, sectionIndex: number) => <Badge key={`${sourceIndex}-${sectionIndex}`} variant="outline" className="text-xs"><FileText className="h-3 w-3 mr-1" />{section.title || section.document_title || 'Fonte técnica'}{section.revision ? ` · ${section.revision}` : ''}</Badge>)
                                  : [<Badge key={sourceIndex} variant="outline" className="text-xs"><Database className="h-3 w-3 mr-1" />Dados internos</Badge>])}
                              </div>
                            </div>}
                        </div>
                      </div>)}
                    
                    {isLoading && <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />
                
                <div className="p-4">
                  {!conversationId ? <div className="text-center text-muted-foreground py-4">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Inicializando conversa...</p>
                    </div> : <div className="space-y-2">
                      {imagePreview && <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <div className="relative w-16 h-16 rounded overflow-hidden">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedImage?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {selectedImage ? (selectedImage.size / 1024 / 1024).toFixed(2) : '0'} MB
                            </p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={clearImage} disabled={isLoading}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>}
                      {selectedDocument && <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedDocument.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(selectedDocument.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" onClick={clearDocument} disabled={isLoading}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>}
                      <form onSubmit={e => {
                    e.preventDefault();
                    sendMessage();
                  }} className="flex gap-2">
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                        <input ref={documentInputRef} type="file" accept=".pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleDocumentSelect} className="hidden" />
                        <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isLoading || !!selectedImage || !!selectedDocument} title="Enviar imagem">
                          <Camera className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon" onClick={() => documentInputRef.current?.click()} disabled={isLoading || !!selectedImage || !!selectedDocument} title="Enviar relatório (PDF, DOCX, XLSX)">
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Input value={inputMessage} onChange={e => setInputMessage(e.target.value)} placeholder={selectedImage ? "Adicione um comentário (opcional)..." : selectedDocument ? "Adicione contexto sobre o relatório (opcional)..." : "Digite sua pergunta, envie uma imagem ou relatório..."} disabled={isLoading} className="flex-1" />
                        <Button type="submit" disabled={isLoading || !inputMessage.trim() && !selectedImage && !selectedDocument}>
                          {analyzingImage || analyzingDocument ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                      </form>
                    </div>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Fontes da Central de Conhecimento</CardTitle>
                <CardDescription>A IA consulta somente fontes aprovadas, ativas e dentro da validade.</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum documento enviado ainda</p>
                  </div> : <div className="space-y-2">
                    {documents.map(doc => <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getDocumentStatusIcon(doc.status)}
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-muted-foreground">{doc.file_name}{doc.revision ? ` · ${doc.revision}` : ''}</p>
                            <div className="mt-1 flex flex-wrap gap-1"><Badge variant="outline">{({ standard: 'Norma', internal_procedure: 'Procedimento interno', client_requirement: 'Requisito do cliente', manufacturer_manual: 'Manual do fabricante', historical_report: 'Relatório histórico', other: 'Outro' } as Record<string, string>)[doc.knowledge_type] || doc.document_type}</Badge>{doc.client_name && <Badge variant="outline">{doc.client_name}</Badge>}{doc.approval_status && <Badge variant={doc.approval_status === 'approved' ? 'secondary' : 'outline'}>{doc.approval_status === 'approved' ? 'Aprovado' : doc.approval_status}</Badge>}</div>
                          </div>
                        </div>
                        <Badge variant={doc.status === 'ready' ? 'default' : 'secondary'}>
                          {doc.status === 'ready' ? 'Pronto' : doc.status === 'processing' ? 'Processando' : doc.status === 'error' ? 'Erro' : 'Pendente'}
                        </Badge>
                      </div>)}
                  </div>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>;
};
export default AssistenteTecnico;
