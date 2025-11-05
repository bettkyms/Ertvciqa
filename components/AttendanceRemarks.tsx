import React, { useState, useMemo, useContext, useEffect } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { DataContext } from '../contexts/DataContext';
import { Day, Remark, Role, TimeSlot, WeeklyTrainerReportData, WeeklyTraineeReportData } from '../types';
import ReportPreview from './ReportPreview';
import { generatePdf } from '../services/pdfService';

// Helper to get date range of a week (YYYY-W##)
const getDateRangeOfWeek = (weekStr: string): [Date, Date] => {
    const [year, week] = weekStr.split('-W').map(Number);
    const d = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const firstDay = new Date(d.getUTCFullYear(), 0, d.getUTCDate() - 3);

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


const AttendanceRemarks: React.FC = () => {
  const { currentUser } = useContext(AuthContext);
  const { classes, remarks, addRemark, trainerSchedules, trainees, units, trainers, traineeAttendanceRecords, logo } = useContext(DataContext);

  const [selectedClassId, setSelectedClassId] = useState('');
  const [week, setWeek] = useState('');
  const [reportType, setReportType] = useState<'trainee' | 'trainer'>('trainee');
  const [remarkText, setRemarkText] = useState('');
  const [message, setMessage] = useState('');
  const [previewData, setPreviewData] = useState<WeeklyTrainerReportData | WeeklyTraineeReportData | null>(null);
  
  // State for post-submission flow
  const [showDownloadConfirmation, setShowDownloadConfirmation] = useState(false);
  const [dataForPdf, setDataForPdf] = useState<WeeklyTrainerReportData | WeeklyTraineeReportData | null>(null);
  const [remarkForPdf, setRemarkForPdf] = useState<Remark | null>(null);


  const isIQA = currentUser?.role === Role.IQA;

  const departmentClasses = useMemo(() => {
    if (!currentUser?.department && !isIQA) return [];
    if (isIQA) return classes;
    return classes.filter(c => c.department === currentUser!.department);
  }, [classes, currentUser, isIQA]);

  const displayedRemarks = useMemo(() => {
    const departmentClassIds = new Set(departmentClasses.map(c => c.id));
    return remarks.filter(r => departmentClassIds.has(r.classId)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [remarks, departmentClasses]);

  const currentRemark = useMemo(() => {
    if (!selectedClassId || !week) return null;
    return remarks.find(r =>
      r.classId === selectedClassId &&
      r.week === week &&
      r.type === reportType
    );
  }, [remarks, selectedClassId, week, reportType]);
  
  // When selection changes, clear the preview and reset confirmation state
  useEffect(() => {
    setPreviewData(null);
    setShowDownloadConfirmation(false);
    setDataForPdf(null);
    setRemarkForPdf(null);
  }, [selectedClassId, week, reportType]);


  useEffect(() => {
    setRemarkText(currentRemark?.remarkText || '');
  }, [currentRemark]);

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
            classRepName: "N/A",
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
  
  const handlePreviewReport = async () => {
    setMessage('');
    if (!selectedClassId || !week) {
        setMessage("Please select a class and week first.");
        return;
    }
    const data = await generateAndPrepareReportData(reportType, selectedClassId, week);
    if(data) {
        setPreviewData(data);
    } else {
        setMessage(`No ${reportType} attendance records found for this week.`);
        setPreviewData(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !week || !remarkText || !currentUser) {
      setMessage('Please select a class, week, and enter a remark.');
      return;
    }
    
    setMessage('Saving remark and preparing report...');
    
    const newRemarkData: Omit<Remark, 'id'> = {
      classId: selectedClassId,
      week,
      type: reportType,
      remarkText,
      authorName: currentUser.name,
      authorSignature: currentUser.name,
      date: new Date().toLocaleDateString(),
    };
    addRemark(newRemarkData);

    const generatedData = await generateAndPrepareReportData(reportType, selectedClassId, week);
    
    if (generatedData) {
        setDataForPdf(generatedData);
        setRemarkForPdf({ ...newRemarkData, id: `remark-${Date.now()}` });
        setShowDownloadConfirmation(true);
        setMessage('');
        setRemarkText('');
        setPreviewData(null);
    } else {
        // Still show confirmation for the remark, but without a download button
        setRemarkForPdf(null);
        setDataForPdf(null);
        setShowDownloadConfirmation(true); // This will now show a message about no data
    }
  };

  const handleDownloadPdfWithRemark = () => {
    if (dataForPdf && remarkForPdf) {
        generatePdf(reportType, dataForPdf, remarkForPdf, logo);
    }
  };

  const resetFormAndContinue = () => {
      setShowDownloadConfirmation(false);
      setDataForPdf(null);
      setRemarkForPdf(null);
      setSelectedClassId('');
      setWeek('');
      setRemarkText('');
      setMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <h2 className="text-xl font-bold text-slate-700 mb-1">Add/Edit Report Remarks</h2>
        <p className="text-slate-500 mb-6 text-sm">Select a class and week to add or view HOD remarks on reports.</p>
        
        {showDownloadConfirmation ? (
            <div className="space-y-4 p-6 bg-green-50 rounded-lg border border-green-200 text-center">
                <h3 className="text-xl font-bold text-green-800">Remark Saved Successfully!</h3>
                {dataForPdf && remarkForPdf ? (
                    <>
                        <p className="text-slate-600">You can now download the updated PDF report with your remark included.</p>
                        <button onClick={handleDownloadPdfWithRemark} className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors">
                            Download PDF with Remark
                        </button>
                    </>
                ) : (
                    <p className="text-slate-600">No attendance data was found for this period to generate a report PDF.</p>
                )}
                 <button onClick={resetFormAndContinue} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors mt-2">
                    Add Another Remark
                </button>
            </div>
        ) : (
            <div className="space-y-4 p-6 bg-slate-50 rounded-lg border border-slate-200">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                    <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} required className="w-full p-2 border border-slate-300 rounded-md bg-white">
                        <option value="">-- Select Class --</option>
                        {departmentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
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
                    <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Remark</label>
                    <textarea
                        value={remarkText}
                        onChange={e => setRemarkText(e.target.value)}
                        required
                        placeholder={currentRemark ? "Edit existing remark..." : "Enter new remark..."}
                        className="w-full p-2 border border-slate-300 rounded-md min-h-[100px]"
                        disabled={!selectedClassId || !week}
                    />
                    </div>
                    <button type="submit" disabled={!selectedClassId || !week || !remarkText} className="w-full bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-300">
                    {currentRemark ? 'Update Remark' : 'Save Remark'}
                    </button>
                </form>
                <div className="border-t border-slate-200 pt-4">
                    <button onClick={handlePreviewReport} disabled={!selectedClassId || !week} className="w-full bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-300">
                        Preview Report
                    </button>
                </div>
                {message && <p className="text-sm text-center text-red-600 pt-2">{message}</p>}
            </div>
        )}
        {previewData && <ReportPreview data={previewData} type={reportType} onClose={() => setPreviewData(null)} />}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Recent Remarks ({displayedRemarks.length})</h3>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2 max-h-[450px] overflow-y-auto">
          {displayedRemarks.length > 0 ? (
            displayedRemarks.map(remark => {
              const associatedClass = classes.find(c => c.id === remark.classId);
              return (
                <div key={remark.id} className="bg-white p-3 rounded shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-800">{associatedClass?.name}</p>
                      <p className="text-xs text-slate-500">{remark.week} | {remark.type} report</p>
                    </div>
                    <p className="text-xs text-slate-500">{remark.date}</p>
                  </div>
                  <p className="text-sm text-slate-700 mt-2 border-l-2 border-slate-200 pl-2">"{remark.remarkText}"</p>
                  <p className="text-xs text-right text-slate-600 mt-2">- {remark.authorName}</p>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-slate-500 px-2">No remarks found for your department.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceRemarks;