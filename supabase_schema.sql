-- =========================================================================
-- ESQUEMA DO BANCO DE DADOS SUPABASE PARA DISTRIBUIDORA / OFFICE EMBALAGENS
-- Execute este script no SQL Editor do seu projeto Supabase (supabase.com)
-- =========================================================================

-- 1. TABELA DE CATEGORIAS
create table if not exists public.categories (
  id text primary key,
  name text not null,
  description text,
  image_url text,
  image_zoom integer default 0,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Migração segura caso a tabela já tenha sido criada anteriormente
alter table public.categories add column if not exists image_zoom integer default 0;

-- 2. TABELA DE PRODUTOS
create table if not exists public.products (
  id text primary key,
  name text not null,
  description text default '',
  price numeric not null default 0,
  cost_price numeric default 0,
  profit numeric default 0,
  sku text,
  code text,
  category text,
  increment numeric default 1,
  stock integer default 0,
  unit text default 'Unidade',
  available boolean default true,
  hide_description boolean default false,
  hide_price boolean default false,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. TABELA DE CONFIGURAÇÕES DA LOJA
create table if not exists public.settings (
  id text primary key,
  store_name text default '',
  subtitle text default '',
  logo_url text default '',
  logo_zoom integer default 0,
  whatsapp_number text default '',
  pix_key text default '',
  min_order_value numeric default 0,
  delivery_notice text default '',
  hide_catalog_description boolean default false,
  hide_catalog_price boolean default false,
  show_category_images boolean default false,
  admin_password text default 'admin',
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Migrações seguras caso as tabelas já tenham sido criadas anteriormente:
alter table public.settings add column if not exists show_category_images boolean default false;
alter table public.settings add column if not exists logo_zoom integer default 0;
alter table public.categories add column if not exists image_zoom integer default 0;

-- =========================================================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- Permite leitura, escrita e exclusão públicas para o catálogo e painel administrativo
-- =========================================================================

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;

-- Políticas para Categorias
drop policy if exists "Permitir leitura pública de categorias" on public.categories;
create policy "Permitir leitura pública de categorias" on public.categories for select using (true);

drop policy if exists "Permitir escrita pública de categorias" on public.categories;
create policy "Permitir escrita pública de categorias" on public.categories for all using (true) with check (true);

drop policy if exists "Permitir exclusão pública de categorias" on public.categories;
create policy "Permitir exclusão pública de categorias" on public.categories for delete using (true);

-- Políticas para Produtos
drop policy if exists "Permitir leitura pública de produtos" on public.products;
create policy "Permitir leitura pública de produtos" on public.products for select using (true);

drop policy if exists "Permitir escrita pública de produtos" on public.products;
create policy "Permitir escrita pública de produtos" on public.products for all using (true) with check (true);

drop policy if exists "Permitir exclusão pública de produtos" on public.products;
create policy "Permitir exclusão pública de produtos" on public.products for delete using (true);

-- Políticas para Configurações
drop policy if exists "Permitir leitura pública de configurações" on public.settings;
create policy "Permitir leitura pública de configurações" on public.settings for select using (true);

drop policy if exists "Permitir escrita pública de configurações" on public.settings;
create policy "Permitir escrita pública de configurações" on public.settings for all using (true) with check (true);

-- =========================================================================
-- ATIVAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME)
-- =========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'categories'
  ) then
    alter publication supabase_realtime add table public.categories;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'settings'
  ) then
    alter publication supabase_realtime add table public.settings;
  end if;
end $$;
