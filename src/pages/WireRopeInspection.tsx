import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, FileText, Save, Clock, FolderOpen } from "lucide-react";
import { generateWireRopeReportPDF } from "@/utils/wireRopeReportPDF";
import { useWireRopeReport, MeasurementRow } from "@/hooks/useWireRopeReport";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "sonner";

// Components
import { ReportInfoCard } from "@/components/wireRope/ReportInfoCard";
import { CableDataCard } from "@/components/wireRope/CableDataCard";
import { InspectionEquipmentCard } from "@/components/wireRope/InspectionEquipmentCard";
import { MeasurementCard } from "@/components/wireRope/MeasurementCard";
import { MRTGraphsCard } from "@/components/wireRope/MRTGraphsCard";
import { PhotoGalleryCard } from "@/components/wireRope/PhotoGalleryCard";
import { ConclusionCard } from "@/components/wireRope/ConclusionCard";

const WireRopeInspection = () => {
  const report = useWireRopeReport();

  useAutoSave({
    data: report.reportData,
    reportId: report.currentReportId,
    onSave: (id) => {
      if (!report.currentReportId) {
        window.history.replaceState({}, '', `/wire-rope-inspection?id=${id}`);
      }
    },
    enabled: true
  });

  const generatePDF = async () => {
    try {
      await report.markAsCompleted();
      const pdfData = {
        ...report.reportData,
        installationDate: report.installationDate || "Não informado",
        photos: report.photos
      };
      await generateWireRopeReportPDF(pdfData);
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o relatório PDF");
    }
  };

  if (report.loading) {
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
              <Button variant="ghost" onClick={() => report.navigate("/modelos-relatorios")}>
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Relatório de Inspeção de Cabo de Aço</h1>
                {report.currentReportId && (
                  <Badge variant="outline" className="text-xs mt-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Auto-save ativo
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => report.navigate("/saved-reports")}>
                <FolderOpen className="h-4 w-4 mr-2" />
                Ver Relatórios
              </Button>
              <Button variant="outline" onClick={report.manualSave}>
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
            <ReportInfoCard
              reportNumber={report.reportNumber}
              inspectionDate={report.inspectionDate}
              inspector={report.inspector}
              client={report.client}
              location={report.location}
              jbr={report.jbr}
              onReportNumberChange={report.setReportNumber}
              onInspectionDateChange={report.setInspectionDate}
              onInspectorChange={report.setInspector}
              onClientChange={report.setClient}
              onLocationChange={report.setLocation}
              onJbrChange={report.setJbr}
            />
          </TabsContent>

          <TabsContent value="equipment" className="space-y-4">
            <CableDataCard
              application={report.application}
              manufacturer={report.manufacturer}
              installationDate={report.installationDate}
              manufacturingDate={report.manufacturingDate}
              originalCertificate={report.originalCertificate}
              construction={report.construction}
              nominalDiameter={report.nominalDiameter}
              referenceDiameter={report.referenceDiameter}
              measuredDiameter={report.measuredDiameter}
              originalLength={report.originalLength}
              onApplicationChange={report.setApplication}
              onManufacturerChange={report.setManufacturer}
              onInstallationDateChange={report.setInstallationDate}
              onManufacturingDateChange={report.setManufacturingDate}
              onOriginalCertificateChange={report.setOriginalCertificate}
              onConstructionChange={report.setConstruction}
              onNominalDiameterChange={report.setNominalDiameter}
              onReferenceDiameterChange={report.setReferenceDiameter}
              onMeasuredDiameterChange={report.setMeasuredDiameter}
              onOriginalLengthChange={report.setOriginalLength}
            />
            <InspectionEquipmentCard
              magneticHead={report.magneticHead}
              magneticHeadSerial={report.magneticHeadSerial}
              sensorUsed={report.sensorUsed}
              dataLoggerSerial={report.dataLoggerSerial}
              onMagneticHeadChange={report.setMagneticHead}
              onMagneticHeadSerialChange={report.setMagneticHeadSerial}
              onSensorUsedChange={report.setSensorUsed}
              onDataLoggerSerialChange={report.setDataLoggerSerial}
            />
          </TabsContent>

          <TabsContent value="measurements" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tabela de Avaliação de Severidade</CardTitle>
                <Button onClick={report.addMeasurement}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Medição
                </Button>
              </CardHeader>
              <CardContent>
                {report.measurements.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhuma medição adicionada. Clique em "Adicionar Medição" para começar.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {report.measurements.map((measurement) => (
                      <MeasurementCard
                        key={measurement.id}
                        measurement={measurement}
                        onUpdate={report.updateMeasurement}
                        onRemove={report.removeMeasurement}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <MRTGraphsCard
              lmaGraphPreview={report.lmaGraphPreview}
              lfGraphPreview={report.lfGraphPreview}
              velocityGraphPreview={report.velocityGraphPreview}
              lmaObservations={report.lmaObservations}
              lfObservations={report.lfObservations}
              onLmaUpload={(e) => report.handleImageUpload(e, report.setLmaGraph, report.setLmaGraphPreview)}
              onLfUpload={(e) => report.handleImageUpload(e, report.setLfGraph, report.setLfGraphPreview)}
              onVelocityUpload={(e) => report.handleImageUpload(e, report.setVelocityGraph, report.setVelocityGraphPreview)}
              onLmaObservationsChange={report.setLmaObservations}
              onLfObservationsChange={report.setLfObservations}
            />
            <PhotoGalleryCard
              photos={report.photos}
              onPhotoUpload={report.handlePhotoUpload}
              onRemovePhoto={report.removePhoto}
              onUpdateCaption={report.updatePhotoCaption}
            />
          </TabsContent>

          <TabsContent value="conclusion" className="space-y-4">
            <ConclusionCard
              conclusion={report.conclusion}
              recommendations={report.recommendations}
              conductedBy={report.conductedBy}
              approvedBy={report.approvedBy}
              onConclusionChange={report.setConclusion}
              onRecommendationsChange={report.setRecommendations}
              onConductedByChange={report.setConductedBy}
              onApprovedByChange={report.setApprovedBy}
            />
            <div className="flex justify-end">
              <Button onClick={generatePDF} size="lg">
                <FileText className="h-4 w-4 mr-2" />
                Gerar PDF
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default WireRopeInspection;
