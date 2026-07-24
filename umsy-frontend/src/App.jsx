import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Attendance from './components/Attendance';
import Marks from './components/Marks';
import CGPA from './components/CGPA';
import TimeTable from './components/TimeTable';
import Courses from './components/Courses';
import Grades from './components/Grades';
import Ranking from './components/Ranking';
import MutualShift from './components/MutualShift';
import HostelInfo from './components/HostelInfo';
import AiBuddy from './components/AiBuddy';
import Profile from './components/Profile';
import Placements from './components/Placements';
import MobileBacklogs from './components/MobileBacklogs';
import MobileBottomNav from './components/MobileBottomNav';
import ByeBye from './components/ByeBye';
import Cookie from './components/Cookie';
import CookieCallback from './components/CookieCallback';
import NewLogin from './components/NewLogin';
import UmsyV04Login from './components/UmsyV04Login';
import DashboardLayout from './components/DashboardLayout';
import SeatingPlan from './components/SeatingPlan';
import V05Login from './components/V05Login';
import DataPage from './components/DataPage';
import './App.css';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';

function ProtectedRoute({ children }) {
  const reg = localStorage.getItem('umsy_regno');
  const info = localStorage.getItem('umsy_student_info');
  const isLoggingIn = localStorage.getItem('umsy_is_logging_in') === 'true';

  let nameIsInvalid = false;
  if (info) {
    try {
      const parsed = JSON.parse(info);
      if (parsed?.StudentName && parsed.StudentName.toLowerCase() === 'student') {
        nameIsInvalid = true;
      }
      if (parsed?.Name && parsed.Name.toLowerCase() === 'student') {
        nameIsInvalid = true;
      }
    } catch (e) {}
  }

  const isAuthorized = !!reg;
  if (!isAuthorized) {
    localStorage.removeItem('umsy_regno');
    localStorage.removeItem('umsy_cookies');
    localStorage.removeItem('umsy_student_info');
    localStorage.removeItem('umsy_is_logging_in');
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppContent() {
  const location = useLocation();
  const loginRoutes = ['/cookie-callback', '/tlogin', '/v05login', '/v05login/1', '/v05login/2', '/v05login/3', '/v05login/4', '/newlogin', '/newlogin2', '/cookie', '/login', '/umsyV04', '/v04/login', '/'];
  const isLoginPage = loginRoutes.includes(location.pathname);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  // Check version on startup
  useEffect(() => {
    const handleForceUpdate = () => {
      setShowUpdateModal(true);
    };
    window.addEventListener('umsy-force-update', handleForceUpdate);

    const checkVersion = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        if (Capacitor.Plugins.LiveNotification) {
          const { versionCode } = await Capacitor.Plugins.LiveNotification.getVersionCode();
          const response = await fetch('https://umsy-backend-production.up.railway.app/api/app-version');
          if (response.ok) {
            const data = await response.json();
            if (versionCode < data.latestVersionCode) {
              setShowUpdateModal(true);
            }
          }
        }
      } catch (e) {
        console.error('Failed version check', e);
      }
    };
    checkVersion();

    return () => window.removeEventListener('umsy-force-update', handleForceUpdate);
  }, []);

  // Auto-start live notification service if enabled by default or by setting
  useEffect(() => {
    const initLiveNotification = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        const activeSetting = localStorage.getItem('live_notification_active');
        const isActive = activeSetting === null ? true : activeSetting === 'true';
        
        if (isActive && Capacitor.Plugins.LiveNotification) {
          const cachedTimetable = localStorage.getItem('umsy_timetable_data');
          if (cachedTimetable) {
            await Capacitor.Plugins.LiveNotification.saveTimetable({
              data: cachedTimetable
            });
            await Capacitor.Plugins.LiveNotification.startService();
          }
        }
      } catch (e) {
        console.error('Failed to auto-start live notification service', e);
      }
    };
    initLiveNotification();
  }, []);

  const handleUpdate = async () => {
    if (!Capacitor.isNativePlatform() || !Capacitor.Plugins.LiveNotification) {
      window.open('https://umsy.vercel.app/umsy.apk?v=9', '_system');
      return;
    }

    try {
      setDownloadProgress(0);
      setDownloadError(null);

      // Listen for download progress
      const listener = await Capacitor.Plugins.LiveNotification.addListener('downloadProgress', (data) => {
        setDownloadProgress(data.progress);
      });

      await Capacitor.Plugins.LiveNotification.downloadAndInstallApk({
        url: 'https://umsy.vercel.app/umsy.apk?v=9'
      });

      listener.remove();
    } catch (err) {
      console.error('Update failed', err);
      setDownloadError('Download failed. Please try again.');
      setDownloadProgress(null);
    }
  };

  // Monitor credentials and student info. If missing, logout and redirect.
  useEffect(() => {
    if (loginRoutes.includes(location.pathname)) return;

    const checkAuth = () => {
      const reg = localStorage.getItem('umsy_regno');
      const info = localStorage.getItem('umsy_student_info');
      const isLoggingIn = localStorage.getItem('umsy_is_logging_in') === 'true';

      let nameIsInvalid = false;
      if (info) {
        try {
          const parsed = JSON.parse(info);
          if (parsed?.StudentName && parsed.StudentName.toLowerCase() === 'student') {
            nameIsInvalid = true;
          }
          if (parsed?.Name && parsed.Name.toLowerCase() === 'student') {
            nameIsInvalid = true;
          }
        } catch (e) {}
      }

      if (!reg) {
        localStorage.removeItem('umsy_regno');
        localStorage.removeItem('umsy_cookies');
        localStorage.removeItem('umsy_student_info');
        localStorage.removeItem('umsy_is_logging_in');
        window.location.href = '/login';
      }
    };

    checkAuth();
    const interval = setInterval(checkAuth, 2000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Get student info for the nav
  const studentInfoStr = localStorage.getItem('umsy_student_info');
  let studentPhoto = '';
  let studentName = '';

  if (studentInfoStr) {
    try {
      const studentInfo = JSON.parse(studentInfoStr);
      studentPhoto = studentInfo?.StudentPicture ? `data:image/png;base64,${studentInfo.StudentPicture}` : '';
      studentName = studentInfo?.StudentName || '';
    } catch (e) {
      console.error('Error parsing student info:', e);
    }
  }

  if (showUpdateModal) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-xl p-6 text-center select-none">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-[#bef227] text-[#1c312e] rounded-2xl flex items-center justify-center mb-6 shadow-md shadow-[#bef227]/25 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">App Update Required</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm leading-relaxed mb-6 font-bold">
            {downloadProgress !== null ? `Downloading update: ${downloadProgress}%` : "You are using an older version of UMSY. Please update to continue."}
          </p>

          {downloadProgress !== null ? (
            <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-2.5 mb-6">
              <div 
                className="bg-[#bef227] h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          ) : (
            <button
              onClick={handleUpdate}
              className="w-full bg-[#bef227] hover:bg-[#a9d821] text-[#1c312e] font-black py-3.5 px-6 rounded-2xl transition-all active:scale-95 shadow-md shadow-[#bef227]/20 cursor-pointer"
            >
              Update Now
            </button>
          )}

          <a
            href="https://umsy.vercel.app/umsy.apk?v=9"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (Capacitor.isNativePlatform()) {
                e.preventDefault();
                window.open('https://umsy.vercel.app/umsy.apk?v=9', '_system');
              }
            }}
            className="mt-5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline cursor-pointer transition-colors"
          >
            Or download directly from website
          </a>

          {downloadError && (
            <p className="text-red-500 text-xs mt-3 font-semibold">{downloadError}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route path="/cookie" element={<Cookie />} />
        <Route path="/cookie-callback" element={<CookieCallback />} />
        <Route path="/tlogin" element={<UmsyV04Login />} />
        <Route path="/v05login" element={<Navigate to="/v05login/1" replace />} />
        <Route path="/v05login/1" element={<V05Login mode="extension" />} />
        <Route path="/v05login/2" element={<V05Login mode="popup" />} />
        <Route path="/v05login/3" element={<V05Login mode="turnstile" />} />
        <Route path="/v05login/4" element={<V05Login mode="instant" />} />
        <Route path="/newlogin" element={<V05Login />} />
        <Route path="/newlogin2" element={<V05Login />} />
        <Route path="/v04/login" element={<Navigate to="/tlogin" replace />} />
        <Route path="/umsyV04" element={<Navigate to="/tlogin" replace />} />
        <Route path="/login" element={<UmsyV04Login />} />

        {/* Dashboard layout wrapping all core authenticated pages */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/marks" element={<Grades />} />
          <Route path="/cgpa" element={<CGPA />} />
          <Route path="/time-table" element={<TimeTable />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/grades" element={<Grades />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/hostel-info" element={<HostelInfo />} />
          <Route path="/ai-buddy" element={<AiBuddy />} />
          <Route path="/placements" element={<Placements />} />
          <Route path="/seating-plan" element={<SeatingPlan />} />
        </Route>

        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/backlogs" element={<ProtectedRoute><MobileBacklogs /></ProtectedRoute>} />
        <Route path="/data" element={<ProtectedRoute><DataPage /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
