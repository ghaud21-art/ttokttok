import { supabase } from '../supabaseClient.js';

export async function uploadCoverImage(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('ddok-covers').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('ddok-covers').getPublicUrl(path);
  return data.publicUrl;
}
