

import React, { useContext } from 'react';
import { AuthContext } from './contexts/AuthContext';
import { Role } from './types';
import TrainerPortal from './components/TrainerPortal';
import ClassRepPortal from './components/ClassRepPortal';
import { IQAPortal } from './components/IQAPortal';
import HODPortal from './components/HODPortal';
import LoginPage from './components/LoginPage';


const App: React.FC = () => {
  const { currentUser } = useContext(AuthContext);

  const renderContent = () => {
    if (!currentUser) {
      return <LoginPage />;
    }

    switch (currentUser.role) {
      case Role.Trainer:
        return <TrainerPortal />;
      case Role.ClassRep:
        return <ClassRepPortal />;
      case Role.IQA:
        return <IQAPortal />;
      case Role.HOD:
        return <HODPortal />;
      default:
        // Fallback to login page if role is somehow invalid or user is logged out
        return <LoginPage />;
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      {renderContent()}
    </main>
  );
};

export default App;