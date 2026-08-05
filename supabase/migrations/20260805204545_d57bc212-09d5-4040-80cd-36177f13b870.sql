ALTER TABLE public.agents
  ADD COLUMN test_status text NOT NULL DEFAULT 'not-started',
  ADD COLUMN lifecycle_stage text NOT NULL DEFAULT 'design',
  ADD COLUMN linked_risk_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN linked_decision_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN identity_policy_id text;