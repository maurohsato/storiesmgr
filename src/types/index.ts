export interface Team {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: string;
}

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  collaborators: Collaborator[];
  createdAt: string;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientId: string;
  teamId: string;
  duration: string;
  technologies: string[];
  status: 'planning' | 'active' | 'completed' | 'paused';
  startDate: string;
  endDate?: string;
  internalNotes: string;
  createdAt: string;
}

export interface UserStoryData {
  id: string;
  projectId: string;
  date: string;
  author: string;
  userPersona: string;
  userRole: string;
  userConstraints: string;
  userDesire: string;
  userImportance: string;
  currentProblem: string;
  mainSteps: string;
  alternativeFlows: string;
  businessRules: string;
  validations: string;
  acceptanceCriteria: string;
  dependencies: string;
  technicalRisks: string;
  requiresSpike: string;
  additionalComments: string;
  status: 'draft' | 'ready' | 'in-progress' | 'in-review' | 'done';
  createdAt: string;
}