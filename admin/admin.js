-- =============================================================
-- Foto Herdem - Admin & Müşteri Seçim Sistemi
-- Supabase SQL Editor'da çalıştırın (veya: supabase db push)
-- Varsayılan admin:  kullanıcı adı: herdem   şifre: herdem123
-- Kurulumdan sonra admin panelinden şifrenizi değiştirin.
-- =============================================================

create extension if not exists pgcrypto;

-- -------------------------------------------------------------
-- TABLOLAR
-- -------------------------------------------------------------

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  username text unique not null check (length(username) >= 3),
  password_hash text not null,
  display_name text not null default 'Admin',
  is_main boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Mevcut kurulumlar için: is_main sütununu ekle
alter table public.admins
  add column if not exists is_main boolean not null default false;

create table if not exists public.admin_sessions (
  token uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.admins(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '12 hours'
);

create table if not exists public.customer_sessions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  album_path text not null,
  album_title text not null,
  password_hash text not null,
  password_plain text,
  max_selections int not null default 10 check (max_selections between 1 and 500),
  min_selections int not null default 0 check (min_selections between 0 and 500),
  protection_level int not null default 2 check (protection_level between 0 and 3),
  expires_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'used', 'expired', 'revoked')),
  created_by uuid references public.admins(id),
  created_at timestamptz not null default now(),
  photos text[] not null default '{}'
);

-- Mevcut kurulumlar için: photos sütununu ekle
alter table public.customer_sessions
  add column if not exists photos text[] not null default '{}';

-- Mevcut kurulumlar için: min_selections sütununu ekle
alter table public.customer_sessions
  add column if not exists min_selections int not null default 0;

-- Mevcut kurulumlar için: password_plain sütununu ekle
-- (admin panelinde şifreyi gizli şekilde görüntüleyebilmek için saklanır)
alter table public.customer_sessions
  add column if not exists password_plain text;

create table if not exists public.selections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.customer_sessions(id) on delete cascade,
  photo_ids text[] not null,
  contact_name text,
  contact_phone text,
  note text,
  submitted_at timestamptz not null default now()
);

-- Albümler (fotoğraflar Supabase Storage'da; bu tablo yalnızca meta veridir)
-- scripts/upload-albums.js bu tabloyu doldurur/günceller.
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  path text not null,
  cover text not null,
  photos text[] not null default '{}',
  photo_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- Bildirim ayarları (bildirim e-posta adresi vb.)
create table if not exists public.admin_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- RLS: anon/authenticated tablolara doğrudan erişemesin.
-- Tüm erişim aşağıdaki güvenli RPC fonksiyonları üzerinden yapılır.
alter table public.admins enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.customer_sessions enable row level security;
alter table public.selections enable row level security;
alter table public.albums enable row level security;
alter table public.admin_settings enable row level security;

-- -------------------------------------------------------------
-- YARDIMCI FONKSİYONLAR
-- -------------------------------------------------------------

-- Admin oturumu geçerli mi?
create or replace function public.admin_valid(p_token uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.admin_sessions s
    join public.admins a on a.id = s.admin_id
    where s.token = p_token and s.expires_at > now() and a.is_active = true
  );
$$;

create or replace function public.session_to_json(p public.customer_sessions)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'id', p.id,
    'code', p.code,
    'album_path', p.album_path,
    'album_title', p.album_title,
    'max_selections', p.max_selections,
    'min_selections', p.min_selections,
    'protection_level', p.protection_level,
    'status', p.status,
    'expires_at', p.expires_at,
    'created_at', p.created_at
  );
$$;

-- -------------------------------------------------------------
-- ADMIN RPC'LERİ
-- -------------------------------------------------------------

-- Giriş: başarılıysa oturum token'ı döner
create or replace function public.admin_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin public.admins%rowtype;
  v_token uuid;
begin
  select * into v_admin
  from public.admins
  where username = lower(trim(p_username)) and is_active = true;

  if v_admin.id is null or v_admin.password_hash <> crypt(p_password, v_admin.password_hash) then
    return null;
  end if;

  insert into public.admin_sessions (admin_id) values (v_admin.id) returning token into v_token;

  return jsonb_build_object(
    'token', v_token,
    'username', v_admin.username,
    'display_name', v_admin.display_name
  );
end;
$$;

-- Oturum bilgisi (token geçerli mi, hangi admin)
create or replace function public.admin_me(p_token uuid)
returns jsonb
language sql
security definer
set search_path = public, extensions
as $$
  select jsonb_build_object(
    'username', a.username,
    'display_name', a.display_name,
    'is_main', a.is_main
  )
  from public.admin_sessions s
  join public.admins a on a.id = s.admin_id
  where s.token = p_token and s.expires_at > now() and a.is_active = true;
$$;

