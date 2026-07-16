import { supabase } from "@/integrations/supabase/client";

const BUCKET = "inventory-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const validateInventoryPhoto = (file: File) => {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "A imagem deve ter no máximo 5 MB.";
  }

  return null;
};

export const uploadInventoryPhoto = async (file: File) => {
  const validationError = validateInventoryPhoto(file);
  if (validationError) throw new Error(validationError);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
};

const getStoredPhotoPath = (photoUrl: string) => {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const markerIndex = photoUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(photoUrl.slice(markerIndex + marker.length).split("?")[0]);
};

export const removeInventoryPhoto = async (photoUrl: string | null | undefined) => {
  if (!photoUrl) return;

  const path = getStoredPhotoPath(photoUrl);
  if (!path) return;

  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
};
