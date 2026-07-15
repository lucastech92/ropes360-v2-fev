import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import { ClipboardList, FolderOpen, FileText, Archive } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useChecklistData, Checklist } from "@/hooks/useChecklistData";
import { ChecklistFormDialog } from "@/components/checklist/ChecklistFormDialog";
import { ChecklistCloneDialog } from "@/components/checklist/ChecklistCloneDialog";
import { ChecklistSelector } from "@/components/checklist/ChecklistSelector";
import { ChecklistDetails } from "@/components/checklist/ChecklistDetails";
import { TemplatesTab } from "@/components/checklist/TemplatesTab";
import { SavedChecklistsTab } from "@/components/checklist/SavedChecklistsTab";

const CheckList = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const serviceIdFromJbr = searchParams.get("serviceId");
  const {
    checklists,
    selectedChecklist,
    setSelectedChecklist,
    items,
    inventoryItems,
    templates,
    serviceChecklists,
    savedChecklists,
    currentChecklist,
    completedCount,
    totalCount,
    progress,
    updateItemQuantity,
    addItem,
    deleteItem,
    createChecklist,
    updateChecklist,
    cloneTemplate,
    saveChecklist,
    restoreChecklist,
    saveAsTemplate,
  } = useChecklistData(serviceIdFromJbr);

  const [activeTab, setActiveTab] = useState<string>("servicos");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [templateToClone, setTemplateToClone] = useState<Checklist | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formServiceTag, setFormServiceTag] = useState("");
  const [formType, setFormType] = useState<'entrada' | 'saida'>('saida');
  const [formIsTemplate, setFormIsTemplate] = useState(false);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormServiceTag("");
    setFormType('saida');
    setFormIsTemplate(false);
    setSelectedServiceId(null);
    setSelectedContainerId(null);
  };

  const openCreateDialog = (asTemplate: boolean) => {
    resetForm();
    setFormIsTemplate(asTemplate);
    setIsTemplateMode(asTemplate);
    setIsCreateDialogOpen(true);
  };

  const openEditDialog = async () => {
    if (currentChecklist) {
      setFormName(currentChecklist.name);
      setFormDescription(currentChecklist.description || "");
      setFormServiceTag(currentChecklist.service_tag || "");
      setFormType(currentChecklist.checklist_type);
      setFormIsTemplate(currentChecklist.is_template);
      setIsTemplateMode(currentChecklist.is_template);

      // Load existing service link
      const { data } = await import("@/integrations/supabase/client").then(m =>
        m.supabase
          .from("service_checklists")
          .select("service_id")
          .eq("checklist_id", currentChecklist.id)
          .limit(1)
      );
      const linkedServiceId = data?.[0]?.service_id || null;
      setSelectedServiceId(linkedServiceId);
      if (linkedServiceId) {
        const { data: linkedService } = await import("@/integrations/supabase/client").then(m => m.supabase.from("services").select("logistics_container_id").eq("id", linkedServiceId).single());
        setSelectedContainerId(linkedService?.logistics_container_id || null);
      } else setSelectedContainerId(null);

      setIsEditDialogOpen(true);
    }
  };

  const openCloneDialog = (template: Checklist) => {
    setTemplateToClone(template);
    setIsCloneDialogOpen(true);
  };

  const handleCreate = async () => {
    const result = await createChecklist({
      name: formName,
      description: formDescription,
      serviceTag: formServiceTag,
      type: formType,
      isTemplate: formIsTemplate,
    }, selectedServiceId, selectedContainerId);

    if (result) {
      setIsCreateDialogOpen(false);
      resetForm();
    }
  };

  const handleUpdate = async () => {
    const success = await updateChecklist({
      name: formName,
      description: formDescription,
      serviceTag: formServiceTag,
      type: formType,
      isTemplate: formIsTemplate,
    }, selectedServiceId, selectedContainerId);

    if (success) {
      setIsEditDialogOpen(false);
    }
  };

  const handleClone = async (serviceTag: string, name?: string, serviceId?: string, containerId?: string) => {
    if (!templateToClone) return;
    
    const result = await cloneTemplate(templateToClone, serviceTag, name, serviceId, containerId);
    if (result) {
      setIsCloneDialogOpen(false);
      setTemplateToClone(null);
      setActiveTab("servicos");
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    await deleteItem(deleteItemId);
    setDeleteItemId(null);
  };

  const handleEditTemplate = (template: Checklist) => {
    setSelectedChecklist(template.id);
    setActiveTab("servicos");
  };

  const handleViewSaved = (id: string) => {
    setSelectedChecklist(id);
    setActiveTab("servicos");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container space-y-6 px-4 py-6">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <ClipboardList className="h-6 w-6" />
            {t('checklists.title')}
          </h1>
          <p className="text-muted-foreground">{t('checklists.subtitle')}</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-xl grid-cols-3">
            <TabsTrigger value="servicos" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              {serviceIdFromJbr ? "Deste JBR" : "Em uso"} ({serviceChecklists.length})
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="salvos" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Arquivados ({savedChecklists.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-6">
            <TemplatesTab
              templates={templates}
              onCreateClick={() => openCreateDialog(true)}
              onEditClick={handleEditTemplate}
              onCloneClick={openCloneDialog}
            />
          </TabsContent>

          <TabsContent value="servicos" className="space-y-6">
            <div className="grid gap-6">
              <ChecklistSelector
                checklists={serviceChecklists}
                selectedChecklist={selectedChecklist}
                onSelectChecklist={setSelectedChecklist}
                onCreateClick={() => openCreateDialog(false)}
                onEditClick={openEditDialog}
              />

              {currentChecklist && (
                <ChecklistDetails
                  checklist={currentChecklist}
                  items={items}
                  inventoryItems={inventoryItems}
                  progress={progress}
                  completedCount={completedCount}
                  totalCount={totalCount}
                  onQuantityChange={updateItemQuantity}
                  onDeleteItem={(id) => setDeleteItemId(id)}
                  onAddItem={addItem}
                  onCloneClick={() => openCloneDialog(currentChecklist)}
                  onSaveClick={currentChecklist && !currentChecklist.is_template && !currentChecklist.is_saved
                    ? () => saveChecklist(currentChecklist.id)
                    : undefined
                  }
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="salvos" className="space-y-6">
            <SavedChecklistsTab
              savedChecklists={savedChecklists}
              onRestore={restoreChecklist}
              onView={handleViewSaved}
              onSaveAsTemplate={async (id) => {
                const result = await saveAsTemplate(id);
                if (result) setActiveTab("templates");
              }}
            />
          </TabsContent>
        </Tabs>

        {/* Create Dialog */}
        <ChecklistFormDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          mode="create"
          isTemplate={formIsTemplate}
          name={formName}
          description={formDescription}
          serviceTag={formServiceTag}
          type={formType}
          selectedServiceId={selectedServiceId}
          selectedContainerId={selectedContainerId}
          onNameChange={setFormName}
          onDescriptionChange={setFormDescription}
          onServiceTagChange={setFormServiceTag}
          onTypeChange={setFormType}
          onIsTemplateChange={setFormIsTemplate}
          onServiceIdChange={setSelectedServiceId}
          onContainerIdChange={setSelectedContainerId}
          onSubmit={handleCreate}
        />

        {/* Edit Dialog */}
        <ChecklistFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          mode="edit"
          isTemplate={formIsTemplate}
          name={formName}
          description={formDescription}
          serviceTag={formServiceTag}
          type={formType}
          selectedServiceId={selectedServiceId}
          selectedContainerId={selectedContainerId}
          onNameChange={setFormName}
          onDescriptionChange={setFormDescription}
          onServiceTagChange={setFormServiceTag}
          onTypeChange={setFormType}
          onIsTemplateChange={setFormIsTemplate}
          onServiceIdChange={setSelectedServiceId}
          onContainerIdChange={setSelectedContainerId}
          onSubmit={handleUpdate}
        />

        {/* Clone Dialog */}
        <ChecklistCloneDialog
          open={isCloneDialogOpen}
          onOpenChange={setIsCloneDialogOpen}
          template={templateToClone}
          onClone={handleClone}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteItemId} onOpenChange={(open) => !open && setDeleteItemId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('checklists.deleteItemTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('checklists.deleteItemDescription')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive hover:bg-destructive/90">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default CheckList;
