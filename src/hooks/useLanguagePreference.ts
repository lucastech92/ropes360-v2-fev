import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

export const useLanguagePreference = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    const loadLanguagePreference = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('language_preference')
          .eq('user_id', user.id)
          .single();

        if (profile?.language_preference) {
          i18n.changeLanguage(profile.language_preference);
        }
      }
    };

    loadLanguagePreference();
  }, [i18n]);
};

