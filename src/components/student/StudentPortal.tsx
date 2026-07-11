import React, { useState } from 'react';
import { 
  Award, Clock, Calendar, CheckCircle2, AlertCircle, Play, 
  ChevronRight, BookOpen, User, LogOut, ChevronLeft, Volume2, 
  FileText, Mic, Send, Hourglass, HelpCircle, Flame, Star, Quote, Bell, Trash2, Edit2
} from 'lucide-react';
import { User as UserType, Class, Exam, Assignment, CenterSettings, Submission } from '../../types';
import { Language, translations } from '../../data/translations';
import ThemeLanguageSelector from '../ThemeLanguageSelector';

interface StudentPortalProps {
  currentUser: UserType;
  classes: Class[];
  exams: Exam[];
  assignments: Assignment[];
  centerSettings: CenterSettings;
  onLogout: () => void;
  onUpdateAssignments: (updatedAssignments: Assignment[]) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  language: Language;
  setLanguage: (language: Language) => void;
  notifications: any[];
  onMarkAllRead: () => void;
  onClearNotifications: () => void;
  onMarkRead: (id: string) => void;
  onAddNotification: (textVi: string, textEn: string, role?: 'owner' | 'admin' | 'student', userId?: string) => void;
  onUpdateCurrentUser?: (updatedUser: UserType) => void;
}

