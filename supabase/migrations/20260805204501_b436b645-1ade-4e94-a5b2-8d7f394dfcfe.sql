-- role check no longer needs elevated privileges: axion_user_roles is readable by signed-in domain users
CREATE OR REPLACE FUNCTION public.has_axion_role(_user_id uuid, _role public.axion_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.axion_user_roles WHERE user_id = _user_id AND role = _role);
$$;

REVOKE ALL ON FUNCTION public.has_axion_role(uuid, public.axion_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_axion_role(uuid, public.axion_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_axion_access(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_axion_access(text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.ensure_login_report_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_login_report_admin() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon;