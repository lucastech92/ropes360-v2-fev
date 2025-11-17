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
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { 
  Bot, 
  Send, 
  Upload, 
  FileText, 
  Database, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock
} from "lucide-react";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

const AssistenteTecnico = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUserRole();
    loadDocuments();
    createConversation();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    setIsAdmin(roles?.some(r => r.role === 'admin') || false);
  };

  const loadDocuments = async () => {
    const { data, error } = await (supabase as any)
      .from('technical_documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setDocuments(data);
    }
  };

  const createConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user found');
      return;
    }

    console.log('Creating conversation for user:', user.id);
    const { data, error } = await (supabase as any)
      .from('assistant_conversations')
      .insert({ user_id: user.id, title: 'Nova Conversa' })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Erro ao inicializar conversa",
        description: error.message,
        variant: "destructive",
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

      if (!file || !title) {
        throw new Error('Arquivo e título são obrigatórios');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Upload file to storage (sanitize filename)
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
        .replace(/[^\w\s.-]/g, '_') // Replace special chars with underscore
        .replace(/\s+/g, '_'); // Replace spaces with underscore
      
      const filePath = `${user.id}/${Date.now()}_${sanitizedFileName}`;
      const { error: uploadError } = await supabase.storage
        .from('technical-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create document record
      const { data: document, error: docError } = await (supabase as any)
        .from('technical_documents')
        .insert({
          title,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: user.id,
          document_type: 'iso_4309',
        })
        .select()
        .single();

      if (docError) throw docError;

      // Process document using Supabase functions invoke
      console.log('📤 Iniciando processamento do documento:', document.id);
      
      try {
        const { data: processData, error: processError } = await supabase.functions.invoke(
          'process-technical-document',
          {
            body: { documentId: document.id }
          }
        );

        if (processError) {
          console.error('❌ Erro ao processar documento:', processError);
          toast({
            title: "Aviso",
            description: "Documento enviado mas o processamento pode ter falhado.",
            variant: "destructive",
          });
        } else {
          console.log('✅ Documento processado com sucesso:', processData);
          toast({
            title: "Documento enviado!",
            description: "O documento foi processado com sucesso.",
          });
        }
      } catch (err) {
        console.error('❌ Erro na chamada da função:', err);
        toast({
          title: "Erro",
          description: "Falha ao processar documento.",
          variant: "destructive",
        });
      }

      setUploadDialogOpen(false);
      loadDocuments();
    } catch (error: any) {
      toast({
        title: "Erro ao enviar documento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    console.log('sendMessage called', { inputMessage, conversationId });
    if (!inputMessage.trim() || !conversationId) {
      console.log('Validation failed', { hasInput: !!inputMessage.trim(), hasConversation: !!conversationId });
      if (!conversationId) {
        toast({
          title: "Erro",
          description: "Aguarde a inicialização da conversa...",
          variant: "destructive",
        });
      }
      return;
    }

    const userMessage: Message = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Salvar mensagem do usuário
      await (supabase as any).from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: inputMessage,
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/technical-assistant-chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            conversationId,
          }),
        }
      );

      if (!response.ok || !response.body) throw new Error('Failed to start stream');

      let assistantContent = "";
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
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
                  return prev.map((m, i) => 
                    i === prev.length - 1 ? { ...m, content: assistantContent } : m
                  );
                }
                return [...prev, { role: 'assistant', content: assistantContent }];
              });
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save assistant message
      console.log('Saving assistant message:', { conversationId, contentLength: assistantContent.length });
      const { error: saveError } = await (supabase as any).from('assistant_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent,
      });

      if (saveError) {
        console.error('Error saving assistant message:', saveError);
      } else {
        console.log('Assistant message saved successfully');
      }

    } catch (error: any) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getDocumentStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
            
            {isAdmin && (
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload ISO 4309
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Enviar Documento Técnico</DialogTitle>
                    <DialogDescription>
                      Faça upload da ISO 4309 ou outros documentos técnicos
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título do Documento</Label>
                      <Input id="title" name="title" placeholder="ISO 4309 - 2023" required />
                    </div>
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
              </Dialog>
            )}
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
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-12">
                        <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Inicie uma conversa com o Assistente Técnico</p>
                        <p className="text-sm mt-2">
                          Exemplos: "Quais são os critérios de descarte da ISO 4309?" ou "Quantos itens no almoxarifado?"
                        </p>
                      </div>
                    )}
                    
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border/20">
                              <div className="flex gap-2 flex-wrap">
                                {msg.sources.map((source, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {source.type === 'iso_4309' ? (
                                      <><FileText className="h-3 w-3 mr-1" /> ISO 4309</>
                                    ) : (
                                      <><Database className="h-3 w-3 mr-1" /> Dados Internos</>
                                    )}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <Separator />
                
                <div className="p-4">
                  {!conversationId ? (
                    <div className="text-center text-muted-foreground py-4">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Inicializando conversa...</p>
                    </div>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                      <Input
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Digite sua pergunta..."
                        disabled={isLoading}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentos Técnicos</CardTitle>
                <CardDescription>Documentos disponíveis para consulta</CardDescription>
              </CardHeader>
              <CardContent>
                {documents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum documento enviado ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getDocumentStatusIcon(doc.status)}
                          <div>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-muted-foreground">{doc.file_name}</p>
                          </div>
                        </div>
                        <Badge variant={doc.status === 'ready' ? 'default' : 'secondary'}>
                          {doc.status === 'ready' ? 'Pronto' : 
                           doc.status === 'processing' ? 'Processando' : 
                           doc.status === 'error' ? 'Erro' : 'Pendente'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AssistenteTecnico;