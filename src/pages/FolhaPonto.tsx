import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TimesheetCalendar } from "@/components/timesheet/TimesheetCalendar";
import { TimesheetLegend } from "@/components/timesheet/TimesheetLegend";
import { TimesheetSummary } from "@/components/timesheet/TimesheetSummary";
import { CheckInModal } from "@/components/timesheet/CheckInModal";
import { TeamTimesheetView } from "@/components/timesheet/TeamTimesheetView";
import { useTimeEntries, CheckInType, TimeEntry } from "@/hooks/useTimeEntries";

const FolhaPonto = () => {
  const { t, i18n } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const getLocale = () => {
    switch (i18n.language) {
      case 'pt-BR': return ptBR;
      case 'es-ES': return es;
      default: return enUS;
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const { entries, isLoading, createEntry, updateEntry, deleteEntry } = useTimeEntries(
    currentUserId || undefined,
    currentMonth
  );

  const { data: userRole } = useQuery({
    queryKey: ['user-role', currentUserId],
    queryFn: async () => {
      if (!currentUserId) return null;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUserId)
        .single();

      if (error) return null;
      return data?.role;
    },
    enabled: !!currentUserId,
  });

  const isAdminOrModerator = userRole === 'admin' || userRole === 'moderator';

  const getEntryForDate = (date: Date): TimeEntry | undefined => {
    return entries?.find(entry => 
      isSameDay(new Date(entry.entry_date + 'T00:00:00'), date)
    );
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setModalOpen(true);
  };

  const handleSaveCheckIn = (type: CheckInType, notes: string) => {
    if (!selectedDate) return;

    const existingEntry = getEntryForDate(selectedDate);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    if (existingEntry) {
      updateEntry.mutate(
        { id: existingEntry.id, check_in_type: type, notes },
        { onSuccess: () => setModalOpen(false) }
      );
    } else {
      createEntry.mutate(
        { entry_date: dateStr, check_in_type: type, notes },
        { onSuccess: () => setModalOpen(false) }
      );
    }
  };

  const handleDeleteCheckIn = () => {
    if (!selectedDate) return;
    const existingEntry = getEntryForDate(selectedDate);
    if (existingEntry) {
      deleteEntry.mutate(existingEntry.id, {
        onSuccess: () => setModalOpen(false),
      });
    }
  };

  const selectedEntry = selectedDate ? getEntryForDate(selectedDate) : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            {t('timesheet.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('timesheet.description')}
          </p>
        </div>

        <Tabs defaultValue="my-timesheet" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my-timesheet" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t('timesheet.myTimesheet')}
            </TabsTrigger>
            {isAdminOrModerator && (
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t('timesheet.teamView')}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="my-timesheet" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: getLocale() })}
                  </CardTitle>
                  <CardDescription>
                    {t('timesheet.clickToCheckIn')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <TimesheetCalendar
                    entries={entries || []}
                    selectedDate={selectedDate}
                    onSelectDate={handleDateSelect}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                  />
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{t('timesheet.legend')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TimesheetLegend />
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t('timesheet.monthlySummary')}</CardTitle>
                <CardDescription>
                  {t('timesheet.summaryDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimesheetSummary entries={entries || []} />
              </CardContent>
            </Card>
          </TabsContent>

          {isAdminOrModerator && (
            <TabsContent value="team" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="capitalize">
                    {t('timesheet.teamTimesheet')} - {format(currentMonth, 'MMMM yyyy', { locale: getLocale() })}
                  </CardTitle>
                  <CardDescription>
                    {t('timesheet.teamDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TeamTimesheetView month={currentMonth} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <CheckInModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          selectedDate={selectedDate}
          existingEntry={selectedEntry}
          onSave={handleSaveCheckIn}
          onDelete={selectedEntry ? handleDeleteCheckIn : undefined}
          isLoading={createEntry.isPending || updateEntry.isPending || deleteEntry.isPending}
        />
      </main>
    </div>
  );
};

export default FolhaPonto;

