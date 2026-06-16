
export type Priority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

export type PermissionStatus = 'allowed' | 'denied';

export interface Permission {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: Record<string, PermissionStatus>;
}

export interface User {
  id: string;
  name: string;
  role: string; // Role ID
  avatar: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  date: string;
  type: 'pdf' | 'doc' | 'image' | 'other';
  url: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  date: string;
}

export interface TemplateTask {
  title: string;
  description: string;
  points: number;
  peso?: number;   // peso ponderado (0-100), suma debería totalizar 100 entre tareas
  tag?: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tasks: TemplateTask[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  startDate: string;
  endDate: string;
  isLocked?: boolean;
  assignees: string[]; // User IDs
  attachments: Attachment[];
  links: Link[];
  comments: Comment[];
  jiraId?: string;
  status: 'backlog' | 'in-progress' | 'review' | 'done';
}

export interface Column {
  id: string;
  title: string;
  color: string;
  taskIds: string[];
}
