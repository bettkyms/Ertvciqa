import React, { useState, useMemo, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import { AuthContext } from '../contexts/AuthContext';
import { Day, WeeklyTrainerReportData, WeeklyTraineeReportData, TimeSlot, Role } from '../types';
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


const ReportGeneration: React.FC = () => {
  const { classes, remarks, trainerSchedules, trainees, units, trainers, traineeAttendanceRecords, logo } = useContext(DataContext);
  const { currentUser } = useContext(AuthContext);

  const isHOD = currentUser?.role === Role.HOD;

  const [selectedDepartment, setSelectedDepartment] = useState(isHOD ? currentUser?.department || '' : '');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [week, setWeek] = useState('');
  const [reportType, setReportType] = useState<'trainee' | 'trainer'>('trainee');
  const [message, setMessage] = useState('');
  const [previewData, setPreviewData] = useState<WeeklyTrainerReportData | WeeklyTraineeReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const departments = useMemo(() => [...new Set(classes.map(c => c.department))].sort(), [classes]);

  const filteredClasses = useMemo(() => {
    if (!selectedDepartment) return [];
    return classes.filter(c => c.department === selectedDepartment);
  }, [classes, selectedDepartment]);
  
  const generateAndPrepareReportData = async (
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

  const handleAction = async (action: 'preview' | 'download') => {
    setMessage('');
    setPreviewData(null);
    if (!selectedClassId || !week) {
        setMessage("Please select a department, class, and week.");
        return;
    }
    setIsLoading(true);
    const data = await generateAndPrepareReportData(reportType, selectedClassId, week);
    
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
  
  const title = isHOD ? "Generate Department Reports" : "Generate & Download Reports";
  const description = isHOD 
    ? `Select a class and week from the ${currentUser?.department} department to view or download reports.`
    : "Select a department, class, and week to view or download attendance reports.";

  return (
    <div>
      <h2 className="text-xl font-bold text-slate-700 mb-1">{title}</h2>
      <p className="text-slate-500 mb-6 text-sm">{description}</p>
      
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
            <button onClick={() => handleAction('preview')} disabled={isLoading || !selectedClassId || !week} className="flex-1 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-300">
                {isLoading ? 'Loading...' : 'Preview Report'}
            </button>
            <button onClick={() => handleAction('download')} disabled={isLoading || !selectedClassId || !week} className="flex-1 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300">
                {isLoading ? 'Loading...' : 'Download PDF'}
            </button>
        </div>
      </div>
       {previewData && <ReportPreview data={previewData} type={reportType} onClose={() => setPreviewData(null)} />}
    </div>
  );
};

export default ReportGeneration;