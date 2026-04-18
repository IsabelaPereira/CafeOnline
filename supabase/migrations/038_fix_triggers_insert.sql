-- ============================================================
-- 038: Fix triggers to not run on INSERT (only UPDATE)
-- ============================================================

-- trg_single_master was BEFORE INSERT OR UPDATE, causing signUp to fail
-- New users are never master, so only need to check on UPDATE
DROP TRIGGER IF EXISTS trg_single_master ON profiles;
CREATE TRIGGER trg_single_master
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION check_single_master();

-- trg_protect_master was already UPDATE only, but ensure it's correct
DROP TRIGGER IF EXISTS trg_protect_master ON profiles;
CREATE TRIGGER trg_protect_master
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_master_user();
