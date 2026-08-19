-- Workspace record store: one row per workspace object, typed by `kind`.
CREATE TABLE IF NOT EXISTS public.workspace_records (
  id text PRIMARY KEY,
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  initiative_id text,
  kind text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_seed boolean NOT NULL DEFAULT false,
  created_by text NOT NULL DEFAULT '',
  updated_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_records TO authenticated;
GRANT ALL ON public.workspace_records TO service_role;
ALTER TABLE public.workspace_records ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS workspace_records_client_kind_idx ON public.workspace_records (client_id, kind);
CREATE INDEX IF NOT EXISTS workspace_records_initiative_kind_idx ON public.workspace_records (initiative_id, kind);

DROP POLICY IF EXISTS workspace_records_select ON public.workspace_records;
CREATE POLICY workspace_records_select ON public.workspace_records
  FOR SELECT TO authenticated USING (public.has_client_access(client_id));

DROP POLICY IF EXISTS workspace_records_insert ON public.workspace_records;
CREATE POLICY workspace_records_insert ON public.workspace_records
  FOR INSERT TO authenticated WITH CHECK (public.has_client_access(client_id));

DROP POLICY IF EXISTS workspace_records_update ON public.workspace_records;
CREATE POLICY workspace_records_update ON public.workspace_records
  FOR UPDATE TO authenticated USING (public.has_client_access(client_id)) WITH CHECK (public.has_client_access(client_id));

DROP POLICY IF EXISTS workspace_records_delete ON public.workspace_records;
CREATE POLICY workspace_records_delete ON public.workspace_records
  FOR DELETE TO authenticated USING (public.has_client_access(client_id));

DROP TRIGGER IF EXISTS workspace_records_updated_at ON public.workspace_records;
CREATE TRIGGER workspace_records_updated_at
  BEFORE UPDATE ON public.workspace_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
