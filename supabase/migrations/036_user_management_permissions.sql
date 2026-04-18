-- ============================================================
-- 036: User Management & Permission System
-- ============================================================

-- 1. Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Set the first admin as master
UPDATE profiles SET is_master = true
WHERE id = (
  SELECT id FROM profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
);

-- Helper: read current user's role without triggering RLS (avoids infinite recursion)
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT role != 'cliente' FROM profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_user_is_master_or_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT (is_master = true OR role = 'admin') FROM profiles WHERE id = auth.uid()),
    false
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Prevent more than one master
CREATE OR REPLACE FUNCTION check_single_master()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_master = true AND (SELECT count(*) FROM profiles WHERE is_master = true AND id != NEW.id) > 0 THEN
    RAISE EXCEPTION 'Apenas um usuário master é permitido';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_single_master ON profiles;
CREATE TRIGGER trg_single_master
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_single_master();

-- Prevent master from being deactivated or demoted
CREATE OR REPLACE FUNCTION protect_master_user()
RETURNS trigger AS $$
BEGIN
  IF OLD.is_master = true THEN
    IF NEW.active = false THEN
      RAISE EXCEPTION 'Usuário master não pode ser desativado';
    END IF;
    IF NEW.is_master = false THEN
      RAISE EXCEPTION 'Usuário master não pode ser rebaixado';
    END IF;
    IF NEW.role = 'cliente' THEN
      RAISE EXCEPTION 'Usuário master não pode ser alterado para cliente';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_master ON profiles;
CREATE TRIGGER trg_protect_master
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_master_user();

-- 2. Role permissions table
CREATE TABLE IF NOT EXISTS role_permissions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  role        text NOT NULL,
  permission  text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(role, permission)
);

-- 3. Per-user permission overrides
CREATE TABLE IF NOT EXISTS user_permission_overrides (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission  text NOT NULL,
  granted     boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- 4. Seed default role permissions
INSERT INTO role_permissions (role, permission) VALUES
  -- admin: all
  ('admin', 'dashboard'), ('admin', 'pedidos'), ('admin', 'assinaturas'), ('admin', 'crm'),
  ('admin', 'reservas'), ('admin', 'produtos'), ('admin', 'blog'), ('admin', 'financeiro'),
  ('admin', 'logistica'), ('admin', 'relatorios'), ('admin', 'logs'), ('admin', 'configuracoes'),
  ('admin', 'usuarios'),
  -- financeiro
  ('financeiro', 'dashboard'), ('financeiro', 'financeiro'), ('financeiro', 'relatorios'),
  -- operacoes
  ('operacoes', 'dashboard'), ('operacoes', 'pedidos'), ('operacoes', 'assinaturas'),
  ('operacoes', 'logistica'), ('operacoes', 'produtos'), ('operacoes', 'reservas'),
  -- marketing
  ('marketing', 'dashboard'), ('marketing', 'crm'), ('marketing', 'blog'), ('marketing', 'relatorios'),
  -- conteudo
  ('conteudo', 'dashboard'), ('conteudo', 'blog'),
  -- atendimento
  ('atendimento', 'dashboard'), ('atendimento', 'pedidos'), ('atendimento', 'crm'), ('atendimento', 'reservas'),
  -- estoque
  ('estoque', 'dashboard'), ('estoque', 'produtos')
ON CONFLICT (role, permission) DO NOTHING;

-- 5. RLS policies (using SECURITY DEFINER helpers to avoid recursion)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- Drop all first (idempotent re-run)
DROP POLICY IF EXISTS "role_permissions_select" ON role_permissions;
DROP POLICY IF EXISTS "role_permissions_modify" ON role_permissions;
DROP POLICY IF EXISTS "user_overrides_select" ON user_permission_overrides;
DROP POLICY IF EXISTS "user_overrides_modify" ON user_permission_overrides;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;

-- Anyone authenticated can read permissions
CREATE POLICY "role_permissions_select" ON role_permissions
  FOR SELECT TO authenticated USING (true);

-- Only admin/master can modify permissions
CREATE POLICY "role_permissions_modify" ON role_permissions
  FOR ALL TO authenticated
  USING (auth_user_is_master_or_admin())
  WITH CHECK (auth_user_is_master_or_admin());

CREATE POLICY "user_overrides_select" ON user_permission_overrides
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "user_overrides_modify" ON user_permission_overrides
  FOR ALL TO authenticated
  USING (auth_user_is_master_or_admin())
  WITH CHECK (auth_user_is_master_or_admin());

-- Allow admin users to read all profiles (uses SECURITY DEFINER function)
CREATE POLICY "profiles_admin_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR auth_user_is_admin());

-- Allow admin/master to update profiles
CREATE POLICY "profiles_admin_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_user_is_master_or_admin())
  WITH CHECK (id = auth.uid() OR auth_user_is_master_or_admin());

-- 6. RPC to get user emails (auth.users is not directly queryable from client)
CREATE OR REPLACE FUNCTION get_user_emails(user_ids uuid[])
RETURNS TABLE(id uuid, email text) AS $$
BEGIN
  IF NOT auth_user_is_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
    SELECT au.id, au.email::text
    FROM auth.users au
    WHERE au.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
