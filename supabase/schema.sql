-- =============================================================
-- GESTÃO DE SAQUES — Schema Supabase
-- Execute no SQL Editor do Supabase Dashboard (em ordem)
-- =============================================================


-- ─────────────────────────────────────────
-- 1. TABELAS
-- ─────────────────────────────────────────

-- Perfis de usuário (complementa auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         text        UNIQUE NOT NULL,
  email            text        UNIQUE NOT NULL,
  display_name     text        NOT NULL DEFAULT '',
  role             text        NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  percentage       numeric     NOT NULL DEFAULT 0,
  active           boolean     NOT NULL DEFAULT true,
  password_changed boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Lançamentos de saques
CREATE TABLE IF NOT EXISTS public.launches (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  launch_date        date        NOT NULL,
  sales_count        integer     NOT NULL,
  gross_value_eur    numeric     NOT NULL,
  net_value_eur      numeric     NOT NULL,
  gateway_percentage numeric     NOT NULL DEFAULT 28,
  gateway_fixed_fee  numeric     NOT NULL DEFAULT 2,
  net_value_brl      numeric     NOT NULL,
  exchange_rate      numeric     NOT NULL,
  payment_date       date        NOT NULL,
  status             text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Configurações por usuário
CREATE TABLE IF NOT EXISTS public.settings (
  user_id            uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_percentage numeric     NOT NULL DEFAULT 28,
  gateway_fixed_fee  numeric     NOT NULL DEFAULT 2,
  report_name        text        NOT NULL DEFAULT 'OP | PORTUGAL',
  exchange_rate      numeric,    -- nullable: null = sem cotação definida
  updated_at         timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────
-- 2. ATIVAR ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE public.users    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────
-- 3. FUNÇÃO AUXILIAR: is_admin()
-- SECURITY DEFINER evita recursão infinita nas políticas da tabela users
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- ─────────────────────────────────────────
-- 4. FUNÇÃO: get_email_by_username()
-- Permite buscar o e-mail pelo username SEM estar autenticado (fluxo de login)
-- Chamada como anon via supabase.rpc() na tela de login
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT email FROM public.users
  WHERE lower(username) = lower(p_username) AND active = true
  LIMIT 1;
$$;

-- Permite que usuários não autenticados chamem esta função
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;


-- ─────────────────────────────────────────
-- 5. POLÍTICAS RLS — users
-- ─────────────────────────────────────────

-- Cada usuário lê e edita apenas o próprio perfil
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Admin pode ler todos os perfis
CREATE POLICY "users_select_admin" ON public.users
  FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────
-- 6. POLÍTICAS RLS — launches
-- ─────────────────────────────────────────

CREATE POLICY "launches_select_own" ON public.launches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "launches_insert_own" ON public.launches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "launches_update_own" ON public.launches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "launches_delete_own" ON public.launches
  FOR DELETE USING (auth.uid() = user_id);

-- Admin pode ler todos os lançamentos
CREATE POLICY "launches_select_admin" ON public.launches
  FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────
-- 7. POLÍTICAS RLS — settings
-- ─────────────────────────────────────────

CREATE POLICY "settings_all_own" ON public.settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admin pode ler todas as configurações
CREATE POLICY "settings_select_admin" ON public.settings
  FOR SELECT USING (public.is_admin());


-- ─────────────────────────────────────────
-- 8. SEED — Criação do Admin Padrão
-- ─────────────────────────────────────────
--
-- PASSO 1: Acesse o Supabase Dashboard
--   Authentication > Users > "Add user" (ou "Invite user")
--   E-mail: admin@gestao.com
--   Senha:  admin123
--   Marque "Auto Confirm User"
--
-- PASSO 2: Copie o UUID gerado na lista de usuários e rode o INSERT abaixo
--   substituindo 'COLE-AQUI-O-UUID' pelo UUID real:

/*
INSERT INTO public.users (id, username, email, display_name, role, percentage, password_changed)
VALUES (
  'COLE-AQUI-O-UUID',   -- UUID do auth.users gerado no passo 1
  'admin',
  'admin@gestao.com',
  'Admin',
  'admin',
  100,
  false
);
*/

-- ─────────────────────────────────────────
-- Credenciais de acesso padrão:
--   Username: admin
--   Senha:    admin123
-- ─────────────────────────────────────────