create or replace function public.admin_logout(p_token uuid)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  delete from public.admin_sessions where token = p_token;
$$;

-- Şifre değiştirme
create or replace function public.admin_change_password(p_token uuid, p_old_password text, p_new_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin_id uuid;
  v_hash text;
begin
  select s.admin_id into v_admin_id
  from public.admin_sessions s
  where s.token = p_token and s.expires_at > now();

  if v_admin_id is null then
    raise exception 'yetkisiz';
  end if;

  select password_hash into v_hash from public.admins where id = v_admin_id;
  if v_hash <> crypt(p_old_password, v_hash) then
    return false;
  end if;

  if p_new_password is null or length(p_new_password) < 6 then
    raise exception 'yeni şifre en az 6 karakter olmalı';
  end if;

  update public.admins
  set password_hash = crypt(p_new_password, gen_salt('bf', 10))
  where id = v_admin_id;

  return true;
end;
$$;

-- Yeni admin ekleme
create or replace function public.admin_create_admin(
  p_token uuid,
  p_username text,
  p_password text,
  p_display_name text default 'Admin'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_admin_id uuid;
  v_new_id uuid;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  select s.admin_id into v_admin_id
  from public.admin_sessions s
  where s.token = p_token;

  if not exists (select 1 from public.admins where id = v_admin_id and is_main = true) then
    raise exception 'yalnızca ana admin yeni admin ekleyebilir';
  end if;

  if p_username is null or length(trim(p_username)) < 3 then
    raise exception 'kullanıcı adı en az 3 karakter olmalı';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'şifre en az 6 karakter olmalı';
  end if;

  insert into public.admins (username, password_hash, display_name)
  values (lower(trim(p_username)), crypt(p_password, gen_salt('bf', 10)), coalesce(nullif(trim(p_display_name), ''), 'Admin'))
  returning id into v_new_id;

  return jsonb_build_object('id', v_new_id, 'username', lower(trim(p_username)));
end;
$$;

-- Admin listesi (yalnızca ana admin)
create or replace function public.admin_list_admins(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_result jsonb;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  if not exists (
    select 1 from public.admin_sessions s
    join public.admins a on a.id = s.admin_id
    where s.token = p_token and a.is_main = true
  ) then
    raise exception 'yalnızca ana admin adminleri yönetebilir';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', a.id,
      'username', a.username,
      'display_name', a.display_name,
      'is_main', a.is_main,
      'is_active', a.is_active,
      'created_at', a.created_at
    ) order by a.is_main desc, a.created_at asc
  ), '[]'::jsonb) into v_result
  from public.admins a;

  return v_result;
end;
$$;

-- Admin silme (yalnızca ana admin, ana admin silinemez)
create or replace function public.admin_delete_admin(p_token uuid, p_admin_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_is_main boolean;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  select a.is_main into v_is_main
  from public.admin_sessions s
  join public.admins a on a.id = s.admin_id
  where s.token = p_token;

  if not coalesce(v_is_main, false) then
    raise exception 'yalnızca ana admin admin silebilir';
  end if;

  if not exists (select 1 from public.admins where id = p_admin_id) then
    raise exception 'admin bulunamadı';
  end if;

  if exists (select 1 from public.admins where id = p_admin_id and is_main = true) then
    raise exception 'ana admin silinemez';
  end if;

  if exists (select 1 from public.admin_sessions where admin_id = p_admin_id and token = p_token) then
    raise exception 'kendi hesabınızı silemezsiniz';
  end if;

  update public.admins set is_active = false where id = p_admin_id;
  delete from public.admin_sessions where admin_id = p_admin_id;

  return true;
end;
$$;

-- Müşteri seçim linki oluşturma (kod sunucuda üretilir)
drop function if exists public.admin_create_session(uuid, text, text, text, int, int, timestamptz);
create or replace function public.admin_create_session(
  p_token uuid,
  p_album_path text,
  p_album_title text,
  p_password text,
  p_max_selections int,
  p_min_selections int default 0,
  p_protection_level int default 2,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_row public.customer_sessions%rowtype;
  v_admin_id uuid;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  if p_album_path is null or trim(p_album_path) = '' or p_album_title is null or trim(p_album_title) = '' then
    raise exception 'albüm bilgisi eksik';
  end if;

  if p_password is null or length(p_password) < 4 then
    raise exception 'şifre en az 4 karakter olmalı';
  end if;

  if p_max_selections is null or p_max_selections < 1 or p_max_selections > 500 then
    raise exception 'geçersiz seçim sayısı';
  end if;

  if p_min_selections is null or p_min_selections < 0 or p_min_selections > 500 then
    raise exception 'geçersiz en az seçim sayısı';
  end if;

  if p_min_selections > p_max_selections then
    raise exception 'en az seçim sayısı, en fazla seçim sayısından büyük olamaz';
  end if;

  select s.admin_id into v_admin_id
  from public.admin_sessions s
  where s.token = p_token;

  loop
    -- 6 haneli rastgele kod (000001 gibi, baştaki sıfırlar korunur)
    v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.customer_sessions where code = v_code);
  end loop;

  insert into public.customer_sessions (
    code, album_path, album_title, password_hash, password_plain,
    max_selections, min_selections, protection_level, expires_at, created_by
  ) values (
    v_code, trim(p_album_path), trim(p_album_title), crypt(p_password, gen_salt('bf', 10)), p_password,
    p_max_selections, p_min_selections, p_protection_level, p_expires_at, v_admin_id
  )
  returning * into v_row;

  return public.session_to_json(v_row);
end;
$$;

-- Oluşturulan tüm linkler
create or replace function public.admin_list_sessions(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_result jsonb;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'code', s.code,
      'album_path', s.album_path,
      'album_title', s.album_title,
      'password', s.password_plain,
      'max_selections', s.max_selections,
      'min_selections', s.min_selections,
      'protection_level', s.protection_level,
      'status', s.status,
      'expires_at', s.expires_at,
      'created_at', s.created_at,
      'selection_count', (select count(*) from public.selections sel where sel.session_id = s.id)
    ) order by s.created_at desc
  ), '[]'::jsonb) into v_result
  from public.customer_sessions s;

  return v_result;
