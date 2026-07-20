-- =============================================================
-- 20260629000001_fix_handle_new_user_trigger.sql
-- Fix: handle_new_user assegnava 'staff' a TUTTI i nuovi utenti,
-- inclusi i clienti PWA che si registrano via OTP.
-- Ora: legge user_type da raw_user_meta_data (validato contro
-- i valori ammessi), default a 'client'.

-- 'staff' viene assegnato SOLO quando il codice applicativo lo
-- imposta esplicitamente nel metadata al momento della creazione..
-- =============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, user_type)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    coalesce(
      case
        when new.raw_user_meta_data ->> 'user_type' in ('staff', 'client', 'admin')
        then new.raw_user_meta_data ->> 'user_type'
        else null
      end,
      'client'
    )
  )
  on conflict (id) do update set
    email      = excluded.email,
    full_name  = coalesce(public.profiles.full_name, excluded.full_name),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;
