import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.tsx';
import Layout from './components/Layout';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import AuthGuard from './components/auth/AuthGuard';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import TeamForm from './pages/TeamForm';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import Projects from './pages/Projects';
import ProjectForm from './pages/ProjectForm';
import ProjectDetail from './pages/ProjectDetail';
import Stories from './pages/Stories';
import UserStoryForm from './components/UserStoryForm';
import UserManagement from './pages/UserManagement';

const AuthenticatedApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <LoginForm onToggleMode={() => setAuthMode('register')} />
    ) : (
      <RegisterForm onToggleMode={() => setAuthMode('login')} />
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        
        {/* User Management - Admin only */}
        <Route 
          path="/users" 
          element={
            <AuthGuard requiredRoles="admin">
              <UserManagement />
            </AuthGuard>
          } 
        />
        
        {/* Teams - Admin and Project Manager */}
        <Route 
          path="/teams" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <Teams />
            </AuthGuard>
          } 
        />
        <Route 
          path="/teams/new" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <TeamForm />
            </AuthGuard>
          } 
        />
        <Route 
          path="/teams/:id/edit" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <TeamForm />
            </AuthGuard>
          } 
        />
        
        {/* Clients - Admin and Project Manager */}
        <Route 
          path="/clients" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <Clients />
            </AuthGuard>
          } 
        />
        <Route 
          path="/clients/new" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <ClientForm />
            </AuthGuard>
          } 
        />
        <Route 
          path="/clients/:id/edit" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <ClientForm />
            </AuthGuard>
          } 
        />
        
        {/* Projects - Admin and Project Manager */}
        <Route 
          path="/projects" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <Projects />
            </AuthGuard>
          } 
        />
        <Route 
          path="/projects/new" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <ProjectForm />
            </AuthGuard>
          } 
        />
        <Route 
          path="/projects/:id" 
          element={<ProjectDetail />} 
        />
        <Route 
          path="/projects/:id/edit" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager']}>
              <ProjectForm />
            </AuthGuard>
          } 
        />
        
        {/* Stories - All authenticated users can read, collaborators+ can create/edit */}
        <Route path="/stories" element={<Stories />} />
        <Route 
          path="/stories/new" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager', 'collaborator']}>
              <UserStoryForm />
            </AuthGuard>
          } 
        />
        <Route 
          path="/stories/:id/edit" 
          element={
            <AuthGuard requiredRoles={['admin', 'project_manager', 'collaborator']}>
              <UserStoryForm key="edit" />
            </AuthGuard>
          } 
        />
        <Route path="/stories/:id" element={<UserStoryForm key="view" />} />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AuthenticatedApp />
      </Router>
    </AuthProvider>
  );
}

export default App;