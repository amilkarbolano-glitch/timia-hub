// Timia Hub API client — all fetch calls in one place
// VITE_API_URL=http://localhost:4000 in .env.local

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...opts,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

// Tasks
export const api = {
  tasks: {
    list: (projectId?: string) =>
      req<any[]>(`/api/tasks${projectId ? `?projectId=${projectId}` : ''}`),
    create: (data: any) =>
      req<any>('/api/tasks', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      req<any>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) =>
      req<any>(`/api/tasks/${id}`, { method: 'DELETE' }),
    addComment: (id: string, text: string, userId: string) =>
      req<any>(`/api/tasks/${id}/comments`, { method: 'POST', body: JSON.stringify({ text, userId }) }),
  },
  users: {
    list: () => req<any[]>('/api/users'),
    create: (data: any) => req<any>('/api/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      req<any>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  projects: {
    list: () => req<any[]>('/api/projects'),
    get: (id: string) => req<any>(`/api/projects/${id}`),
    create: (data: any) => req<any>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  },
  audit: {
    list: (limit?: number) => req<any[]>(`/api/audit${limit ? `?limit=${limit}` : ''}`),
  },
  ans: {
    status: (projectId?: string) =>
      req<any[]>(`/api/ans/status${projectId ? `?projectId=${projectId}` : ''}`),
  },
};
