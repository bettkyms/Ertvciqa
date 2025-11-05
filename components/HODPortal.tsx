import React, { useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import UserManagement from './UserManagement';
import TraineeManagement from './TraineeManagement';
import AttendanceRemarks from './AttendanceRemarks';
import UnitManagement from './UnitManagement';
import ClassManagement from './ClassManagement';
import UnitAssignmentManagement from './UnitAssignmentManagement';
import ReportGeneration from './ReportGeneration';

type HODTab = 'reports' | 'remarks' | 'trainees' | 'users' | 'units' | 'classes' | 'assignments';

const HODPortal: React.FC = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<HODTab>('reports');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reports':
        return <ReportGeneration />;
      case 'users':
        return <UserManagement />;
      case 'trainees':
        return <TraineeManagement />;
      case 'units':
        return <UnitManagement />;
      case 'classes':
        return <ClassManagement />;
      case 'assignments':
        return <UnitAssignmentManagement />;
      case 'remarks':
      default:
        return <AttendanceRemarks />;
    }
  };
  
  const TabButton: React.FC<{tabId: HODTab; label: string}> = ({ tabId, label }) => (
     <button
        onClick={() => setActiveTab(tabId)}
        className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
            activeTab === tabId
            ? 'bg-indigo-600 text-white'
            : 'text-slate-600 hover:bg-slate-200'
        }`}
    >
        {label}
    </button>
  )

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="absolute top-4 right-4">
        <button onClick={logout} className="flex items-center text-sm text-slate-600 hover:text-indigo-800 font-semibold transition-colors group">
          <span className="mr-2 hidden sm:inline">Logout ({currentUser?.name})</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-lg">
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">HOD Portal</h1>
            <p className="text-slate-500">Management Dashboard for the <span className="font-semibold text-slate-600">{currentUser?.department}</span> Department</p>
        </div>

        <div className="mb-6 border-b border-slate-200">
            <div className="flex flex-wrap gap-2 sm:gap-4">
               <TabButton tabId="reports" label="Generate Reports" />
               <TabButton tabId="remarks" label="Attendance Remarks" />
               <TabButton tabId="classes" label="Class Management" />
               <TabButton tabId="units" label="Unit Management" />
               <TabButton tabId="assignments" label="Unit Assignments" />
               <TabButton tabId="trainees" label="Trainee Management" />
               <TabButton tabId="users" label="User Management" />
            </div>
        </div>

        <div>
            {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default HODPortal;