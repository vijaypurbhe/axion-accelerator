-- shared helpers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TYPE public.axion_role AS ENUM (
  'executive-sponsor','enterprise-architect','data360-architect',
  'data-steward','data-engineer','agentforce-architect'
);

-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  default_persona text NOT NULL DEFAULT 'enterprise-architect',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_techmahindra_user());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id AND public.is_techmahindra_user());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- axion roles
CREATE TABLE public.axion_user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.axion_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.axion_user_roles TO authenticated;
GRANT ALL ON public.axion_user_roles TO service_role;
ALTER TABLE public.axion_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "axion_roles_select" ON public.axion_user_roles FOR SELECT TO authenticated
  USING (public.is_techmahindra_user());

CREATE OR REPLACE FUNCTION public.has_axion_role(_user_id uuid, _role public.axion_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.axion_user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- provisioning: profile + demo personas for domain users
CREATE OR REPLACE FUNCTION public.ensure_axion_access(_display_name text, _persona text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.axion_role;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_techmahindra_user() THEN RETURN FALSE; END IF;

  INSERT INTO public.profiles (id, email, display_name, default_persona)
  VALUES (auth.uid(), public.current_user_email(), coalesce(_display_name, ''), coalesce(_persona, 'enterprise-architect'))
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, default_persona = EXCLUDED.default_persona;

  FOR r IN SELECT unnest(enum_range(NULL::public.axion_role)) LOOP
    INSERT INTO public.axion_user_roles (user_id, role) VALUES (auth.uid(), r)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  RETURN TRUE;
END; $$;

-- agents
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL,
  initiative_id text NOT NULL,
  reference text NOT NULL,
  pattern_id text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  version text NOT NULL DEFAULT '0.1',
  risk_rating text NOT NULL DEFAULT 'medium',
  release text NOT NULL DEFAULT '',
  origin text NOT NULL DEFAULT 'manual',
  overview jsonb NOT NULL DEFAULT '{}'::jsonb,
  instructions jsonb NOT NULL DEFAULT '{}'::jsonb,
  consumption jsonb NOT NULL DEFAULT '{}'::jsonb,
  tests jsonb NOT NULL DEFAULT '[]'::jsonb,
  backlog jsonb NOT NULL DEFAULT '[]'::jsonb,
  monitoring jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agents_initiative_idx ON public.agents (initiative_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_all" ON public.agents FOR ALL TO authenticated
  USING (public.is_techmahindra_user()) WITH CHECK (public.is_techmahindra_user());
CREATE TRIGGER agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- per-object design tables
CREATE TABLE public.agent_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  authorization_state text NOT NULL DEFAULT 'unauthorized',
  authorized_by text,
  authorized_at timestamptz,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_grounding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_boundaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- versions, reviews, decisions
CREATE TABLE public.agent_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  version text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  summary text NOT NULL DEFAULT '',
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text NOT NULL DEFAULT '',
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  stage text NOT NULL,
  reviewer text NOT NULL DEFAULT '',
  reviewer_role public.axion_role NOT NULL,
  outcome text NOT NULL DEFAULT 'pending',
  comments text NOT NULL DEFAULT '',
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agent_suggestion_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  decision text NOT NULL,
  rationale text NOT NULL DEFAULT '',
  confidence numeric,
  decided_by text NOT NULL DEFAULT '',
  decided_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  stage text NOT NULL,
  requested_by text NOT NULL DEFAULT '',
  required_roles text[] NOT NULL DEFAULT '{}',
  state text NOT NULL DEFAULT 'open',
  due_by timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  format text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  content_hash text NOT NULL DEFAULT '',
  byte_size integer NOT NULL DEFAULT 0,
  storage_path text,
  error text,
  requested_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- audit trail
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text NOT NULL DEFAULT '',
  initiative_id text,
  actor text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  action text NOT NULL,
  object_type text NOT NULL,
  object_id text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  old_value_summary text,
  new_value_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_created_idx ON public.activity_log (created_at DESC);
CREATE INDEX activity_log_object_idx ON public.activity_log (object_type, object_id);

-- grants + RLS for all agent-scoped tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'agent_topics','agent_actions','agent_grounding','agent_guardrails',
    'agent_escalations','agent_boundaries','agent_versions',
    'agent_suggestion_decisions','approval_requests','export_jobs'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_techmahindra_user()) WITH CHECK (public.is_techmahindra_user())',
      t || '_all', t);
    EXECUTE format('CREATE INDEX %I ON public.%I (agent_id)', t || '_agent_idx', t);
  END LOOP;
END; $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agent_topics','agent_actions','agent_grounding','agent_guardrails','agent_escalations','agent_boundaries','approval_requests','export_jobs'] LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t || '_updated_at', t);
  END LOOP;
END; $$;

-- reviews: only a user who actually holds the role may record the outcome
GRANT SELECT, INSERT ON public.agent_reviews TO authenticated;
GRANT ALL ON public.agent_reviews TO service_role;
ALTER TABLE public.agent_reviews ENABLE ROW LEVEL SECURITY;
CREATE INDEX agent_reviews_agent_idx ON public.agent_reviews (agent_id);
CREATE POLICY "agent_reviews_select" ON public.agent_reviews FOR SELECT TO authenticated
  USING (public.is_techmahindra_user());
CREATE POLICY "agent_reviews_insert_role_holder" ON public.agent_reviews FOR INSERT TO authenticated
  WITH CHECK (public.is_techmahindra_user() AND public.has_axion_role(auth.uid(), reviewer_role));

-- activity log: append-only
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT TO authenticated
  USING (public.is_techmahindra_user());
CREATE POLICY "activity_log_insert" ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (public.is_techmahindra_user());