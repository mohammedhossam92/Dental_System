import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, Search, X, Filter, Edit, Trash2, Info, ChevronDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Student, WorkingDays, ClassYear, StudentWithDetails } from '../types';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';

export function StudentsPage() {
  const { organizationId } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [workingDays, setWorkingDays] = useState<WorkingDays[]>([]);
  const [classYears, setClassYears] = useState<ClassYear[]>([]);
  // Add new state for class year filter
  const [selectedClassYearFilter, setSelectedClassYearFilter] = useState<string>(() => {
    return localStorage.getItem('studentClassYearFilter') || 'all';
  });
  // Add the missing state variable for dropdown
  const [isClassYearDropdownOpen, setIsClassYearDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [error, setError] = useState('');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'name', 'mobile', 'working_days', 'status', 'registration'
  ]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

  // New state for sorting and filtering
  const [sortConfig, setSortConfig] = useState<{column: string | null, direction: 'asc' | 'desc' | null}>({
    column: null,
    direction: null
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [registrationFilter, setRegistrationFilter] = useState<'all' | 'registered' | 'unregistered' | 'pending'>('all');
  const [columnDropdownOpen, setColumnDropdownOpen] = useState<string | null>(null);
  const [universityFilter, setUniversityFilter] = useState<string>('all');
  const [universitySearchTerm, setUniversitySearchTerm] = useState<string>('');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [citySearchTerm, setCitySearchTerm] = useState<string>('');
  const [workingDaysFilter, setWorkingDaysFilter] = useState<string>('all');
  const [registrationEndDateFilter, setRegistrationEndDateFilter] = useState<string>('all');
  const uniqueRegistrationEndDates = React.useMemo(() => {
    const dates = students
      .map(s => s.registration_end_date)
      .filter((date): date is string => Boolean(date))
      .map(date => new Date(date).toISOString().split('T')[0]);
    return Array.from(new Set(dates)).sort();
  }, [students]);

  const [newStudent, setNewStudent] = useState<Omit<Student, 'id' | 'patients_in_progress' | 'patients_completed' | 'created_at'>>({
    name: '',
    mobile: '',
    city: '',
    university: '',
    university_type: 'حكومي',
    working_days_id: '',
    class_year_id: '',
    organization_id: '',
    registration_status: 'pending',
    registration_end_date: null,
    is_available: true // Add status field to state
  });

  const availableColumns = [
    { id: 'name', label: 'Name' },
    { id: 'mobile', label: 'Mobile' },
    { id: 'city', label: 'City' },
    { id: 'university', label: 'University' },
    { id: 'working_days', label: 'Working Days' },
    { id: 'status', label: 'Status' },
    { id: 'registration', label: 'Registration' },
    { id: 'registration_end_date', label: 'Registration End Date' }, // <-- Added
  ];

  const memoizedFetchData = useCallback(async () => {
    try {
      if (!organizationId) {
        console.error('No organization ID found');
        setError('Organization not found');
        return;
      }

      console.log('Organization ID:', organizationId);

      const [studentsResult, workingDaysResult, classYearsResult] = await Promise.all([
        supabase
          .from('students')
          .select('*, working_days:working_days_id (name, days)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('working_days')
          .select('*')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true }),
        supabase
          .from('class_years')
          .select('*')
          .eq('organization_id', organizationId)
          .order('year_range', { ascending: true })
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (workingDaysResult.error) throw workingDaysResult.error;
      if (classYearsResult.error) throw classYearsResult.error;

      setStudents(studentsResult.data || []);
      setWorkingDays(workingDaysResult.data || []);
      setClassYears(classYearsResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const memoizedCheckRegistrationStatus = useCallback(async () => {
    try {
      if (!organizationId) return;

      const today = new Date();
      const { data: expiredStudents, error } = await supabase
        .from('students')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('registration_status', 'registered')
        .lte('registration_end_date', today.toISOString());

      if (error) throw error;

      if (expiredStudents.length > 0) {
        const { error: updateError } = await supabase
          .from('students')
          .update({ registration_status: 'unregistered', registration_end_date: null })
          .in('id', expiredStudents.map(s => s.id));

        if (updateError) throw updateError;

        memoizedFetchData();
      }
    } catch (error) {
      console.error('Error checking registration status:', error);
    }
  }, [organizationId, memoizedFetchData]);

  useEffect(() => {
    const checkAndScheduleRegistration = () => {
      memoizedCheckRegistrationStatus();
      const now = new Date();
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();

      setTimeout(() => {
        memoizedCheckRegistrationStatus();
        setInterval(memoizedCheckRegistrationStatus, 24 * 60 * 60 * 1000);
      }, timeUntilMidnight);
    };

    memoizedFetchData();
    checkAndScheduleRegistration();
  }, [memoizedFetchData, memoizedCheckRegistrationStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate name has at least 4 words
    const nameWords = newStudent.name.trim().split(/\s+/);
    if (nameWords.length < 4) {
      setError('Name must contain at least 4 words');
      return;
    }

    // Validate mobile number is exactly 11 digits
    if (!/^\d{11}$/.test(newStudent.mobile)) {
      setError('Mobile number must be exactly 11 digits');
      return;
    }

    // Check if mobile number is unique (for new students)
    if (!isEditMode) {
      const { data: existingMobile } = await supabase
        .from('students')
        .select('id')
        .eq('mobile', newStudent.mobile)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (existingMobile) {
        setError('Mobile number already exists');
        return;
      }
    }

    // Continue with the rest of the function
    if (!organizationId) {
      setError('Organization not found');
      return;
    }

    const requiredFields = ['name', 'mobile', 'city', 'university', 'working_days_id'];
    const missingFields = requiredFields.filter(field => !newStudent[field as keyof typeof newStudent]);

    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const studentData = {
      ...newStudent,
      organization_id: organizationId,
      registration_end_date: newStudent.registration_status === 'registered' ? newStudent.registration_end_date : null,
      is_available: newStudent.is_available
    };

    try {
      if (isEditMode && selectedStudent) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', selectedStudent.id)
          .eq('organization_id', organizationId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([studentData]);

        if (error) throw error;
      }

      memoizedFetchData();
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving student:', error);
      setError('Failed to save student');
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      // First, delete related records in patients table
      const { error: patientsError } = await supabase
        .from('patients')
        .delete()
        .eq('student_id', id);

      if (patientsError) throw patientsError;

      // Then delete the student
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      memoizedFetchData();
    } catch (error) {
      console.error('Error deleting student:', error);
      setError('Failed to delete student');
    }
  }

  async function handleEdit(student: Student) {
  let latestStudentData = student;
  // Fetch the latest student data from the students table
  if (student.id) {
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('id', student.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!studentError && studentData) {
      latestStudentData = studentData;
    }
    // Note: registration_end_date intentionally not fetched or set
  }
  setNewStudent({
    name: latestStudentData.name,
    mobile: latestStudentData.mobile,
    city: latestStudentData.city,
    university: latestStudentData.university,
    university_type: latestStudentData.university_type || 'حكومي',
    working_days_id: latestStudentData.working_days_id,
    class_year_id: latestStudentData.class_year_id || '',
    organization_id: latestStudentData.organization_id,
    registration_status: latestStudentData.registration_status,
    registration_end_date: latestStudentData.registration_status === 'registered' && latestStudentData.registration_end_date
      ? new Date(latestStudentData.registration_end_date).toISOString().split('T')[0]
      : null,
    is_available: latestStudentData.is_available
  });
  setSelectedStudent(latestStudentData);
  setIsEditMode(true);
  setIsModalOpen(true);
}

  function resetForm() {
    setNewStudent({
      name: '',
      mobile: '',
      city: '',
      university: '',
      university_type: 'حكومي',
      working_days_id: '',
      class_year_id: '',
      organization_id: organizationId || '',
      registration_status: 'pending',
      registration_end_date: null,
      is_available: true
    });
    setIsEditMode(false);
    setSelectedStudent(null);
    setError('');
  }

  // Add function to generate and download Excel template
  const downloadExcelTemplate = async () => {
    try {
      // Fetch working days and class years for dropdown options
      const [workingDaysResult, classYearsResult] = await Promise.all([
        supabase
          .from('working_days')
          .select('id, name')
          .eq('organization_id', organizationId)
          .order('name', { ascending: true }),
        supabase
          .from('class_years')
          .select('id, year_range')
          .eq('organization_id', organizationId)
          .order('year_range', { ascending: true })
      ]);

      if (workingDaysResult.error) throw workingDaysResult.error;
      if (classYearsResult.error) throw classYearsResult.error;

      const workingDaysList = workingDaysResult.data || [];
      const classYearsList = classYearsResult.data || [];

      if (workingDaysList.length === 0) {
        Swal.fire({
          title: 'Error!',
          text: 'No working days found. Please create working days first.',
          icon: 'error',
          confirmButtonColor: '#4f46e5'
        });
        return;
      }

      // Create worksheet with headers
      const headers = [
        "Name",
        "Mobile",
        "City",
        "University",
        "University Type",
        "Working Days",
        "Class Year",
        "Registration Status"
      ];

      // Create example row to guide users
      const exampleRow = [
        "John Doe Smith",
        "01234567890",
        "Cairo",
        "Cairo University",
        "حكومي",
        workingDaysList[0]?.name || "",
        classYearsList[0]?.year_range || "",
        "registered"
      ];

      const wsData = [headers, exampleRow];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      const columnWidths = [
        { wch: 30 }, // Name
        { wch: 15 }, // Mobile
        { wch: 15 }, // City
        { wch: 25 }, // University
        { wch: 15 }, // University Type
        { wch: 20 }, // Working Days
        { wch: 15 }, // Class Year
        { wch: 15 }  // Registration Status
      ];
      ws['!cols'] = columnWidths;

      // Note: XLSX.js doesn't directly support data validation in the browser
      // The template will be structured but won't have dropdown validation
      // The values will be documented in the example row

      // Add the worksheet to the workbook
      XLSX.utils.book_append_sheet(wb, ws, "Students Template");

      // Generate Excel file
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

      // Create blob and download
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'students_template.xlsx';
      link.click();

      // Clean up
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error creating Excel template:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to generate Excel template',
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
    }
  };

  // Add state for import dropdown
  const [showImportDropdown, setShowImportDropdown] = useState(false);

  // Modify the file upload handler to have an option for adding without replacing
  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>, shouldReplace: boolean = true) {
    if (!event.target.files?.[0]) return;

    const file = event.target.files[0];

    // Check file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
      Swal.fire({
        title: 'Error!',
        text: 'Please upload a valid Excel file (.xlsx or .xls)',
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });
      event.target.value = '';
      return;
    }

    // Show loading state
    Swal.fire({
      title: 'Importing...',
      text: 'Please wait while we import the students',
      allowOutsideClick: false,
      showConfirmButton: false,
      willOpen: () => {
        Swal.showLoading();
      }
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as Record<string, string>[];

        // Validate if excel has required columns
        const requiredColumns = ['Name', 'Mobile', 'City', 'University'];
        const firstRow = rows[0];
        const missingColumns = requiredColumns.filter(col => !(col in firstRow));

        if (missingColumns.length > 0) {
          Swal.fire({
            title: 'Error!',
            text: `Excel file is missing required columns: ${missingColumns.join(', ')}`,
            icon: 'error',
            confirmButtonColor: '#4f46e5'
          });
          event.target.value = '';
          return;
        }

        if (!organizationId) {
          Swal.fire({
            title: 'Error!',
            text: 'Organization not found',
            icon: 'error',
            confirmButtonColor: '#4f46e5'
          });
          return;
        }

        // Fetch working days and class years for mapping
        const [workingDaysResult, classYearsResult] = await Promise.all([
          supabase.from('working_days').select('id, name').eq('organization_id', organizationId),
          supabase.from('class_years').select('id, year_range').eq('organization_id', organizationId)
        ]);

        if (workingDaysResult.error) throw workingDaysResult.error;
        if (classYearsResult.error) throw classYearsResult.error;

        const workingDaysMap = new Map(workingDaysResult.data.map(wd => [wd.name, wd.id]));
        const classYearsMap = new Map(classYearsResult.data.map(cy => [cy.year_range, cy.id]));

        // Prepare students data
        const students = rows.map(row => {
          const workingDaysName = row['Working Days'] || '';
          const workingDaysId = workingDaysMap.get(workingDaysName) || workingDaysResult.data[0]?.id || '';

          const classYearName = row['Class Year'] || '';
          const classYearId = classYearsMap.get(classYearName) || '';

          return {
            name: row['Name'] || '',
            mobile: row['Mobile'] || '',
            city: row['City'] || '',
            university: row['University'] || '',
            university_type: row['University Type'] || 'حكومي',
            working_days_id: workingDaysId,
            class_year_id: classYearId,
            organization_id: organizationId,
            registration_status: row['Registration Status'] || 'registered',
            registration_end_date: null
          };
        });

        // Validate students data
        const invalidStudents = students.filter(student =>
          !student.name ||
          !student.mobile ||
          !student.city ||
          !student.university ||
          !student.working_days_id
        );

        if (invalidStudents.length > 0) {
          Swal.fire({
            title: 'Warning!',
            text: `${invalidStudents.length} students have missing required fields and will be skipped.`,
            icon: 'warning',
            confirmButtonColor: '#4f46e5'
          });

          // Filter out invalid students
          const validStudents = students.filter(student =>
            student.name &&
            student.mobile &&
            student.city &&
            student.university &&
            student.working_days_id
          );

          if (validStudents.length === 0) {
            event.target.value = '';
            return;
          }

          if (shouldReplace) {
            // Confirm before replacing all students
            const confirmResult = await Swal.fire({
              title: 'Replace Existing Students?',
              text: 'This will replace all existing students. Are you sure you want to continue?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Yes, replace them!'
            });

            if (!confirmResult.isConfirmed) {
              event.target.value = '';
              return;
            }

            // Delete all existing students
            const { error: deleteError } = await supabase
              .from('students')
              .delete()
              .eq('organization_id', organizationId);

            if (deleteError) throw deleteError;
          }

          // Insert valid students
          const { error } = await supabase
            .from('students')
            .insert(validStudents);

          if (error) throw error;

          memoizedFetchData();
          event.target.value = '';

          Swal.fire({
            title: 'Success!',
            text: `Successfully ${shouldReplace ? 'replaced all students with' : 'added'} ${validStudents.length} students.`,
            icon: 'success',
            confirmButtonColor: '#4f46e5',
            timer: 2000
          });
        } else {
          if (shouldReplace) {
            // Confirm before replacing all students
            const confirmResult = await Swal.fire({
              title: 'Replace Existing Students?',
              text: 'This will replace all existing students. Are you sure you want to continue?',
              icon: 'warning',
              showCancelButton: true,
              confirmButtonColor: '#3085d6',
              cancelButtonColor: '#d33',
              confirmButtonText: 'Yes, replace them!'
            });

            if (!confirmResult.isConfirmed) {
              event.target.value = '';
              return;
            }

            // Delete all existing students
            const { error: deleteError } = await supabase
              .from('students')
              .delete()
              .eq('organization_id', organizationId);

            if (deleteError) throw deleteError;
          }

          // Insert all students
          const { error } = await supabase
            .from('students')
            .insert(students);

          if (error) throw error;

          memoizedFetchData();
          event.target.value = '';

          Swal.fire({
            title: 'Success!',
            text: `Successfully ${shouldReplace ? 'replaced all students with' : 'added'} ${students.length} students.`,
            icon: 'success',
            confirmButtonColor: '#4f46e5',
            timer: 2000
          });
        }
      } catch (error) {
        console.error('Error importing students:', error);

        Swal.fire({
          title: 'Error!',
          text: 'Failed to import students. Please check the file format and try again.',
          icon: 'error',
          confirmButtonColor: '#4f46e5'
        });

        event.target.value = '';
      }
    };

    reader.onerror = () => {
      Swal.fire({
        title: 'Error!',
        text: 'Failed to read the file. Please try again.',
        icon: 'error',
        confirmButtonColor: '#4f46e5'
      });

      event.target.value = '';
    };

    reader.readAsArrayBuffer(file);
  }

  function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchTerm(e.target.value);
  }

  // Add effect to persist filter selection
  useEffect(() => {
    localStorage.setItem('studentClassYearFilter', selectedClassYearFilter);
  }, [selectedClassYearFilter]);

  // Function to handle sorting
  const handleSort = (column: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';

    if (sortConfig.column === column) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }

    setSortConfig({ column, direction });
  };

  // Function to toggle column dropdown
  const toggleColumnDropdown = (column: string | null) => {
    if (columnDropdownOpen === column) {
      setColumnDropdownOpen(null);
    } else {
      setColumnDropdownOpen(column);
    }
  };

  // Get unique universities, cities and working days for filters
  const uniqueUniversities = React.useMemo(() => {
    const universities = students.map(student => student.university);
    return [...new Set(universities)].filter(Boolean).sort();
  }, [students]);

  const uniqueCities = React.useMemo(() => {
    const cities = students.map(student => student.city);
    return [...new Set(cities)].filter(Boolean).sort();
  }, [students]);

  // Filtered universities based on search term
  const filteredUniversities = React.useMemo(() => {
    if (!universitySearchTerm) return uniqueUniversities;
    return uniqueUniversities.filter(university =>
      university.toLowerCase().includes(universitySearchTerm.toLowerCase())
    );
  }, [uniqueUniversities, universitySearchTerm]);

  // Filtered cities based on search term
  const filteredCities = React.useMemo(() => {
    if (!citySearchTerm) return uniqueCities;
    return uniqueCities.filter(city =>
      city.toLowerCase().includes(citySearchTerm.toLowerCase())
    );
  }, [uniqueCities, citySearchTerm]);

  // Add state for city and university autocomplete
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showUniversityDropdown, setShowUniversityDropdown] = useState(false);

  // Filtered cities based on input
  const filteredCitiesForInput = React.useMemo(() => {
    if (!newStudent.city) return uniqueCities;
    return uniqueCities.filter(city =>
      city.toLowerCase().includes(newStudent.city.toLowerCase())
    );
  }, [uniqueCities, newStudent.city]);

  // Filtered universities based on input
  const filteredUniversitiesForInput = React.useMemo(() => {
    if (!newStudent.university) return uniqueUniversities;
    return uniqueUniversities.filter(university =>
      university.toLowerCase().includes(newStudent.university.toLowerCase())
    );
  }, [uniqueUniversities, newStudent.university]);

  // Modify the filteredStudents logic to include class year filtering, sorting, and column-specific filtering
  const filteredStudents = students
    .filter(student => {
      // First apply class year filter
      if (selectedClassYearFilter !== 'all' && student.class_year_id !== selectedClassYearFilter) {
        return false;
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'available' && !student.is_available) return false;
        if (statusFilter === 'busy' && student.is_available) return false;
      }

      // Apply registration filter
      if (registrationFilter !== 'all' && student.registration_status !== registrationFilter) {
        return false;
      }

      // Apply university filter
      if (universityFilter !== 'all' && student.university !== universityFilter) {
        return false;
      }

      // Apply city filter
      if (cityFilter !== 'all' && student.city !== cityFilter) {
        return false;
      }

      // Apply working days filter
      if (workingDaysFilter !== 'all' && student.working_days_id !== workingDaysFilter) {
        return false;
      }

      if (
        registrationEndDateFilter !== 'all' &&
        (!student.registration_end_date ||
          new Date(student.registration_end_date).toISOString().split('T')[0] !== registrationEndDateFilter)
      ) {
        return false;
      }

      // Then apply search term filter
      if (!searchTerm) return true;

      const searchTermLower = searchTerm.toLowerCase();
      return selectedColumns.some(column => {
        switch (column) {
          case 'name':
            return student.name.toLowerCase().includes(searchTermLower);
          case 'mobile':
            return student.mobile.includes(searchTerm);
          case 'university':
            return student.university.toLowerCase().includes(searchTermLower);
          case 'city':
            return student.city.toLowerCase().includes(searchTermLower);
          case 'status':
            return (student.is_available ? 'available' : 'busy').includes(searchTermLower);
          case 'registration':
            return student.registration_status.toLowerCase().includes(searchTermLower);
          default:
            return false;
        }
      });
    })
    .sort((a, b) => {
      if (!sortConfig.column || !sortConfig.direction) return 0;

      let valueA, valueB;

      switch (sortConfig.column) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'mobile':
          valueA = a.mobile;
          valueB = b.mobile;
          break;
        case 'university':
          valueA = a.university.toLowerCase();
          valueB = b.university.toLowerCase();
          break;
        case 'city':
          valueA = a.city.toLowerCase();
          valueB = b.city.toLowerCase();
          break;
        case 'status':
          valueA = a.is_available ? 'available' : 'busy';
          valueB = b.is_available ? 'available' : 'busy';
          break;
        case 'registration':
          valueA = a.registration_status;
          valueB = b.registration_status;
          break;
        default:
          return 0;
      }

      if (valueA < valueB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  function openInfoModal(student: Student) {
    setSelectedStudent(student);
    setIsInfoModalOpen(true);
  }

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Students Management</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Replace select with styled button */}
          <div className="relative">
            <button
              onClick={() => setIsClassYearDropdownOpen(!isClassYearDropdownOpen)}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Filter className="h-5 w-5 mr-2" />
              {selectedClassYearFilter === 'all'
                ? 'All Class Years'
                : classYears.find(year => year.id === selectedClassYearFilter)?.year_range || 'Class Year'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {isClassYearDropdownOpen && (
              <div className="absolute z-10 mt-1 w-56 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                <ul className="py-1 max-h-60 overflow-auto">
                  <li
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      selectedClassYearFilter === 'all'
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                        : 'text-gray-900 dark:text-white'
                    }`}
                    onClick={() => {
                      setSelectedClassYearFilter('all');
                      setIsClassYearDropdownOpen(false);
                    }}
                  >
                    All Class Years
                  </li>
                  {classYears.map((year) => (
                    <li
                      key={year.id}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedClassYearFilter === year.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                          : 'text-gray-900 dark:text-white'
                      }`}
                      onClick={() => {
                        setSelectedClassYearFilter(year.id);
                        setIsClassYearDropdownOpen(false);
                      }}
                    >
                      {year.year_range}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Replace Import Excel button with dropdown including Download Template option */}
          <div className="relative">
            <button
              onClick={() => setShowImportDropdown(!showImportDropdown)}
              className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
            >
              <Upload className="h-5 w-5 mr-2" />
              Import Excel
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>

            {showImportDropdown && (
              <div className="absolute z-10 mt-1 w-56 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 right-0">
                <ul className="py-1">
                  <li className="relative">
                    <button
                      onClick={() => {
                        downloadExcelTemplate();
                        setShowImportDropdown(false);
                      }}
                      className="flex items-center px-4 py-2 w-full text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </button>
                  </li>
                  <li className="border-t border-gray-200 dark:border-gray-700"></li>
                  <li className="relative">
                    <label className="flex items-center px-4 py-2 w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                      <Upload className="h-4 w-4 mr-2" />
                      Replace All Students
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          handleFileUpload(e, true);
                          setShowImportDropdown(false);
                        }}
                      />
                    </label>
                  </li>
                  <li className="relative">
                    <label className="flex items-center px-4 py-2 w-full cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white">
                      <Upload className="h-4 w-4 mr-2" />
                      Add to Existing Students
                      <input
                        type="file"
                        className="hidden"
                        accept=".xlsx,.xls"
                        onChange={(e) => {
                          handleFileUpload(e, false);
                          setShowImportDropdown(false);
                        }}
                      />
                    </label>
                  </li>
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Student
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={`Search by ${selectedColumns.join(', ')}...`}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors duration-200"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
        >
          <Filter className="h-5 w-5 mr-2" />
          Filter Columns
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                {selectedColumns.includes('name') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center">
                      <span>Name</span>
                      <div className="flex items-center ml-1">
                        <button
                          onClick={() => handleSort('name')}
                          className="focus:outline-none mr-1"
                          title="Sort by name"
                        >
                          {sortConfig.column === 'name' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-indigo-500" />
                            ) : sortConfig.direction === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <div className="h-3 w-3"></div>
                            )
                          ) : (
                            <div className="h-3 w-3"></div>
                          )}
                        </button>
                      </div>
                    </div>
                  </th>
                )}
                {selectedColumns.includes('mobile') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center">
                      <span>Mobile</span>
                      <button
                        onClick={() => handleSort('mobile')}
                        className="ml-1 focus:outline-none"
                      >
                        {sortConfig.column === 'mobile' ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-3 w-3 text-indigo-500" />
                          ) : sortConfig.direction === 'desc' ? (
                            <ArrowDown className="h-3 w-3 text-indigo-500" />
                          ) : (
                            <div className="h-3 w-3"></div>
                          )
                        ) : (
                          <div className="h-3 w-3"></div>
                        )}
                      </button>
                    </div>
                  </th>
                )}
                {selectedColumns.includes('city') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center relative">
                      <span>City</span>
                      <div className="flex items-center ml-1">
                        <button
                          onClick={() => handleSort('city')}
                          className="focus:outline-none mr-1"
                        >
                          {sortConfig.column === 'city' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-indigo-500" />
                            ) : sortConfig.direction === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <div className="h-3 w-3"></div>
                            )
                          ) : (
                            <div className="h-3 w-3"></div>
                          )}
                        </button>
                        <button
                          onClick={() => toggleColumnDropdown('city')}
                          className="focus:outline-none"
                        >
                          <Filter className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                        </button>
                      </div>

                      {columnDropdownOpen === 'city' && (
                        <div className="absolute z-10 mt-1 top-full left-0 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search city..."
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={citySearchTerm}
                                onChange={(e) => setCitySearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <ul className="py-1 max-h-60 overflow-auto">
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                cityFilter === 'all'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setCityFilter('all');
                                setCitySearchTerm('');
                                toggleColumnDropdown(null);
                              }}
                            >
                              All Cities
                            </li>
                            {filteredCities.map((city) => (
                              <li
                                key={city}
                                className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  cityFilter === city
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                                onClick={() => {
                                  setCityFilter(city);
                                  setCitySearchTerm('');
                                  toggleColumnDropdown(null);
                                }}
                              >
                                {city}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                {selectedColumns.includes('university') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center relative">
                      <span>University</span>
                      <div className="flex items-center ml-1">
                        <button
                          onClick={() => handleSort('university')}
                          className="focus:outline-none mr-1"
                        >
                          {sortConfig.column === 'university' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-indigo-500" />
                            ) : sortConfig.direction === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <div className="h-3 w-3"></div>
                            )
                          ) : (
                            <div className="h-3 w-3"></div>
                          )}
                        </button>
                        <button
                          onClick={() => toggleColumnDropdown('university')}
                          className="focus:outline-none"
                        >
                          <Filter className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                        </button>
                      </div>

                      {columnDropdownOpen === 'university' && (
                        <div className="absolute z-10 mt-1 top-full left-0 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                              <input
                                type="text"
                                placeholder="Search university..."
                                className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                value={universitySearchTerm}
                                onChange={(e) => setUniversitySearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <ul className="py-1 max-h-60 overflow-auto">
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                universityFilter === 'all'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setUniversityFilter('all');
                                setUniversitySearchTerm('');
                                toggleColumnDropdown(null);
                              }}
                            >
                              All Universities
                            </li>
                            {filteredUniversities.map((university) => (
                              <li
                                key={university}
                                className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  universityFilter === university
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                                onClick={() => {
                                  setUniversityFilter(university);
                                  setUniversitySearchTerm('');
                                  toggleColumnDropdown(null);
                                }}
                              >
                                {university}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                {selectedColumns.includes('working_days') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center relative">
                      <span>Working Days</span>
                      <div className="flex items-center ml-1">
                        <button
                          onClick={() => toggleColumnDropdown('working_days')}
                          className="focus:outline-none"
                        >
                          <Filter className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                        </button>
                      </div>

                      {columnDropdownOpen === 'working_days' && (
                        <div className="absolute z-10 mt-1 top-full left-0 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                          <ul className="py-1 max-h-60 overflow-auto">
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                workingDaysFilter === 'all'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setWorkingDaysFilter('all');
                                toggleColumnDropdown(null);
                              }}
                            >
                              All Working Days
                            </li>
                            {workingDays.map((workingDay) => (
                              <li
                                key={workingDay.id}
                                className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  workingDaysFilter === workingDay.id
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                                onClick={() => {
                                  setWorkingDaysFilter(workingDay.id);
                                  toggleColumnDropdown(null);
                                }}
                              >
                                {workingDay.name} ({workingDay.days.join(', ')})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                {selectedColumns.includes('status') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center relative">
                      <span>Status</span>
                      <div className="flex items-center ml-1">
                        <button
                          onClick={() => handleSort('status')}
                          className="focus:outline-none mr-1"
                        >
                          {sortConfig.column === 'status' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-indigo-500" />
                            ) : sortConfig.direction === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <div className="h-3 w-3"></div>
                            )
                          ) : (
                            <div className="h-3 w-3"></div>
                          )}
                        </button>
                        <button
                          onClick={() => toggleColumnDropdown('status')}
                          className="focus:outline-none"
                        >
                          <Filter className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                        </button>
                      </div>

                      {columnDropdownOpen === 'status' && (
                        <div className="absolute z-10 mt-1 top-full left-0 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                          <ul className="py-1">
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                statusFilter === 'all'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setStatusFilter('all');
                                toggleColumnDropdown(null);
                              }}
                            >
                              All
                            </li>
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                statusFilter === 'available'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setStatusFilter('available');
                                toggleColumnDropdown(null);
                              }}
                            >
                              Available
                            </li>
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                statusFilter === 'busy'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setStatusFilter('busy');
                                toggleColumnDropdown(null);
                              }}
                            >
                              Busy
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                {selectedColumns.includes('registration') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center relative">
                      <span>Registration</span>
                      <div className="flex items-center ml-1">
                        <button
                          onClick={() => handleSort('registration')}
                          className="focus:outline-none mr-1"
                        >
                          {sortConfig.column === 'registration' ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3 text-indigo-500" />
                            ) : sortConfig.direction === 'desc' ? (
                              <ArrowDown className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <div className="h-3 w-3"></div>
                            )
                          ) : (
                            <div className="h-3 w-3"></div>
                          )}
                        </button>
                        <button
                          onClick={() => toggleColumnDropdown('registration')}
                          className="focus:outline-none"
                        >
                          <Filter className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                        </button>
                      </div>

                      {columnDropdownOpen === 'registration' && (
                        <div className="absolute z-10 mt-1 top-full left-0 w-32 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                          <ul className="py-1">
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                registrationFilter === 'all'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setRegistrationFilter('all');
                                toggleColumnDropdown(null);
                              }}
                            >
                              All
                            </li>
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                registrationFilter === 'registered'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setRegistrationFilter('registered');
                                toggleColumnDropdown(null);
                              }}
                            >
                              Registered
                            </li>
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                registrationFilter === 'unregistered'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setRegistrationFilter('unregistered');
                                toggleColumnDropdown(null);
                              }}
                            >
                              Unregistered
                            </li>
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                registrationFilter === 'pending'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setRegistrationFilter('pending');
                                toggleColumnDropdown(null);
                              }}
                            >
                              Pending
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                {selectedColumns.includes('registration_end_date') && (
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center relative">
                      <span>Registration End Date</span>
                      <button
                        onClick={() => toggleColumnDropdown('registration_end_date')}
                        className="focus:outline-none ml-1"
                      >
                        <Filter className="h-3 w-3 text-gray-400 hover:text-indigo-500" />
                      </button>
                      {columnDropdownOpen === 'registration_end_date' && (
                        <div className="absolute z-10 mt-1 top-full left-0 w-48 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700">
                          <ul className="py-1 max-h-60 overflow-auto">
                            <li
                              className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                registrationEndDateFilter === 'all'
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                              onClick={() => {
                                setRegistrationEndDateFilter('all');
                                toggleColumnDropdown(null);
                              }}
                            >
                              All Dates
                            </li>
                            {uniqueRegistrationEndDates.map(date => (
                              <li
                                key={date}
                                className={`px-3 py-1 text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                  registrationEndDateFilter === date
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}
                                onClick={() => {
                                  setRegistrationEndDateFilter(date);
                                  toggleColumnDropdown(null);
                                }}
                              >
                                {date}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </th>
                )}
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    {selectedColumns.includes('name') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{student.name}</td>
                    )}
                    {selectedColumns.includes('mobile') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.mobile}</td>
                    )}
                    {selectedColumns.includes('city') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.city}</td>
                    )}
                    {selectedColumns.includes('university') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{student.university}</td>
                    )}
                    {selectedColumns.includes('working_days') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {(student as StudentWithDetails).working_days?.days?.join(', ') || ''}
                      </td>
                    )}
                    {selectedColumns.includes('status') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                          student.is_available
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {student.is_available ? 'Available' : 'Busy'}
                        </span>
                      </td>
                    )}
                    {selectedColumns.includes('registration') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex text-xs leading-5 font-semibold rounded-full px-2 py-1 ${
                          student.registration_status === 'registered'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : student.registration_status === 'unregistered'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {student.registration_status.charAt(0).toUpperCase() + student.registration_status.slice(1)}
                        </span>
                      </td>
                    )}
                    {selectedColumns.includes('registration_end_date') && (
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {student.registration_end_date ? new Date(student.registration_end_date).toLocaleDateString() : 'N/A'}
                      </td>
                    )}
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(student)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openInfoModal(student)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
                          title="Info"
                        >
                          <Info className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Columns Modal */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Filter Columns</h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4 max-h-80 overflow-y-auto">
              {availableColumns.map((column) => (
                <label key={column.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, column.id]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(c => c !== column.id));
                      }
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{column.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button
                onClick={() => {
                  // Select all columns
                  setSelectedColumns(availableColumns.map(col => col.id));
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Select All
              </button>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 w-full max-w-2xl mx-auto my-4 sm:my-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Edit Student' : 'Add New Student'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                    placeholder="Enter full name (at least 4 names)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Full name should include at least 4 names</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mobile
                  </label>
                  <input
                    type="number"
                    value={newStudent.mobile}
                    onChange={(e) => {
                      // Limit to 11 digits
                      if (e.target.value.length <= 11) {
                        setNewStudent({ ...newStudent, mobile: e.target.value });
                      }
                    }}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                    placeholder="Enter 11-digit mobile number"
                    maxLength={11}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-500 mt-1">Mobile number must be exactly 11 digits</p>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={newStudent.city}
                    onChange={(e) => {
                      setNewStudent({ ...newStudent, city: e.target.value });
                      setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => {
                      // Delay hiding dropdown to allow for selection
                      setTimeout(() => setShowCityDropdown(false), 200);
                    }}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                    placeholder="Enter city"
                  />
                  {showCityDropdown && filteredCitiesForInput.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-auto">
                      {filteredCitiesForInput.map((city, index) => (
                        <li
                          key={index}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm sm:text-base"
                          onMouseDown={() => {
                            setNewStudent({ ...newStudent, city });
                            setShowCityDropdown(false);
                          }}
                        >
                          {city}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    University
                  </label>
                  <input
                    type="text"
                    value={newStudent.university}
                    onChange={(e) => {
                      setNewStudent({ ...newStudent, university: e.target.value });
                      setShowUniversityDropdown(true);
                    }}
                    onFocus={() => setShowUniversityDropdown(true)}
                    onBlur={() => {
                      // Delay hiding dropdown to allow for selection
                      setTimeout(() => setShowUniversityDropdown(false), 200);
                    }}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                    placeholder="Enter university"
                  />
                  {showUniversityDropdown && filteredUniversitiesForInput.length > 0 && (
                    <ul className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-auto">
                      {filteredUniversitiesForInput.map((university, index) => (
                        <li
                          key={index}
                          className="px-3 py-1.5 sm:px-4 sm:py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm sm:text-base"
                          onMouseDown={() => {
                            setNewStudent({ ...newStudent, university });
                            setShowUniversityDropdown(false);
                          }}
                        >
                          {university}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    University Type
                  </label>
                  <select
                    value={newStudent.university_type}
                    onChange={(e) => setNewStudent({ ...newStudent, university_type: e.target.value as 'حكومي' | 'خاص' | 'اخري' })}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base appearance-none bg-no-repeat bg-right pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="حكومي">حكومي</option>
                    <option value="خاص">خاص</option>
                    <option value="اخري">اخري</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Working Days
                  </label>
                  <select
                    value={newStudent.working_days_id}
                    onChange={(e) => setNewStudent({ ...newStudent, working_days_id: e.target.value })}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base appearance-none bg-no-repeat bg-right pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="">Select working days</option>
                    {workingDays.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.days.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Class Year
                  </label>
                  <select
                    value={newStudent.class_year_id || ''}
                    onChange={(e) => setNewStudent({ ...newStudent, class_year_id: e.target.value })}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base appearance-none bg-no-repeat bg-right pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="">Select class year</option>
                    {classYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.year_range}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Registration Status
                  </label>
                  <select
                    value={newStudent.registration_status}
                    onChange={(e) => setNewStudent({
                      ...newStudent,
                      registration_status: e.target.value as typeof newStudent.registration_status,
                      registration_end_date: e.target.value !== 'registered' ? null : newStudent.registration_end_date
                    })}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base appearance-none bg-no-repeat bg-right pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="pending">Pending</option>
                    <option value="registered">Registered</option>
                    <option value="unregistered">Unregistered</option>
                  </select>
                </div>

                {newStudent.registration_status === 'registered' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Registration End Date
                    </label>
                    <input
                      type="date"
                      value={newStudent.registration_end_date || ''}
                      onChange={(e) => setNewStudent({ ...newStudent, registration_end_date: e.target.value || null })}
                      className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}

                {/* Student Status Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={newStudent.is_available ? 'available' : 'busy'}
                    onChange={e => setNewStudent({ ...newStudent, is_available: e.target.value === 'available' })}
                    className="w-full p-2 sm:p-2.5 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base appearance-none bg-no-repeat bg-right pr-8"
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 20 20\'%3e%3cpath stroke=\'%236b7280\' stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'1.5\' d=\'M6 8l4 4 4-4\'/%3e%3c/svg%3e")', backgroundSize: '1.5em 1.5em' }}
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                  </select>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-6 pt-4 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm sm:text-base"
                >
                  {isEditMode ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Info Modal */}
      {isInfoModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-3 z-50 transition-opacity duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 w-full max-w-lg mx-2 sm:mx-4 shadow-2xl transform transition-transform duration-300 scale-100 my-4">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Student Profile</h2>
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 p-1 sm:p-2"
                aria-label="Close"
              >
                <X className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* On mobile, display a profile summary at the top */}
            <div className="md:hidden mb-4 flex flex-col items-center border-b dark:border-gray-700 pb-4">
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">{selectedStudent.name}</p>
              <div className="flex space-x-3 mb-3">
                <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                  selectedStudent.registration_status === 'registered'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : selectedStudent.registration_status === 'unregistered'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>
                  {selectedStudent.registration_status.charAt(0).toUpperCase() + selectedStudent.registration_status.slice(1)}
                </span>
                <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                  selectedStudent.is_available
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {selectedStudent.is_available ? 'Available' : 'Busy'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-h-[60vh] overflow-y-auto pr-1">
              <div className="space-y-3 sm:space-y-4">
                <div className="hidden md:block">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedStudent.name}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Mobile</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedStudent.mobile}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">University</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedStudent.university}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">{selectedStudent.city}</p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Working Days</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {workingDays.find(wd => wd.id === selectedStudent.working_days_id)?.name || 'N/A'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Class Year</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {classYears.find(cy => cy.id === selectedStudent.class_year_id)?.year_range || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="hidden md:block">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Registration Status</label>
                  <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                    selectedStudent.registration_status === 'registered'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : selectedStudent.registration_status === 'unregistered'
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {selectedStudent.registration_status.charAt(0).toUpperCase() + selectedStudent.registration_status.slice(1)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Registration End Date</label>
                  <p className="text-sm sm:text-base text-gray-900 dark:text-white">
                    {selectedStudent.registration_end_date ? new Date(selectedStudent.registration_end_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>

                <div className="hidden md:block">
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Availability Status</label>
                  <span className={`inline-flex text-xs font-semibold rounded-full px-2 py-1 ${
                    selectedStudent.is_available
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {selectedStudent.is_available ? 'Available' : 'Busy'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Patients in Progress</label>
                  <div className="flex items-center">
                    <span className="text-lg sm:text-xl font-bold text-indigo-600 dark:text-indigo-400">{selectedStudent.patients_in_progress}</span>
                    <span className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">patients</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Patients Completed</label>
                  <div className="flex items-center">
                    <span className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">{selectedStudent.patients_completed}</span>
                    <span className="ml-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">patients</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t dark:border-gray-700">
              <button
                onClick={() => setIsInfoModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors duration-200 flex items-center text-sm sm:text-base"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
