import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UnifiedInventoryItem, ItemType } from "@/hooks/useUnifiedInventory";
import { Camera, ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { prepareInventoryPhoto, removeInventoryPhoto, uploadInventoryPhoto } from "@/lib/inventoryPhotoStorage";

const formSchema = z.object({
  item_name: z.string().min(1, "Nome é obrigatório"),
  item_type: z.enum(["consumivel", "equipamento"]),
  category: z.string().optional(),
  quantity: z.coerce.number().min(0, "Quantidade deve ser >= 0"),
  unit: z.string().optional(),
  location: z.string().optional(),
  min_quantity: z.coerce.number().optional(),
  notes: z.string().optional(),
  // Equipment-specific fields
  code: z.string().optional(),
  ca_number: z.string().optional(),
  serial_number: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  status: z.enum(["available", "in_service", "maintenance", "calibration", "inactive"]).optional(),
  condition: z.enum(["excellent", "good", "fair", "needs_repair", "damaged"]).optional(),
  acquisition_date: z.string().optional(),
  last_calibration: z.string().optional(),
  next_calibration: z.string().optional(),
  calibration_interval_months: z.coerce.number().optional(),
  current_location: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InventoryItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: UnifiedInventoryItem | null;
  onSave: (data: Partial<UnifiedInventoryItem>) => Promise<boolean>;
}

export default function InventoryItemForm({ open, onOpenChange, item, onSave }: InventoryItemFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      item_name: "",
      item_type: "consumivel",
      category: "",
      quantity: 0,
      unit: "",
      location: "",
      min_quantity: 0,
      notes: "",
      code: "",
      ca_number: "",
      serial_number: "",
      manufacturer: "",
      model: "",
      status: "available",
      condition: "good",
      acquisition_date: "",
      last_calibration: "",
      next_calibration: "",
      calibration_interval_months: 12,
      current_location: "Base",
    },
  });

  const itemType = form.watch("item_type");

  useEffect(() => {
    if (item) {
      form.reset({
        item_name: item.item_name,
        item_type: item.item_type,
        category: item.category || "",
        quantity: item.quantity,
        unit: item.unit || "",
        location: item.location || "",
        min_quantity: item.min_quantity || 0,
        notes: item.notes || "",
        code: item.code || "",
        ca_number: item.ca_number || "",
        serial_number: item.serial_number || "",
        manufacturer: item.manufacturer || "",
        model: item.model || "",
        status: item.status || "available",
        condition: item.condition || "good",
        acquisition_date: item.acquisition_date || "",
        last_calibration: item.last_calibration || "",
        next_calibration: item.next_calibration || "",
        calibration_interval_months: item.calibration_interval_months || 12,
        current_location: item.current_location || "Base",
      });
    } else {
      form.reset({
        item_name: "",
        item_type: "consumivel",
        category: "",
        quantity: 0,
        unit: "",
        location: "",
        min_quantity: 0,
        notes: "",
        code: "",
        ca_number: "",
        serial_number: "",
        manufacturer: "",
        model: "",
        status: "available",
        condition: "good",
        acquisition_date: "",
        last_calibration: "",
        next_calibration: "",
        calibration_interval_months: 12,
        current_location: "Base",
      });
    }
    setPhotoFile(null);
    setRemovePhoto(false);
  }, [item, form, open]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(removePhoto ? null : item?.photo_url || null);
      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [photoFile, removePhoto, item?.photo_url]);

  const handlePhotoSelected = async (file: File | undefined) => {
    if (!file) return;
    setPreparingPhoto(true);
    try {
      const preparedPhoto = await prepareInventoryPhoto(file);
      setPhotoFile(preparedPhoto);
      setRemovePhoto(false);
    } catch (error: any) {
      toast({ title: "Foto não aceita", description: error.message, variant: "destructive" });
    } finally {
      setPreparingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleSubmit = async (data: FormData) => {
    setSaving(true);
    let uploadedPhoto: { path: string; publicUrl: string } | null = null;

    try {
      if (photoFile) uploadedPhoto = await uploadInventoryPhoto(photoFile);

      const nextPhotoUrl = uploadedPhoto?.publicUrl ?? (removePhoto ? null : item?.photo_url || null);
      const success = await onSave({ ...data, photo_url: nextPhotoUrl });

      if (!success) {
        if (uploadedPhoto) await removeInventoryPhoto(uploadedPhoto.publicUrl);
        return;
      }

      if (item?.photo_url && item.photo_url !== nextPhotoUrl) {
        try {
          await removeInventoryPhoto(item.photo_url);
        } catch (error) {
          console.error("Não foi possível remover a foto anterior:", error);
        }
      }

      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      if (uploadedPhoto) {
        try {
          await removeInventoryPhoto(uploadedPhoto.publicUrl);
        } catch (cleanupError) {
          console.error("Não foi possível limpar a foto enviada:", cleanupError);
        }
      }
      toast({ title: "Não foi possível salvar a foto", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Editar Item" : "Novo Item"}</DialogTitle>
          <DialogDescription>
            {item ? "Atualize os dados do item" : "Preencha os dados do novo item do inventário"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Item Type Selection */}
            <FormField
              control={form.control}
              name="item_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Item *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!item}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="consumivel">Consumível</SelectItem>
                      <SelectItem value="equipamento">Equipamento / Ferramenta</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs key={itemType} defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                {itemType === "consumivel" && (
                  <TabsTrigger value="consumable">Identificação / EPI</TabsTrigger>
                )}
                {itemType === "equipamento" && (
                  <TabsTrigger value="equipment">Dados do Equipamento</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="item_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Item *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do item" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Categoria" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade {itemType === "consumivel" ? "" : "Inicial"}</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" min={0} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="un, kg, m..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="min_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Qtd. Mínima (Alerta)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="Para alertas de estoque" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Localização no almoxarifado" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <Label>Foto do item</Label>
                  <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center">
                    <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-md bg-muted sm:w-40">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Prévia do item" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-muted-foreground">Use a câmera ou escolha uma imagem. O arquivo será comprimido automaticamente.</p>
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
                      />
                      <Input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => handlePhotoSelected(event.target.files?.[0])}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={preparingPhoto}
                          onClick={() => {
                            if (fileInputRef.current) {
                              fileInputRef.current.value = "";
                              fileInputRef.current.click();
                            }
                          }}
                        >
                          {preparingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          {preparingPhoto ? "Otimizando..." : photoPreview ? "Substituir" : "Escolher foto"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={preparingPhoto}
                          onClick={() => {
                            if (cameraInputRef.current) {
                              cameraInputRef.current.value = "";
                              cameraInputRef.current.click();
                            }
                          }}
                        >
                          <Camera className="mr-2 h-4 w-4" /> Tirar foto
                        </Button>
                        {photoPreview && (
                          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={handleRemovePhoto}>
                            <Trash2 className="mr-2 h-4 w-4" /> Remover
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Observações adicionais" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {itemType === "consumivel" && (
                <TabsContent value="consumable" className="space-y-4 mt-4">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-sm font-medium">Rastreabilidade do consumível ou EPI</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Preencha os dados aplicáveis. O número de série pode ficar vazio para itens controlados apenas por quantidade.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="ca_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do CA</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 12345" inputMode="numeric" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fabricante</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Fabricante" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Modelo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Série</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="S/N (opcional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              )}

              {itemType === "equipamento" && (
                <TabsContent value="equipment" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código do Equipamento</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: MH80-120-001" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="serial_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Série</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="S/N" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="ca_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número do CA</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: 12345" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fabricante</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Fabricante" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="model"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Modelo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Disponível</SelectItem>
                              <SelectItem value="in_service">Em Serviço</SelectItem>
                              <SelectItem value="maintenance">Manutenção</SelectItem>
                              <SelectItem value="calibration">Calibração</SelectItem>
                              <SelectItem value="inactive">Inativo</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="condition"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Condição</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="excellent">Excelente</SelectItem>
                              <SelectItem value="good">Bom</SelectItem>
                              <SelectItem value="fair">Regular</SelectItem>
                              <SelectItem value="needs_repair">Precisa Reparo</SelectItem>
                              <SelectItem value="damaged">Danificado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="current_location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Localização Atual</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Base" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="acquisition_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Aquisição</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="calibration_interval_months"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Intervalo de Calibração (meses)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="last_calibration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Última Calibração</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="next_calibration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Próxima Calibração</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving || preparingPhoto}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || preparingPhoto}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Salvando..." : item ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
