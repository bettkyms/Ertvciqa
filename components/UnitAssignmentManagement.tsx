import React, { useContext, useMemo } from 'react';
import { DataContext } from '../contexts/DataContext';
import { AuthContext } from '../contexts/AuthContext';

const UnitAssignmentManagement: React.FC = () => {
    const { classes, units, trainers, unitAssignments, assignUnitToTrainer } = useContext(DataContext);
    const { currentUser } = useContext(AuthContext);

    const departmentClasses = useMemo(() => {
        if (!currentUser?.department) return [];
        return classes.filter(c => c.department === currentUser.department);
    }, [classes, currentUser]);

    const departmentTrainers = useMemo(() => {
        if (!currentUser?.department) return [];
        return trainers.filter(t => t.department === currentUser.department);
    }, [trainers, currentUser]);

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

    const assignmentsMap = useMemo(() => {
        return new Map(unitAssignments.map(a => [a.unitId, a.trainerId]));
    }, [unitAssignments]);

    return (
        <div>
            <h2 className="text-xl font-bold text-slate-700 mb-1">Assign Units to Trainers</h2>
            <p className="text-slate-500 mb-6 text-sm">For each unit, select the trainer responsible for teaching it.</p>

            <div className="space-y-6">
                {unitsByClass.map(classGroup => (
                    <div key={classGroup.className} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <h3 className="font-bold text-slate-800 text-lg mb-3">{classGroup.className}</h3>
                        <div className="space-y-3">
                            {classGroup.units.sort((a,b) => a.name.localeCompare(b.name)).map(unit => (
                                <div key={unit.id} className="grid grid-cols-2 gap-4 items-center bg-white p-3 rounded-md shadow-sm">
                                    <p className="text-sm font-medium text-slate-700">{unit.name}</p>
                                    <select
                                        value={assignmentsMap.get(unit.id) || ''}
                                        onChange={(e) => assignUnitToTrainer(unit.id, e.target.value)}
                                        className="w-full p-2 border border-slate-300 rounded-md bg-white text-sm"
                                    >
                                        <option value="">-- Unassigned --</option>
                                        {departmentTrainers.map(trainer => (
                                            <option key={trainer.id} value={trainer.id}>{trainer.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {unitsByClass.length === 0 && (
                     <p className="text-sm text-slate-500 text-center py-8">No classes or units found for the <span className="font-semibold">{currentUser?.department}</span> department. Please add classes and units first.</p>
                )}
            </div>
        </div>
    );
};

export default UnitAssignmentManagement;