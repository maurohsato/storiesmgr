import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Bug, Eye, EyeOff } from 'lucide-react';

const DebugInfo: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const debugData = {
    user: user ? {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    } : null,
    profile: profile ? {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      role: profile.role,
      created_at: profile.created_at,
    } : null,
    loading,
    localStorage: {
      session: !!localStorage.getItem('supabase_session'),
      lastActivity: localStorage.getItem('supabase_last_activity'),
    },
    timestamp: new Date().toISOString(),
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-purple-600 text-white p-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Toggle Debug Info"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-purple-900">🐛 Debug Info</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <EyeOff className="h-4 w-4" />
            </button>
          </div>
          
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(debugData, null, 2)}
          </pre>
          
          <div className="mt-3 space-y-2">
            <button
              onClick={() => {
                console.log('🐛 Debug Data:', debugData);
                alert('Debug data logged to console');
              }}
              className="w-full text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200"
            >
              Log to Console
            </button>
            
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
            >
              Clear Storage & Reload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugInfo;