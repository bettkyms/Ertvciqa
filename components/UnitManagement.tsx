import React, { useContext, useState, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { AuthContext } from '../contexts/AuthContext';

const UnitManagement: React.FC = () => {
  const { classes, units, addUnit } = useContext(DataContext);
  const { currentUser } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');

  const departmentClasses = useMemo(() => {
    if (!currentUser?.department) return [];
    return classes.filter(c => c.department === currentUser.department);
  }, [classes, currentUser]);

  const unitsByClass = useMemo(() => {
    const grouped: { [key: string]: { className: string; units: { id: string; name: string }[] } } = {};
    const departmentClassIds = new Set(departmentClasses.map(c => c.id));

    units.forEach(unit => {
      if (departmentClassIds.has(unit.classId)) {
        if (!grouped[unit.classId]) {
          const cls = classes.find(c => c.id === unit.classId);
          grouped[unit.classId] = {
            className: cls?.name || 'Unknown Class',
            units: []
          };
        }
        grouped[unit.classId].units.push(unit);
      }
    });
    return Object.values(grouped).sort((a,b) => a.className.localeCompare(b.className));
  }, [units, classes, departmentClasses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !classId) {
      setMessage('Please select a class and enter a unit name.');
      return;
    }
    const success = addUnit(name, classId);
    if (success) {
      setMessage(`Unit "${name}" created successfully!`);
      setName('');
      setClassId('');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setMessage(`A unit with that name may already exist in the selected class.`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Add Unit Form */}
      <div>
        <h2 className="text-xl font-bold text-slate-700 mb-1">Add New Unit</h2>
        <p className="text-slate-500 mb-6 text-sm">Add a new unit of study to a class in your department.</p>
        <form onSubmit={handleSubmit} className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
              <option value="" disabled>-- Select a class --</option>
              {departmentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors">
            Create Unit
          </button>
          {message && <p className="text-sm text-center text-green-700 pt-2">{message}</p>}
        </form>
      </div>

      {/* Existing Units List */}
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Existing Units in {currentUser?.department}</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-4 max-h-[450px] overflow-y-auto">
          {unitsByClass.length > 0 ? (
            unitsByClass.map(group => (
              <div key={group.className}>
                <h4 className="font-semibold text-slate-800 bg-slate-200 px-3 py-1 rounded-t-md">{group.className}</h4>
                <div className="border border-t-0 border-slate-200 rounded-b-md p-2 space-y-1">
                  {group.units.sort((a,b)=>a.name.localeCompare(b.name)).map(unit => (
                    <p key={unit.id} className="text-sm text-slate-700 bg-white p-2 rounded shadow-sm">{unit.name}</p>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500 px-2">No units found for your department.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnitManagement;
