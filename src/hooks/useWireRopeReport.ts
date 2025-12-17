import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MeasurementRow {
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

export interface PhotoEntry {
  id: string;
  file: File | null;
  preview: string;
  caption: string;
}

export interface WireRopeReportData {
  reportNumber: string;
  inspectionDate: string;
  inspector: string;
  client: string;
  location: string;
  jbr: string;
  application: string;
  manufacturer: string;
  installationDate: string;
  manufacturingDate: string;
  originalCertificate: string;
  construction: string;
  nominalDiameter: string;
  referenceDiameter: string;
  measuredDiameter: string;
  originalLength: string;
  magneticHead: string;
  magneticHeadSerial: string;
  sensorUsed: string;
  dataLoggerSerial: string;
  measurements: MeasurementRow[];
  lmaGraphPreview: string;
  lfGraphPreview: string;
  velocityGraphPreview: string;
  lmaObservations: string;
  lfObservations: string;
  photos: { id: string; preview: string; caption: string }[];
  conclusion: string;
  recommendations: string;
  conductedBy: string;
  approvedBy: string;
}

export const useWireRopeReport = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get('id');
  
  const [currentReportId, setCurrentReportId] = useState<string | null>(reportId);
  const [loading, setLoading] = useState(!!reportId);
  
  // Header fields
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

  const reportData: WireRopeReportData = {
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
          file: null,
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

  const markAsCompleted = async () => {
    if (currentReportId) {
      await supabase
        .from('inspection_reports')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', currentReportId);
    }
  };

  return {
    // State
    loading,
    currentReportId,
    reportData,
    
    // Header
    reportNumber, setReportNumber,
    inspectionDate, setInspectionDate,
    inspector, setInspector,
    client, setClient,
    location, setLocation,
    jbr, setJbr,
    
    // Wire rope
    application, setApplication,
    manufacturer, setManufacturer,
    installationDate, setInstallationDate,
    manufacturingDate, setManufacturingDate,
    originalCertificate, setOriginalCertificate,
    construction, setConstruction,
    nominalDiameter, setNominalDiameter,
    referenceDiameter, setReferenceDiameter,
    measuredDiameter, setMeasuredDiameter,
    originalLength, setOriginalLength,
    
    // Equipment
    magneticHead, setMagneticHead,
    magneticHeadSerial, setMagneticHeadSerial,
    sensorUsed, setSensorUsed,
    dataLoggerSerial, setDataLoggerSerial,
    
    // Measurements
    measurements,
    addMeasurement,
    removeMeasurement,
    updateMeasurement,
    
    // MRT
    lmaGraph, setLmaGraph,
    lmaGraphPreview, setLmaGraphPreview,
    lfGraph, setLfGraph,
    lfGraphPreview, setLfGraphPreview,
    velocityGraph, setVelocityGraph,
    velocityGraphPreview, setVelocityGraphPreview,
    lmaObservations, setLmaObservations,
    lfObservations, setLfObservations,
    handleImageUpload,
    
    // Photos
    photos,
    handlePhotoUpload,
    removePhoto,
    updatePhotoCaption,
    
    // Conclusion
    conclusion, setConclusion,
    recommendations, setRecommendations,
    conductedBy, setConductedBy,
    approvedBy, setApprovedBy,
    
    // Actions
    manualSave,
    markAsCompleted,
    navigate,
  };
};
