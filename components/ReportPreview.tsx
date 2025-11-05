import React from 'react';
import { WeeklyTrainerReportData, WeeklyTraineeReportData, Day, TimeSlot } from '../types';

interface ReportPreviewProps {
  data: WeeklyTrainerReportData | WeeklyTraineeReportData | null;
  type: 'trainer' | 'trainee';
  onClose: () => void;
}

const timeSlots: TimeSlot[] = ['08:00-10:00', '10:00-12:00', '12:00-13:00', '13:00-15:00', '15:00-17:00'];
const days: Day[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const ReportPreview: React.FC<ReportPreviewProps> = ({ data, type, onClose }) => {
  if (!data) return null;

  return (
    <div className="mt-6 p-4 bg-white rounded-lg border border-slate-300 shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-slate-700">Report Preview</h3>
        <button onClick={onClose} className="text-sm font-semibold text-red-600 hover:text-red-800">&times; Close Preview</button>
      </div>
      <div className="overflow-x-auto">
        {type === 'trainer' ? (
          <TrainerReportPreview data={data as WeeklyTrainerReportData} />
        ) : (
          <TraineeReportPreview data={data as WeeklyTraineeReportData} />
        )}
      </div>
    </div>
  );
};

const TrainerReportPreview: React.FC<{ data: WeeklyTrainerReportData }> = ({ data }) => {
  return (
    <table className="min-w-full border-collapse text-xs">
      <thead>
        <tr className="bg-slate-100">
          <th className="p-2 border border-slate-200 text-left font-semibold text-slate-600">Time</th>
          {days.map(day => (
            <th key={day} className="p-2 border border-slate-200 text-left font-semibold text-slate-600 capitalize">
              {day} <span className="font-normal text-slate-500">({data.dates[day]})</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {timeSlots.map(time => (
          <tr key={time}>
            <td className="p-2 border border-slate-200 font-medium text-slate-500 align-top">{time}</td>
            {days.map(day => {
              const session = data.schedule[day]?.[time];
              return (
                <td key={`${day}-${time}`} className="p-2 border border-slate-200 align-top">
                  {session ? (
                    <div className="space-y-1">
                      <p><span className="font-semibold">Unit:</span> {session.subject}</p>
                      <p><span className="font-semibold">Trainer:</span> {session.trainer}</p>
                      <p><span className="font-semibold">Status:</span> {session.status}</p>
                    </div>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const TraineeReportPreview: React.FC<{ data: WeeklyTraineeReportData }> = ({ data }) => {
    return (
        <>
        <table className="min-w-full border-collapse text-xs">
            <thead>
                <tr className="bg-slate-100">
                    <th className="p-2 border border-slate-200 text-left font-semibold text-slate-600">Trainee Name</th>
                    <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Mon</th>
                    <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Tue</th>
                    <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Wed</th>
                    <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Thu</th>
                    <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Fri</th>
                    <th className="p-2 border border-slate-200 text-center font-semibold text-slate-600">Weekly %</th>
                </tr>
            </thead>
            <tbody>
                {data.attendanceGrid.map((row, index) => (
                    <tr key={index}>
                        <td className="p-2 border border-slate-200 font-medium">{row.name}</td>
                        <td className="p-2 border border-slate-200 text-center">{row.attendance.mon}</td>
                        <td className="p-2 border border-slate-200 text-center">{row.attendance.tue}</td>
                        <td className="p-2 border border-slate-200 text-center">{row.attendance.wed}</td>
                        <td className="p-2 border border-slate-200 text-center">{row.attendance.thu}</td>
                        <td className="p-2 border border-slate-200 text-center">{row.attendance.fri}</td>
                        <td className="p-2 border border-slate-200 text-center font-semibold">{row.weeklyPercentage.toFixed(1)}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
         <div className="mt-4 p-3 bg-slate-50 rounded-md text-xs">
            <h4 className="font-bold mb-2">Summary</h4>
            <p><strong>Overall Attendance:</strong> {data.summary.overallPercentage.toFixed(1)}%</p>
            <p><strong>Perfect Attendance ({data.summary.perfectAttendance.length}):</strong> {data.summary.perfectAttendance.join(', ') || 'None'}</p>
            <p><strong>Low Attendance (&lt;80%, {data.summary.lowAttendance.length}):</strong> {data.summary.lowAttendance.join(', ') || 'None'}</p>
        </div>
        </>
    );
};

export default ReportPreview;