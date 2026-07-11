import React, { useState, useEffect } from 'react';
import { 
  getStoredUsers, saveUsers, getStoredClasses, saveClasses, 
  getStoredExams, saveExams, getStoredAssignments, saveAssignments, 
  getStoredSettings, saveSettings, getAdminStats,
  getStoredSecurityLogs, addSecurityLog,
  getStoredNotifications, saveNotifications, formatNotificationTime
} from './data/mockData';
import { User, Class, Exam, Assignment, CenterSettings, RouteType, ExamType, AppNotification, Role } from './types';
import { Language, translations } from './data/translations';

// Components
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import PermissionTable from './components/owner/PermissionTable';
import OwnerSettings from './components/owner/OwnerSettings';
import OwnerUserTable from './components/owner/OwnerUserTable';
import RoleModal from './components/owner/RoleModal';
import OwnerSidebar from './components/owner/OwnerSidebar';
import AdminSidebar from './components/admin/AdminSidebar';
import AdminHeader from './components/admin/AdminHeader';
import StatCard from './components/admin/StatCard';
import ExamCard from './components/admin/ExamCard';
import ClassCard from './components/admin/ClassCard';
import DataTable from './components/admin/DataTable';
import ChartCard from './components/admin/ChartCard';
import AssignmentCard from './components/admin/AssignmentCard';
import StudentPortal from './components/student/StudentPortal';

// Icons
import { 
  Users, School, BookOpen, Clock, AlertTriangle, Key, 
  Plus, Search, HelpCircle, ShieldAlert, Settings, FileText,
  UserCheck, ShieldCheck, Mail, Phone, Calendar, ArrowRight, X, ChevronRight, CheckCircle2, Lock, Unlock, Ban,
  Eye, Edit, Trash2
} from 'lucide-react';