end;
$$;

-- Bir linke yapılan seçimler
create or replace function public.admin_get_selections(p_token uuid, p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_result jsonb;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', sel.id,
      'photo_ids', sel.photo_ids,
      'contact_name', sel.contact_name,
      'contact_phone', sel.contact_phone,
      'note', sel.note,
      'submitted_at', sel.submitted_at,
      'code', s.code,
      'album_title', s.album_title
    ) order by sel.submitted_at desc
  ), '[]'::jsonb) into v_result
  from public.selections sel
  join public.customer_sessions s on s.id = sel.session_id
  where sel.session_id = p_session_id;

  return v_result;
end;
$$;

-- Linki iptal etme
create or replace function public.admin_revoke_session(p_token uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  update public.customer_sessions
  set status = 'revoked'
  where id = p_session_id and status = 'active';
end;
$$;

-- Linki tamamen silme (seçimler otomatik silinir)
create or replace function public.admin_delete_session(p_token uuid, p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  delete from public.customer_sessions
  where id = p_session_id;
end;
$$;

-- Admin bildirim e-posta adresi (seçim yapılınca bu adrese bildirim gider)
create or replace function public.admin_get_email()
returns text
language sql
security definer
set search_path = public, extensions
as $$
  select value from public.admin_settings where key = 'admin_email';
$$;

create or replace function public.admin_set_email(p_token uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_is_main boolean;
begin
  if not public.admin_valid(p_token) then
    raise exception 'yetkisiz';
  end if;

  select a.is_main into v_is_main
  from public.admin_sessions s
  join public.admins a on a.id = s.admin_id
  where s.token = p_token;

  if not coalesce(v_is_main, false) then
    raise exception 'yalnızca ana admin bildirim e-postasını değiştirebilir';
  end if;

  if p_email is null or length(trim(p_email)) < 5 or position('@' in p_email) = 0 then
    raise exception 'geçerli bir e-posta adresi girin';
  end if;

  insert into public.admin_settings (key, value)
  values ('admin_email', lower(trim(p_email)))
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end;
$$;

-- -------------------------------------------------------------
-- MÜŞTERİ RPC'LERİ (seçim sayfası)
-- -------------------------------------------------------------

-- Kod + şifre ile giriş
create or replace function public.customer_login(p_code text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.customer_sessions%rowtype;
begin
  select * into v_row
  from public.customer_sessions
  where code = lower(trim(p_code)) or code = regexp_replace(trim(p_code), '\D', '', 'g');

  if v_row.id is null then
    return jsonb_build_object('error', 'not_found');
  end if;

  if v_row.status = 'revoked' then
    return jsonb_build_object('error', 'revoked');
  end if;

  if v_row.status = 'used' then
    return jsonb_build_object('error', 'already_used');
  end if;

  if v_row.expires_at is not null and v_row.expires_at < now() then
    update public.customer_sessions set status = 'expired' where id = v_row.id;
    return jsonb_build_object('error', 'expired');
  end if;

  if v_row.password_hash <> crypt(p_password, v_row.password_hash) then
    return jsonb_build_object('error', 'wrong_password');
  end if;

  return jsonb_build_object(
    'ok', true,
    'session_id', v_row.id,
    'code', v_row.code,
    'album_path', v_row.album_path,
    'album_title', v_row.album_title,
    'max_selections', v_row.max_selections,
    'min_selections', v_row.min_selections,
    'protection_level', v_row.protection_level,
    'expires_at', v_row.expires_at,
    'admin_email', (select value from public.admin_settings where key = 'admin_email')
  );
end;
$$;

-- Seçimi kaydet (tek kullanımlık: link otomatik "used" olur)
create or replace function public.customer_submit_selection(
  p_session_id uuid,
  p_photo_ids text[],
  p_contact_name text default null,
  p_contact_phone text default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session public.customer_sessions%rowtype;
  v_count int;
begin
  select * into v_session from public.customer_sessions where id = p_session_id;

  if v_session.id is null then
    return jsonb_build_object('error', 'not_found');
  end if;

  if v_session.status = 'used' then
    return jsonb_build_object('error', 'already_used');
  end if;

  if v_session.status = 'revoked' then
    return jsonb_build_object('error', 'revoked');
  end if;

  if v_session.expires_at is not null and v_session.expires_at < now() then
    update public.customer_sessions set status = 'expired' where id = v_session.id;
    return jsonb_build_object('error', 'expired');
  end if;

  if p_contact_name is null or trim(p_contact_name) = '' then
    return jsonb_build_object('error', 'contact_required');
  end if;

  if p_contact_phone is null or trim(p_contact_phone) = '' then
    return jsonb_build_object('error', 'contact_required');
  end if;

  v_count := coalesce(array_length(p_photo_ids, 1), 0);
  if v_count < 1 then
    return jsonb_build_object('error', 'no_photos');
  end if;

  if v_count < v_session.min_selections then
    return jsonb_build_object('error', 'too_few');
  end if;

  if v_count > v_session.max_selections then
    return jsonb_build_object('error', 'too_many');
  end if;

  insert into public.selections (session_id, photo_ids, contact_name, contact_phone, note)
  values (p_session_id, p_photo_ids, p_contact_name, p_contact_phone, p_note);

  update public.customer_sessions set status = 'used' where id = p_session_id;

  return jsonb_build_object('ok', true, 'count', v_count);
end;
$$;

-- -------------------------------------------------------------
-- İZİNLER
-- -------------------------------------------------------------

revoke all on table public.admins from anon, authenticated;
revoke all on table public.admin_sessions from anon, authenticated;
revoke all on table public.customer_sessions from anon, authenticated;
revoke all on table public.selections from anon, authenticated;
revoke all on table public.admin_settings from anon, authenticated;

grant usage on schema public to anon, authenticated;
grant execute on function public.admin_login(text, text) to anon, authenticated;
grant execute on function public.admin_me(uuid) to anon, authenticated;
grant execute on function public.admin_logout(uuid) to anon, authenticated;
grant execute on function public.admin_change_password(uuid, text, text) to anon, authenticated;
grant execute on function public.admin_create_admin(uuid, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_admins(uuid) to anon, authenticated;
grant execute on function public.admin_delete_admin(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_create_session(uuid, text, text, text, int, int, int, timestamptz) to anon, authenticated;
grant execute on function public.admin_list_sessions(uuid) to anon, authenticated;
grant execute on function public.admin_get_selections(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_revoke_session(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_delete_session(uuid, uuid) to anon, authenticated;
grant execute on function public.admin_get_email() to anon, authenticated;
grant execute on function public.admin_set_email(uuid, text) to anon, authenticated;
grant execute on function public.customer_login(text, text) to anon, authenticated;
grant execute on function public.customer_submit_selection(uuid, text[], text, text, text) to anon, authenticated;

-- -------------------------------------------------------------
-- VARSAYILAN ADMIN KAYDI
-- Kullanıcı adı: herdem   Şifre: herdem123
-- İlk girişten sonra şifreyi değiştirmeyi unutmayın!
-- -------------------------------------------------------------

insert into public.admins (username, password_hash, display_name, is_main)
values ('herdem', crypt('herdem123', gen_salt('bf', 10)), 'Foto Herdem Admin', true)
on conflict (username) do nothing;

-- Mevcut kurulumlarda 'herdem' ana admin olarak işaretlensin
update public.admins set is_main = true where username = 'herdem';


-- =============================================================
-- Foto Albümleri (metadata Supabase'de, fotoğraflar GitHub'da)
-- =============================================================
create table if not exists public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  folder text not null unique,
  cover_path text,
  photo_count int not null default 0,
  photos jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.photo_albums enable row level security;

create policy "Public read photo_albums"
  on public.photo_albums for select
  to anon, authenticated
  using (true);

create policy "Authenticated insert photo_albums"
  on public.photo_albums for insert
  to authenticated
  with check (true);

create policy "Authenticated update photo_albums"
  on public.photo_albums for update
  to authenticated
  using (true);

create policy "Authenticated delete photo_albums"
  on public.photo_albums for delete
  to authenticated
  using (true);
