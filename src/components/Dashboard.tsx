import React, { useState, useEffect } from 'react';
import { Users, Stethoscope, UserCheck, Clock, UserCircle, CheckCircle, UserPlus } from 'lucide-react';
import type { Student, Case, Attendance } from '../types';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    casesToday: 0,
    attendanceRate: 0,
    pendingCases: 0,
    totalCasesDone: 0,
    availableStudents: 0
  });
  const [recentCases, setRecentCases] = useState<Case[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<(Attendance & { student: Student })[]>([]);

  useEffect(() => {
    // Simulate API calls - replace with real API calls later
    const fetchData = () => {
      // Mock data
      setStats({
        totalStudents: 124,
        casesToday: 28,
        attendanceRate: 95,
        pendingCases: 12,
        totalCasesDone: 1458,
        availableStudents: 45
      });

      setRecentCases([
        {
          id: '1',
          studentId: 'std1',
          patientId: '12345',
          procedureType: 'Root Canal Treatment',
          date: new Date().toISOString(),
          supervisor: 'Dr. Sarah Johnson',
          notes: 'Procedure completed successfully',
          status: 'completed'
        },
        {
          id: '2',
          studentId: 'std2',
          patientId: '12346',
          procedureType: 'Dental Cleaning',
          date: new Date().toISOString(),
          supervisor: 'Dr. Michael Chen',
          notes: 'Regular cleaning procedure',
          status: 'completed'
        },
        {
          id: '3',
          studentId: 'std3',
          patientId: '12347',
          procedureType: 'Cavity Filling',
          date: new Date().toISOString(),
          supervisor: 'Dr. Emily Brown',
          notes: 'Minor cavity treatment',
          status: 'in-progress'
        }
      ]);

      setTodayAttendance([
        {
          id: 'att1',
          studentId: 'std1',
          date: new Date().toISOString(),
          status: 'present',
          student: {
            id: 'std1',
            name: 'John Doe',
            email: 'john@example.com',
            specialization: 'dental',
            year: 3
          }
        },
        {
          id: 'att2',
          studentId: 'std2',
          date: new Date().toISOString(),
          status: 'present',
          student: {
            id: 'std2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            specialization: 'medical',
            year: 2
          }
        },
        {
          id: 'att3',
          studentId: 'std3',
          date: new Date().toISOString(),
          status: 'late',
          student: {
            id: 'std3',
            name: 'Mike Wilson',
            email: 'mike@example.com',
            specialization: 'dental',
            year: 4
          }
        }
      ]);
    };

    fetchData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          icon={<Users className="h-8 w-8 text-blue-500" />}
          title="Total Students"
          value={stats.totalStudents.toString()}
          subtitle="Active students"
        />
        <DashboardCard
          icon={<Stethoscope className="h-8 w-8 text-green-500" />}
          title="Cases Today"
          value={stats.casesToday.toString()}
          subtitle="Across all students"
        />
        <DashboardCard
          icon={<UserCheck className="h-8 w-8 text-indigo-500" />}
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          subtitle="This month"
        />
        <DashboardCard
          icon={<Clock className="h-8 w-8 text-purple-500" />}
          title="Pending Cases"
          value={stats.pendingCases.toString()}
          subtitle="Requiring review"
        />
        <DashboardCard
          icon={<CheckCircle className="h-8 w-8 text-emerald-500" />}
          title="Total Cases Done"
          value={stats.totalCasesDone.toString()}
          subtitle="All time completed"
        />
        <DashboardCard
          icon={<UserPlus className="h-8 w-8 text-cyan-500" />}
          title="Available Students"
          value={stats.availableStudents.toString()}
          subtitle="Ready for new cases"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentCases cases={recentCases} />
        <AttendanceOverview attendanceList={todayAttendance} />
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, subtitle }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
          <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}

function RecentCases({ cases }: { cases: Case[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Cases</h2>
      <div className="space-y-4">
        {cases.map((case_) => (
          <div key={case_.id} className="border-b dark:border-gray-700 pb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">{case_.procedureType}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{case_.supervisor}</p>
              </div>
              <span className={`text-sm px-2 py-1 rounded ${
                case_.status === 'completed' 
                  ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
                  : case_.status === 'in-progress'
                  ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900'
                  : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
              }`}>
                {case_.status.charAt(0).toUpperCase() + case_.status.slice(1)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Patient #{case_.patientId} • {new Date(case_.date).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceOverview({ attendanceList }: { attendanceList: (Attendance & { student: Student })[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Today's Attendance</h2>
      <div className="space-y-4">
        {attendanceList.map((attendance) => (
          <div key={attendance.id} className="flex items-center justify-between border-b dark:border-gray-700 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-gray-500 dark:text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{attendance.student.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Year {attendance.student.year} • {attendance.student.specialization.charAt(0).toUpperCase() + attendance.student.specialization.slice(1)}
                </p>
              </div>
            </div>
            <span className={`text-sm px-2 py-1 rounded ${
              attendance.status === 'present'
                ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
                : attendance.status === 'late'
                ? 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900'
                : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
            }`}>
              {attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}