export default function App() {
  // Sync core lists
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);

  // Theme & Language
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<Language>('vi');

  // Core Notifications List (loaded/saved dynamically via localStorage)
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const getActiveNotifications = () => {
    if (!currentUser) return [];
    const filtered = notifications.filter(n => {
      // If targeted to a specific userId, check if it matches
      if (n.userId && n.userId !== currentUser.id) return false;
      // If targeted to a role, check if it matches
      if (n.role && n.role !== currentUser.role) return false;
      return true;
    });

    // Format times dynamically to make sure they are always true and relative!
    return filtered.map(n => ({
      ...n,
      timeVi: formatNotificationTime(n.createdAt, 'vi'),
      timeEn: formatNotificationTime(n.createdAt, 'en')
    }));
  };

  const handleMarkAllRead = () => {
    if (!currentUser) return;
    const updated = notifications.map(n => {
      const isTarget = (!n.userId || n.userId === currentUser.id) && (!n.role || n.role === currentUser.role);
      return isTarget ? { ...n, isRead: true } : n;
    });
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleClearNotifications = () => {
    if (!currentUser) return;
    // Keep notifications for other roles/users, only clear for current active view
    const updated = notifications.filter(n => {
      const isTarget = (!n.userId || n.userId === currentUser.id) && (!n.role || n.role === currentUser.role);
      return !isTarget;
    });
    setNotifications(updated);
    saveNotifications(updated);
  };

  const handleMarkRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  };

  // Helper to trigger a real notification in real-time
  const triggerAddNotification = (textVi: string, textEn: string, role?: Role, userId?: string) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      role,
      userId,
      textVi,
      textEn,
      timeVi: 'Vừa xong',
      timeEn: 'Just now',
      isRead: false,
      createdAt: new Date().toISOString()
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    saveNotifications(updated);
  };

  // Handle body theme side-effect
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.remove('dark-theme');
    }
  }, [theme]);

  // Authentication & routing states
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ielts_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const [currentRoute, setCurrentRoute] = useState<RouteType>(() => {
    const saved = localStorage.getItem('ielts_current_route');
    return (saved as RouteType) || 'login';
  });

  // Persist currentUser and currentRoute to localStorage so reloads don't log the user out
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ielts_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ielts_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('ielts_current_route', currentRoute);
  }, [currentRoute]);

  // Sub-detail states
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);

  // Class detail TAB choice
  const [classDetailTab, setClassDetailTab] = useState<'members' | 'assignments'>('members');

  // Modal display states
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<User | null>(null);
  const [roleActionType, setRoleActionType] = useState<'grant' | 'revoke' | null>(null);

  // Administrative form modals
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAddStudentToClassModal, setShowAddStudentToClassModal] = useState(false);

  // Input states for administrative creation forms
  const [newClassName, setNewClassName] = useState('');
  const [newClassStatus, setNewClassStatus] = useState<'active' | 'inactive'>('active');

  const [newExamTitle, setNewExamTitle] = useState('');
  const [newExamType, setNewExamType] = useState<ExamType>('listening');
  const [newExamDuration, setNewExamDuration] = useState(40);
  const [newExamQuestions, setNewExamQuestions] = useState(40);
  const [newExamStatus, setNewExamStatus] = useState<'published' | 'draft'>('published');

  const [assignExamId, setAssignExamId] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('2026-07-25');
  const [assignNotify, setAssignNotify] = useState(true);

  const [enrollStudentSearch, setEnrollStudentSearch] = useState('');

  const [securityLogs, setSecurityLogs] = useState<any[]>([]);

  // Center settings editing and notification states
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [showSettingsSuccess, setShowSettingsSuccess] = useState(false);
  const [viewingStudentDetail, setViewingStudentDetail] = useState<User | null>(null);

  // Loaded once on mount with active truthfulness validation
  useEffect(() => {
    const loadedUsers = getStoredUsers();
    const loadedClasses = getStoredClasses();
    const loadedExams = getStoredExams();
    const loadedAssignments = getStoredAssignments();
    const loadedSettings = getStoredSettings();
    const loadedSecurityLogs = getStoredSecurityLogs();
    const loadedNotifications = getStoredNotifications();

    // Sanitize classes on initial load
    const studentIdsSet = new Set(loadedUsers.filter(u => u.role === 'student').map(u => u.id));
    const sanitizedClasses = loadedClasses.map(cls => ({
      ...cls,
      studentIds: cls.studentIds.filter(id => studentIdsSet.has(id))
    }));

    setUsers(loadedUsers);
    setClasses(sanitizedClasses);
    saveClasses(sanitizedClasses);
    setExams(loadedExams);
    setAssignments(loadedAssignments);
    setSettings(loadedSettings);
    setSecurityLogs(loadedSecurityLogs);

    // Sync logged-in currentUser with loaded central database users list to prevent stale roles/permissions on reload
    if (currentUser) {
      const latestUser = loadedUsers.find(u => u.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
      if (latestUser) {
        setCurrentUser(latestUser);
        if (latestUser.role !== currentUser.role) {
          if (latestUser.role === 'owner') {
            setCurrentRoute('owner/dashboard');
          } else if (latestUser.role === 'admin') {
            setCurrentRoute('admin/dashboard');
          } else {
            setCurrentRoute('student/dashboard');
          }
        }
      }
    }

    // Active truthfulness validation: Filter out any notification whose content references non-existent data,
    // ensuring notifications match exactly 100% with the real current database entities and events.
    const cleanNotifications = loadedNotifications.filter(n => {
      // General system ready message is always true
      if (n.id === 'sys-ready-notification' || n.textVi.includes('khởi động') || n.textVi.includes('sẵn sàng')) {
        return true;
      }

      // Check if it's about a class
      const mentionsClass = n.textVi.includes('lớp') || n.textVi.includes('Lớp');
      const classMatch = loadedClasses.some(cls => n.textVi.includes(cls.name));
      if (mentionsClass && !classMatch) return false;

      // Check if it's about an exam or assignment
      const mentionsExamOrAssignment = n.textVi.includes('bài') || n.textVi.includes('đề') || n.textVi.includes('Reading') || n.textVi.includes('Listening') || n.textVi.includes('Writing') || n.textVi.includes('Speaking');
      const examMatch = loadedExams.some(ex => n.textVi.includes(ex.title));
      const assignmentMatch = loadedAssignments.some(a => n.textVi.includes(a.title));
      if (mentionsExamOrAssignment && !examMatch && !assignmentMatch) return false;

      // Check if it mentions a specific student or user
      const mentionsStudent = n.textVi.includes('Học sinh') || n.textVi.includes('học sinh') || n.textVi.includes('Bạn vừa được thêm') || n.textVi.includes('Bạn đã nộp') || n.textVi.includes('Bạn đạt');
      const studentMatch = loadedUsers.some(u => n.textVi.includes(u.name) || n.userId === u.id);
      if (mentionsStudent && !studentMatch) return false;

      // Remove any legacy mock names or placeholders
      const containsMockKeywords = 
        n.textVi.includes('Masterclass') || 
        n.textVi.includes('Reading Test 02') || 
        n.textVi.includes('Listening Test 05') || 
        n.textVi.includes('Writing Task 2') ||
        n.textVi.includes('Nguyễn Văn A') ||
        n.textVi.includes('Trần Thị B') ||
        n.textVi.includes('IELTS Foundation') ||
        n.id.startsWith('init-');
      if (containsMockKeywords) return false;

      return true;
    });

    setNotifications(cleanNotifications);
    saveNotifications(cleanNotifications);
  }, []);

  // Automatically check-in student to calculate their streak when logged in
  useEffect(() => {
    if (currentUser && currentUser.role === 'student' && users.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const lastCheckIn = currentUser.lastCheckInDate;
      
      let newStreak = currentUser.streak || 0;
      let shouldUpdate = false;
      
      if (!lastCheckIn) {
        newStreak = 1;
        shouldUpdate = true;
      } else {
        const lastDate = new Date(lastCheckIn + 'T00:00:00');
        const todayDate = new Date(today + 'T00:00:00');
        const diffTime = todayDate.getTime() - lastDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak += 1;
          shouldUpdate = true;
        } else if (diffDays > 1) {
          newStreak = 1;
          shouldUpdate = true;
        }
      }
      
      if (shouldUpdate || currentUser.lastCheckInDate !== today || currentUser.streak !== newStreak) {
        const updatedUser: User = {
          ...currentUser,
          streak: newStreak,
          lastCheckInDate: today
        };
        // Update state and localstorage
        setCurrentUser(updatedUser);
        const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
      }
    }
  }, [currentUser?.id, users.length]);

  const triggerAddLog = (action: string, detail: string) => {
    addSecurityLog(action, detail);
    setSecurityLogs(getStoredSecurityLogs());
  };

  // Sync back to local storage whenever states alter
  const updateUsersState = (newUsers: User[]) => {
    setUsers(newUsers);
    saveUsers(newUsers);

    // Filter classes to make sure ONLY users with role === 'student' remain in studentIds
    const studentIdsSet = new Set(newUsers.filter(u => u.role === 'student').map(u => u.id));
    const sanitizedClasses = classes.map(cls => ({
      ...cls,
      studentIds: cls.studentIds.filter(id => studentIdsSet.has(id))
    }));
    setClasses(sanitizedClasses);
    saveClasses(sanitizedClasses);
  };

  const updateClassesState = (newClasses: Class[]) => {
    // Filter classes to make sure ONLY users with role === 'student' remain in studentIds
    const studentIdsSet = new Set(users.filter(u => u.role === 'student').map(u => u.id));
    const sanitizedClasses = newClasses.map(cls => ({
      ...cls,
      studentIds: cls.studentIds.filter(id => studentIdsSet.has(id))
    }));
    setClasses(sanitizedClasses);
    saveClasses(sanitizedClasses);
  };

  const updateExamsState = (newExams: Exam[]) => {
    setExams(newExams);
    saveExams(newExams);
  };

  const updateAssignmentsState = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
    saveAssignments(newAssignments);
  };

  const updateSettingsState = (newSettings: CenterSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Auth hooks
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    // Route appropriately
    if (user.role === 'owner') {
      setCurrentRoute('owner/dashboard');
    } else if (user.role === 'admin') {
      setCurrentRoute('admin/dashboard');
    } else {
      setCurrentRoute('student/dashboard');
    }
  };

  const handleRegisterSuccess = (newStudent: User) => {
    // Save to users list
    const updated = [...users, newStudent];
    updateUsersState(updated);
    
    // Add real, factual notifications
    triggerAddNotification(
      `Chào mừng ${newStudent.name} đã đăng ký tài khoản thành công!`,
      `Welcome ${newStudent.name}! Your student account has been successfully registered.`,
      'student',
      newStudent.id
    );
    triggerAddNotification(
      `👤 Học sinh ${newStudent.name} vừa đăng ký tài khoản.`,
      `👤 Student ${newStudent.name} has registered a new account.`,
      'admin'
    );

    // Automatically log in the registered student
    setCurrentUser(newStudent);
    setCurrentRoute('student/dashboard');
  };

  const handleUpdateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    updateUsersState(updatedUsers);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRoute('login');
  };

  // OWNER Permission workflows
  const initiateGrantAdmin = (userId: string) => {
    const userObj = users.find(u => u.id === userId);
    if (userObj) {
      setSelectedUserForRole(userObj);
      setRoleActionType('grant');
      setIsRoleModalOpen(true);
    }
  };

  const initiateRevokeAdmin = (userId: string) => {
    const userObj = users.find(u => u.id === userId);
    if (userObj) {
      setSelectedUserForRole(userObj);
      setRoleActionType('revoke');
      setIsRoleModalOpen(true);
    }
  };

  const executeRoleToggle = () => {
    if (!selectedUserForRole || !roleActionType) return;

    const targetRole = roleActionType === 'grant' ? 'admin' : 'student';
    
    const updated = users.map(u => {
      if (u.id === selectedUserForRole.id) {
        return { ...u, role: targetRole };
      }
      // If we are granting admin, demote any other admin to student to enforce "only one admin"
      if (roleActionType === 'grant' && u.role === 'admin') {
        return { ...u, role: 'student' as const };
      }
      return u;
    });

    updateUsersState(updated);
    
    // Add real security logs and dynamic notifications
    if (roleActionType === 'grant') {
      triggerAddLog('Phân quyền Admin', `Cấp quyền Quản trị viên (Admin) cho "${selectedUserForRole.name}"`);
      
      triggerAddNotification(
        `Bạn vừa được Chủ sở hữu hệ thống cấp quyền Quản trị viên (Admin).`,
        `You have been granted Administrator privileges by the System Owner.`,
        'admin',
        selectedUserForRole.id
      );
      triggerAddNotification(
        `🔑 Bạn vừa cấp quyền Admin cho ${selectedUserForRole.name}.`,
        `🔑 You have successfully granted Admin privileges to ${selectedUserForRole.name}.`,
        'owner'
      );
    } else {
      triggerAddLog('Thu hồi quyền Admin', `Thu hồi quyền Quản trị viên (Admin) của "${selectedUserForRole.name}"`);
      
      triggerAddNotification(
        `Quyền Quản trị viên của bạn đã bị thu hồi bởi Chủ sở hữu. Vai trò mới của bạn là Học viên.`,
        `Your Administrator privileges have been revoked. Your new role is Student.`,
        'student',
        selectedUserForRole.id
      );
      triggerAddNotification(
        `🔒 Quyền Admin của ${selectedUserForRole.name} đã bị thu hồi.`,
        `🔒 Admin privileges for ${selectedUserForRole.name} have been revoked.`,
        'owner'
      );
    }

    setIsRoleModalOpen(false);
    setSelectedUserForRole(null);
    setRoleActionType(null);
  };

  // Student lock toggling
  const handleToggleStudentLock = (userId: string) => {
    const userObj = users.find(u => u.id === userId);
    const updated = users.map(u => {
      if (u.id === userId) {
        const newStatus = u.status === 'active' ? 'locked' as const : 'active' as const;
        return { ...u, status: newStatus };
      }
      return u;
    });
    updateUsersState(updated);
    
    if (userObj) {
      const isLocking = userObj.status === 'active';
      triggerAddLog(
        isLocking ? 'Khóa tài khoản' : 'Mở khóa tài khoản', 
        `Đã ${isLocking ? 'khóa' : 'mở khóa'} thành công tài khoản "${userObj.name}"`
      );

      triggerAddNotification(
        `Tài khoản của bạn đã bị ${isLocking ? 'khóa tạm thời' : 'mở khóa'} bởi Ban quản trị.`,
        `Your account has been ${isLocking ? 'temporarily locked' : 'unlocked'} by the Admin.`,
        'student',
        userId
      );
      triggerAddNotification(
        `Đã ${isLocking ? 'khóa' : 'mở khóa'} thành công tài khoản học viên "${userObj.name}".`,
        `Successfully ${isLocking ? 'locked' : 'unlocked'} student account "${userObj.name}".`,
        'admin'
      );
      triggerAddNotification(
        `Đã ${isLocking ? 'khóa' : 'mở khóa'} thành công tài khoản học viên "${userObj.name}".`,
        `Successfully ${isLocking ? 'locked' : 'unlocked'} student account "${userObj.name}".`,
        'owner'
      );
    }
  };

  // Adding class
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    const newClass: Class = {
      id: `class-${Date.now()}`,
      name: newClassName.trim(),
      status: newClassStatus,
      createdAt: new Date().toISOString().split('T')[0],
      studentIds: []
    };

    updateClassesState([...classes, newClass]);

    triggerAddNotification(
      `Lớp học mới "${newClass.name}" đã được tạo thành công trên hệ thống.`,
      `New class "${newClass.name}" has been successfully created.`,
      'admin'
    );
    triggerAddNotification(
      `Lớp học mới "${newClass.name}" đã được tạo thành công trên hệ thống.`,
      `New class "${newClass.name}" has been successfully created.`,
      'owner'
    );

    setNewClassName('');
    setShowAddClassModal(false);
  };

  // Adding exam
  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle.trim()) return;

    const newExam: Exam = {
      id: `exam-${newExamType}-${Date.now()}`,
      title: newExamTitle.trim(),
      type: newExamType,
      duration: newExamDuration,
      questionsCount: newExamQuestions,
      status: newExamStatus,
      createdAt: new Date().toISOString().split('T')[0]
    };

    updateExamsState([...exams, newExam]);

    triggerAddNotification(
      `📝 Có đề thi mới được thêm.`,
      `📝 A new exam has been added.`,
      'admin'
    );
    triggerAddNotification(
      `📝 Có đề thi mới được thêm.`,
      `📝 A new exam has been added.`,
      'owner'
    );
    triggerAddNotification(
      `📢 Có đề luyện tập mới.`,
      `📢 A new practice exam has been added.`,
      'student'
    );

    setNewExamTitle('');
    setShowAddExamModal(false);
  };

  // Adding member to class
  const handleEnrollStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassId || !enrollStudentSearch.trim()) return;

    // Search student by phone or email
    const student = users.find(u => 
      u.role === 'student' && 
      (u.phone === enrollStudentSearch.trim() || u.email.toLowerCase() === enrollStudentSearch.trim().toLowerCase())
    );

    if (!student) {
      alert('Không tìm thấy học sinh nào khớp với Số điện thoại hoặc Email này trên hệ thống. Hãy thử bằng sđt học viên "0987654321".');
      return;
    }

    // Check if already in class
    const cls = classes.find(c => c.id === activeClassId);
    if (cls?.studentIds.includes(student.id)) {
      alert('Học viên này đã ở trong lớp học này rồi.');
      return;
    }

    // Add to class student list
    const updatedClasses = classes.map(c => {
      if (c.id === activeClassId) {
        return { ...c, studentIds: [...c.studentIds, student.id] };
      }
      return c;
    });

    updateClassesState(updatedClasses);

    // Add real notifications
    const targetClass = classes.find(c => c.id === activeClassId);
    if (targetClass) {
      triggerAddNotification(
        `🏫 Bạn vừa được thêm vào lớp ${targetClass.name}.`,
        `🏫 You have been added to class ${targetClass.name}.`,
        'student',
        student.id
      );
      triggerAddNotification(
        `🏫 Học sinh ${student.name} vừa được thêm vào lớp ${targetClass.name}.`,
        `🏫 Student ${student.name} has been added to class ${targetClass.name}.`,
        'admin'
      );
      triggerAddNotification(
        `🏫 Học sinh ${student.name} vừa được thêm vào lớp ${targetClass.name}.`,
        `🏫 Student ${student.name} has been added to class ${targetClass.name}.`,
        'owner'
      );
    }

    setEnrollStudentSearch('');
    setShowAddStudentToClassModal(false);
  };

  // Assign Homework form submit
  const handleAssignHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClassId || !assignExamId) return;

    const exam = exams.find(ex => ex.id === assignExamId);
    if (!exam) return;

    const cls = classes.find(c => c.id === activeClassId);
    if (!cls) return;

    // Build default pending submission list for all students currently in class
    const submissions = cls.studentIds.map(studentId => ({
      studentId,
      status: 'pending' as const
    }));

    const newAssignment: Assignment = {
      id: `assign-${Date.now()}`,
      classId: activeClassId,
      examId: assignExamId,
      title: `Bài tập: ${exam.title}`,
      type: exam.type,
      createdAt: new Date().toISOString().split('T')[0],
      deadline: assignDeadline,
      status: 'active',
      submissions
    };

    updateAssignmentsState([...assignments, newAssignment]);

    // Send notification to all enrolled students
    cls.studentIds.forEach(studentId => {
      triggerAddNotification(
        `📚 Giáo viên vừa giao bài ${exam.title}.`,
        `📚 Teacher assigned ${exam.title}.`,
        'student',
        studentId
      );
    });

    triggerAddNotification(
      `📚 ${exam.title} đã được giao cho lớp ${cls.name}.`,
      `📚 ${exam.title} has been assigned to class ${cls.name}.`,
      'admin'
    );
    triggerAddNotification(
      `📚 ${exam.title} đã được giao cho lớp ${cls.name}.`,
      `📚 ${exam.title} has been assigned to class ${cls.name}.`,
      'owner'
    );

    setShowAssignModal(false);
    
    if (assignNotify) {
      alert(`Bài tập đã được giao thành công!\nHệ thống gửi thông báo đến ${cls.studentIds.length} học viên lớp "${cls.name}".`);
    }
  };

  const handleDeassignHomework = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy giao bài tập này? Mọi câu trả lời và điểm số liên quan sẽ bị xóa.')) {
      updateAssignmentsState(assignments.filter(a => a.id !== id));
    }
  };

  // Quick stats calculations
  const stats = getAdminStats();
  const t = translations[language];

  // If student role, delegate view entirely to StudentPortal
  if (currentUser && currentUser.role === 'student' && settings) {
    return (
      <StudentPortal 
        currentUser={currentUser}
        classes={classes}
        exams={exams}
        assignments={assignments}
        centerSettings={settings}
        onLogout={handleLogout}
        onUpdateAssignments={updateAssignmentsState}
        theme={theme}
        setTheme={setTheme}
        language={language}
        setLanguage={setLanguage}
        notifications={getActiveNotifications()}
        onMarkAllRead={handleMarkAllRead}
        onClearNotifications={handleClearNotifications}
        onMarkRead={handleMarkRead}
        onAddNotification={triggerAddNotification}
        onUpdateCurrentUser={handleUpdateCurrentUser}
      />
    );
  }

  // Active Class details retrieval
  const activeClass = classes.find(c => c.id === activeClassId);
  const classStudents = activeClass 
    ? users.filter(u => u.role === 'student' && activeClass.studentIds.includes(u.id)) 
    : [];
  const classAssignments = activeClass
    ? assignments.filter(a => a.classId === activeClass.id)
    : [];

  // Active Assignment details retrieval
  const activeAssignment = assignments.find(a => a.id === activeAssignmentId);
  const activeAssignmentExam = activeAssignment 
    ? exams.find(e => e.id === activeAssignment.examId) 
    : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">

      {currentUser && settings ? (
        <div className="flex flex-1 min-h-0">
          {/* SIDEBAR RENDER */}
          {currentUser.role === 'owner' ? (
            <OwnerSidebar 
              currentRoute={currentRoute}
              onNavigate={setCurrentRoute}
              currentUser={currentUser}
              centerSettings={settings}
              onLogout={handleLogout}
              language={language}
            />
          ) : (
            <AdminSidebar 
              currentRoute={currentRoute}
              onNavigate={setCurrentRoute}
              currentUser={currentUser}
              centerSettings={settings}
              onLogout={handleLogout}
              language={language}
            />
          )}

          {/* MAIN CONTAINER */}
          <div className="flex-1 flex flex-col md:pl-64 min-h-screen">
            <AdminHeader 
              currentRoute={currentRoute}
              currentUser={currentUser}
              centerSettings={settings}
              onLogout={handleLogout}
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
              notifications={getActiveNotifications()}
              onMarkAllRead={handleMarkAllRead}
              onClearNotifications={handleClearNotifications}
              onMarkRead={handleMarkRead}
            />

            {/* VIEWS DIRECTORY */}
            <main className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto space-y-6">
              
              {/* ==================================================== */}
              {/* OWNER - DASHBOARD */}
              {/* ==================================================== */}
              {currentRoute === 'owner/dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{t.ownerDashboardTitle}</h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {t.ownerDashboardSubtitle}
                      </p>
                    </div>
                  </div>

                  {/* System Overview Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                    <div className="glass-card p-6 flex items-center justify-between group">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.sysUsers}</span>
                        <span className="text-2xl font-extrabold text-slate-800 mt-2 block">{users.length} {t.sysAccountsSuffix}</span>
                      </div>
                      <span className="p-3 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-lg group-hover:scale-105 transition-transform">👥</span>
                    </div>

                    <div className="glass-card p-6 flex items-center justify-between group">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.sysAdmins}</span>
                        <span className="text-2xl font-extrabold text-slate-800 mt-2 block">{users.filter(u => u.role === 'admin').length} {t.sysPeopleSuffix}</span>
                      </div>
                      <span className="p-3 rounded-lg bg-blue-50 text-blue-600 font-bold text-lg group-hover:scale-105 transition-transform">🔑</span>
                    </div>

                    <div className="glass-card p-6 flex items-center justify-between group">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.sysEnrolled}</span>
                        <span className="text-2xl font-extrabold text-slate-800 mt-2 block">{stats.enrolledStudentsCount} {t.sysStudentSuffix}</span>
                      </div>
                      <span className="p-3 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-lg group-hover:scale-105 transition-transform">👨‍🎓</span>
                    </div>

                    <div className="glass-card p-6 flex items-center justify-between group">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t.sysClasses}</span>
                        <span className="text-2xl font-extrabold text-teal-600 mt-2 block">{classes.length} {t.sysClassSuffix}</span>
                      </div>
                      <span className="p-3 rounded-lg bg-teal-50 text-teal-600 font-bold text-lg group-hover:scale-105 transition-transform">🏫</span>
                    </div>
                  </div>

                  {/* Quick activities */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="glass-card p-6 space-y-4">
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-3">
                        <ShieldAlert size={16} className="text-indigo-600" />
                        <span>{t.ownerSupremeTitle}</span>
                      </h3>
                      <div className="text-xs text-slate-600 leading-relaxed space-y-2.5">
                        <p>
                          1. <strong>{language === 'vi' ? 'Thu hồi và cấp quyền Admin:' : 'Revoke and promote Admin:'}</strong> {t.ownerSupremeRule1}
                        </p>
                        <p>
                          2. <strong>{language === 'vi' ? 'Bảo mật danh tính:' : 'Identity Isolation:'}</strong> {t.ownerSupremeRule2}
                        </p>
                        <p>
                          3. <strong>{language === 'vi' ? 'Toàn quyền truy cập:' : 'Universal Access:'}</strong> {t.ownerSupremeRule3}
                        </p>
                      </div>
                    </div>

                    <div className="glass-card p-6 space-y-4">
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-50 pb-3">
                        <span>{t.activityLogTitle}</span>
                      </h3>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {securityLogs.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">{t.activityLogEmpty}</p>
                        ) : (
                          securityLogs.map((log: any) => (
                            <div key={log.id} className="flex items-start justify-between text-xs border-b border-slate-50 pb-2">
                              <div>
                                <p className="font-bold text-slate-800">{log.action}</p>
                                <p className="text-[10px] text-slate-400">{log.detail}</p>
                              </div>
                              <span className="text-[10px] text-slate-400 font-semibold font-mono">{log.time}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OWNER - USERS */}
              {currentRoute === 'owner/users' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'vi' ? 'Danh Sách Người Dùng Hệ Thống' : 'System Accounts Registry'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {language === 'vi' 
                        ? 'Giám sát trạng thái hoạt động của mọi thành viên đã đăng ký tài khoản trên website.' 
                        : 'Monitor authorization states and activity records of all registered accounts.'}
                    </p>
                  </div>
                  <OwnerUserTable 
                    users={users}
                    classes={classes}
                    onToggleStatus={handleToggleStudentLock}
                    onViewDetails={(id) => {
                      const user = users.find(u => u.id === id);
                      if (user) {
                        setViewingStudentDetail(user);
                      }
                    }}
                    language={language}
                  />
                </div>
              )}

              {/* OWNER - PERMISSIONS (Cấp quyền Admin) */}
              {currentRoute === 'owner/permissions' && (
                <div className="space-y-6 animate-fade-in">
                  <PermissionTable 
                    users={users}
                    currentUserId={currentUser.id}
                    onGrantAdmin={initiateGrantAdmin}
                    onRevokeAdmin={initiateRevokeAdmin}
                    language={language}
                  />
                </div>
              )}

              {/* OWNER - SETTINGS */}
              {currentRoute === 'owner/settings' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'vi' ? 'Cấu Hình Bảo Mật Hệ Thống' : 'System Security Settings'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {language === 'vi' 
                        ? 'Giám sát hạ tầng lõi bảo mật và cập nhật thông tin mật mã định danh tối mật.' 
                        : 'Oversee core safety parameters and personalize top-secret authentication credentials.'}
                    </p>
                  </div>
                  <OwnerSettings 
                    currentUser={currentUser}
                    onUpdateProfile={(updatedUser) => {
                      setCurrentUser(updatedUser);
                      const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
                      updateUsersState(updatedUsers);
                    }}
                    language={language}
                  />
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - DASHBOARD */}
              {/* ==================================================== */}
              {currentRoute === 'admin/dashboard' && (
                <div className="space-y-6 animate-fade-in">
                  {/* Greeting */}
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'vi' ? 'Xin chào' : 'Welcome'}, {currentUser.name}!
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {language === 'vi' 
                        ? 'Dưới đây là các thông số vận hành tổng quan và hoạt động học viên gần đây.' 
                        : 'Here is the overview of system operations and recent student activities.'}
                    </p>
                  </div>

                  {/* 4 Stat Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard 
                      title={language === 'vi' ? 'Tổng học sinh đã xếp lớp' : 'Total enrolled students'}
                      value={`${stats.enrolledStudentsCount} ${language === 'vi' ? 'học sinh' : 'students'}`}
                      icon={Users}
                      description={language === 'vi' ? 'Chỉ tính những học sinh đã vào lớp' : 'Enrolled students in batches'}
                      colorTheme="indigo"
                    />
                    <StatCard 
                      title={language === 'vi' ? 'Tổng số lớp học' : 'Total batches'}
                      value={`${stats.classesCount} ${language === 'vi' ? 'Lớp' : 'Batches'}`}
                      icon={School}
                      description={language === 'vi' ? 'Đang hoạt động trong kỳ học' : 'Currently active in semester'}
                      colorTheme="purple"
                    />
                    <StatCard 
                      title={language === 'vi' ? 'Tổng số đề thi' : 'Total exams'}
                      value={`${stats.examsCount} ${language === 'vi' ? 'Đề' : 'Exams'}`}
                      icon={BookOpen}
                      description={language === 'vi' ? 'Kho đề nghe, đọc, viết, nói' : 'Repository of IELTS tests'}
                      colorTheme="amber"
                    />
                    <StatCard 
                      title={language === 'vi' ? 'Bài tập đang giao' : 'Active assignments'}
                      value={`${stats.activeAssignmentsCount} ${language === 'vi' ? 'Bài' : 'Assignments'}`}
                      icon={Clock}
                      description={language === 'vi' ? 'Bài nộp đang chờ đánh giá' : 'Submissions awaiting review'}
                      colorTheme="emerald"
                    />
                  </div>

                  {/* Charts section & Recent classes */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                      <ChartCard 
                        type="line"
                        title={language === 'vi' ? 'Tần suất làm bài của học sinh (6 tháng gần nhất)' : 'Student homework frequency (last 6 months)'}
                        subtitle={language === 'vi' ? 'Mô phỏng tổng số lượt nộp bài thi thử trực tuyến' : 'Simulated mock exam submissions overview'}
                      />
                    </div>
                    
                    <div className="glass-card p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-2.5">
                        <h4 className="font-extrabold text-sm text-slate-800">
                          {language === 'vi' ? 'Lớp học IELTS mới tạo' : 'Recently created IELTS batches'}
                        </h4>
                        <button onClick={() => setCurrentRoute('admin/classes')} className="text-xs font-bold text-blue-600 hover:underline">
                          {language === 'vi' ? 'Tất cả' : 'All'}
                        </button>
                      </div>
                      <div className="space-y-3">
                        {classes.slice(0, 3).map(cls => (
                          <div key={cls.id} className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div>
                              <p className="font-bold text-slate-800">{cls.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {language === 'vi' ? 'Sĩ số:' : 'Size:'} {cls.studentIds.length} {language === 'vi' ? 'học viên' : 'students'}
                              </p>
                            </div>
                            <span className="font-semibold text-blue-600">{cls.createdAt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - EXAMS (Quản lý đề) */}
              {/* ==================================================== */}
              {currentRoute === 'admin/exams' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {language === 'vi' ? 'Kho Đề Thi IELTS' : 'IELTS Exam Repository'}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {language === 'vi' 
                          ? 'Quản lý các đề thi Listening, Reading, Writing, Speaking và Đề thi thử (Full Test).' 
                          : 'Manage IELTS Listening, Reading, Writing, Speaking, and Full Mock Exams.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddExamModal(true)}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all self-start sm:self-center cursor-pointer"
                    >
                      <Plus size={15} />
                      {language === 'vi' ? 'Thêm đề thi mới' : 'Create new exam'}
                    </button>
                  </div>

                  {/* Simple skills tabs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {exams.map(exam => (
                      <ExamCard 
                        key={exam.id}
                        exam={exam}
                        language={language}
                        onPreview={(ex) => alert(
                          language === 'vi'
                            ? `[Xem trước] Đề thi: ${ex.title}\nCấu trúc: ${ex.questionsCount} câu | Thời gian: ${ex.duration} phút.`
                            : `[Preview] Exam: ${ex.title}\nStructure: ${ex.questionsCount} questions | Duration: ${ex.duration} mins.`
                        )}
                        onEdit={(ex) => alert(
                          language === 'vi'
                            ? `Sửa đề: Tính năng sửa tiêu đề và thời gian làm bài của "${ex.title}".`
                            : `Edit exam: Feature to edit title and duration of "${ex.title}".`
                        )}
                        onDelete={(id) => {
                          if (confirm(
                            language === 'vi'
                              ? 'Bạn có chắc muốn xóa đề thi này khỏi hệ thống?'
                              : 'Are you sure you want to delete this exam from the system?'
                          )) {
                            updateExamsState(exams.filter(e => e.id !== id));
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - CLASSES (Quản lý lớp học) */}
              {/* ==================================================== */}
              {currentRoute === 'admin/classes' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        {language === 'vi' ? 'Quản Lý Lớp Học IELTS' : 'IELTS Class Management'}
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">
                        {language === 'vi' 
                          ? 'Khởi tạo các lớp, theo dõi sĩ số, thêm học viên mới và trực tiếp giao bài tập.' 
                          : 'Initialize classes, monitor size, add new students, and assign homework directly.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddClassModal(true)}
                      className="inline-flex items-center gap-1.5 px-4.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/10 transition-all self-start sm:self-center cursor-pointer"
                    >
                      <Plus size={15} />
                      {language === 'vi' ? 'Tạo lớp học mới' : 'Create new batch'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {classes.map(cls => (
                      <ClassCard 
                        key={cls.id}
                        cls={cls}
                        language={language}
                        onViewDetails={(id) => {
                          setActiveClassId(id);
                          setActiveAssignmentId(null);
                          setClassDetailTab('assignments');
                          setCurrentRoute('admin/classes/detail');
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - CLASS DETAIL */}
              {/* ==================================================== */}
              {currentRoute === 'admin/classes/detail' && activeClass && (
                <div className="space-y-6 animate-fade-in">
                  {/* Back button and Class Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveClassId(null);
                          setActiveAssignmentId(null);
                          setCurrentRoute('admin/classes');
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors cursor-pointer"
                      >
                        <ChevronRight size={18} className="rotate-180" />
                      </button>
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
                          {language === 'vi' ? 'Quản lý lớp học' : 'Class Management'}
                        </span>
                        <h2 className="text-xl font-extrabold text-slate-900">{activeClass.name}</h2>
                      </div>
                    </div>

                    {/* Class actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => setShowAddStudentToClassModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        {language === 'vi' ? 'Thêm học sinh vào lớp' : 'Add student to class'}
                      </button>
                      
                      <button
                        onClick={() => {
                          if (exams.length === 0) {
                            alert(
                              language === 'vi'
                                ? 'Vui lòng tạo ít nhất một đề thi trước khi giao bài.'
                                : 'Please create at least one exam before assigning.'
                            );
                            return;
                          }
                          setAssignExamId(exams[0].id);
                          setShowAssignModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10 transition-all cursor-pointer"
                      >
                        <Plus size={14} />
                        {language === 'vi' ? 'Giao bài tập mới' : 'Assign new homework'}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* ASSIGNMENTS LIST (TABLE VIEW AS REQUESTED) */}
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                          {language === 'vi' ? 'Danh sách bài tập' : 'Assignments List'} ({classAssignments.length})
                        </h3>
                      </div>

                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                              <th className="px-6 py-4">{language === 'vi' ? 'Loại bài' : 'Type'}</th>
                              <th className="px-6 py-4">{language === 'vi' ? 'Tên đề' : 'Exam Title'}</th>
                              <th className="px-6 py-4">{language === 'vi' ? 'Ngày giao' : 'Assigned Date'}</th>
                              <th className="px-6 py-4">{language === 'vi' ? 'Hạn nộp' : 'Deadline'}</th>
                              <th className="px-6 py-4">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                              <th className="px-6 py-4">{language === 'vi' ? 'Đã làm' : 'Done'}</th>
                              <th className="px-6 py-4">{language === 'vi' ? 'Chưa làm' : 'Pending'}</th>
                              <th className="px-6 py-4 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                            {classAssignments.length === 0 ? (
                              <tr>
                                <td colSpan={8} className="text-center py-12 text-slate-400 text-xs font-medium">
                                  {language === 'vi' 
                                    ? 'Lớp học này chưa có bài tập nào. Hãy nhấn "Giao bài tập mới" để giao bài.'
                                    : 'This class has no assigned homework yet. Click "Assign new homework" to assign.'}
                                </td>
                              </tr>
                            ) : (
                              classAssignments.map(assign => {
                                const totalStudents = classStudents.length;
                                const doneCount = classStudents.filter(student => 
                                  assign.submissions?.some(s => s.studentId === student.id && s.status === 'done')
                                ).length;
                                const pendingCount = totalStudents - doneCount;

                                const exam = exams.find(e => e.id === assign.examId);

                                const getTranslatedType = () => {
                                  switch (assign.type) {
                                    case 'listening': return 'Listening';
                                    case 'reading': return 'Reading';
                                    case 'writing': return 'Writing';
                                    case 'speaking': return 'Speaking';
                                    default: return 'Full Test';
                                  }
                                };

                                const getTypeStyles = () => {
                                  switch (assign.type) {
                                    case 'listening': return 'text-teal-700 bg-teal-50 border-teal-100';
                                    case 'reading': return 'text-indigo-700 bg-indigo-50 border-indigo-100';
                                    case 'writing': return 'text-amber-700 bg-amber-50 border-amber-100';
                                    case 'speaking': return 'text-purple-700 bg-purple-50 border-purple-100';
                                    default: return 'text-blue-700 bg-blue-50 border-blue-100';
                                  }
                                };

                                const getStatusTextAndStyle = () => {
                                  switch (assign.status) {
                                    case 'active':
                                      return {
                                        text: language === 'vi' ? 'Đang giao' : 'Assigned',
                                        style: 'text-emerald-700 bg-emerald-50 border-emerald-100'
                                      };
                                    case 'expired':
                                      return {
                                        text: language === 'vi' ? 'Đã hết hạn' : 'Expired',
                                        style: 'text-red-700 bg-red-50 border-red-100'
                                      };
                                    default:
                                      return {
                                        text: language === 'vi' ? 'Hoàn thành' : 'Completed',
                                        style: 'text-slate-700 bg-slate-100 border-slate-200'
                                      };
                                  }
                                };

                                const statusInfo = getStatusTextAndStyle();

                                return (
                                  <tr key={assign.id} className="hover:bg-slate-50/30 transition-colors">
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 text-xs font-bold border rounded-md uppercase tracking-wider ${getTypeStyles()}`}>
                                        {getTranslatedType()}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-slate-900">
                                      {assign.title}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-500 text-xs">{assign.createdAt}</td>
                                    <td className="px-6 py-4 font-bold text-red-500 text-xs">{assign.deadline}</td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 text-xs font-bold border rounded-md ${statusInfo.style}`}>
                                        {statusInfo.text}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-emerald-600 font-extrabold text-xs">
                                      {doneCount}/{totalStudents} {language === 'vi' ? 'học sinh' : 'students'}
                                    </td>
                                    <td className="px-6 py-4 text-amber-600 font-extrabold text-xs">
                                      {pendingCount}/{totalStudents} {language === 'vi' ? 'học sinh' : 'students'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          onClick={() => setActiveAssignmentId(assign.id)}
                                          className="inline-flex items-center gap-1 py-1.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-all border border-blue-100 cursor-pointer"
                                          title={language === 'vi' ? 'Xem chi tiết' : 'View details'}
                                        >
                                          <Eye size={13} />
                                          <span>{language === 'vi' ? 'Xem chi tiết' : 'Xem chi tiết'}</span>
                                        </button>
                                        <button
                                          onClick={() => {
                                            const newDeadline = prompt(
                                              language === 'vi'
                                                ? 'Nhập hạn nộp mới (YYYY-MM-DD):'
                                                : 'Enter new deadline (YYYY-MM-DD):', 
                                              assign.deadline
                                            );
                                            if (newDeadline) {
                                              const updated = assignments.map(a => {
                                                if (a.id === assign.id) {
                                                  return { ...a, deadline: newDeadline };
                                                }
                                                return a;
                                              });
                                              updateAssignmentsState(updated);
                                            }
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 rounded-lg transition-colors cursor-pointer"
                                          title={language === 'vi' ? 'Chỉnh sửa' : 'Edit'}
                                        >
                                          <Edit size={13} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (confirm(
                                              language === 'vi' 
                                                ? 'Bạn có chắc muốn xóa bài tập này khỏi lớp?' 
                                                : 'Are you sure you want to remove this assignment?'
                                            )) {
                                              handleDeassignHomework(assign.id);
                                            }
                                          }}
                                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-100 hover:border-red-100 rounded-lg transition-colors cursor-pointer"
                                          title={language === 'vi' ? 'Xóa' : 'Delete'}
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* CHI TIẾT BÀI TẬP OVERLAY PANEL */}
                    {activeAssignment && (
                      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                              {language === 'vi' ? 'Danh sách bài nộp chi tiết học sinh' : 'Detailed student submission list'}
                            </span>
                            <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">{activeAssignment.title}</h4>
                          </div>
                          <button
                            onClick={() => setActiveAssignmentId(null)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          >
                            <X size={18} />
                          </button>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                                <th className="px-6 py-3">{language === 'vi' ? 'Họ tên' : 'Full name'}</th>
                                <th className="px-6 py-3">{language === 'vi' ? 'Số điện thoại' : 'Phone number'}</th>
                                <th className="px-6 py-3">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                                <th className="px-6 py-3">{language === 'vi' ? 'Thống kê làm bài' : 'Homework Stats'}</th>
                                <th className="px-6 py-3">{language === 'vi' ? 'Số giờ học' : 'Study duration'}</th>
                                <th className="px-6 py-3">{language === 'vi' ? 'Thời gian nộp' : 'Submission date'}</th>
                                <th className="px-6 py-3">{language === 'vi' ? 'Điểm' : 'Score'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
                              {classStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="text-center py-6 text-slate-400 text-xs">
                                    {language === 'vi' ? 'Lớp học chưa có học sinh.' : 'This class has no students.'}
                                  </td>
                                </tr>
                              ) : (
                                classStudents.map(student => {
                                  const sub = activeAssignment.submissions?.find(s => s.studentId === student.id);
                                  const isDone = sub?.status === 'done';

                                  // Retrieve student stats from actual completed assignments across all homework in this class
                                  const studentSubmissions = assignments.flatMap(a => {
                                    const studentSub = a.submissions?.find(s => s.studentId === student.id);
                                    const exam = exams.find(e => e.id === a.examId);
                                    const duration = studentSub?.duration || exam?.duration || 0;
                                    return studentSub ? [{ ...studentSub, type: a.type, duration }] : [];
                                  });

                                  const getStatsByType = (type: string) => {
                                    const typeSubs = studentSubmissions.filter(s => s.type === type);
                                    const total = typeSubs.length;
                                    const done = typeSubs.filter(s => s.status === 'done').length;
                                    return { done, total };
                                  };

                                  const listeningStats = getStatsByType('listening');
                                  const readingStats = getStatsByType('reading');
                                  const writingStats = getStatsByType('writing');
                                  const speakingStats = getStatsByType('speaking');
                                  const fullTestStats = getStatsByType('full');

                                  const totalMinutes = studentSubmissions
                                    .filter(s => s.status === 'done')
                                    .reduce((sum, s) => sum + (s.duration || 0), 0);
                                  const hours = Math.floor(totalMinutes / 60);
                                  const mins = totalMinutes % 60;
                                  const durationText = hours > 0 
                                    ? (language === 'vi' ? `${hours}g ${mins}p` : `${hours}h ${mins}m`)
                                    : (language === 'vi' ? `${mins} phút` : `${mins}m`);

                                  const getScoreDisplay = () => {
                                    if (!isDone) return '—';
                                    const hasScore = sub?.score !== undefined && sub?.score !== null;

                                    if (activeAssignment.type === 'writing' || activeAssignment.type === 'speaking') {
                                      return hasScore ? `Band ${sub.score}` : (language === 'vi' ? 'Chưa chấm' : 'Not graded');
                                    }
                                    return hasScore ? `Band ${sub.score}` : '—';
                                  };

                                  return (
                                    <tr key={student.id} className="hover:bg-slate-50/30">
                                      <td className="px-6 py-3">
                                        <div className="font-bold text-slate-900">{student.name}</div>
                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{student.email}</div>
                                      </td>
                                      <td className="px-6 py-3 font-mono">{student.phone}</td>
                                      <td className="px-6 py-3">
                                        {isDone ? (
                                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                                            ✅ {language === 'vi' ? 'Đã làm' : 'Đã làm'}
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                                            ❌ {language === 'vi' ? 'Chưa làm' : 'Chưa làm'}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-3">
                                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold font-mono text-teal-700 bg-teal-50 border border-teal-100 rounded-md" title="Listening">
                                            L: {listeningStats.done}/{listeningStats.total}
                                          </span>
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-md" title="Reading">
                                            R: {readingStats.done}/{readingStats.total}
                                          </span>
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold font-mono text-amber-700 bg-amber-50 border border-amber-100 rounded-md" title="Writing">
                                            W: {writingStats.done}/{writingStats.total}
                                          </span>
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold font-mono text-purple-700 bg-purple-50 border border-purple-100 rounded-md" title="Speaking">
                                            S: {speakingStats.done}/{speakingStats.total}
                                          </span>
                                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-100 rounded-md" title="Full Test">
                                            FT: {fullTestStats.done}/{fullTestStats.total}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 text-slate-500 font-mono">
                                        <div className="flex items-center gap-1">
                                          <Clock size={12} className="text-slate-400" />
                                          <span>{durationText}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-3 font-mono">
                                        {isDone && sub?.submittedAt 
                                          ? new Date(sub.submittedAt).toLocaleDateString('vi-VN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              day: '2-digit',
                                              month: '2-digit',
                                              year: 'numeric'
                                            }) 
                                          : '—'}
                                      </td>
                                      <td className="px-6 py-3 font-extrabold text-blue-600">
                                        {getScoreDisplay()}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* COLLAPSIBLE SECTION FOR ENROLLED STUDENTS AT THE BOTTOM TO REMAIN FUNCTIONAL */}
                    <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                      <details className="group">
                        <summary className="flex justify-between items-center font-bold text-xs text-slate-600 uppercase tracking-wider cursor-pointer select-none">
                          <span>{language === 'vi' ? 'Quản lý học viên trong lớp' : 'Manage Enrolled Students'} ({classStudents.length})</span>
                          <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                        </summary>
                        
                        <div className="mt-4 overflow-x-auto bg-white rounded-xl border border-slate-100 shadow-inner">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                                <th className="px-4 py-3">{language === 'vi' ? 'Học viên' : 'Student'}</th>
                                <th className="px-4 py-3">{language === 'vi' ? 'Số điện thoại' : 'Phone'}</th>
                                <th className="px-4 py-3 text-right">{language === 'vi' ? 'Thao tác' : 'Action'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                              {classStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="text-center py-6 text-slate-400">
                                    {language === 'vi' ? 'Chưa có học viên nào trong lớp này.' : 'No students in this class yet.'}
                                  </td>
                                </tr>
                              ) : (
                                classStudents.map(student => (
                                  <tr key={student.id} className="hover:bg-slate-50/30">
                                    <td className="px-4 py-3">
                                      <div className="font-bold text-slate-900">{student.name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono">{student.email}</div>
                                    </td>
                                    <td className="px-4 py-3 font-mono font-semibold text-slate-600">{student.phone}</td>
                                    <td className="px-4 py-3 text-right">
                                      <button
                                        onClick={() => {
                                          if (confirm(
                                            language === 'vi'
                                              ? 'Xóa học sinh này khỏi lớp học?'
                                              : 'Remove this student from the class?'
                                          )) {
                                            const updatedClasses = classes.map(c => {
                                              if (c.id === activeClass.id) {
                                                return { ...c, studentIds: c.studentIds.filter(id => id !== student.id) };
                                              }
                                              return c;
                                            });
                                            updateClassesState(updatedClasses);
                                          }
                                        }}
                                        className="text-red-600 font-bold hover:underline cursor-pointer"
                                      >
                                        {language === 'vi' ? 'Xóa khỏi lớp' : 'Remove'}
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - STUDENTS (Quản lý học sinh) */}
              {/* ==================================================== */}
              {currentRoute === 'admin/students' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                      {language === 'vi' ? 'Học Viên Hệ Thống' : 'Registered Students'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {language === 'vi' 
                        ? 'Danh sách các học viên đã được xếp vào lớp học trên hệ thống.' 
                        : 'List of students assigned to classes in the system.'}
                    </p>
                  </div>

                  <DataTable 
                    students={users.filter(u => u.role === 'student' && classes.some(cls => cls.studentIds.includes(u.id)))}
                    classes={classes}
                    assignments={assignments}
                    language={language}
                    onToggleStatus={handleToggleStudentLock}
                    onViewDetails={(id) => {
                      const studentObj = users.find(u => u.id === id);
                      if (studentObj) {
                        setViewingStudentDetail(studentObj);
                      }
                    }}
                  />
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - STATISTICS (Báo cáo thống kê) */}
              {/* ==================================================== */}
              {currentRoute === 'admin/statistics' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Báo Cáo & Thống Kê Học Tập</h2>
                    <p className="text-sm text-slate-500 mt-1">Các chỉ số đo lường hiệu suất tiếp thu kiến thức và sự cải thiện kỹ năng của học sinh.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartCard 
                      type="skills"
                      title="Điểm trung bình theo từng kỹ năng IELTS"
                      subtitle="Báo cáo dải điểm thực tế của toàn bộ học viên trung tâm"
                    />
                    <ChartCard 
                      type="bar"
                      title="Số lượng bài tập hoàn thành hàng tuần"
                      subtitle="Giám sát thái độ học tập và mức độ chăm chỉ của học sinh"
                    />
                  </div>
                </div>
              )}

              {/* ==================================================== */}
              {/* ADMIN - SETTINGS (Cài đặt trung tâm) */}
              {/* ==================================================== */}
              {currentRoute === 'admin/settings' && settings && (
                <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm max-w-4xl animate-fade-in space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Thiết Lập Thông Tin Hiển Thị Trung Tâm</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-normal">
                        Chỉnh sửa thông tin liên hệ và hình ảnh của trung tâm luyện thi. Những thông số này ảnh hưởng trực tiếp đến logo, slogan, và giao diện đăng nhập của học sinh.
                      </p>
                    </div>
                    <div>
                      {!isEditingSettings ? (
                        <button
                          type="button"
                          onClick={() => setIsEditingSettings(true)}
                          className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs transition-colors border border-indigo-200/50 flex items-center gap-1.5 shadow-sm"
                        >
                          ✏️ Nhấn để sửa thông tin
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingSettings(false);
                            setSettings(getStoredSettings());
                          }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-colors border border-slate-200 flex items-center gap-1.5 shadow-sm"
                        >
                          ❌ Hủy bỏ chỉnh sửa
                        </button>
                      )}
                    </div>
                  </div>

                  {showSettingsSuccess && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
                      <span className="text-emerald-500 text-lg">✅</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-emerald-800">Cập nhật thành công!</p>
                        <p className="text-[11px] text-emerald-600 mt-0.5">Thông tin cấu hình trung tâm đã được lưu trữ và cập nhật trên toàn hệ thống.</p>
                      </div>
                      <button 
                        onClick={() => setShowSettingsSuccess(false)} 
                        className="text-emerald-500 hover:text-emerald-700 font-bold text-xs"
                      >
                        Đóng
                      </button>
                    </div>
                  )}

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (!isEditingSettings) return;
                    updateSettingsState(settings);
                    setIsEditingSettings(false);
                    setShowSettingsSuccess(true);

                    // Trigger dynamic notifications matching user request!
                    triggerAddNotification(
                      `🖼 Logo trung tâm vừa được cập nhật.`,
                      `🖼 Center logo has been successfully updated.`,
                      'admin'
                    );
                    triggerAddNotification(
                      `🖼 Logo trung tâm vừa được cập nhật.`,
                      `🖼 Center logo has been successfully updated.`,
                      'owner'
                    );
                    triggerAddNotification(
                      `📢 Trung tâm vừa cập nhật lịch học.`,
                      `📢 The center has updated the class schedule.`,
                      'student'
                    );

                    setTimeout(() => {
                      setShowSettingsSuccess(false);
                    }, 5000);
                  }} className="space-y-4 pt-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên trung tâm IELTS</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.name} 
                          onChange={(e) => updateSettingsState({ ...settings, name: e.target.value })}
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Slogan hiển thị</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.slogan} 
                          onChange={(e) => updateSettingsState({ ...settings, slogan: e.target.value })}
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số điện thoại liên hệ</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.phone} 
                          onChange={(e) => updateSettingsState({ ...settings, phone: e.target.value })}
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Địa chỉ Email</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.email} 
                          onChange={(e) => updateSettingsState({ ...settings, email: e.target.value })}
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Logo ký hiệu</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.logo} 
                          onChange={(e) => updateSettingsState({ ...settings, logo: e.target.value })}
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Địa chỉ Facebook</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.facebook} 
                          onChange={(e) => updateSettingsState({ ...settings, facebook: e.target.value })}
                          placeholder="Ví dụ: facebook.com/trungtamielts"
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số điện thoại Zalo / Link Zalo</label>
                        <input 
                          type="text" 
                          readOnly={!isEditingSettings}
                          value={settings.zalo} 
                          onChange={(e) => updateSettingsState({ ...settings, zalo: e.target.value })}
                          placeholder="Ví dụ: zalo.me/0901234567"
                          className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                            isEditingSettings 
                              ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                              : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Địa chỉ trụ sở chính</label>
                      <input 
                        type="text" 
                        readOnly={!isEditingSettings}
                        value={settings.address} 
                        onChange={(e) => updateSettingsState({ ...settings, address: e.target.value })}
                        className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                          isEditingSettings 
                            ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Mô tả giới thiệu chi tiết</label>
                      <textarea 
                        rows={4}
                        readOnly={!isEditingSettings}
                        value={settings.description} 
                        onChange={(e) => updateSettingsState({ ...settings, description: e.target.value })}
                        className={`block w-full border rounded-lg p-2.5 text-xs font-medium transition-all ${
                          isEditingSettings 
                            ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    {/* Banner Image config */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Banner URL</label>
                      <input 
                        type="text" 
                        readOnly={!isEditingSettings}
                        value={settings.bannerUrl} 
                        onChange={(e) => updateSettingsState({ ...settings, bannerUrl: e.target.value })}
                        className={`block w-full border rounded-lg p-2.5 text-xs font-semibold transition-all ${
                          isEditingSettings 
                            ? 'bg-white border-slate-200 text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500' 
                            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-red-700 max-w-md">
                        <strong>GIỚI HẠN QUYỀN HẠN:</strong> Admin không được phép thay đổi Owner của website, không thể phân phối lại các dải quyền quản trị viên cao cấp của hệ thống.
                      </div>
                      <button 
                        type="submit" 
                        disabled={!isEditingSettings}
                        className={`px-5 py-3 font-bold rounded-xl text-xs shadow-md transition-all duration-200 ${
                          isEditingSettings 
                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-indigo-500/10' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                      >
                        {isEditingSettings ? '💾 Cập nhật thông tin hiển thị' : '🔒 Bấm nút Sửa ở trên đầu để chỉnh sửa'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </main>
          </div>
        </div>
      ) : (
        /* AUTHENTICATION ROUTING WALL */
        <div className="flex-1 flex items-center justify-center p-6 md:p-12 min-h-screen relative overflow-hidden bg-slate-50 dark:bg-slate-950 duration-200 transition-colors">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-70 pointer-events-none z-0"></div>
          {currentRoute === 'register' ? (
            <RegisterForm 
              onRegisterSuccess={handleRegisterSuccess}
              onNavigateToLogin={() => setCurrentRoute('login')}
              users={users}
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
            />
          ) : (
            <LoginForm 
              onLoginSuccess={handleLoginSuccess}
              onNavigateToRegister={() => setCurrentRoute('register')}
              users={users}
              theme={theme}
              setTheme={setTheme}
              language={language}
              setLanguage={setLanguage}
            />
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* SYSTEM CONFIRMATION MODALS & OVERLAYS */}
      {/* ==================================================== */}
      
      {/* Permission Change Warning Modal for Owners */}
      <RoleModal 
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedUserForRole(null);
          setRoleActionType(null);
        }}
        onConfirm={executeRoleToggle}
        user={selectedUserForRole}
        actionType={roleActionType}
      />

      {/* Add Class Form Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Tạo Lớp Học IELTS Mới</span>
              <button onClick={() => setShowAddClassModal(false)} className="hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddClass} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tên lớp học</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: IELTS Intensive 6.5+ K20"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Trạng thái ban đầu</label>
                <select
                  value={newClassStatus}
                  onChange={(e) => setNewClassStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Khai giảng ngay (Active)</option>
                  <option value="inactive">Tạm ẩn lớp học (Inactive)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowAddClassModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/10">Khởi tạo lớp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Exam Form Modal */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Thêm Đề Thi Vào Kho</span>
              <button onClick={() => setShowAddExamModal(false)} className="hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddExam} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Tiêu đề đề thi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Cambridge IELTS 19 Test 4 Listening"
                  value={newExamTitle}
                  onChange={(e) => setNewExamTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Kỹ năng</label>
                  <select
                    value={newExamType}
                    onChange={(e) => setNewExamType(e.target.value as ExamType)}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600"
                  >
                    <option value="listening">Listening 🎧</option>
                    <option value="reading">Reading 📖</option>
                    <option value="writing">Writing ✍️</option>
                    <option value="speaking">Speaking 🗣️</option>
                    <option value="full">Full Test 📝</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Trạng thái</label>
                  <select
                    value={newExamStatus}
                    onChange={(e) => setNewExamStatus(e.target.value as 'published' | 'draft')}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-600"
                  >
                    <option value="published">Công khai (Hiện)</option>
                    <option value="draft">Bản nháp (Ẩn)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Thời gian làm (phút)</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(parseInt(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số lượng câu hỏi</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={newExamQuestions}
                    onChange={(e) => setNewExamQuestions(parseInt(e.target.value))}
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowAddExamModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/10">Lưu đề thi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enroll Student to Class Form Modal */}
      {showAddStudentToClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Thêm Học Sinh Vào Lớp</span>
              <button onClick={() => setShowAddStudentToClassModal(false)} className="hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEnrollStudent} className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-normal">
                Nhập chính xác số điện thoại hoặc email của học sinh đã đăng ký tài khoản trên hệ thống để thêm vào danh sách lớp.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Số ĐT hoặc Email học viên</label>
                <input 
                  type="text" 
                  required
                  placeholder="Gợi ý: 0987654321 hoặc student@ielts.com"
                  value={enrollStudentSearch}
                  onChange={(e) => setEnrollStudentSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowAddStudentToClassModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">Thêm vào lớp</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Homework / Test Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <span className="font-bold text-sm">Giao Bài Tập Cho Lớp Học</span>
              <button onClick={() => setShowAssignModal(false)} className="hover:text-slate-300 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignHomework} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Lớp học tiếp nhận</label>
                <input 
                  type="text" 
                  disabled
                  value={activeClass?.name || ''}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-500 font-semibold cursor-not-allowed" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Chọn đề thi tương ứng</label>
                <select
                  value={assignExamId}
                  onChange={(e) => setAssignExamId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {exams.filter(ex => ex.status === 'published').map(ex => (
                    <option key={ex.id} value={ex.id}>[{ex.type.toUpperCase()}] — {ex.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Hạn nộp bài</label>
                <input 
                  type="date" 
                  required
                  value={assignDeadline}
                  onChange={(e) => setAssignDeadline(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="assign_notify"
                  checked={assignNotify}
                  onChange={(e) => setAssignNotify(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="assign_notify" className="text-xs font-semibold text-slate-600 cursor-pointer">Gửi thông báo nộp bài đến học viên</label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={() => setShowAssignModal(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">Giao bài ngay</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Detail Modal with beautiful Table */}
      {viewingStudentDetail && (() => {
        const studentClasses = classes.filter(cls => cls.studentIds.includes(viewingStudentDetail.id));
        const classesName = studentClasses.length > 0 
          ? studentClasses.map(c => c.name).join(', ') 
          : (language === 'vi' ? 'Chưa xếp lớp' : 'Unassigned');

        const studentSubmissions = assignments.flatMap(a => {
          const studentSub = a.submissions?.find(s => s.studentId === viewingStudentDetail.id && s.status === 'done');
          return studentSub ? [studentSub] : [];
        });
        const completedCount = studentSubmissions.length;
        const completedWithScores = studentSubmissions.filter(s => s.score !== undefined && s.score > 0);
        const averageScore = completedWithScores.length > 0
          ? (completedWithScores.reduce((sum, s) => sum + (s.score || 0), 0) / completedWithScores.length).toFixed(1)
          : null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg overflow-hidden animate-slide-up">
              <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
                <span className="font-bold text-sm">
                  {language === 'vi' ? 'Chi Tiết Thông Tin Thành Viên' : 'Member Details Profile'}
                </span>
                <button onClick={() => setViewingStudentDetail(null)} className="hover:text-slate-300 transition-colors cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-bold flex items-center justify-center border border-blue-200 dark:border-blue-800 text-lg">
                    {viewingStudentDetail.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">{viewingStudentDetail.name}</h3>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{viewingStudentDetail.role === 'student' ? (language === 'vi' ? 'Học viên' : 'Student') : viewingStudentDetail.role === 'admin' ? (language === 'vi' ? 'Quản trị viên' : 'Admin') : (language === 'vi' ? 'Chủ sở hữu' : 'Owner')}</p>
                  </div>
                </div>

                <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
                        <th className="px-4 py-2.5 w-1/3">{language === 'vi' ? 'Thông tin' : 'Field'}</th>
                        <th className="px-4 py-2.5">{language === 'vi' ? 'Giá trị' : 'Value'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-sm">
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Họ tên' : 'Full name'}</td>
                        <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 font-semibold">{viewingStudentDetail.name}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Email' : 'Email'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-semibold font-mono">{viewingStudentDetail.email}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Số điện thoại' : 'Phone number'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 font-semibold font-mono">{viewingStudentDetail.phone}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Lớp đang học' : 'Current class'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold ${
                            studentClasses.length === 0 
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30' 
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30'
                          }`}>
                            {classesName}
                          </span>
                        </td>
                      </tr>
                      {viewingStudentDetail.role === 'student' && (
                        <>
                          <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                            <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Đề đã làm' : 'Exams completed'}</td>
                            <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200 font-semibold">
                              📊 {completedCount} {language === 'vi' ? 'đề đã hoàn thành' : 'exams completed'}
                            </td>
                          </tr>
                          {averageScore && (
                            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                              <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Điểm trung bình' : 'Average score'}</td>
                              <td className="px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-extrabold">
                                ⭐ Band {averageScore}
                              </td>
                            </tr>
                          )}
                        </>
                      )}
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{language === 'vi' ? 'Trạng thái' : 'Status'}</td>
                        <td className="px-4 py-3 text-sm">
                          {viewingStudentDetail.status === 'active' ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-0.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              {language === 'vi' ? 'Hoạt động' : 'Active'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-red-500 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-950/30 px-2.5 py-0.5 rounded-lg border border-red-100 dark:border-red-900/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              {language === 'vi' ? 'Đang khóa' : 'Locked'}
                            </span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800/50">
                  <button 
                    onClick={() => setViewingStudentDetail(null)} 
                    className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-md shadow-slate-900/10"
                  >
                    {language === 'vi' ? 'Đóng' : 'Close'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