export default function StudentPortal({ 
  currentUser, classes, exams, assignments, centerSettings, onLogout, onUpdateAssignments,
  theme, setTheme, language, setLanguage, notifications, onMarkAllRead, onClearNotifications, onMarkRead,
  onAddNotification, onUpdateCurrentUser
}: StudentPortalProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'exams' | 'history'>('dashboard');
  const [takingExam, setTakingExam] = useState<Exam | null>(null);
  const [takingAssignment, setTakingAssignment] = useState<Assignment | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timer, setTimer] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(currentUser.targetScore || '');

  React.useEffect(() => {
    setTempTarget(currentUser.targetScore || '');
  }, [currentUser.targetScore]);
  
  const t = translations[language];

  // Helper to dynamically translate default Vietnamese slogan/description to English if current language is 'en'
  const DEFAULT_SLOGAN_VI = 'Trải nghiệm lộ trình cá nhân hóa, bứt phá band điểm IELTS';
  const DEFAULT_SLOGAN_EN = 'Personalized pathways to boost your IELTS band score';
  const DEFAULT_DESC_VI = 'Hệ thống luyện thi IELTS trực tuyến thông minh hàng đầu. Với thư viện đề thi phong phú, giao diện thi thực tế và các công cụ thống kê trực quan dành cho trung tâm, chúng tôi giúp học viên cải thiện điểm số vượt bậc một cách nhanh chóng.';
  const DEFAULT_DESC_EN = 'The leading intelligent online IELTS exam preparation platform. With a rich exam library, realistic test interface, and intuitive statistical tools for the center, we help students improve their band scores dramatically and quickly.';

  const displaySlogan = !centerSettings.slogan
    ? (language === 'vi' ? DEFAULT_SLOGAN_VI : DEFAULT_SLOGAN_EN)
    : (language === 'en' && centerSettings.slogan.trim() === DEFAULT_SLOGAN_VI)
      ? DEFAULT_SLOGAN_EN
      : centerSettings.slogan;

  const displayDescription = !centerSettings.description
    ? (language === 'vi' ? DEFAULT_DESC_VI : DEFAULT_DESC_EN)
    : (language === 'en' && centerSettings.description.trim() === DEFAULT_DESC_VI)
      ? DEFAULT_DESC_EN
      : centerSettings.description;

  // Find class(es) the student is in
  const studentClasses = classes.filter(c => c.studentIds.includes(currentUser.id));
  const classIds = studentClasses.map(c => c.id);

  // Find assignments assigned to these classes
  const studentAssignments = assignments.filter(a => classIds.includes(a.classId));

  // Compute metrics
  const completedAssignments = studentAssignments.filter(a => 
    a.submissions?.some(s => s.studentId === currentUser.id && s.status === 'done')
  );

  const pendingAssignments = studentAssignments.filter(a => 
    !a.submissions?.some(s => s.studentId === currentUser.id && s.status === 'done') && a.status === 'active'
  );

  const completedSubmissions = studentAssignments
    .flatMap(a => a.submissions || [])
    .filter(s => s.studentId === currentUser.id && s.status === 'done');

  const averageBand = completedSubmissions.length > 0
    ? (completedSubmissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedSubmissions.length).toFixed(1)
    : 'N/A';

  // Handle starting a test
  const handleStartExam = (exam: Exam, assignment?: Assignment) => {
    setTakingExam(exam);
    setTakingAssignment(assignment || null);
    setAnswers({});
    setTimer(exam.duration * 60); // set timer in seconds
    
    // Start simple countdown
    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle submitting test answers
  const handleSubmitTest = () => {
    if (!takingExam) return;
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      // Generate realistic score (between 5.5 and 8.5)
      const scores = [5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5];
      const randomScore = scores[Math.floor(Math.random() * scores.length)];

      const correctCountMap: Record<number, number> = {
        5.5: 22,
        6.0: 25,
        6.5: 28,
        7.0: 31,
        7.5: 33,
        8.0: 35,
        8.5: 37
      };
      const correctAnswers = correctCountMap[randomScore] || 30;
      const formattedTypeVi = takingExam.type === 'reading' ? 'Reading' 
                            : takingExam.type === 'listening' ? 'Listening'
                            : takingExam.type === 'writing' ? 'Writing'
                            : takingExam.type === 'speaking' ? 'Speaking'
                            : 'Full Test';
      const formattedTypeEn = takingExam.type.charAt(0).toUpperCase() + takingExam.type.slice(1);

      if (takingAssignment) {
        // Update assignment submission state
        const updatedAssignments = assignments.map(assign => {
          if (assign.id === takingAssignment.id) {
            const updatedSubmissions = assign.submissions.map(sub => {
              if (sub.studentId === currentUser.id) {
                return {
                  ...sub,
                  status: 'done' as const,
                  submittedAt: new Date().toISOString(),
                  score: randomScore,
                  duration: Math.round((takingExam.duration * 60 - timer) / 60) || 1
                };
              }
              return sub;
            });
            return { ...assign, submissions: updatedSubmissions };
          }
          return assign;
        });
        
        onUpdateAssignments(updatedAssignments);

        // Add real-time notifications for homework submission
        onAddNotification(
          `✅ Bạn đã nộp bài thành công bài tập "${takingAssignment.title}".`,
          `✅ You have successfully submitted your answers for assignment "${takingAssignment.title}".`,
          'student',
          currentUser.id
        );
        onAddNotification(
          `🎉 Bạn đạt ${correctAnswers}/40 trong đề "${takingExam.title}" (Band ${randomScore}).`,
          `🎉 You achieved ${correctAnswers}/40 in "${takingExam.title}" (Band ${randomScore}).`,
          'student',
          currentUser.id
        );
        onAddNotification(
          `✅ Học sinh ${currentUser.name} đã hoàn thành bài tập "${takingAssignment.title}".`,
          `✅ Student ${currentUser.name} completed assignment "${takingAssignment.title}".`,
          'admin'
        );
        onAddNotification(
          `✅ Học sinh ${currentUser.name} đã hoàn thành bài tập "${takingAssignment.title}".`,
          `✅ Student ${currentUser.name} completed assignment "${takingAssignment.title}".`,
          'owner'
        );

        alert(`Nộp bài tập thành công!\nĐiểm của bạn: Band ${randomScore}\nThời gian làm bài: ${Math.round((takingExam.duration * 60 - timer) / 60) || 1} phút.`);
      } else {
        // self practice, mock save or log
        onAddNotification(
          `✅ Bạn đã hoàn thành tự luyện tập đề thi "${takingExam.title}".`,
          `✅ You have completed self-practice exam "${takingExam.title}".`,
          'student',
          currentUser.id
        );
        onAddNotification(
          `🎉 Bạn đạt ${correctAnswers}/40 trong đề "${takingExam.title}" (Band ${randomScore}).`,
          `🎉 You achieved ${correctAnswers}/40 in "${takingExam.title}" (Band ${randomScore}).`,
          'student',
          currentUser.id
        );
        onAddNotification(
          `✅ Học sinh ${currentUser.name} vừa hoàn thành tự luyện tập đề thi "${takingExam.title}".`,
          `✅ Student ${currentUser.name} completed self-practice exam "${takingExam.title}".`,
          'admin'
        );
        onAddNotification(
          `✅ Học sinh ${currentUser.name} vừa hoàn thành tự luyện tập đề thi "${takingExam.title}".`,
          `✅ Student ${currentUser.name} completed self-practice exam "${takingExam.title}".`,
          'owner'
        );

        alert(`Hoàn thành tự luyện tập!\nKết quả giả lập: Band ${randomScore}`);
      }

      setTakingExam(null);
      setTakingAssignment(null);
      setActiveTab('dashboard');
    }, 1200);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="text-xl bg-blue-50 dark:bg-slate-800 p-2 rounded-xl text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-slate-700">
            {centerSettings.logo}
          </span>
          <div>
            <h1 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm leading-tight">{centerSettings.name}</h1>
            <p className="text-[10px] text-blue-500 dark:text-blue-400 font-extrabold uppercase tracking-wider">
              {t.studentPortalTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-5">
          {/* Theme & Language Toggles */}
          <ThemeLanguageSelector
            theme={theme}
            setTheme={setTheme}
            language={language}
            setLanguage={setLanguage}
          />

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={`relative p-2 rounded-full transition-colors ${
                showNotifDropdown 
                  ? 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowNotifDropdown(false)} 
                />
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 z-40 animate-fade-in overflow-hidden">
                  <div className="p-4 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider flex items-center gap-2">
                      🔔 {t.notificationTitle}
                      {unreadCount > 0 && (
                        <span className="bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                          {unreadCount} {t.notificationNew}
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2 text-[11px]">
                      {unreadCount > 0 && (
                        <button
                          onClick={() => { onMarkAllRead(); }}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                        >
                          {t.notificationMarkAll}
                        </button>
                      )}
                      <button
                        onClick={() => { onClearNotifications(); }}
                        className="text-rose-500 hover:underline font-bold flex items-center gap-0.5"
                      >
                        <Trash2 size={11} />
                        {t.notificationClear}
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/50">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                        <p className="text-xl mb-1">🕊️</p>
                        {t.notificationNoItems}
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`p-3.5 flex gap-2.5 transition-colors text-xs text-left ${
                            n.isRead 
                              ? 'bg-white dark:bg-slate-900' 
                              : 'bg-indigo-50/40 dark:bg-indigo-950/10'
                          }`}
                        >
                          <div className="mt-0.5">
                            {n.isRead ? (
                              <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700 block" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-indigo-600 block animate-pulse" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className={`leading-relaxed text-slate-700 dark:text-slate-300 ${!n.isRead ? 'font-semibold' : 'font-normal'}`}>
                              {language === 'vi' ? n.textVi : n.textEn}
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              <span>{language === 'vi' ? n.timeVi : n.timeEn}</span>
                              {!n.isRead && (
                                <button
                                  onClick={() => onMarkRead(n.id)}
                                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold flex items-center gap-0.5"
                                >
                                  {t.notificationMarkRead}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User profile avatar info */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shadow-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{currentUser.name}</div>
              <div className="text-[9px] text-slate-400 font-semibold uppercase">{currentUser.email}</div>
            </div>
          </div>

          <button
            onClick={onLogout}
            title={t.logout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-lg text-xs font-bold transition-all"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">{t.logout}</span>
          </button>
        </div>
      </header>

      {/* Main body wrapper */}
      {takingExam ? (
        /* IELTS IMMERSIVE TEST SIMULATOR */
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col min-h-[500px]">
            {/* Sim Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => { if(confirm(t.examSimExitConfirm)) setTakingExam(null); }}
                  className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <div>
                  <div className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{t.examSimTitle}</div>
                  <h3 className="font-bold text-sm truncate max-w-md">{takingExam.title}</h3>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 font-mono text-sm font-bold text-blue-400">
                <Hourglass size={16} className="animate-pulse" />
                <span>{t.examSimTime}: {formatTimer(timer)}</span>
              </div>
            </div>

            {/* Sim Content area */}
            <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              {/* Left Column: Passage / Question Instruction */}
              <div className="space-y-5 lg:pr-4 overflow-y-auto max-h-[550px] pr-2">
                <h4 className="font-bold text-lg text-indigo-700 flex items-center gap-2">
                  {takingExam.type === 'listening' ? <Volume2 size={20} /> : <FileText size={20} />}
                  <span>{t.examSimInstruction}</span>
                </h4>

                {takingExam.type === 'listening' && (
                  <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl space-y-3">
                    <span className="text-xs font-bold text-blue-700 block uppercase">{t.examSimAudio}</span>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100">
                      <button className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                        <Play size={16} fill="white" />
                      </button>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="w-1/3 h-full bg-blue-600 rounded-full"></div>
                      </div>
                      <span className="text-xs font-semibold text-slate-500 font-mono">12:35 / 40:00</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-normal">
                      {t.examSimAudioDesc}
                    </p>
                  </div>
                )}

                {takingExam.type === 'reading' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Reading Passage 1: The Impact of Climate Change on Arctic Marine Ecosystems
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Arctic Marine Ecosystems are experiencing rapid modifications due to the unprecedented rate of climate warning. Observations over the past three decades reveal a consistent decline in both the thickness and seasonal duration of polar sea ice. This dramatic transition has far-reaching consequences, affecting everything from microscopic phytoplankton to apex predators like polar bears (Ursus maritimus)...
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Phytoplankton communities form the foundational base of the marine trophic web. With the thinning of sea ice coverage, solar radiation penetrates deeper into the water columns, triggering earlier and more intense seasonal algal blooms. However, this shift does not necessarily translate to positive output. The timing of food source availability is increasingly desynchronized with the life cycles of key zooplankton species...
                    </p>
                  </div>
                )}

                {takingExam.type === 'writing' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl">
                      <span className="text-xs font-bold text-amber-700 block mb-1">WRITING TASK 2 prompt:</span>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">
                        Some people believe that online education platforms are superior to traditional physical classrooms. To what extent do you agree or disagree with this statement? Provide arguments and relevant examples to support your view.
                      </p>
                    </div>
                  </div>
                )}

                {takingExam.type === 'speaking' && (
                  <div className="space-y-4">
                    <div className="p-4 bg-purple-50/60 border border-purple-100 rounded-xl text-center space-y-3">
                      <Mic size={36} className="text-purple-600 mx-auto animate-bounce" />
                      <h5 className="font-bold text-sm text-slate-800">SPEAKING PART 2: Describe a memorable trip</h5>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-normal">
                        You should speak for 1 to 2 minutes. You have 1 minute to prepare your notes before speaking.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 text-slate-500">
                  <div className="font-bold text-slate-700">{t.simGeneralRequirements}</div>
                  <p>{t.simReq1}</p>
                  <p>{t.simReq2}</p>
                  <p>{t.simReq3}</p>
                </div>
              </div>

              {/* Right Column: Answer Sheet Input */}
              <div className="space-y-5 lg:pl-6 pt-5 lg:pt-0 overflow-y-auto max-h-[550px] pr-2">
                <h4 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-emerald-500" />
                  <span>{t.answerSheetLabel}</span>
                </h4>

                {takingExam.type === 'writing' ? (
                  <div className="space-y-4">
                    <label className="block text-xs font-bold text-slate-700">{t.essayLabel}</label>
                    <textarea
                      placeholder="Write your essay here..."
                      rows={12}
                      value={answers['essay'] || ''}
                      onChange={(e) => setAnswers({ ...answers, essay: e.target.value })}
                      className="w-full p-4 border border-slate-200 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white bg-slate-50"
                    />
                    <div className="text-xs text-slate-400 font-bold text-right">
                      {t.essayWordCount} {answers['essay'] ? answers['essay'].trim().split(/\s+/).length : 0} {t.wordsSuffix}
                    </div>
                  </div>
                ) : takingExam.type === 'speaking' ? (
                  <div className="space-y-5 text-center py-6">
                    <span className="inline-flex items-center justify-center bg-red-50 text-red-600 border border-red-100 font-bold px-3 py-1.5 rounded-full text-xs gap-1.5 animate-pulse mx-auto">
                      {t.simSpeakingRecording}
                    </span>
                    <p className="text-xs text-slate-500">{t.simSpeakingAudioDesc}</p>
                    <div className="flex justify-center gap-1.5 items-center h-8">
                      <div className="w-1 bg-purple-500 h-6 rounded animate-pulse"></div>
                      <div className="w-1 bg-purple-500 h-8 rounded animate-pulse" style={{animationDelay:'0.1s'}}></div>
                      <div className="w-1 bg-purple-500 h-4 rounded animate-pulse" style={{animationDelay:'0.2s'}}></div>
                      <div className="w-1 bg-purple-500 h-7 rounded animate-pulse" style={{animationDelay:'0.3s'}}></div>
                      <div className="w-1 bg-purple-500 h-5 rounded animate-pulse" style={{animationDelay:'0.4s'}}></div>
                    </div>
                    <textarea
                      placeholder={t.simSpeakingNotesPlaceholder}
                      rows={4}
                      value={answers['speaking_notes'] || ''}
                      onChange={(e) => setAnswers({ ...answers, speaking_notes: e.target.value })}
                      className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <span className="text-xs font-bold text-slate-400 block uppercase">{language === 'vi' ? 'Đáp án các câu hỏi:' : 'Question Answers:'}</span>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <div key={num} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="font-bold text-slate-400 w-6 text-right text-xs">{t.questionLabel} {num}:</span>
                          <input
                            type="text"
                            placeholder={t.answerInputPlaceholder}
                            value={answers[num] || ''}
                            onChange={(e) => setAnswers({ ...answers, [num]: e.target.value })}
                            className="flex-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs text-slate-800 font-semibold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submitting Actions */}
                <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    onClick={() => { if(confirm(t.confirmExitExam)) setTakingExam(null); }}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
                  >
                    {t.cancelExamBtn}
                  </button>
                  <button
                    onClick={handleSubmitTest}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1.5"
                  >
                    {isSubmitting ? t.scoringStatus : t.submitExamBtn}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* PORTAL CONTENTS */
        <div className="flex-1 flex max-w-7xl w-full mx-auto">
          {/* Internal Sidebar Menu for student */}
          <aside className="w-60 border-r border-slate-200/60 p-6 space-y-6 hidden md:block">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{t.studentFunctions}</span>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Award size={15} />
                {t.studentDashboardTab}
              </button>
              <button
                onClick={() => setActiveTab('exams')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'exams' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen size={15} />
                {t.studentExamsTab}
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <CheckCircle2 size={15} />
                {t.studentHistoryTab}
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-2">
              <span className="text-[10px] font-bold text-blue-700 uppercase block">{t.studentSupport}</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {t.studentSupportDesc} <strong className="text-blue-800">{centerSettings.phone}</strong>
              </p>
            </div>
          </aside>

          {/* Tab Pages rendering */}
          <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Hero Banner with custom center options */}
                <div className="relative rounded-2xl overflow-hidden shadow-sm border border-slate-100 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
                  {centerSettings.bannerUrl && (
                    <div className="absolute inset-0 opacity-15 mix-blend-overlay">
                      <img src={centerSettings.bannerUrl} alt="banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                  <div className="p-8 relative z-10 max-w-2xl">
                    <span className="text-xs bg-white/20 text-white font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3 inline-block">
                      {t.welcomeLabel}
                    </span>
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{t.welcomeBack}, {currentUser.name}!</h2>
                    <p className="text-blue-100 text-xs md:text-sm mt-2 leading-relaxed">
                      {displaySlogan}
                    </p>
                    <p className="text-slate-300 text-[11px] md:text-xs mt-3 leading-relaxed opacity-90 hidden sm:block">
                      {displayDescription}
                    </p>
                  </div>
                </div>

                {/* Performance overview metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card p-5 flex items-center gap-3">
                    <span className="p-3.5 rounded-xl bg-blue-50 text-blue-600">
                      <Award size={20} />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.studentStatAverage}</span>
                      <span className="text-xl font-extrabold text-slate-900">{averageBand}</span>
                    </div>
                  </div>

                  <div className="glass-card p-5 flex items-center gap-3">
                    <span className="p-3.5 rounded-xl bg-teal-50 text-teal-600">
                      <CheckCircle2 size={20} />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.studentStatCompleted}</span>
                      <span className="text-xl font-extrabold text-slate-900">{completedAssignments.length} {language === 'vi' ? 'bài' : 'tasks'}</span>
                    </div>
                  </div>

                  <div className="glass-card p-5 flex items-center gap-3">
                    <span className="p-3.5 rounded-xl bg-amber-50 text-amber-600">
                      <Clock size={20} />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.studentStatPending}</span>
                      <span className="text-xl font-extrabold text-slate-900">{pendingAssignments.length} {language === 'vi' ? 'bài' : 'tasks'}</span>
                    </div>
                  </div>

                  <div className="glass-card p-5 flex items-center gap-3">
                    <span className="p-3.5 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-500">
                      <Flame size={20} className="animate-pulse" />
                    </span>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">{t.streakLabel}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                          {currentUser.streak || 0} {t.daysSuffix}
                        </span>
                        <span className="text-xs text-green-500 font-medium">
                          ✓ {language === 'vi' ? 'Đã điểm danh' : 'Checked in'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Assigned Homework section */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={18} className="text-blue-600" />
                        <span>{t.assignedHomeworkLabel}</span>
                      </h3>
                      <span className="text-xs bg-red-50 text-red-600 px-2.5 py-0.5 rounded-full font-bold">
                        {pendingAssignments.length} {t.debtHomeworkLabel}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {studentAssignments.length === 0 ? (
                        <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-slate-400 text-xs">
                          {language === 'vi' ? 'Chưa có lớp hoặc chưa có bài tập nào được giao cho bạn.' : 'No classes assigned or no homework has been assigned to you yet.'}
                        </div>
                      ) : (
                        studentAssignments.map(assign => {
                          const isDone = assign.submissions?.some(s => s.studentId === currentUser.id && s.status === 'done');
                          const submission = assign.submissions?.find(s => s.studentId === currentUser.id);
                          const matchingExam = exams.find(e => e.id === assign.examId);

                          if (!matchingExam) return null;

                          return (
                            <div key={assign.id} className="glass-card hover:border-blue-200 p-5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase">
                                    {assign.type}
                                  </span>
                                  <span>•</span>
                                  <span className="text-[10px] font-bold text-blue-600 uppercase">
                                    {t.studentDeadlineLabel} {assign.deadline}
                                  </span>
                                </div>
                                <h4 className="font-bold text-slate-800 text-sm">{assign.title}</h4>
                                <div className="text-xs text-slate-500">
                                  {language === 'vi' ? 'Cấu trúc:' : 'Structure:'} {matchingExam.questionsCount} {language === 'vi' ? 'câu' : 'questions'} | {matchingExam.duration} {language === 'vi' ? 'phút' : 'mins'}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-3">
                                {isDone ? (
                                  <div className="text-right">
                                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-100">
                                      <CheckCircle2 size={12} />
                                      {language === 'vi' ? 'Đã đạt' : 'Achieved'}: Band {submission?.score}
                                    </span>
                                    <span className="block text-[10px] text-slate-400 mt-1 font-semibold">{language === 'vi' ? 'Đã hoàn thành' : 'Completed'}</span>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleStartExam(matchingExam, assign)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/10"
                                  >
                                    <Play size={11} fill="white" />
                                    {t.doHomeworkBtn}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Sidebar stats & quote info */}
                  <div className="space-y-6">
                    <div className="glass-card p-5 space-y-4">
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5 border-b border-slate-50 pb-2.5">
                        <Star size={16} className="text-amber-500" />
                        <span>{t.studentTargetScoreLabel}</span>
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{t.studentIeltsTargetScore}</span>
                          {isEditingTarget ? (
                            <select
                              value={tempTarget}
                              onChange={(e) => {
                                const val = e.target.value;
                                setTempTarget(val);
                                setIsEditingTarget(false);
                                if (onUpdateCurrentUser) {
                                  onUpdateCurrentUser({
                                    ...currentUser,
                                    targetScore: val || undefined
                                  });
                                }
                              }}
                              onBlur={() => setIsEditingTarget(false)}
                              autoFocus
                              className="text-xs bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                            >
                              <option value="">{language === 'vi' ? 'Chưa đặt' : 'Not set'}</option>
                              <option value="Band 5.0">Band 5.0</option>
                              <option value="Band 5.5">Band 5.5</option>
                              <option value="Band 6.0">Band 6.0</option>
                              <option value="Band 6.5">Band 6.5</option>
                              <option value="Band 7.0">Band 7.0</option>
                              <option value="Band 7.5">Band 7.5</option>
                              <option value="Band 8.0">Band 8.0</option>
                              <option value="Band 8.5">Band 8.5</option>
                              <option value="Band 9.0">Band 9.0</option>
                            </select>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                {currentUser.targetScore || (language === 'vi' ? 'Chưa đặt' : 'Not set')}
                              </span>
                              <button
                                onClick={() => {
                                  setTempTarget(currentUser.targetScore || '');
                                  setIsEditingTarget(true);
                                }}
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                                title={language === 'vi' ? 'Sửa mục tiêu' : 'Edit target score'}
                              >
                                <Edit2 size={11} />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{t.studentCurrentClass}</span>
                          <span className="font-semibold text-slate-800 truncate max-w-[150px]">
                            {studentClasses.length > 0 ? studentClasses[0].name.split(' - ')[0] : t.studentNoClass}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">{t.studentTargetStatus}</span>
                          <span className="text-emerald-600 font-bold">{language === 'vi' ? 'Đang chăm chỉ ✍️' : 'Studying hard ✍️'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-5 rounded-2xl text-white space-y-3 relative overflow-hidden">
                      <Quote size={40} className="text-white/5 absolute -right-2 -bottom-2" />
                      <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">{t.studentQuoteTitle}</span>
                      <p className="text-xs text-indigo-100 italic leading-relaxed">
                        "Your limits only exist in your mind. Every practice test you take brings you one band closer to your dream score."
                      </p>
                      <span className="block text-[10px] text-right text-indigo-300 font-bold">— Aegis IELTS Council</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'exams' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">{t.studentPracticeLibrary}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.studentPracticeLibraryDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {exams.filter(e => e.status === 'published').map(exam => (
                    <div key={exam.id} className="glass-card p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
                      <div className="space-y-3">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[10px] font-bold uppercase">
                          {exam.type}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 h-10 group-hover:text-blue-600 transition-colors">
                          {exam.title}
                        </h4>
                        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{exam.duration} {language === 'vi' ? 'phút' : 'mins'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText size={12} />
                            <span>{exam.questionsCount} {language === 'vi' ? 'câu hỏi' : 'questions'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-50 pt-3.5 mt-4 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-semibold">{t.studentSelfStudyTag}</span>
                        <button
                          onClick={() => handleStartExam(exam)}
                          className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          {t.studentPracticeBtn}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-800">{t.studentHistoryPageTitle}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t.studentHistoryPageDesc}
                  </p>
                </div>

                <div className="glass-card overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <th className="px-6 py-4">{t.studentHistoryColTitle}</th>
                        <th className="px-6 py-4">{t.studentHistoryColType}</th>
                        <th className="px-6 py-4">{t.studentHistoryColDate}</th>
                        <th className="px-6 py-4">{t.studentHistoryColDuration}</th>
                        <th className="px-6 py-4 text-right">{t.studentHistoryColScore}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                      {completedSubmissions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                            {t.studentHistoryEmpty}
                          </td>
                        </tr>
                      ) : (
                        completedSubmissions.map((sub, idx) => {
                          // Find matching assignment name
                          const matchingAssign = studentAssignments.find(a => 
                            a.submissions?.some(s => s.submittedAt === sub.submittedAt)
                          );

                          return (
                            <tr key={idx} className="hover:bg-slate-50/40 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{matchingAssign?.title || (language === 'vi' ? 'Đề tự luyện' : 'Self-study practice')}</div>
                                <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">{language === 'vi' ? 'Mã nộp:' : 'Submission ID:'} {idx + 101}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-xs font-semibold uppercase bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded">
                                  {matchingAssign?.type || 'General'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500">
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
                              </td>
                              <td className="px-6 py-4 text-xs font-mono">
                                {sub.duration} {language === 'vi' ? 'phút' : 'mins'}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="inline-block bg-blue-50 text-blue-700 font-extrabold text-sm px-3 py-1 rounded-lg border border-blue-100">
                                  Band {sub.score}
                                </span>
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
          </div>
        </div>
      )}
    </div>
  );
}
