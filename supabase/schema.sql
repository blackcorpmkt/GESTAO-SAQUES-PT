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

-- Sócios por usuário (percentuais usados na Divisão de Lucro)
CREATE TABLE IF NOT EXISTS public.partners (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         text        NOT NULL,
  percentage   numeric     NOT NULL DEFAULT 0,
  active       boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Custos por lançamento (BRL/USD/EUR, convertidos para EUR em amount_eur)
CREATE TABLE IF NOT EXISTS public.launch_costs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  launch_id     uuid        NOT NULL REFERENCES public.launches(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description   text        NOT NULL,
  amount        numeric     NOT NULL,
  currency      text        NOT NULL DEFAULT 'BRL' CHECK (currency IN ('BRL', 'USD', 'EUR')),
  exchange_rate numeric     NOT NULL DEFAULT 1,
  amount_eur    numeric     NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);


-- ─────────────────────────────────────────
-- 2. ATIVAR ROW LEVEL SECURITY
-- ─────────────────────────────────────────

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launch_costs ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────
-- 3. FUNÇÃO: get_email_by_username()
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
-- 4b. FUNÇÃO: get_active_partners()
-- Retorna nome + percentual dos usuários ATIVOS para a Calculadora de Lucro.
-- SECURITY DEFINER permite que qualquer usuário autenticado veja a distribuição
-- de sociedade sem expor as demais colunas da tabela users (contorna a RLS
-- que restringe usuários comuns a lerem apenas o próprio perfil).
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_active_partners()
RETURNS TABLE (display_name text, username text, percentage numeric, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT display_name, username, percentage, role
  FROM public.users
  WHERE active = true
  ORDER BY percentage DESC, display_name;
$$;

-- Apenas usuários autenticados podem listar os sócios
GRANT EXECUTE ON FUNCTION public.get_active_partners() TO authenticated;


-- ─────────────────────────────────────────
-- 4c. FUNÇÃO: get_admin_profit_by_partner()
-- Lucro consolidado por sócio (NOME) em TODAS as contas, para o painel /admin/lucros.
-- SECURITY DEFINER contorna a RLS (que restringe cada usuário aos próprios dados).
-- Cálculo por lançamento:  lucro = net_value_eur − Σ(launch_costs.amount_eur)
-- Distribuição:            lucro_socio = lucro × (partners.percentage / 100), só ATIVOS
-- BRL:                     lucro_socio_eur × exchange_rate do próprio lançamento
-- Agregação:               soma por partners.name (mesmo nome em contas distintas soma)
-- Guarda: só retorna linhas se o chamador (auth.uid()) for admin; senão vem vazio.
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_admin_profit_by_partner()
RETURNS TABLE (
  partner_name      text,
  total_profit_eur  numeric,
  total_profit_brl  numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH launch_profit AS (
    SELECT
      l.id,
      l.user_id,
      l.exchange_rate,
      l.net_value_eur - COALESCE((
        SELECT SUM(c.amount_eur)
        FROM public.launch_costs c
        WHERE c.launch_id = l.id
      ), 0) AS profit_eur
    FROM public.launches l
  ),
  distributed AS (
    SELECT
      p.name AS partner_name,
      lp.profit_eur * (p.percentage / 100.0)                    AS profit_eur,
      lp.profit_eur * (p.percentage / 100.0) * lp.exchange_rate AS profit_brl
    FROM launch_profit lp
    JOIN public.partners p
      ON p.user_id = lp.user_id
     AND p.active = true
  )
  SELECT
    d.partner_name,
    SUM(d.profit_eur)::numeric AS total_profit_eur,
    SUM(d.profit_brl)::numeric AS total_profit_brl
  FROM distributed d
  WHERE EXISTS (
    SELECT 1 FROM public.users au
    WHERE au.id = auth.uid() AND au.role = 'admin'
  )
  GROUP BY d.partner_name
  ORDER BY total_profit_eur DESC;
$$;

-- Apenas autenticados (a guarda interna restringe o resultado a admins)
GRANT EXECUTE ON FUNCTION public.get_admin_profit_by_partner() TO authenticated;


-- ─────────────────────────────────────────
-- 4d. FUNÇÃO: get_partner_profit_detail(partner_name)
-- Detalha o lucro de UM sócio (por nome, ILIKE) conta a conta — usada na busca
-- da página /admin/lucros. Mesma lógica de lucro do get_admin_profit_by_partner,
-- mas agrupando por conta (user_id) em vez de só pelo nome. LEFT JOIN garante
-- listar contas onde o sócio participa mesmo sem lançamentos (lucro 0).
-- ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_partner_profit_detail(partner_name text)
RETURNS TABLE (
  account_name      text,
  account_username  text,
  percentage        numeric,
  profit_eur        numeric,
  profit_brl        numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH launch_profit AS (
    SELECT
      l.user_id,
      l.exchange_rate,
      l.net_value_eur - COALESCE((
        SELECT SUM(c.amount_eur)
        FROM public.launch_costs c
        WHERE c.launch_id = l.id
      ), 0) AS profit_eur
    FROM public.launches l
  )
  SELECT
    u.display_name AS account_name,
    u.username     AS account_username,
    p.percentage,
    COALESCE(SUM(lp.profit_eur * (p.percentage / 100.0)), 0)::numeric                    AS profit_eur,
    COALESCE(SUM(lp.profit_eur * (p.percentage / 100.0) * lp.exchange_rate), 0)::numeric AS profit_brl
  FROM public.partners p
  JOIN public.users u ON u.id = p.user_id
  LEFT JOIN launch_profit lp ON lp.user_id = p.user_id
  WHERE p.active = true
    AND p.name ILIKE get_partner_profit_detail.partner_name
    AND EXISTS (
      SELECT 1 FROM public.users au
      WHERE au.id = auth.uid() AND au.role = 'admin'
    )
  GROUP BY u.display_name, u.username, p.percentage, p.user_id
  ORDER BY profit_eur DESC;
$$;

-- Apenas autenticados (a guarda interna restringe o resultado a admins)
GRANT EXECUTE ON FUNCTION public.get_partner_profit_detail(text) TO authenticated;


-- ─────────────────────────────────────────
-- 5. POLÍTICAS RLS
-- ─────────────────────────────────────────
--
-- ⚠️  ATENÇÃO: as políticas RLS (CREATE POLICY) NÃO ficam neste arquivo.
-- Elas estão configuradas e mantidas MANUALMENTE no Supabase Dashboard
-- (Authentication > Policies). Não recrie, altere ou versione políticas
-- aqui nem em migrations — qualquer alteração quebra o sistema em produção.


-- ─────────────────────────────────────────
-- 6. SEED — Criação do Admin Padrão
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
