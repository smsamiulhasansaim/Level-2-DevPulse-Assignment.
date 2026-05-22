// ─── User

export type UserRole = 'contributor' | 'maintainer';

export interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface UserPublic {
  id: number;
  name: string;
  role: UserRole;
}

export interface JwtPayload {
  id: number;
  name: string;
  role: UserRole;
}

// ─── Issue

export type IssueType = 'bug' | 'feature_request';
export type IssueStatus = 'open' | 'in_progress' | 'resolved';

export interface Issue {
  id: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  reporter_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface IssueEnriched extends Omit<Issue, 'reporter_id'> {
  reporter: UserPublic | null;
}

// ─── Request Bodies ─

export interface SignupBody {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface CreateIssueBody {
  title: string;
  description: string;
  type: IssueType;
}

export interface UpdateIssueBody {
  title?: string;
  description?: string;
  type?: IssueType;
  status?: IssueStatus;
}

// ─── Metrics 

export interface IssueMetrics {
  total_issues: number;
  open: number;
  in_progress: number;
  resolved: number;
  bugs: number;
  feature_requests: number;
}

// ─── PostgreSQL error

export interface PgError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}