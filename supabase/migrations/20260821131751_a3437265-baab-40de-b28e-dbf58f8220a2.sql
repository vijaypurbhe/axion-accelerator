CREATE TABLE public.user_onboarding (
  user_id uuid NOT NULL PRIMARY KEY,
  chosen_role public.axion_role,
  wizard_step integer NOT NULL DEFAULT 0,
  wizard_complete boolean NOT NULL DEFAULT false,
  completed_steps text[] NOT NULL DEFAULT '{}',
  checklist_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own onboarding state"
  ON public.user_onboarding FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();