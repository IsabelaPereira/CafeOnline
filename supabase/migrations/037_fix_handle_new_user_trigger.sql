-- ============================================================
-- 037: Fix handle_new_user trigger for new profile columns
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, email, is_master, active)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'cliente'),
    new.email,
    false,
    true
  )
  ON CONFLICT (id) DO UPDATE
    SET email = excluded.email,
        name = COALESCE(NULLIF(excluded.name, ''), profiles.name);
  RETURN new;
END;
$$;
