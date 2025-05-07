import React, { useState, useEffect } from 'react';
import { Users, Stethoscope, UserCheck, Clock, CheckCircle, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, Patient, TreatmentVisit } from '../types';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    casesToday: 0,
    attendanceRate: 0,
    pendingCases: 0,
    totalCasesDone: 0,
    availableStudents: 0
  });
  const [registeredStudents, setRegisteredStudents] = useState(0);
  const [recentCases, setRecentCases] = useState<Patient[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Fetch all required data in parallel
      const [
        studentsResult,
        casesTodayResult,
        pendingCasesResult,
        completedCasesResult,
        recentCasesResult
      ] = await Promise.all([
        supabase.from('students').select('*'),
        supabase.from('patients').select('*').gte('created_at', todayStr),
        supabase.from('patients').select('*').eq('status', 'pending'),
        supabase.from('patients').select('*').eq('status', 'completed'),
        supabase
          .from('patients')
          .select(`
            *,
            student:students(name),
            treatment:treatments(name)
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Calculate stats
      const totalStudents = studentsResult.data?.length || 0;
      // Update this line to filter for both registered and available students
      const availableStudents = studentsResult.data?.filter(s => s.is_available && s.registration_status === 'registered').length || 0;
      const casesToday = casesTodayResult.data?.length || 0;
      const pendingCases = pendingCasesResult.data?.length || 0;
      const totalCasesDone = completedCasesResult.data?.length || 0;
      const presentStudents = studentsResult.data?.filter(s => s.is_available).length || 0;
      const attendanceRate = totalStudents ? Math.round((presentStudents / totalStudents) * 100) : 0;

      setStats({
        totalStudents,
        casesToday,
        attendanceRate,
        pendingCases,
        totalCasesDone,
        availableStudents
      });
      // Fix this line to use registration_status instead of status:
      setRegisteredStudents(studentsResult.data?.filter(s => s.registration_status === 'registered').length || 0);
      setRecentCases(recentCasesResult.data || []);
      setTodayAttendance(studentsResult.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-gray-600 dark:text-gray-400">Loading dashboard data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        <DashboardCard
          icon={<Users className="h-6 sm:h-8 w-6 sm:w-8 text-blue-500" />}
          title="Total Students"
          value={stats.totalStudents.toString()}
          subtitle="Total students in system"
        />
        <DashboardCard
          icon={<Users className="h-6 sm:h-8 w-6 sm:w-8 text-orange-500" />}
          title="Currently Registered Students"
          value={registeredStudents.toString()}
          subtitle="Students with registered status"
        />
        <DashboardCard
          icon={<UserPlus className="h-6 sm:h-8 w-6 sm:w-8 text-cyan-500" />}
          title="Available Students"
          value={stats.availableStudents.toString()}
          subtitle="Ready for new cases"
        />
        <DashboardCard
          icon={<Stethoscope className="h-6 sm:h-8 w-6 sm:w-8 text-green-500" />}
          title="Cases Today"
          value={stats.casesToday.toString()}
          subtitle="New cases today"
        />
        <DashboardCard
          icon={<CheckCircle className="h-6 sm:h-8 w-6 sm:w-8 text-emerald-500" />}
          title="Total Cases Done"
          value={stats.totalCasesDone.toString()}
          subtitle="Successfully completed"
        />
        {/* <DashboardCard
          icon={<UserCheck className="h-6 sm:h-8 w-6 sm:w-8 text-indigo-500" />}
          title="Attendance Rate"
          value={`${stats.attendanceRate}%`}
          subtitle="Present today"
        /> */}
        <DashboardCard
          icon={<Clock className="h-6 sm:h-8 w-6 sm:w-8 text-purple-500" />}
          title="Pending Cases"
          value={stats.pendingCases.toString()}
          subtitle="Awaiting assignment"
        />


      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Cases</h2>
          <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto">
            {recentCases.map((case_) => (
              <div key={case_.id} className="border-b dark:border-gray-700 pb-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {case_.treatment?.name || 'Unknown Treatment'}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Assigned to: {case_.student?.name || 'Unassigned'}
                    </p>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded self-start ${
                    case_.status === 'completed' 
                      ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
                      : case_.status === 'in_progress'
                      ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900'
                      : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900'
                  }`}>
                    {case_.status.charAt(0).toUpperCase() + case_.status.slice(1).replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Patient #{case_.ticket_number} • {new Date(case_.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Students */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900 dark:text-white">Available Students</h2>
          <div className="space-y-4 max-h-[calc(100vh-24rem)] overflow-y-auto">
            {todayAttendance.map((student) => (
              <div key={student.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b dark:border-gray-700 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">
                      {student.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {student.patients_completed} completed • {student.patients_in_progress} in progress
                    </p>
                  </div>
                </div>
                <span className={`text-sm px-2 py-1 rounded self-start sm:self-center ${
                  student.is_available
                    ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900'
                    : 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900'
                }`}>
                  {student.is_available ? 'Available' : 'Busy'}
                </span>
              </div>
            ))}
          </div>
        </div>
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 transition-all duration-200 hover:shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
          <p className="text-2xl sm:text-3xl font-bold mt-2 text-gray-900 dark:text-white">{value}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
        </div>
        {icon}
      </div>
    </div>
  );
}