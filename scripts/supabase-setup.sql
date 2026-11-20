-- ============================================================
-- Doce Encanto — banco online (Supabase)
-- Como aplicar: Supabase > SQL Editor > New query > colar > Run
-- Pode executar mais de uma vez sem apagar dados existentes.
-- ============================================================

create table if not exists public.de_private (
  id int primary key default 1 check (id = 1),
  admin_pin text not null default '1234',
  updated_at timestamptz not null default now()
);
insert into public.de_private (id, admin_pin) values (1, '1234')
  on conflict (id) do nothing;

create table if not exists public.de_settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.de_categories (
  id text primary key,
  name text not null,
  icon text not null default 'cake',
  sort int not null default 0
);

create table if not exists public.de_products (
  id text primary key,
  sort int not null default 0,
  data jsonb not null
);

create table if not exists public.de_coupons (
  id text primary key,
  sort int not null default 0,
  data jsonb not null
);

create sequence if not exists public.de_order_seq start with 1043;

create table if not exists public.de_orders (
  id text primary key,
  code int not null default nextval('public.de_order_seq'::regclass),
  status text not null default 'novo',
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.de_reviews (
  id text primary key,
  order_id text,
  approved boolean not null default true,
  created_at timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb
);

alter table public.de_private enable row level security;
alter table public.de_settings enable row level security;
alter table public.de_categories enable row level security;
alter table public.de_products enable row level security;
alter table public.de_coupons enable row level security;
alter table public.de_orders enable row level security;
alter table public.de_reviews enable row level security;

revoke all on public.de_private, public.de_settings, public.de_categories,
  public.de_products, public.de_coupons, public.de_orders, public.de_reviews
  from anon, authenticated, public;

-- ---------- funções internas ----------
create or replace function public.de_check_pin(p_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from de_private where id = 1 and admin_pin = p_pin)
$$;

-- Catálogo público (sem dados privados)
create or replace function public.de_public_catalog()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'settings', coalesce((select data from de_settings where id = 1), '{}'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'icon', icon) order by sort)
      from de_categories
    ), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(data order by sort) from de_products), '[]'::jsonb),
    'coupons', coalesce((
      select jsonb_agg(data order by sort) from de_coupons
      where coalesce((data->>'active')::boolean, false)
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(r.data order by r.created_at desc)
      from (select data, created_at from de_reviews where approved order by created_at desc limit 60) r
    ), '[]'::jsonb)
  )
$$;

-- Login do administrador (verifica o PIN no servidor)
create or replace function public.de_admin_check(p_pin text)
returns boolean language sql stable security definer set search_path = public as $$
  select de_check_pin(p_pin)
$$;

