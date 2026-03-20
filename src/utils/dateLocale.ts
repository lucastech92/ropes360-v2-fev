import { ptBR, enUS, es } from "date-fns/locale";
import i18n from "i18next";

export const getDateLocale = () => {
  const lang = i18n.language;
  if (lang?.startsWith("en")) return enUS;
  if (lang?.startsWith("es")) return es;
  return ptBR;
};
