-- ============================================================
-- 035: Campo de vídeos nos produtos
-- ============================================================

-- Array de URLs de vídeo (YouTube embed, Vimeo, ou URL direta)
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS videos text[] NOT NULL DEFAULT '{}';

-- Bucket de storage para mídias de produtos (execute via Supabase Dashboard se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('produtos', 'produtos', true)
-- ON CONFLICT (id) DO NOTHING;

-- Policy: leitura pública para o bucket produtos
-- CREATE POLICY "Public read produtos media" ON storage.objects
--   FOR SELECT USING (bucket_id = 'produtos');

-- Policy: upload apenas para admins
-- CREATE POLICY "Admin upload produtos media" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'produtos' AND
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--   );

-- Policy: delete apenas para admins
-- CREATE POLICY "Admin delete produtos media" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'produtos' AND
--     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
--   );
