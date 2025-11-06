import React, { useState, useMemo, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { AuthContext } from '../contexts/AuthContext';
import { Day, WeeklyTrainerReportData, WeeklyTraineeReportData, TimeSlot, Role, TrainerSchedule, PercentageReportData, PercentageReportItem, TraineeAttendanceRecord } from '../types';
import ReportPreview from './ReportPreview';
import { generatePdf } from '../services/pdfService';

// Helper to get date range of a week (YYYY-W##)
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
    ISOweekEnd.setDate(ISOweekStart.getDate() + 4); // Monday to Friday
    return [ISOweekStart, ISOweekEnd];
};

const getDatesOfWeek = (weekStr: string): Date[] => {
    const [year, week] = weekStr.split('-W').map(Number);
    const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    // Go to the Monday of that week
    d.setUTCDate(d.getUTCDate() + 1 - (d.getUTCDay() || 7));
    
    const dates: Date[] = [];
    for (let i = 0; i < 5; i++) { // Monday to Friday
        const dayDate = new Date(d);
        dayDate.setUTCDate(d.getUTCDate() + i);
        dates.push(dayDate);
    }
    return dates;
};


const ReportGeneration: React.FC = () => {
  const { classes, remarks, trainerSchedules, trainees, units, trainers, traineeAttendanceRecords, logo } = useContext(DataContext);
  const { currentUser } = useContext(AuthContext);

  const isHOD = currentUser?.role === Role.HOD;

  // State for weekly reports
  const [selectedDepartment, setSelectedDepartment] = useState(isHOD ? currentUser?.department || '' : '');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [week, setWeek] = useState('');
  const [reportType, setReportType] = useState<'trainee' | 'trainer'>('trainee');
  const [message, setMessage] = useState('');
  const [previewData, setPreviewData] = useState<WeeklyTrainerReportData | WeeklyTraineeReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // State for aggregate reports
  const [aggStartDate, setAggStartDate] = useState('');
  const [aggEndDate, setAggEndDate] = useState('');
  const [aggSubject, setAggSubject] = useState<'trainees' | 'trainers'>('trainees');
  const [aggGroupBy, setAggGroupBy] = useState<'overall' | 'department' | 'class' | 'individual'>('class');
  const [aggMessage, setAggMessage] = useState('');
  const [aggIsLoading, setAggIsLoading] = useState(false);
  const [aggReportData, setAggReportData] = useState<PercentageReportData | null>(null);


  const departments = useMemo(() => [...new Set(classes.map(c => c.department))].sort(), [classes]);

  const filteredClasses = useMemo(() => {
    if (!selectedDepartment) return isHOD ? classes.filter(c => c.department === currentUser?.department) : [];
    return classes.filter(c => c.department === selectedDepartment);
  }, [classes, selectedDepartment, isHOD, currentUser]);
  
  const generateAndPrepareWeeklyReportData = async (
    type: 'trainee' | 'trainer',
    classId: string,
    weekStr: string
  ): Promise<WeeklyTrainerReportData | WeeklyTraineeReportData | null> => {
    if (type === 'trainer') {
        const scheduleRecord = trainerSchedules.find(s => s.classId === classId && s.week === weekStr);
        if (!scheduleRecord) return null;

        const selectedClass = classes.find(c => c.id === classId)!;
        const unitMap = new Map(units.map(u => [u.id, u.name]));
        const trainerMap = new Map(trainers.map(t => [t.id, t.name]));
        const reportSchedule: WeeklyTrainerReportData['schedule'] = { monday: {}, tuesday: {}, wednesday: {}, thursday: {}, friday: {} };
        const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

        for (const day of days) {
            const dayScheduleInput = scheduleRecord.schedule[day];
            const dayScheduleOutput: { [time: string]: { subject: string; status: string; trainer: string; } } = {};
            for (const time in dayScheduleInput) {
                const sessionInput = dayScheduleInput[time as TimeSlot];
                if (sessionInput && sessionInput.unitId && sessionInput.trainerId) {
                    dayScheduleOutput[time] = {
                        subject: String(unitMap.get(sessionInput.unitId) || 'Unknown Unit'),
                        status: String(sessionInput.status),
                        trainer: String(trainerMap.get(sessionInput.trainerId) || 'Unknown Trainer')
                    };
                }
            }
            reportSchedule[day] = dayScheduleOutput;
        }

        const dates = days.reduce((acc, day, i) => {
            const [start] = getDateRangeOfWeek(weekStr);
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            return { ...acc, [day]: currentDate.toLocaleDateString('en-CA')};
        }, {} as {[day: string]: string});

        return {
            department: selectedClass.department,
            className: selectedClass.name,
            classRepName: "N/A", // IQA might not know the specific rep
            schedule: reportSchedule,
            dates: dates,
        };
    } else { // trainee report
        const traineesForClass = trainees.filter(t => t.classId === classId);
        if (traineesForClass.length === 0) return null;

        const [startDate, endDate] = getDateRangeOfWeek(weekStr);
        const relevantRecords = traineeAttendanceRecords.filter(rec => {
            const recordDate = new Date(rec.date);
            return rec.classId === classId && recordDate >= startDate && recordDate <= endDate;
        });

        if (relevantRecords.length === 0) return null;

        const uniqueSessionsPerDay: Record<number, number> = {};
        for(let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                 const dateStr = d.toISOString().split('T')[0];
                 uniqueSessionsPerDay[dayOfWeek] = new Set(relevantRecords.filter(r => r.date === dateStr).map(r => r.time)).size;
            }
        }

        const totalWeeklySessions = Object.values(uniqueSessionsPerDay).reduce((sum, count) => sum + count, 0);
        let grandTotalPresent = 0;
        const attendanceGrid = traineesForClass.map(trainee => {
            const traineeRecords = relevantRecords.filter(r => r.traineeId === trainee.id);
            const dailyAttendance: { [key: string]: string } = { mon: '-', tue: '-', wed: '-', thu: '-', fri: '-' };
            const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            for(let i=1; i<=5; i++) {
                const dayKey = dayMap[i];
                const totalSessionsOnDay = uniqueSessionsPerDay[i] || 0;
                if(totalSessionsOnDay > 0) {
                    const presentOnDay = new Set(traineeRecords.filter(r => new Date(r.date).getDay() === i && r.status === 'present').map(r => r.time)).size;
                    dailyAttendance[dayKey] = `${presentOnDay}/${totalSessionsOnDay}`;
                }
            }
            const totalPresentForTrainee = traineeRecords.filter(r => r.status === 'present').length;
            grandTotalPresent += totalPresentForTrainee;
            const weeklyPercentage = totalWeeklySessions > 0 ? (totalPresentForTrainee / totalWeeklySessions) * 100 : 0;

            return { name: trainee.name, attendance: dailyAttendance, weeklyPercentage: weeklyPercentage };
        }).sort((a,b) => a.name.localeCompare(b.name));

        const totalPossibleAttendances = totalWeeklySessions * traineesForClass.length;
        const overallPercentage = totalPossibleAttendances > 0 ? (grandTotalPresent / totalPossibleAttendances) * 100 : 0;
        
        return {
            attendanceGrid,
            summary: {
                overallPercentage: overallPercentage,
                perfectAttendance: attendanceGrid.filter(g => g.weeklyPercentage === 100).map(g => g.name),
                lowAttendance: attendanceGrid.filter(g => g.weeklyPercentage < 80).map(g => g.name),
            },
            recommendations: ""
        };
    }
  }

  const handleWeeklyAction = async (action: 'preview' | 'download') => {
    setMessage('');
    setPreviewData(null);
    if (!selectedClassId || !week) {
        setMessage("Please select a department, class, and week.");
        return;
    }
    setIsLoading(true);
    const data = await generateAndPrepareWeeklyReportData(reportType, selectedClassId, week);
    
    if(!data) {
        setMessage(`No ${reportType} attendance records found for this week.`);
        setIsLoading(false);
        return;
    }

    if(action === 'preview') {
        setPreviewData(data);
    } else {
        const hodRemark = remarks.find(r => r.classId === selectedClassId && r.week === week && r.type === reportType);
        await generatePdf(reportType, data, hodRemark, logo);
    }

    setIsLoading(false);
  };
  
  const handleGenerateAggregateReport = async () => {
    setAggMessage('');
    setAggReportData(null);
    if (!aggStartDate || !aggEndDate) {
      setAggMessage('Please select a start and end date.');
      return;
    }
    setAggIsLoading(true);

    const period = `${aggStartDate} to ${aggEndDate}`;
    const start = new Date(aggStartDate);
    const end = new Date(aggEndDate);
    end.setHours(23, 59, 59, 999); // Include the whole end day

    let title = '';
    const items: PercentageReportItem[] = [];
    let grandTotalPresent = 0;
    let grandTotalSessions = 0;

    const departmentScope = isHOD ? currentUser.department : null;

    if (aggSubject === 'trainees') {
        const relevantRecords = traineeAttendanceRecords.filter(r => {
            const recordDate = new Date(r.date);
            const classDept = classes.find(c => c.id === r.classId)?.department;
            if (departmentScope && classDept !== departmentScope) return false;
            return recordDate >= start && recordDate <= end;
        });

        if (relevantRecords.length === 0) {
            setAggMessage('No trainee attendance records found in this period.');
            setAggIsLoading(false);
            return;
        }

        const traineeMap = new Map(trainees.map(t => [t.id, t.name]));
        const classMap = new Map(classes.map(c => [c.id, { name: c.name, department: c.department }]));

        let groups: Map<string, typeof relevantRecords>;

        switch (aggGroupBy) {
            case 'individual':
                title = 'Trainee Attendance Report by Individual';
                groups = groupBy(relevantRecords, 'traineeId');
                break;
            case 'class':
                title = 'Trainee Attendance Report by Class';
                groups = groupBy(relevantRecords, 'classId');
                break;
            case 'department':
                title = 'Trainee Attendance Report by Department';
                // FIX: Initialize map with correct generic types to avoid type pollution.
                groups = new Map<string, TraineeAttendanceRecord[]>();
                relevantRecords.forEach(r => {
                    const dept = classMap.get(r.classId)?.department;
                    if (dept) {
                        if (!groups.has(dept)) groups.set(dept, []);
                        groups.get(dept)!.push(r);
                    }
                });
                break;
            case 'overall':
                title = 'Overall Trainee Attendance Report';
                groups = new Map([['overall', relevantRecords]]);
                break;
        }

        groups.forEach((records, key) => {
            const presentCount = records.filter(r => r.status === 'present').length;
            const totalSessions = records.length;
            const percentage = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
            
            let name = 'Overall';
            if (aggGroupBy === 'individual') name = traineeMap.get(key) || 'Unknown Trainee';
            if (aggGroupBy === 'class') name = classMap.get(key)?.name || 'Unknown Class';
            if (aggGroupBy === 'department') name = key;

            items.push({ id: key, name, presentCount, totalSessions, percentage });
        });

    } else { // Trainers
        const flatSessions: { trainerId: string, status: string, date: Date, classId: string, department: string }[] = [];
        const relevantSchedules = trainerSchedules.filter(s => {
            const classDept = classes.find(c => c.id === s.classId)?.department;
            if (departmentScope && classDept !== departmentScope) return false;
            const [weekStart] = getDateRangeOfWeek(s.week);
            return weekStart <= end; // Simplified check
        });

        relevantSchedules.forEach(schedule => {
            const dates = getDatesOfWeek(schedule.week);
            days.forEach((day, i) => {
                const daySessions = schedule.schedule[day];
                if (daySessions) {
                    for (const time in daySessions) {
                        const session = daySessions[time as TimeSlot];
                        const sessionDate = dates[i];
                        if (session && sessionDate >= start && sessionDate <= end) {
                            flatSessions.push({
                                trainerId: session.trainerId,
                                status: session.status,
                                date: sessionDate,
                                classId: schedule.classId,
                                department: classes.find(c => c.id === schedule.classId)?.department || ''
                            });
                        }
                    }
                }
            });
        });

        if (flatSessions.length === 0) {
            setAggMessage('No trainer activity records found in this period.');
            setAggIsLoading(false);
            return;
        }
        
        // FIX: Explicitly type maps to prevent `unknown` type errors.
        const trainerMap: Map<string, string> = new Map(trainers.map(t => [t.id, t.name]));
        const classMap: Map<string, string> = new Map(classes.map(c => [c.id, c.name]));

        let groups: Map<string, typeof flatSessions>;
         switch (aggGroupBy) {
            case 'individual':
                title = 'Trainer Activity Report by Individual';
                groups = groupBy(flatSessions, 'trainerId');
                break;
            case 'class':
                title = 'Trainer Activity Report by Class';
                groups = groupBy(flatSessions, 'classId');
                break;
            case 'department':
                title = 'Trainer Activity Report by Department';
                groups = groupBy(flatSessions, 'department');
                break;
            case 'overall':
                title = 'Overall Trainer Activity Report';
                groups = new Map([['overall', flatSessions]]);
                break;
        }

        groups.forEach((sessions, key) => {
            const presentCount = sessions.filter(s => s.status === 'Taught' || s.status === 'Assignment').length;
            const totalSessions = sessions.length;
            const percentage = totalSessions > 0 ? (presentCount / totalSessions) * 100 : 0;
            
            let name = 'Overall';
            if (aggGroupBy === 'individual') name = trainerMap.get(key) || 'Unknown Trainer';
            if (aggGroupBy === 'class') name = classMap.get(key) || 'Unknown Class';
            if (aggGroupBy === 'department') name = key;

            items.push({ id: key, name, presentCount, totalSessions, percentage });
        });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    grandTotalPresent = items.reduce((sum, item) => sum + item.presentCount, 0);
    grandTotalSessions = items.reduce((sum, item) => sum + item.totalSessions, 0);

    setAggReportData({
        title,
        period,
        items,
        overall: {
            present: grandTotalPresent,
            total: grandTotalSessions,
            percentage: grandTotalSessions > 0 ? (grandTotalPresent / grandTotalSessions) * 100 : 0,
        }
    });

    setAggIsLoading(false);
  };
  
  const handleDownloadAggregateReport = () => {
    if (aggReportData) {
        generatePdf('percentage', aggReportData, undefined, logo);
    }
  };

  const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const groupBy = <T, K extends keyof T>(arr: T[], key: K): Map<string, T[]> => {
    return arr.reduce((map, item) => {
        const itemKey = String(item[key]);
        if (!map.has(itemKey)) {
            map.set(itemKey, []);
        }
        map.get(itemKey)!.push(item);
        return map;
    }, new Map<string, T[]>());
  };

  
  const weeklyReportTitle = isHOD ? "Generate Department Weekly Reports" : "Generate & Download Weekly Reports";
  const weeklyReportDesc = isHOD 
    ? `Select a class and week from the ${currentUser?.department} department to view or download reports.`
    : "Select a department, class, and week to view or download attendance reports.";

  return (
    <div className="space-y-8">
      {/* --- Weekly Reports --- */}
      <div>
        <h2 className="text-xl font-bold text-slate-700 mb-1">{weeklyReportTitle}</h2>
        <p className="text-slate-500 mb-6 text-sm">{weeklyReportDesc}</p>
        
        <div className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isHOD ? (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={selectedDepartment} 
                    disabled 
                    className="w-full p-2 border border-slate-300 rounded-md bg-slate-200"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select value={selectedDepartment} onChange={e => { setSelectedDepartment(e.target.value); setSelectedClassId(''); }} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
                      <option value="">-- Select Department --</option>
                      {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required disabled={!selectedDepartment} className="w-full p-2 border border-slate-300 rounded-md bg-white disabled:bg-slate-100">
                    <option value="">-- Select Class --</option>
                    {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Week</label>
            <input type="week" value={week} onChange={e => setWeek(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
            <select value={reportType} onChange={e => setReportType(e.target.value as 'trainee' | 'trainer')} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
                <option value="trainee">Trainee Attendance</option>
                <option value="trainer">Trainer Activity</option>
            </select>
          </div>
          
          {message && <p className="text-sm text-center text-red-600 pt-2">{message}</p>}

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button onClick={() => handleWeeklyAction('preview')} disabled={isLoading || !selectedClassId || !week} className="flex-1 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-300">
                  {isLoading ? 'Loading...' : 'Preview Report'}
              </button>
              <button onClick={() => handleWeeklyAction('download')} disabled={isLoading || !selectedClassId || !week} className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300">
                  {isLoading ? 'Loading...' : 'Download PDF'}
              </button>
          </div>
        </div>
        {previewData && <ReportPreview data={previewData} type={reportType} onClose={() => setPreviewData(null)} />}
      </div>

      {/* --- Aggregate Percentage Reports --- */}
      <div className="border-t border-slate-200 pt-8">
        <h2 className="text-xl font-bold text-slate-700 mb-1">Aggregate Percentage Reports</h2>
        <p className="text-slate-500 mb-6 text-sm">Generate attendance percentage reports over a custom date range.</p>
        
        <div className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                <input type="date" value={aggStartDate} onChange={e => setAggStartDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                <input type="date" value={aggEndDate} onChange={e => setAggEndDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Subject</label>
                <select value={aggSubject} onChange={e => setAggSubject(e.target.value as 'trainees' | 'trainers')} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                    <option value="trainees">Trainees</option>
                    <option value="trainers">Trainers</option>
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Group By</label>
                {/* FIX: Replaced `as any` with a specific type to preserve type safety and enable proper type inference. */}
                <select value={aggGroupBy} onChange={e => setAggGroupBy(e.target.value as 'overall' | 'department' | 'class' | 'individual')} className="w-full p-2 border border-slate-300 rounded-md bg-white">
                    <option value="class">Class</option>
                    <option value="individual">Individual</option>
                    {!isHOD && <option value="department">Department</option>}
                    <option value="overall">Overall</option>
                </select>
            </div>
          </div>
           {aggMessage && <p className="text-sm text-center text-red-600 pt-2">{aggMessage}</p>}
           <div className="pt-2">
            <button onClick={handleGenerateAggregateReport} disabled={aggIsLoading} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300">
                {aggIsLoading ? 'Generating...' : 'Generate Aggregate Report'}
            </button>
           </div>
        </div>
        
        {aggReportData && (
            <div className="mt-6 p-4 bg-white rounded-lg border border-slate-300 shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-700">{aggReportData.title}</h3>
                    <button onClick={handleDownloadAggregateReport} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1 rounded-md">Download PDF</button>
                </div>
                <p className="text-sm text-slate-500 mb-4">Period: {aggReportData.period}</p>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="p-2 border border-slate-200 text-left font-semibold text-slate-600">Name</th>
                                <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Present / Taught</th>
                                <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Total Sessions</th>
                                <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Attendance %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggReportData.items.map(item => (
                                <tr key={item.id}>
                                    <td className="p-2 border border-slate-200 font-medium">{item.name}</td>
                                    <td className="p-2 border border-slate-200 text-center">{item.presentCount}</td>
                                    <td className="p-2 border border-slate-200 text-center">{item.totalSessions}</td>
                                    <td className="p-2 border border-slate-200 text-center font-semibold">{item.percentage.toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 p-3 bg-slate-100 rounded-md text-sm">
                    <h4 className="font-bold mb-2">Overall Summary</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <p><strong>Total Present/Taught:</strong> {aggReportData.overall.present}</p>
                        <p><strong>Total Sessions:</strong> {aggReportData.overall.total}</p>
                        <p><strong>Overall Percentage:</strong> {aggReportData.overall.percentage.toFixed(1)}%</p>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ReportGeneration;
