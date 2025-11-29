import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Upload, FileText, Save, Clock, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { generateWireRopeReportPDF } from "@/utils/wireRopeReportPDF";
import { supabase } from "@/integrations/supabase/client";
import { useAutoSave } from "@/hooks/useAutoSave";
import { CableImageAnalyzer } from "@/components/CableImageAnalyzer";

interface MeasurementRow {
  id: string;
  position: string;
  diameter1: string;
  diameter2: string;
  corrosionSeverity: string;
  damageNature: string;
  damageSeverity: string;
  brokenWires: string;
  brokenWiresSeverity: string;
  overallAssessment: string;
}

interface PhotoEntry {
  id: string;
  file: File;
  preview: string;
  caption: string;
}

const WireRopeInspection = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('id');
  
  const [currentReportId, setCurrentReportId] = useState<string | null>(reportId);
  const [loading, setLoading] = useState(!!reportId);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  const [reportNumber, setReportNumber] = useState(`LS BR ${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspector, setInspector] = useState("");
  const [client, setClient] = useState("");
  const [location, setLocation] = useState("");
  const [jbr, setJbr] = useState("");
  
  // Wire rope data
  const [application, setApplication] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [installationDate, setInstallationDate] = useState("");
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [originalCertificate, setOriginalCertificate] = useState("");
  const [construction, setConstruction] = useState("");
  const [nominalDiameter, setNominalDiameter] = useState("");
  const [referenceDiameter, setReferenceDiameter] = useState("");
  const [measuredDiameter, setMeasuredDiameter] = useState("");
  const [originalLength, setOriginalLength] = useState("");
  
  // Equipment data
  const [magneticHead, setMagneticHead] = useState("");
  const [magneticHeadSerial, setMagneticHeadSerial] = useState("");
  const [sensorUsed, setSensorUsed] = useState("");
  const [dataLoggerSerial, setDataLoggerSerial] = useState("");
  
  // Measurements table
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  
  // MRT Results
  const [lmaGraph, setLmaGraph] = useState<File | null>(null);
  const [lmaGraphPreview, setLmaGraphPreview] = useState<string>("");
  const [lfGraph, setLfGraph] = useState<File | null>(null);
  const [lfGraphPreview, setLfGraphPreview] = useState<string>("");
  const [velocityGraph, setVelocityGraph] = useState<File | null>(null);
  const [velocityGraphPreview, setVelocityGraphPreview] = useState<string>("");
  const [lmaObservations, setLmaObservations] = useState("");
  const [lfObservations, setLfObservations] = useState("");
  
  // Photos
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  
  // Conclusion
  const [conclusion, setConclusion] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [conductedBy, setConductedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  // Prepare data for auto-save
  const reportData = {
    reportNumber,
    inspectionDate,
    inspector,
    client,
    location,
    jbr,
    application,
    manufacturer,
    installationDate,
    manufacturingDate,
    originalCertificate,
    construction,
    nominalDiameter,
    referenceDiameter,
    measuredDiameter,
    originalLength,
    magneticHead,
    magneticHeadSerial,
    sensorUsed,
    dataLoggerSerial,
    measurements,
    lmaGraphPreview,
    lfGraphPreview,
    velocityGraphPreview,
    lmaObservations,
    lfObservations,
    photos: photos.map(p => ({ id: p.id, preview: p.preview, caption: p.caption })),
    conclusion,
    recommendations,
    conductedBy,
    approvedBy
  };

  // Auto-save hook
  useAutoSave({
    data: reportData,
    reportId: currentReportId,
    onSave: (id) => {
      if (!currentReportId) {
        setCurrentReportId(id);
        window.history.replaceState({}, '', `/wire-rope-inspection?id=${id}`);
      }
    },
    enabled: autoSaveEnabled
  });

  // Load report data if editing
  useEffect(() => {
    if (reportId) {
      loadReport(reportId);
    }
  }, [reportId]);

  const loadReport = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inspection_reports')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      const rd = data.report_data as any;
      setReportNumber(rd.reportNumber || '');
      setInspectionDate(rd.inspectionDate || '');
      setInspector(rd.inspector || '');
      setClient(rd.client || '');
      setLocation(rd.location || '');
      setJbr(rd.jbr || '');
      setApplication(rd.application || '');
      setManufacturer(rd.manufacturer || '');
      setInstallationDate(rd.installationDate || '');
      setManufacturingDate(rd.manufacturingDate || '');
      setOriginalCertificate(rd.originalCertificate || '');
      setConstruction(rd.construction || '');
      setNominalDiameter(rd.nominalDiameter || '');
      setReferenceDiameter(rd.referenceDiameter || '');
      setMeasuredDiameter(rd.measuredDiameter || '');
      setOriginalLength(rd.originalLength || '');
      setMagneticHead(rd.magneticHead || '');
      setMagneticHeadSerial(rd.magneticHeadSerial || '');
      setSensorUsed(rd.sensorUsed || '');
      setDataLoggerSerial(rd.dataLoggerSerial || '');
      setMeasurements(rd.measurements || []);
      setLmaGraphPreview(rd.lmaGraphPreview || '');
      setLfGraphPreview(rd.lfGraphPreview || '');
      setVelocityGraphPreview(rd.velocityGraphPreview || '');
      setLmaObservations(rd.lmaObservations || '');
      setLfObservations(rd.lfObservations || '');
      
      if (rd.photos && Array.isArray(rd.photos)) {
        const loadedPhotos: PhotoEntry[] = rd.photos.map((p: any) => ({
          id: p.id,
          file: null as any,
          preview: p.preview,
          caption: p.caption || ''
        }));
        setPhotos(loadedPhotos);
      }
      
      setConclusion(rd.conclusion || '');
      setRecommendations(rd.recommendations || '');
      setConductedBy(rd.conductedBy || '');
      setApprovedBy(rd.approvedBy || '');

      toast.success("Relatório carregado com sucesso!");
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar o relatório");
    } finally {
      setLoading(false);
    }
  };

  const manualSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const saveData = {
        user_id: user.id,
        report_number: reportNumber,
        title: client ? `${client} - ${location || 'Sem local'}` : 'Rascunho sem título',
        status: 'draft',
        report_data: reportData as any,
        updated_at: new Date().toISOString()
      };

      if (currentReportId) {
        const { error } = await supabase
          .from('inspection_reports')
          .update(saveData)
          .eq('id', currentReportId);

        if (error) throw error;
      } else {
        const { data: newReport, error } = await supabase
          .from('inspection_reports')
          .insert([saveData])
          .select()
          .single();

        if (error) throw error;
        setCurrentReportId(newReport.id);
        window.history.replaceState({}, '', `/wire-rope-inspection?id=${newReport.id}`);
      }

      toast.success("Rascunho salvo com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar o rascunho");
    }
  };

  const addMeasurement = () => {
    const newMeasurement: MeasurementRow = {
      id: Date.now().toString(),
      position: "",
      diameter1: "",
      diameter2: "",
      corrosionSeverity: "",
      damageNature: "",
      damageSeverity: "",
      brokenWires: "",
      brokenWiresSeverity: "",
      overallAssessment: ""
    };
    setMeasurements([...measurements, newMeasurement]);
  };

  const removeMeasurement = (id: string) => {
    setMeasurements(measurements.filter(m => m.id !== id));
  };

  const updateMeasurement = (id: string, field: keyof MeasurementRow, value: string) => {
    setMeasurements(measurements.map(m => 
      m.id === id ? { ...m, [field]: value } : m
    ));
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
    previewSetter: (preview: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        previewSetter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto: PhotoEntry = {
          id: Date.now().toString() + Math.random(),
          file,
          preview: reader.result as string,
          caption: ""
        };
        setPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const updatePhotoCaption = (id: string, caption: string) => {
    setPhotos(photos.map(p => p.id === id ? { ...p, caption } : p));
  };

  const generatePDF = async () => {
    try {
      // Mark as completed when generating PDF
      if (currentReportId) {
        await supabase
          .from('inspection_reports')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', currentReportId);
      }

      const pdfData = {
        ...reportData,
        installationDate: installationDate || "Não informado",
        photos: photos
      };

      await generateWireRopeReportPDF(pdfData);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o relatório PDF");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="text-center py-20">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <p className="text-muted-foreground">Carregando relatório...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-8">
        <div className="mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate("/modelos-relatorios")}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Relatório de Inspeção de Cabo de Aço</h1>
                {currentReportId && (
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Auto-save ativo
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/saved-reports")}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Ver Relatórios
              </Button>
              <Button variant="outline" onClick={manualSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Agora
              </Button>
            </div>
          </div>
        </div>

        <Tabs defaultValue="header" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="header">Cabeçalho</TabsTrigger>
            <TabsTrigger value="equipment">Equipamento</TabsTrigger>
            <TabsTrigger value="measurements">Medições</TabsTrigger>
            <TabsTrigger value="results">Resultados MRT</TabsTrigger>
            <TabsTrigger value="conclusion">Conclusão</TabsTrigger>
          </TabsList>

          <TabsContent value="header" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Relatório</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="reportNumber">Nº do Relatório</Label>
                  <Input
                    id="reportNumber"
                    value={reportNumber}
                    onChange={(e) => setReportNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspectionDate">Data da Inspeção</Label>
                  <Input
                    id="inspectionDate"
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inspector">Inspetor</Label>
                  <Input
                    id="inspector"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente</Label>
                  <Input
                    id="client"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Local</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jbr">JBR</Label>
                  <Input
                    id="jbr"
                    value={jbr}
                    onChange={(e) => setJbr(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Cabo de Aço</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="application">Aplicação</Label>
                  <Input
                    id="application"
                    value={application}
                    onChange={(e) => setApplication(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Fabricante</Label>
                  <Input
                    id="manufacturer"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="installationDate">Data da Instalação</Label>
                  <Input
                    id="installationDate"
                    type="date"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manufacturingDate">Data de Fabricação</Label>
                  <Input
                    id="manufacturingDate"
                    type="date"
                    value={manufacturingDate}
                    onChange={(e) => setManufacturingDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalCertificate">Certificado Original</Label>
                  <Input
                    id="originalCertificate"
                    value={originalCertificate}
                    onChange={(e) => setOriginalCertificate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="construction">Construção</Label>
                  <Input
                    id="construction"
                    value={construction}
                    onChange={(e) => setConstruction(e.target.value)}
                    placeholder="Ex: 39(W)xK7-WSC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nominalDiameter">Diâmetro Nominal (mm)</Label>
                  <Input
                    id="nominalDiameter"
                    type="number"
                    step="0.01"
                    value={nominalDiameter}
                    onChange={(e) => setNominalDiameter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceDiameter">Diâmetro de Referência (mm)</Label>
                  <Input
                    id="referenceDiameter"
                    type="number"
                    step="0.01"
                    value={referenceDiameter}
                    onChange={(e) => setReferenceDiameter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="measuredDiameter">Diâmetro Medido em Campo (mm)</Label>
                  <Input
                    id="measuredDiameter"
                    type="number"
                    step="0.01"
                    value={measuredDiameter}
                    onChange={(e) => setMeasuredDiameter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="originalLength">Comprimento Original do Cabo (m)</Label>
                  <Input
                    id="originalLength"
                    type="number"
                    value={originalLength}
                    onChange={(e) => setOriginalLength(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipamento de Inspeção</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="magneticHead">Cabeça Magnética</Label>
                  <Input
                    id="magneticHead"
                    value={magneticHead}
                    onChange={(e) => setMagneticHead(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="magneticHeadSerial">Nº Série Cabeça Magnética</Label>
                  <Input
                    id="magneticHeadSerial"
                    value={magneticHeadSerial}
                    onChange={(e) => setMagneticHeadSerial(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sensorUsed">Sensor Utilizado</Label>
                  <Input
                    id="sensorUsed"
                    value={sensorUsed}
                    onChange={(e) => setSensorUsed(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataLoggerSerial">Nº Série Unidade de Dados</Label>
                  <Input
                    id="dataLoggerSerial"
                    value={dataLoggerSerial}
                    onChange={(e) => setDataLoggerSerial(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="measurements" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tabela de Avaliação de Severidade</CardTitle>
                <Button onClick={addMeasurement}>
                  <Plus className="h-4 w-4" />
                  Adicionar Medição
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {measurements.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma medição adicionada. Clique em "Adicionar Medição" para começar.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {measurements.map((measurement) => (
                          <Card key={measurement.id} className="p-4">
                            <div className="grid gap-4 md:grid-cols-4">
                              <div className="space-y-2">
                                <Label>Posição (m)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={measurement.position}
                                  onChange={(e) => updateMeasurement(measurement.id, 'position', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Diâmetro 1 (mm)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={measurement.diameter1}
                                  onChange={(e) => updateMeasurement(measurement.id, 'diameter1', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Diâmetro 2 (mm)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={measurement.diameter2}
                                  onChange={(e) => updateMeasurement(measurement.id, 'diameter2', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Corrosão (%)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={measurement.corrosionSeverity}
                                  onChange={(e) => updateMeasurement(measurement.id, 'corrosionSeverity', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label>Natureza do Dano</Label>
                                <Input
                                  value={measurement.damageNature}
                                  onChange={(e) => updateMeasurement(measurement.id, 'damageNature', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Severidade Dano (%)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={measurement.damageSeverity}
                                  onChange={(e) => updateMeasurement(measurement.id, 'damageSeverity', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Arames Rompidos</Label>
                                <Input
                                  value={measurement.brokenWires}
                                  onChange={(e) => updateMeasurement(measurement.id, 'brokenWires', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Severidade Arames (%)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={measurement.brokenWiresSeverity}
                                  onChange={(e) => updateMeasurement(measurement.id, 'brokenWiresSeverity', e.target.value)}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Avaliação Geral (%)</Label>
                                <Input
                                  type="number"
                                  step="0.1"
                                  value={measurement.overallAssessment}
                                  onChange={(e) => updateMeasurement(measurement.id, 'overallAssessment', e.target.value)}
                                />
                              </div>
                              <div className="flex items-end md:col-span-2">
                                <Button
                                  variant="destructive"
                                  onClick={() => removeMeasurement(measurement.id)}
                                  className="w-full"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Gráficos MRT</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Gráfico LMA</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {lmaGraphPreview ? (
                        <img src={lmaGraphPreview} alt="LMA Graph" className="max-h-40 mx-auto" />
                      ) : (
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setLmaGraph, setLmaGraphPreview)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gráfico LF</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {lfGraphPreview ? (
                        <img src={lfGraphPreview} alt="LF Graph" className="max-h-40 mx-auto" />
                      ) : (
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setLfGraph, setLfGraphPreview)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Gráfico de Velocidade</Label>
                    <div className="border-2 border-dashed rounded-lg p-4 text-center">
                      {velocityGraphPreview ? (
                        <img src={velocityGraphPreview} alt="Velocity Graph" className="max-h-40 mx-auto" />
                      ) : (
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      )}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setVelocityGraph, setVelocityGraphPreview)}
                        className="mt-2"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lmaObservations">Observações LMA</Label>
                  <Textarea
                    id="lmaObservations"
                    value={lmaObservations}
                    onChange={(e) => setLmaObservations(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lfObservations">Observações LF</Label>
                  <Textarea
                    id="lfObservations"
                    value={lfObservations}
                    onChange={(e) => setLfObservations(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fotos e Observações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Upload de Fotos</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="mt-2"
                  />
                </div>
                <div className="grid gap-4">
                  {photos.map((photo) => (
                    <Card key={photo.id} className="p-4">
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-[200px,1fr,auto]">
                          <img src={photo.preview} alt="Inspection" className="rounded-lg object-cover h-32 w-full" />
                          <div className="space-y-2">
                            <Label>Legenda</Label>
                            <Textarea
                              value={photo.caption}
                              onChange={(e) => updatePhotoCaption(photo.id, e.target.value)}
                              rows={3}
                            />
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => removePhoto(photo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <CableImageAnalyzer 
                          imagePreview={photo.preview}
                          onAnalysisComplete={(analysis) => {
                            // Auto-fill caption with first damage type
                            if (analysis.damageTypes.length > 0) {
                              const firstDamage = analysis.damageTypes[0];
                              const autoCaption = `${firstDamage.type} - Severidade: ${firstDamage.severity}% - ${firstDamage.location}`;
                              updatePhotoCaption(photo.id, autoCaption);
                            }
                          }}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conclusion" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conclusão e Recomendações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="conclusion">Conclusão</Label>
                  <Textarea
                    id="conclusion"
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recommendations">Recomendações</Label>
                  <Textarea
                    id="recommendations"
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Aprovação</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="conductedBy">Conduzido Por</Label>
                  <Input
                    id="conductedBy"
                    value={conductedBy}
                    onChange={(e) => setConductedBy(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="approvedBy">Aprovado Por</Label>
                  <Input
                    id="approvedBy"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={generatePDF} size="lg">
                <FileText className="h-5 w-5" />
                Gerar Relatório PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WireRopeInspection;
