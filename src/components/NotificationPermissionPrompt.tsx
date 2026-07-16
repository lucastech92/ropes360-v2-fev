import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { useTranslation } from 'react-i18next';

export const NotificationPermissionPrompt = () => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const { permission, isSubscribed, isLoading, isSupported, subscribeToPush } = useNotificationPermission();

  useEffect(() => {
    const isDismissed = localStorage.getItem('notification-prompt-dismissed');
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('notification-prompt-dismissed', 'true');
  };

  const handleEnable = async () => {
    await subscribeToPush();
    handleDismiss();
  };

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - User denied permission
  // - User dismissed
  if (!isSupported || isSubscribed || permission === 'denied' || dismissed) {
    return null;
  }

  return (
    <Card className="fixed bottom-20 left-4 right-4 z-50 w-auto border-primary shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-96">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>{t('notifications.enableTitle')}</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {t('notifications.enableDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>{t('notifications.benefit1')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>{t('notifications.benefit2')}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">•</span>
            <span>{t('notifications.benefit3')}</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleDismiss}
          className="flex-1"
        >
          {t('notifications.later')}
        </Button>
        <Button
          onClick={handleEnable}
          disabled={isLoading}
          className="flex-1"
        >
          {isLoading ? t('notifications.enabling') : t('notifications.enable')}
        </Button>
      </CardFooter>
    </Card>
  );
};