-- Pedidos e avaliações completos para o painel
create or replace function public.de_admin_data(p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not de_check_pin(p_pin) then raise exception 'pin_invalido'; end if;
  return jsonb_build_object(
    'orders', coalesce((
      select jsonb_agg(o.data || jsonb_build_object(
        'id', o.id, 'code', o.code, 'status', o.status, 'createdAt', o.created_at
      ) order by o.created_at desc)
      from de_orders o
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(r.data || jsonb_build_object('id', r.id, 'approved', r.approved) order by r.created_at desc)
      from de_reviews r
    ), '[]'::jsonb)
  );
end $$;

-- Criação de pedido pelo cliente
create or replace function public.de_create_order(payload jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id text;
  v_code int;
  v_now timestamptz := now();
  v_items jsonb := coalesce(payload->'items', '[]'::jsonb);
  v_status text;
  v_created timestamptz;
begin
  if jsonb_typeof(payload) <> 'object' then raise exception 'pedido_invalido'; end if;
  if jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 60 then raise exception 'itens_invalidos'; end if;
  if coalesce(length(payload->'customer'->>'name'), 0) < 2 then raise exception 'cliente_invalido'; end if;
  if coalesce((payload->>'total')::numeric, 0) <= 0 then raise exception 'total_invalido'; end if;

  v_id := coalesce(nullif(payload->>'id', ''), 'o-' || encode(gen_random_bytes(8), 'hex'));
  v_code := nextval('public.de_order_seq');

  insert into de_orders (id, code, status, created_at, data)
  values (
    v_id, v_code, 'novo', v_now,
    (payload - 'status' - 'code')
      || jsonb_build_object(
        'statusHistory', jsonb_build_array(jsonb_build_object('status', 'novo', 'at', v_now)),
        'rated', false
      )
  )
  on conflict (id) do nothing;

  if not found then
    select code, status, created_at into v_code, v_status, v_created
    from de_orders where id = v_id;
    return jsonb_build_object('id', v_id, 'code', v_code, 'status', v_status, 'createdAt', v_created);
  end if;

  return jsonb_build_object('id', v_id, 'code', v_code, 'status', 'novo', 'createdAt', v_now);
end $$;

-- Acompanhamento do pedido pelo cliente
create or replace function public.de_order_track(p_id text)
returns jsonb language sql stable security definer set search_path = public as $$
  select o.data || jsonb_build_object('id', o.id, 'code', o.code, 'status', o.status, 'createdAt', o.created_at)
  from de_orders o where o.id = p_id
$$;

-- Registra uso do cupom
create or replace function public.de_coupon_used(p_code text)
returns void language sql security definer set search_path = public as $$
  update de_coupons
  set data = jsonb_set(data, '{uses}', to_jsonb(coalesce((data->>'uses')::int, 0) + 1))
  where upper(data->>'code') = upper(p_code);
$$;

-- Avaliação enviada pelo cliente
create or replace function public.de_rate_order(p_order_id text, p_review jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_data jsonb;
begin
  select data into v_data from de_orders where id = p_order_id for update;
  if v_data is null then raise exception 'pedido_nao_encontrado'; end if;
  if coalesce((v_data->>'rated')::boolean, false) then raise exception 'ja_avaliado'; end if;

  insert into de_reviews (id, order_id, approved, created_at, data)
  values (
    coalesce(nullif(p_review->>'id', ''), 'r-' || encode(gen_random_bytes(6), 'hex')),
    p_order_id, true, now(), p_review
  );

  update de_orders set data = data || '{"rated": true}'::jsonb where id = p_order_id;
end $$;

-- Salva cardápio, cupons e configurações (somente administrador)
create or replace function public.de_admin_save_catalog(
  p_pin text, p_categories jsonb, p_products jsonb, p_coupons jsonb, p_settings jsonb
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not de_check_pin(p_pin) then raise exception 'pin_invalido'; end if;
  if jsonb_typeof(p_categories) <> 'array' or jsonb_typeof(p_products) <> 'array'
     or jsonb_typeof(p_coupons) <> 'array' then
    raise exception 'dados_invalidos';
  end if;
  if jsonb_array_length(p_products) > 500 then raise exception 'muitos_produtos'; end if;

  delete from de_categories;
  insert into de_categories (id, name, icon, sort)
  select coalesce(e->>'id', ''), coalesce(e->>'name', ''), coalesce(nullif(e->>'icon', ''), 'cake'), (ord - 1)::int
  from jsonb_array_elements(p_categories) with ordinality as t(e, ord)
  where coalesce(e->>'id', '') <> '';

  delete from de_products;
  insert into de_products (id, sort, data)
  select e->>'id', (ord - 1)::int, e
  from jsonb_array_elements(p_products) with ordinality as t(e, ord)
  where coalesce(e->>'id', '') <> '';

  delete from de_coupons;
  insert into de_coupons (id, sort, data)
  select e->>'id', (ord - 1)::int, e
  from jsonb_array_elements(p_coupons) with ordinality as t(e, ord)
  where coalesce(e->>'id', '') <> '';

  insert into de_settings (id, data, updated_at)
  values (1, coalesce(p_settings, '{}'::jsonb) - 'adminPin', now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end $$;

-- Mudança de status de um pedido
create or replace function public.de_admin_set_status(p_pin text, p_id text, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not de_check_pin(p_pin) then raise exception 'pin_invalido'; end if;
  if p_status not in ('novo', 'preparo', 'pronto', 'entrega', 'concluido', 'cancelado') then
    raise exception 'status_invalido';
  end if;
  update de_orders
  set status = p_status,
      data = data || jsonb_build_object(
        'statusHistory',
        coalesce(data->'statusHistory', '[]'::jsonb)
          || jsonb_build_array(jsonb_build_object('status', p_status, 'at', now()))
      )
  where id = p_id;
end $$;

-- Exclusão de avaliação
create or replace function public.de_admin_delete_review(p_pin text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not de_check_pin(p_pin) then raise exception 'pin_invalido'; end if;
  delete from de_reviews where id = p_id;
end $$;

-- Exclusão de pedido (manutenção)
create or replace function public.de_admin_delete_order(p_pin text, p_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not de_check_pin(p_pin) then raise exception 'pin_invalido'; end if;
  delete from de_orders where id = p_id;
end $$;

-- Troca do PIN do administrador
create or replace function public.de_admin_change_pin(p_pin text, p_new text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not de_check_pin(p_pin) then raise exception 'pin_invalido'; end if;
  if p_new !~ '^\d{4,8}$' then raise exception 'pin_formato'; end if;
  update de_private set admin_pin = p_new, updated_at = now() where id = 1;
end $$;

-- ---------- permissões ----------
revoke all on function public.de_check_pin(text) from public, anon, authenticated;

revoke all on function public.de_public_catalog() from public;
grant execute on function public.de_public_catalog() to anon;

revoke all on function public.de_admin_check(text) from public;
grant execute on function public.de_admin_check(text) to anon;

revoke all on function public.de_admin_data(text) from public;
grant execute on function public.de_admin_data(text) to anon;

revoke all on function public.de_create_order(jsonb) from public;
grant execute on function public.de_create_order(jsonb) to anon;

revoke all on function public.de_order_track(text) from public;
grant execute on function public.de_order_track(text) to anon;

revoke all on function public.de_coupon_used(text) from public;
grant execute on function public.de_coupon_used(text) to anon;

revoke all on function public.de_rate_order(text, jsonb) from public;
grant execute on function public.de_rate_order(text, jsonb) to anon;

revoke all on function public.de_admin_save_catalog(text, jsonb, jsonb, jsonb, jsonb) from public;
grant execute on function public.de_admin_save_catalog(text, jsonb, jsonb, jsonb, jsonb) to anon;

revoke all on function public.de_admin_set_status(text, text, text) from public;
grant execute on function public.de_admin_set_status(text, text, text) to anon;

revoke all on function public.de_admin_delete_review(text, text) from public;
grant execute on function public.de_admin_delete_review(text, text) to anon;

revoke all on function public.de_admin_delete_order(text, text) from public;
grant execute on function public.de_admin_delete_order(text, text) to anon;

revoke all on function public.de_admin_change_pin(text, text) from public;
grant execute on function public.de_admin_change_pin(text, text) to anon;
