import { toast as sonnerToast } from "sonner";

/**
 * Unified notification API. Wraps sonner with semantic helpers so the whole
 * app has consistent tone, duration and copy for user feedback.
 *
 * Usage:
 *   notify.success("Salvo");
 *   notify.error("Falha ao salvar", { description: err.message });
 */
type NotifyOptions = {
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
};

const build = (opts?: NotifyOptions) =>
  opts
    ? {
        description: opts.description,
        duration: opts.duration,
        action: opts.action,
      }
    : undefined;

export const notify = {
  success: (message: string, opts?: NotifyOptions) => sonnerToast.success(message, build(opts)),
  error: (message: string, opts?: NotifyOptions) =>
    sonnerToast.error(message, { duration: 6000, ...build(opts) }),
  warn: (message: string, opts?: NotifyOptions) => sonnerToast.warning(message, build(opts)),
  info: (message: string, opts?: NotifyOptions) => sonnerToast.info(message, build(opts)),
  loading: (message: string) => sonnerToast.loading(message),
  dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  promise: sonnerToast.promise,
};
