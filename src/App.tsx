import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
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

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/new" element={<TeamForm />} />
            <Route path="/teams/:id/edit" element={<TeamForm />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/clients/new" element={<ClientForm />} />
            <Route path="/clients/:id/edit" element={<ClientForm />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectForm />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/projects/:id/edit" element={<ProjectForm />} />
            <Route path="/stories" element={<Stories />} />
            <Route path="/stories/new" element={<UserStoryForm />} />
            <Route path="/stories/:id/edit" element={<UserStoryForm key="edit" />} />
            <Route path="/stories/:id" element={<UserStoryForm key="view" />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;