import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { AuthContext } from '../contexts/AuthContext';
import { Role } from '../types';

const TraineeManagement: React.FC = () => {
  const { trainees, addTrainee, classes } = useContext(DataContext);
  const { currentUser } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');

  const isHOD = currentUser?.role === Role.HOD;

  const departmentClasses = useMemo(() => {
    if (isHOD) {
        return classes.filter(c => c.department === currentUser?.department);
    }
    return classes;
  }, [classes, currentUser, isHOD]);

  const displayedTrainees = useMemo(() => {
    if (isHOD) {
        const departmentClassIds = new Set(departmentClasses.map(c => c.id));
        return trainees.filter(t => departmentClassIds.has(t.classId));
    }
    return trainees;
  }, [trainees, departmentClasses, isHOD]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !admissionNumber || !classId) {
      setMessage('Please fill all fields.');
      return;
    }
    const success = addTrainee(name, admissionNumber, classId);
    if (success) {
      setMessage(`Trainee "${name}" created successfully!`);
      setName('');
      setAdmissionNumber('');
      setClassId('');
      setTimeout(() => setMessage(''), 3000); // Clear message after 3 seconds
    } else {
      setMessage(`A trainee with the admission number "${admissionNumber}" already exists.`);
    }
  };

  const classMap = new Map(classes.map(c => [c.id, c.name]));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add Trainee Form */}
      <div className="lg:col-span-1">
        <h2 className="text-xl font-bold text-slate-700 mb-1">Add New Trainee</h2>
        <p className="text-slate-500 mb-6 text-sm">
            {isHOD ? `Add a new trainee to a class in the ${currentUser.department} department.` : 'Add a new trainee to any class.'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Trainee Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Admission Number</label>
            <input type="text" value={admissionNumber} onChange={e => setAdmissionNumber(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
                <option value="" disabled>-- Select a class --</option>
                {departmentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
            Create Trainee
          </button>
          {message && <p className="text-sm text-center text-green-700 pt-2">{message}</p>}
        </form>
      </div>

      {/* Existing Trainees List */}
      <div className="lg-col-span-1">
         <h3 className="text-lg font-semibold text-slate-700 mb-3">{isHOD ? `Trainees in ${currentUser.department}` : 'All Trainees'} ({displayedTrainees.length})</h3>
         <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-96 overflow-y-auto">
          {displayedTrainees.length > 0 ? (
            [...displayedTrainees].sort((a, b) => a.name.localeCompare(b.name)).map(trainee => (
              <div key={trainee.id} className="flex justify-between items-center bg-white p-3 rounded shadow-sm">
                <div>
                  <p className="font-medium text-slate-800">{trainee.name}</p>
                   <p className="text-xs text-slate-500">{trainee.admissionNumber}</p>
                </div>
                <p className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{classMap.get(trainee.classId) || 'Unassigned'}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 px-2">No trainees found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TraineeManagement;
