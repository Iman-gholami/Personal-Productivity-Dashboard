export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ApiTask {
  _id: string;
  userId: string;
  title: string;
  description?: string;
  projectId?: string;
  categoryId?: string;
  status: TaskStatus;
  priority: TaskPriority;
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
  type: 'course' | 'book' | 'skill';
  description?: string;
  totalHours: number;
  completedHours: number;
  startDate?: string;
  status: 'not-started' | 'in-progress' | 'completed';
  createdAt: string;
  updatedAt: string;
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

interface AuthResponse {
  token: string;
}

interface LearningSessionResponse {
  item: ApiLearningItem;
  progress: number;
  remainingHours: number;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

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
      projectId?: string;
      categoryId?: string;
    },
  ) {
    return request<ApiTask>('/tasks', {
      method: 'POST',
      token,
      body: JSON.stringify(task),
    });
  },

  updateTask(token: string, id: string, changes: Partial<Pick<ApiTask, 'status' | 'priority' | 'title' | 'description' | 'projectId' | 'categoryId'>>) {
    return request<ApiTask>(`/tasks/${id}`, {
      method: 'PATCH',
      token,
      body: JSON.stringify(changes),
    });
  },

  listProjects(token: string) {
    return request<ApiProject[]>('/projects', { token });
  },

  listCategories(token: string) {
    return request<ApiCategory[]>('/categories', { token });
  },

  listLearning(token: string) {
    return request<ApiLearningItem[]>('/learning', { token });
  },

  logLearningSession(token: string, learningItemId: string, duration: number) {
    return request<LearningSessionResponse>(`/learning/${learningItemId}/sessions`, {
      method: 'POST',
      token,
      body: JSON.stringify({ duration }),
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
};
