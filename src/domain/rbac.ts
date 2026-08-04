import { PERSONAS } from "./catalogs";
import type { Permission, Role, RoleId } from "./models";

/** Permission matrix. Demo mode allows switching roles to demonstrate each experience. */
const MATRIX: Record<RoleId, readonly Permission[]> = {
  "executive-sponsor": ["view", "approve", "reject", "export"],
  "enterprise-architect": ["view", "create", "edit", "approve", "reject", "export", "manage-templates"],
  "data360-architect": ["view", "create", "edit", "export", "deploy"],
  "data-steward": ["view", "create", "edit", "export", "manage-controls"],
  "data-engineer": ["view", "create", "edit", "export", "deploy"],
  "agentforce-architect": ["view", "create", "edit", "export", "deploy"],
};

export const ROLES: readonly Role[] = PERSONAS.map((persona) => ({
  id: persona.id,
  name: persona.name,
  summary: persona.summary,
  permissions: MATRIX[persona.id],
}));

export const ALL_PERMISSIONS: readonly Permission[] = [
  "view",
  "create",
  "edit",
  "approve",
  "reject",
  "export",
  "administer",
  "manage-templates",
  "manage-controls",
  "deploy",
] as const;

export const PERMISSION_LABELS: Record<Permission, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  approve: "Approve",
  reject: "Reject",
  export: "Export",
  administer: "Administer",
  "manage-templates": "Manage templates",
  "manage-controls": "Manage controls",
  deploy: "Deploy",
};

export const getRole = (id: RoleId): Role | undefined => ROLES.find((role) => role.id === id);

export const roleCan = (id: RoleId, permission: Permission): boolean =>
  Boolean(getRole(id)?.permissions.includes(permission));
