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
import MobileBacklogs from './components/MobileBacklogs';
import MobileBottomNav from './components/MobileBottomNav';
import ByeBye from './components/ByeBye';
import Cookie from './components/Cookie';
import NewLogin from './components/NewLogin';
import UmsyV04Login from './components/UmsyV04Login';
import DashboardLayout from './components/DashboardLayout';
import './App.css';

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

  const isAuthorized = reg && (info || isLoggingIn) && !nameIsInvalid;
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
  const loginRoutes = ['/newlogin', '/newlogin2', '/cookie', '/login', '/umsyV04', '/v04/login', '/'];
  const isLoginPage = loginRoutes.includes(location.pathname);

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

      if (!reg || (!info && !isLoggingIn) || nameIsInvalid) {
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

  return (
    <>
      <Routes>
        <Route path="/cookie" element={<Cookie />} />
        <Route path="/newlogin" element={<NewLogin />} />
        <Route path="/newlogin2" element={<NewLogin />} />
        <Route path="/v04/login" element={<Navigate to="/login" replace />} />
        <Route path="/umsyV04" element={<Navigate to="/login" replace />} />
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
        </Route>

        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/backlogs" element={<ProtectedRoute><MobileBacklogs /></ProtectedRoute>} />
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
