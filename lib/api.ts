export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskCategory = 'Splunk' | 'Security' | 'Automation' | 'DevOps' | 'Meeting' | 'Support' | 'Other';
export type ReportPeriod = 'week' | 'month';

export interface ApiTask {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  projectId?: string;
  category?: TaskCategory;
  categoryId?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startedAt?: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiProject {
  _id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ApiCategory {
  _id: string;
  name: string;
  color?: string;
  description?: string;
}

export interface ApiLearningItem {
  _id: string;
  title: string;
  type: 'course' | 'book';
  description?: string;
  totalHours: number;
  completedHours: number;
  totalPages: number;
  completedPages: number;
  startDate?: string;
  status: 'not-started' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ApiLearningSession {
  _id: string;
  learningItemId: string;
  durationHours: number;
  pagesRead: number;
  note?: string;
  date: string;
  createdAt: string;
}

export interface ApiReview {
  _id: string;
  completedTasks?: string;
  learnedToday?: string;
  blockers?: string;
  tomorrowFocus?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiReport {
  period: ReportPeriod;
  range: { start: string; end: string };
  work: {
    completed: number;
    previousCompleted: number;
    changePercent: number;
    daily: { date: string; count: number }[];
    categories: { name: string; count: number }[];
    summary: string;
  };
  learning: {
    hours: number;
    previousHours: number;
    pages: number;
    previousPages: number;
    hoursChangePercent: number;
    pagesChangePercent: number;
    daily: { date: string; hours: number; pages: number }[];
    streak: number;
    summary: string;
  };
}

interface AuthResponse {
  token: string;
}

interface LearningSessionResponse {
  session: ApiLearningSession;
  item: ApiLearningItem;
  progress: number;
}

const API_URL = '/backend';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...init } = options;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      payload?.error || `Request failed with status ${response.status}`,
      response.status,
      payload?.details,
    );
  }

  return payload as T;
}

export const api = {
  register(username: string, password: string) {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  login(username: string, password: string) {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  listTasks(token: string) {
    return request<ApiTask[]>('/tasks', { token });
  },

  createTask(
    token: string,
    task: {
      title: string;
      description?: string;
      priority: TaskPriority;
      category: TaskCategory;
      projectId?: string;
      status?: TaskStatus;
      startedAt?: string;
    },
  ) {
    return request<ApiTask>('/tasks', {
      method: 'POST',
      token,
      body: JSON.stringify(task),
    });
  },

  updateTask(
    token: string,
    id: string,
    changes: Partial<Pick<ApiTask, 'status' | 'priority' | 'title' | 'description' | 'projectId' | 'category' | 'startedAt'>>,
  ) {
    return request<ApiTask>(`/tasks/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(changes),
    });
  },

  deleteTask(token: string, id: string) {
    return request<void>(`/tasks/${id}`, { method: 'DELETE', token });
  },

  listProjects(token: string) {
    return request<ApiProject[]>('/projects', { token });
  },

  createProject(token: string, project: { name: string; description?: string }) {
    return request<ApiProject>('/projects', {
      method: 'POST',
      token,
      body: JSON.stringify(project),
    });
  },

  listCategories(token: string) {
    return request<ApiCategory[]>('/categories', { token });
  },

  listLearning(token: string) {
    return request<ApiLearningItem[]>('/learning', { token });
  },

  createLearningItem(
    token: string,
    item: {
      title: string;
      type: 'course' | 'book';
      description?: string;
      totalHours?: number;
      totalPages?: number;
      startDate?: string;
    },
  ) {
    return request<ApiLearningItem>('/learning', {
      method: 'POST',
      token,
      body: JSON.stringify(item),
    });
  },

  listLearningSessions(token: string) {
    return request<ApiLearningSession[]>('/learning/sessions', { token });
  },

  logLearningSession(
    token: string,
    learningItemId: string,
    input: { durationHours?: number; pagesRead?: number; note?: string; date?: string },
  ) {
    return request<LearningSessionResponse>(`/learning/${learningItemId}/sessions`, {
      method: 'POST',
      token,
      body: JSON.stringify(input),
    });
  },

  listReviews(token: string) {
    return request<ApiReview[]>('/reviews', { token });
  },

  createReview(
    token: string,
    review: Pick<ApiReview, 'learnedToday' | 'blockers' | 'tomorrowFocus'>,
  ) {
    return request<ApiReview>('/reviews', {
      method: 'POST',
      token,
      body: JSON.stringify(review),
    });
  },

  getReport(token: string, period: ReportPeriod) {
    return request<ApiReport>(`/reports?period=${period}`, { token });
  },
};
