-- Migration inicial: schema base do Cola Cidadã
-- Dados públicos oficiais + dados do usuário (cola eleitoral e alertas).
-- REGRA: toda tabela tem RLS habilitado imediatamente após o CREATE TABLE.

-- ---------------------------------------------------------------------------
-- politicos
-- ---------------------------------------------------------------------------
CREATE TABLE public.politicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cargo text NOT NULL,
  partido text,
  estado text,
  id_api_externa text NOT NULL,
  foto_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT politicos_id_api_externa_key UNIQUE (id_api_externa)
);

ALTER TABLE public.politicos ENABLE ROW LEVEL SECURITY;

-- Leitura pública: políticos são dados oficiais abertos.
CREATE POLICY "politicos_select_anon"
  ON public.politicos
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "politicos_select_authenticated"
  ON public.politicos
  FOR SELECT
  TO authenticated
  USING (true);

-- Sem policies de INSERT/UPDATE/DELETE para anon/authenticated:
-- escrita apenas via service_role (bypassa RLS).

CREATE INDEX politicos_id_api_externa_idx ON public.politicos (id_api_externa);

-- ---------------------------------------------------------------------------
-- votacoes
-- ---------------------------------------------------------------------------
CREATE TABLE public.votacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_api_externa text NOT NULL,
  descricao text,
  data_votacao timestamptz,
  resultado text,
  proposicao_id text,
  CONSTRAINT votacoes_id_api_externa_key UNIQUE (id_api_externa)
);

ALTER TABLE public.votacoes ENABLE ROW LEVEL SECURITY;

-- Leitura pública: votações são dados oficiais abertos.
CREATE POLICY "votacoes_select_anon"
  ON public.votacoes
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "votacoes_select_authenticated"
  ON public.votacoes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX votacoes_id_api_externa_idx ON public.votacoes (id_api_externa);
CREATE INDEX votacoes_proposicao_id_idx ON public.votacoes (proposicao_id);

-- ---------------------------------------------------------------------------
-- votos
-- ---------------------------------------------------------------------------
CREATE TABLE public.votos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id uuid NOT NULL REFERENCES public.politicos (id) ON DELETE CASCADE,
  votacao_id uuid NOT NULL REFERENCES public.votacoes (id) ON DELETE CASCADE,
  voto text NOT NULL,
  CONSTRAINT votos_politico_votacao_key UNIQUE (politico_id, votacao_id)
);

ALTER TABLE public.votos ENABLE ROW LEVEL SECURITY;

-- Leitura pública: votos nominais são dados oficiais abertos.
CREATE POLICY "votos_select_anon"
  ON public.votos
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "votos_select_authenticated"
  ON public.votos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX votos_politico_id_idx ON public.votos (politico_id);
CREATE INDEX votos_votacao_id_idx ON public.votos (votacao_id);

-- ---------------------------------------------------------------------------
-- despesas
-- ---------------------------------------------------------------------------
CREATE TABLE public.despesas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  politico_id uuid NOT NULL REFERENCES public.politicos (id) ON DELETE CASCADE,
  tipo text,
  valor numeric(14, 2) NOT NULL,
  data date,
  fornecedor text
);

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

-- Leitura pública: despesas parlamentares são dados oficiais abertos.
CREATE POLICY "despesas_select_anon"
  ON public.despesas
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "despesas_select_authenticated"
  ON public.despesas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX despesas_politico_id_idx ON public.despesas (politico_id);
CREATE INDEX despesas_data_idx ON public.despesas (data);

-- ---------------------------------------------------------------------------
-- cola_items (cola eleitoral do usuário)
-- ---------------------------------------------------------------------------
CREATE TABLE public.cola_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  politico_id uuid NOT NULL REFERENCES public.politicos (id) ON DELETE CASCADE,
  cargo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cola_items_user_politico_cargo_key UNIQUE (user_id, politico_id, cargo)
);

ALTER TABLE public.cola_items ENABLE ROW LEVEL SECURITY;

-- O usuário só acessa a própria cola eleitoral.
CREATE POLICY "cola_items_select_own"
  ON public.cola_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "cola_items_insert_own"
  ON public.cola_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cola_items_update_own"
  ON public.cola_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cola_items_delete_own"
  ON public.cola_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX cola_items_user_id_idx ON public.cola_items (user_id);
CREATE INDEX cola_items_politico_id_idx ON public.cola_items (politico_id);

-- ---------------------------------------------------------------------------
-- alertas
-- ---------------------------------------------------------------------------
CREATE TABLE public.alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  politico_id uuid NOT NULL REFERENCES public.politicos (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  configuracao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;

-- O usuário só gerencia os próprios alertas.
CREATE POLICY "alertas_select_own"
  ON public.alertas
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "alertas_insert_own"
  ON public.alertas
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alertas_update_own"
  ON public.alertas
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alertas_delete_own"
  ON public.alertas
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX alertas_user_id_idx ON public.alertas (user_id);
CREATE INDEX alertas_politico_id_idx ON public.alertas (politico_id);
CREATE INDEX alertas_ativo_idx ON public.alertas (ativo);
