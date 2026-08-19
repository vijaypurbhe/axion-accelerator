-- 1. Client registry
CREATE TABLE IF NOT EXISTS public.clients (
  id text PRIMARY KEY,
  name text NOT NULL,
  industry text NOT NULL DEFAULT 'BFSI',
  geography text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  branding_accent text NOT NULL DEFAULT '#E23125',
  status text NOT NULL DEFAULT 'active',
  is_demo boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 2. Membership: which user may access which client, in which role
CREATE TABLE IF NOT EXISTS public.client_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.axion_role NOT NULL,
  is_client_admin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  invited_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_members TO authenticated;
GRANT ALL ON public.client_members TO service_role;
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS client_members_user_idx ON public.client_members (user_id, client_id);

-- 3. Membership-scoped access helpers
CREATE OR REPLACE FUNCTION public.has_client_access(_client_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE user_id = auth.uid()
      AND client_id = _client_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_client_role(_client_id text, _role public.axion_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE user_id = auth.uid()
      AND client_id = _client_id
      AND role = _role
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_client_admin(_client_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE user_id = auth.uid()
      AND client_id = _client_id
      AND status = 'active'
      AND is_client_admin
  );
$$;

CREATE OR REPLACE FUNCTION public.has_agent_access(_agent_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.id = _agent_id AND public.has_client_access(a.tenant_id)
  );
$$;

-- 4. Policies for the new tables
DROP POLICY IF EXISTS clients_select_member ON public.clients;
CREATE POLICY clients_select_member ON public.clients
  FOR SELECT TO authenticated USING (public.has_client_access(id));

DROP POLICY IF EXISTS clients_insert_domain ON public.clients;
CREATE POLICY clients_insert_domain ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.is_techmahindra_user());

DROP POLICY IF EXISTS clients_update_admin ON public.clients;
CREATE POLICY clients_update_admin ON public.clients
  FOR UPDATE TO authenticated USING (public.is_client_admin(id)) WITH CHECK (public.is_client_admin(id));

DROP POLICY IF EXISTS client_members_select ON public.client_members;
CREATE POLICY client_members_select ON public.client_members
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_client_access(client_id));

DROP POLICY IF EXISTS client_members_admin_write ON public.client_members;
CREATE POLICY client_members_admin_write ON public.client_members
  FOR INSERT TO authenticated WITH CHECK (public.is_client_admin(client_id));

DROP POLICY IF EXISTS client_members_admin_update ON public.client_members;
CREATE POLICY client_members_admin_update ON public.client_members
  FOR UPDATE TO authenticated USING (public.is_client_admin(client_id)) WITH CHECK (public.is_client_admin(client_id));

DROP POLICY IF EXISTS client_members_admin_delete ON public.client_members;
CREATE POLICY client_members_admin_delete ON public.client_members
  FOR DELETE TO authenticated USING (public.is_client_admin(client_id));

-- 5. Seed the demo clients so existing agent rows have an owning client
INSERT INTO public.clients (id, name, industry, geography, description, branding_accent, is_demo)
VALUES
  ('cli-northstar', 'NorthStar Commercial Bank', 'BFSI', 'North America',
   'Tier-1 commercial bank consolidating retail and commercial customer data into a governed Data 360 foundation.', '#E23125', true),
  ('cli-meridian', 'Meridian Assurance', 'BFSI', 'EMEA',
   'Insurance carrier unifying policy, claims and party data to accelerate claims decisioning.', '#40587A', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Replace the domain-wide access predicate with membership-scoped policies
DROP POLICY IF EXISTS agents_all ON public.agents;
CREATE POLICY agents_select ON public.agents
  FOR SELECT TO authenticated USING (public.has_client_access(tenant_id));
CREATE POLICY agents_insert ON public.agents
  FOR INSERT TO authenticated WITH CHECK (public.has_client_access(tenant_id));
CREATE POLICY agents_update ON public.agents
  FOR UPDATE TO authenticated USING (public.has_client_access(tenant_id)) WITH CHECK (public.has_client_access(tenant_id));
CREATE POLICY agents_delete ON public.agents
  FOR DELETE TO authenticated USING (public.has_client_access(tenant_id));

DROP POLICY IF EXISTS agent_topics_all ON public.agent_topics;
CREATE POLICY agent_topics_all ON public.agent_topics
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_actions_all ON public.agent_actions;
CREATE POLICY agent_actions_all ON public.agent_actions
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_grounding_all ON public.agent_grounding;
CREATE POLICY agent_grounding_all ON public.agent_grounding
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_guardrails_all ON public.agent_guardrails;
CREATE POLICY agent_guardrails_all ON public.agent_guardrails
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_escalations_all ON public.agent_escalations;
CREATE POLICY agent_escalations_all ON public.agent_escalations
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_boundaries_all ON public.agent_boundaries;
CREATE POLICY agent_boundaries_all ON public.agent_boundaries
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_versions_all ON public.agent_versions;
CREATE POLICY agent_versions_all ON public.agent_versions
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_suggestion_decisions_all ON public.agent_suggestion_decisions;
CREATE POLICY agent_suggestion_decisions_all ON public.agent_suggestion_decisions
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS approval_requests_all ON public.approval_requests;
CREATE POLICY approval_requests_all ON public.approval_requests
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS export_jobs_all ON public.export_jobs;
CREATE POLICY export_jobs_all ON public.export_jobs
  FOR ALL TO authenticated USING (public.has_agent_access(agent_id)) WITH CHECK (public.has_agent_access(agent_id));

-- Reviews: readable by client members, writable only by a holder of the reviewing role on that client
DROP POLICY IF EXISTS agent_reviews_select ON public.agent_reviews;
CREATE POLICY agent_reviews_select ON public.agent_reviews
  FOR SELECT TO authenticated USING (public.has_agent_access(agent_id));

DROP POLICY IF EXISTS agent_reviews_insert_role_holder ON public.agent_reviews;
CREATE POLICY agent_reviews_insert_role_holder ON public.agent_reviews
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agents a
      WHERE a.id = agent_id AND public.has_client_role(a.tenant_id, reviewer_role)
    )
  );

