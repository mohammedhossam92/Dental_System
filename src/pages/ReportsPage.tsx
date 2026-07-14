import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Patient, Treatment, Student } from '../types';
import { Calendar, Users, Activity, Loader2, AlertCircle, Download, CheckCircle, Clock, UserPlus, BarChart2, Edit } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../context/LanguageContext';

type DatePreset = 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

export function ReportsPage() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [unregisteredStudents, setUnregisteredStudents] = useState<Student[]>([]);
  const [treatmentStats, setTreatmentStats] = useState<{ [key: string]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'treatments' | 'students' | 'unregistered'>('treatments');
  const { t, language } = useLanguage();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Set date range based on preset
  useEffect(() => {
    const now = new Date();
    const start = new Date();
    
    switch (datePreset) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        setDateRange({
          start: start.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        });
        break;
      case 'week':
        start.setDate(now.getDate() - now.getDay());
        start.setHours(0, 0, 0, 0);
        setDateRange({
          start: start.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        });
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        setDateRange({
          start: start.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        });
        break;
      case 'lastMonth':
        start.setMonth(now.getMonth() - 1);
        start.setDate(1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        setDateRange({
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        });
        break;
      default:
        break;
    }
  }, [datePreset]);

  // Calculate summary statistics
  const totalPatients = Object.values(treatmentStats).reduce((sum, count) => sum + count, 0);
  const activeStudents = students.filter(s => s.patients_in_progress > 0).length;
  const totalTreatments = treatments.length;
  const completionRate = students.length > 0 
    ? (students.reduce((sum, s) => sum + s.patients_completed, 0) / 
       students.reduce((sum, s) => sum + s.patients_completed + s.patients_in_progress, 1) * 100).toFixed(1)
    : 0;

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);
      
      try {
        let unregisteredQuery = supabase
          .from('students')
          .select('*')
          .eq('registration_status', 'unregistered');
        
        if (dateRange.start) {
          unregisteredQuery = unregisteredQuery.gte('unregistered_at', `${dateRange.start}T00:00:00.000Z`);
        }
        if (dateRange.end) {
          unregisteredQuery = unregisteredQuery.lte('unregistered_at', `${dateRange.end}T23:59:59.999Z`);
        }

        const [treatmentsRes, studentsRes, unregisteredRes] = await Promise.all([
          supabase.from('treatments').select('*').order('name'),
          supabase.from('students').select('*').eq('registration_status', 'registered').order('name'),
          unregisteredQuery
        ]);

        if (treatmentsRes.error) throw treatmentsRes.error;
        if (studentsRes.error) throw studentsRes.error;
        if (unregisteredRes.error) throw unregisteredRes.error;

        setTreatments(treatmentsRes.data || []);
        setStudents(studentsRes.data || []);
        setUnregisteredStudents(unregisteredRes.data || []);

        let patientsQuery = supabase
          .from('patients')
          .select('treatment_id');

        if (dateRange.start) {
          patientsQuery = patientsQuery.gte('created_at', `${dateRange.start}T00:00:00.000Z`);
        }
        if (dateRange.end) {
          patientsQuery = patientsQuery.lte('created_at', `${dateRange.end}T23:59:59.999Z`);
        }

        const { data: patientsData, error: patientsError } = await patientsQuery;
        if (patientsError) throw patientsError;

        const stats: { [key: string]: number } = {};
        patientsData?.forEach(p => {
          if (p.treatment_id) {
            stats[p.treatment_id] = (stats[p.treatment_id] || 0) + 1;
          }
        });
        setTreatmentStats(stats);
      } catch (err: any) {
        console.error('Error fetching report data:', err);
        setError(err.message || 'Failed to load report data');
      } finally {
        setIsLoading(false);
      }
    }

    if (dateRange.start || datePreset !== 'custom') {
      fetchData();
    }
  }, [dateRange, datePreset]);

  const exportToExcel = () => {
    const data = [
      ['Dental Clinic Management Summary Report'],
      ['Date Range', `${dateRange.start || 'All'} to ${dateRange.end || 'All'}`],
      [],
      ['Summary Metrics'],
      ['Total Patients Treated', totalPatients],
      ['Active Students', activeStudents],
      ['Total Treatment Types', totalTreatments],
      ['Completion Rate', `${completionRate}%`],
      [],
      ['Treatment Statistics'],
      ['Treatment', 'Patient Count'],
      ...treatments.map(t => [t.name, treatmentStats[t.id] || 0]),
      [],
      ['Student', 'Completed', 'In Progress', 'Total Cases'],
      ...students.map(s => [s.name, s.patients_completed, s.patients_in_progress, s.patients_completed + s.patients_in_progress])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summary Report');

    // Add Recently Unregistered Students sheet
    const unregisteredData = [
      ['Recently Unregistered Students Report'],
      ['Date Range', `${dateRange.start || 'All'} to ${dateRange.end || 'All'}`],
      [],
      ['Student Name', 'Mobile', 'City', 'University', 'University Type', 'Unregistration Date', 'Completed Cases', 'In Progress Cases'],
      ...unregisteredStudents.map(s => [
        s.name,
        s.mobile,
        s.city,
        s.university,
        s.university_type,
        s.unregistered_at ? new Date(s.unregistered_at).toLocaleString() : 'N/A',
        s.patients_completed,
        s.patients_in_progress
      ])
    ];
    const wsUnregistered = XLSX.utils.aoa_to_sheet(unregisteredData);
    XLSX.utils.book_append_sheet(wb, wsUnregistered, 'Unregistered Students');

    XLSX.writeFile(wb, `dental_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const renderSummaryCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-blue-100">{t('totalPatientsReport')}</p>
            <p className="text-3xl font-bold">{totalPatients}</p>
          </div>
          <Users className="h-10 w-10 opacity-20" />
        </div>
      </div>
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-green-100">{t('activeStudentsReport')}</p>
            <p className="text-3xl font-bold">{activeStudents}</p>
          </div>
          <UserPlus className="h-10 w-10 opacity-20" />
        </div>
      </div>
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-purple-100">{t('totalTreatmentsReport')}</p>
            <p className="text-3xl font-bold">{totalTreatments}</p>
          </div>
          <Activity className="h-10 w-10 opacity-20" />
        </div>
      </div>
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-amber-100">{t('completionRateReport')}</p>
            <p className="text-3xl font-bold">{completionRate}%</p>
          </div>
          <BarChart2 className="h-10 w-10 opacity-20" />
        </div>
      </div>
    </div>
  );

  const renderDatePresets = () => (
    <div className="flex flex-wrap gap-2 mb-6">
      {[
        { id: 'today', label: t('todayPreset') },
        { id: 'week', label: t('weekPreset') },
        { id: 'month', label: t('monthPreset') },
        { id: 'lastMonth', label: t('lastMonthPreset') },
        { id: 'custom', label: t('customPreset') }
      ].map(preset => (
        <button
          key={preset.id}
          onClick={() => setDatePreset(preset.id as DatePreset)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            datePreset === preset.id
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
      <p className="text-gray-600 dark:text-gray-400">{t('loading')}</p>
    </div>
  );

  const renderErrorState = () => (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Error Loading Data</h3>
      <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
      >
        Retry
      </button>
    </div>
  );

  const renderNoDataState = () => (
    <div className="text-center py-12">
      <BarChart2 className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">No Data Available</h3>
      <p className="text-gray-500 dark:text-gray-400">
        {datePreset === 'custom' && dateRange.start && dateRange.end
          ? `No data found for the selected date range (${dateRange.start} to ${dateRange.end})`
          : 'No data available for the selected time period.'}
      </p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-white mb-2">{t('reportsTitle')}</h1>
          <p className="text-gray-600 dark:text-gray-400">Track treatment progress and student performance</p>
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          {t('exportData')}
        </button>
      </div>

      {renderSummaryCards()}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex items-center rtl:space-x-reverse">
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2 ml-2" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">{t('datePreset')}</h2>
          </div>
          {renderDatePresets()}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{t('startDate')}</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              value={dateRange.start}
              onChange={(e) => {
                setDatePreset('custom');
                setDateRange(prev => ({ ...prev, start: e.target.value }));
              }}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">{t('endDate')}</label>
            <input
              type="date"
              className="w-full px-4 py-2 rounded-xl border bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              value={dateRange.end}
              onChange={(e) => {
                setDatePreset('custom');
                setDateRange(prev => ({ ...prev, end: e.target.value }));
              }}
              min={dateRange.start}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 rtl:space-x-reverse">
          <button
            onClick={() => setActiveTab('treatments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'treatments'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Treatment Statistics
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'students'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Student Performance
          </button>
          <button
            onClick={() => setActiveTab('unregistered')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'unregistered'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Recently Unregistered
          </button>
        </nav>
      </div>

      {isLoading ? (
        renderLoadingState()
      ) : error ? (
        renderErrorState()
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {activeTab === 'treatments' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Activity className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Treatment Statistics</h2>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {treatments.length} treatments
                </span>
              </div>
              
              {treatments.length === 0 ? (
                renderNoDataState()
              ) : (
                <div className="space-y-4">
                  {treatments.map((treatment) => {
                    const count = treatmentStats[treatment.id] || 0;
                    const percentage = totalPatients > 0 ? (count / totalPatients) * 100 : 0;
                    
                    return (
                      <div
                        key={treatment.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-800 dark:text-gray-200 font-medium">{treatment.name}</span>
                          <div className="flex items-center">
                            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {count}
                            </span>
                            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                              {count === 1 ? 'patient' : 'patients'}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeTab === 'students' ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Student Performance</h2>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {students.length} students
                </span>
              </div>
              
              {students.length === 0 ? (
                renderNoDataState()
              ) : (
                <div className="space-y-4">
                  {students.map((student) => {
                    const totalCases = student.patients_completed + student.patients_in_progress;
                    const completionRate = totalCases > 0 
                      ? (student.patients_completed / totalCases) * 100 
                      : 0;
                    
                    return (
                      <div
                        key={student.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="text-gray-800 dark:text-white font-medium block">{student.name}</span>
                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                              <span className="flex items-center mr-4">
                                <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-500" />
                                {student.patients_completed} completed
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3.5 w-3.5 mr-1 text-yellow-500" />
                                {student.patients_in_progress} in progress
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-center">
                              <span className="block text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                {totalCases}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Total Cases</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-2xl font-bold text-green-600 dark:text-green-400">
                                {completionRate.toFixed(1)}%
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Completion</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all duration-500"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 w-12 text-right">
                            {completionRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recently Unregistered Students</h2>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {unregisteredStudents.length} unregistered
                </span>
              </div>
              
              {unregisteredStudents.length === 0 ? (
                renderNoDataState()
              ) : (
                <div className="space-y-4">
                  {unregisteredStudents.map((student) => {
                    const totalCases = student.patients_completed + student.patients_in_progress;
                    return (
                      <div
                        key={student.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-[1.02]"
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div>
                            <span className="text-gray-800 dark:text-white font-medium block">{student.name}</span>
                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                              <span>
                                <strong>Mobile:</strong> {student.mobile}
                              </span>
                              <span>
                                <strong>University:</strong> {student.university} ({student.university_type})
                              </span>
                              <span className="text-red-600 dark:text-red-400 font-medium">
                                <strong>Unregistered:</strong> {formatDate(student.unregistered_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-6">
                            <div className="text-center">
                              <span className="block text-xl font-bold text-gray-700 dark:text-gray-300">
                                {student.patients_completed}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-xl font-bold text-yellow-600 dark:text-yellow-400">
                                {student.patients_in_progress}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">In Progress</span>
                            </div>
                            <button
                              onClick={() => navigate(`/students?edit=${student.id}`)}
                              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                              title="Edit Student"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
