export type AdminWorkflowRole = 'author' | 'reviewer' | 'admin';

export function normalizeWorkflowRole(value: unknown): AdminWorkflowRole | null {
  return value === 'author' || value === 'reviewer' || value === 'admin'
    ? value
    : null;
}

export function canReview(role: AdminWorkflowRole | null) {
  return role === 'reviewer' || role === 'admin';
}

export function canPublish(role: AdminWorkflowRole | null) {
  return role === 'admin';
}