-- Audit trail: scoped to client membership
DROP POLICY IF EXISTS activity_log_select ON public.activity_log;
CREATE POLICY activity_log_select ON public.activity_log
  FOR SELECT TO authenticated USING (public.has_client_access(tenant_id));

DROP POLICY IF EXISTS activity_log_insert ON public.activity_log;
CREATE POLICY activity_log_insert ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (public.has_client_access(tenant_id));

-- Profiles: only visible to users who share a client workspace
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.client_members mine
      JOIN public.client_members theirs ON theirs.client_id = mine.client_id
      WHERE mine.user_id = auth.uid() AND mine.status = 'active'
        AND theirs.user_id = profiles.id AND theirs.status = 'active'
    )
  );

-- 7. Provisioning: profile + demo-workspace membership (demo clients only)
CREATE OR REPLACE FUNCTION public.ensure_axion_access(_display_name text, _persona text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.axion_role;
  c record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_techmahindra_user() THEN RETURN FALSE; END IF;

  INSERT INTO public.profiles (id, email, display_name, default_persona)
  VALUES (auth.uid(), public.current_user_email(), coalesce(_display_name, ''), coalesce(_persona, 'enterprise-architect'))
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, default_persona = EXCLUDED.default_persona;

  -- Demo workspaces stay self-service for @techmahindra.com users so walkthroughs keep working.
  -- Non-demo client workspaces require an explicit invitation by a client admin.
  FOR c IN SELECT id FROM public.clients WHERE is_demo LOOP
    FOR r IN SELECT unnest(enum_range(NULL::public.axion_role)) LOOP
      INSERT INTO public.client_members (client_id, user_id, role, is_client_admin, invited_by)
      VALUES (c.id, auth.uid(), r, true, 'self-service-demo')
      ON CONFLICT (client_id, user_id, role) DO NOTHING;
    END LOOP;
  END LOOP;

  RETURN TRUE;
END; $$;
