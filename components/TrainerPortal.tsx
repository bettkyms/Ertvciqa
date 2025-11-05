import React, { useState, useMemo, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { DataContext } from '../contexts/DataContext';
import { generatePdf } from '../services/pdfService';
import { SessionTraineeReportData, TraineeAttendanceRecord, PeriodicTraineeReportData } from '../types';

type ReportPeriod = 'weekly' | 'monthly' | 'termly';

// --- Helper Functions for Date Calculation ---
const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const getDateRangeOfWeek = (weekStr: string): [Date, Date] => {
    const [year, week] = weekStr.split('-W').map(Number);
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    const ISOweekEnd = new Date(ISOweekStart);
    ISOweekEnd.setDate(ISOweekStart.getDate() + 6);
    return [ISOweekStart, ISOweekEnd];
};


const TrainerPortal: React.FC = () => {
  const { currentUser, logout } = useContext(AuthContext);
  const { classes, units, trainees, logo, addTraineeAttendance, traineeAttendanceRecords, unitAssignments } = useContext(DataContext);

  // State for taking attendance
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [presentTrainees, setPresentTrainees] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [reportData, setReportData] = useState<SessionTraineeReportData | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceTime, setAttendanceTime] =useState('08:00');

  // State for generating reports
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('weekly');
  const [reportWeek, setReportWeek] = useState('');
  const [reportMonth, setReportMonth] = useState('');
  const [reportTerm, setReportTerm] = useState('1');
  const [reportClassId, setReportClassId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportError, setReportError] = useState('');

  const trainerClasses = useMemo(() => {
    if (!currentUser?.department) return [];
    return classes.filter(c => c.department === currentUser.department);
  }, [currentUser, classes]);

  const unitsInClass = useMemo(() => {
    if (!selectedClassId || !currentUser) return [];

    // Get IDs of units assigned to the current trainer
    const assignedUnitIds = new Set(
        unitAssignments
            .filter(a => a.trainerId === currentUser.id)
            .map(a => a.unitId)
    );
    
    // Filter units for the selected class to only include assigned ones
    return units.filter(u => u.classId === selectedClassId && assignedUnitIds.has(u.id));
  }, [selectedClassId, units, unitAssignments, currentUser]);
  
  const traineesInClass = useMemo(() => trainees.filter(t => t.classId === selectedClassId).sort((a, b) => a.name.localeCompare(b.name)), [selectedClassId, trainees]);

  const handleTraineeToggle = (traineeId: string) => {
    setPresentTrainees(prev => {
      const newSet = new Set(prev);
      newSet.has(traineeId) ? newSet.delete(traineeId) : newSet.add(traineeId);
      return newSet;
    });
  };

  const handleSelectAll = () => setPresentTrainees(new Set(traineesInClass.map(t => t.id)));
  const handleDeselectAll = () => setPresentTrainees(new Set());

  const handleSubmit = async () => {
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const selectedUnit = units.find(u => u.id === selectedUnitId);

    if (!selectedClass || !selectedUnit || !currentUser) return;
    
    const presentList = traineesInClass.filter(t => presentTrainees.has(t.id));
    const absentList = traineesInClass.filter(t => !presentTrainees.has(t.id));

    // Create and save historical records
    const records: TraineeAttendanceRecord[] = traineesInClass.map(trainee => ({
        traineeId: trainee.id,
        classId: selectedClassId,
        unitId: selectedUnitId,
        trainerId: currentUser.id,
        date: attendanceDate,
        time: attendanceTime,
        status: presentTrainees.has(trainee.id) ? 'present' : 'absent',
    }));
    addTraineeAttendance(records);

    const data: SessionTraineeReportData = {
        className: selectedClass.name,
        unitName: selectedUnit.name,
        trainerName: currentUser.name,
        date: attendanceDate,
        time: attendanceTime,
        presentTrainees: presentList.map(t => ({ name: t.name, admissionNumber: t.admissionNumber })),
        absentTrainees: absentList.map(t => ({ name: t.name, admissionNumber: t.admissionNumber })),
        summary: {
            present: presentList.length,
            absent: absentList.length,
            total: traineesInClass.length,
        }
    };

    setReportData(data);
    setSummaryText(`Attendance for ${selectedClass.name} on ${attendanceDate} submitted.`);
    setShowSummary(true);
  };

  const handleDownloadPdf = async () => {
      if (!reportData) return;
      await generatePdf('sessionTrainee', reportData, undefined, logo);
  };

  const resetForm = () => {
    setShowSummary(false);
    setSummaryText('');
    setSelectedClassId('');
    setSelectedUnitId('');
    setPresentTrainees(new Set());
    setReportData(null);
  };
  
  const handleGeneratePeriodicReport = async () => {
    if (!reportClassId || !currentUser) {
        setReportError('Please select a class.');
        return;
    }
    setIsGenerating(true);
    setReportError('');

    let startDate: Date, endDate: Date;
    let periodStr = '';

    try {
        if (reportPeriod === 'weekly') {
            if (!reportWeek) { setReportError('Please select a week.'); setIsGenerating(false); return; }
            [startDate, endDate] = getDateRangeOfWeek(reportWeek);
            periodStr = `Week: ${reportWeek}`;
        } else if (reportPeriod === 'monthly') {
            if (!reportMonth) { setReportError('Please select a month.'); setIsGenerating(false); return; }
            const [year, month] = reportMonth.split('-').map(Number);
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0);
            periodStr = `Month: ${startDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
        } else { // Termly
            const year = new Date().getFullYear();
            const startWeek = (parseInt(reportTerm) - 1) * 12 + 1;
            const endWeek = startWeek + 11;
            [startDate] = getDateRangeOfWeek(`${year}-W${startWeek}`);
            [endDate] = getDateRangeOfWeek(`${year}-W${endWeek}`);
            periodStr = `Term ${reportTerm} (${year})`;
        }
    } catch (e) {
        setReportError('Invalid date selection.');
        setIsGenerating(false);
        return;
    }
    
    const reportClass = classes.find(c => c.id === reportClassId)!;
    const traineesForClass = trainees.filter(t => t.classId === reportClassId);

    const relevantRecords = traineeAttendanceRecords.filter(rec => {
        const recordDate = new Date(rec.date);
        return rec.classId === reportClassId &&
               rec.trainerId === currentUser.id &&
               recordDate >= startDate && recordDate <= endDate;
    });

    if (relevantRecords.length === 0) {
        setReportError('No attendance records found for this period.');
        setIsGenerating(false);
        return;
    }

    const uniqueSessions = [...new Set(relevantRecords.map(r => `${r.date}-${r.time}`))].length;

    const reportGrid: PeriodicTraineeReportData['attendanceGrid'] = traineesForClass.map(trainee => {
        const traineeRecords = relevantRecords.filter(r => r.traineeId === trainee.id);
        const presentCount = traineeRecords.filter(r => r.status === 'present').length;
        const absentCount = uniqueSessions - presentCount;
        const attendancePercentage = uniqueSessions > 0 ? (presentCount / uniqueSessions) * 100 : 0;
        return {
            traineeName: trainee.name,
            admissionNumber: trainee.admissionNumber,
            presentCount,
            absentCount,
            totalSessions: uniqueSessions,
            attendancePercentage,
        };
    }).sort((a,b) => a.traineeName.localeCompare(b.traineeName));

    const periodicReportData: PeriodicTraineeReportData = {
        reportTitle: `${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} Attendance Report`,
        period: periodStr,
        className: reportClass.name,
        trainerName: currentUser.name,
        attendanceGrid: reportGrid,
    };
    
    await generatePdf('periodicTrainee', periodicReportData, undefined, logo);

    setIsGenerating(false);
  };


  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="absolute top-4 right-4">
        <button onClick={logout} className="flex items-center text-sm text-slate-600 hover:text-indigo-800 font-semibold transition-colors group">
          <span className="mr-2 hidden sm:inline">Logout ({currentUser?.name})</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
      <div className="bg-white p-8 rounded-2xl shadow-lg space-y-10">
        
        {/* --- Take Attendance Section --- */}
        <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Trainer Portal</h1>
            <p className="text-slate-500 mb-6">Take attendance for your assigned classes.</p>

            {showSummary ? (
              <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                <h2 className="text-2xl font-semibold text-green-800 mb-4">Attendance Recorded!</h2>
                <div className="text-left bg-white p-4 rounded-md shadow-sm mb-6">
                  <h3 className="font-bold text-slate-700 mb-2">Summary:</h3>
                  <p className="text-slate-600 whitespace-pre-wrap">{summaryText}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                     <button onClick={handleDownloadPdf} className="flex-1 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-300">
                        Download PDF Report
                    </button>
                    <button onClick={resetForm} className="flex-1 bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300">
                        Mark Another Class
                    </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">1. Select Class</label>
                    <select value={selectedClassId} onChange={e => { setSelectedClassId(e.target.value); setSelectedUnitId(''); }} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                      <option value="" disabled>-- Choose your class --</option>
                      {trainerClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">2. Select Unit Taught</label>
                    <select value={selectedUnitId} onChange={e => setSelectedUnitId(e.target.value)} disabled={!selectedClassId} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100">
                      <option value="" disabled>-- Choose unit --</option>
                      {unitsInClass.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">3. Select Date</label>
                    <input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                   <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">4. Select Time</label>
                    <input type="time" value={attendanceTime} onChange={e => setAttendanceTime(e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                {selectedClassId && selectedUnitId && (
                  <div>
                    <h3 className="text-lg font-medium text-slate-700 mb-3">5. Mark Trainee Attendance</h3>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-slate-600">{presentTrainees.size} of {traineesInClass.length} present</p>
                      <div className="flex space-x-2">
                        <button onClick={handleSelectAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Select All</button>
                        <button onClick={handleDeselectAll} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">Deselect All</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-60 overflow-y-auto p-4 bg-slate-50 rounded-lg border">
                      {traineesInClass.map(trainee => (
                        <button
                          key={trainee.id}
                          onClick={() => handleTraineeToggle(trainee.id)}
                          className={`p-3 rounded-lg text-left transition-all duration-200 border-2 ${
                            presentTrainees.has(trainee.id)
                              ? 'bg-green-100 border-green-400 text-green-800'
                              : 'bg-white border-slate-300 hover:border-indigo-400'
                          }`}
                        >
                          <p className="font-semibold">{trainee.name}</p>
                          <p className="text-xs text-slate-500">{trainee.admissionNumber}</p>
                        </button>
                      ))}
                    </div>
                    <div className="mt-8">
                      <button onClick={handleSubmit} className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-300 disabled:bg-indigo-300">
                        Submit Attendance
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
        </div>

        {/* --- Generate Reports Section --- */}
        <div className="border-t border-slate-200 pt-8">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Generate Attendance Reports</h2>
            <p className="text-slate-500 mb-6">Download aggregated attendance reports for a specific class and period.</p>
            <div className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                        <select value={reportClassId} onChange={e => setReportClassId(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                            <option value="">-- Select a Class --</option>
                            {trainerClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Report Period</label>
                        <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value as ReportPeriod)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="termly">Termly (12 Weeks)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Select Date/Term</label>
                    {reportPeriod === 'weekly' && <input type="week" value={reportWeek} onChange={e => setReportWeek(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>}
                    {reportPeriod === 'monthly' && <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md"/>}
                    {reportPeriod === 'termly' && (
                        <select value={reportTerm} onChange={e => setReportTerm(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                            <option value="1">Term 1 (Jan - Mar)</option>
                            <option value="2">Term 2 (Apr - Jun)</option>
                            <option value="3">Term 3 (Jul - Sep)</option>
                            <option value="4">Term 4 (Oct - Dec)</option>
                        </select>
                    )}
                </div>
                {reportError && <p className="text-red-500 text-sm text-center">{reportError}</p>}
                <button 
                  onClick={handleGeneratePeriodicReport}
                  disabled={isGenerating || !reportClassId}
                  className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 transition-colors duration-300 disabled:bg-teal-300"
                >
                    {isGenerating ? 'Generating...' : 'Download PDF Report'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default TrainerPortal;