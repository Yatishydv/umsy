import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
import UmzV04Login from './components/UmzV04Login';
import GlobalSearch from './components/GlobalSearch';
import './App.css';

function AppContent() {
  const location = useLocation();
  const loginRoutes = ['/newlogin', '/newlogin2', '/cookie', '/login', '/umzV04', '/v04/login', '/'];
  const isLoginPage = loginRoutes.includes(location.pathname);

  // Get student info for the nav
  const studentInfoStr = localStorage.getItem('umz_student_info');
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
        <Route path="/v04/login" element={<UmzV04Login />} />
        <Route path="/umzV04" element={<UmzV04Login />} />
        <Route path="/login" element={<ByeBye />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/marks" element={<Grades />} />
        <Route path="/cgpa" element={<CGPA />} />
        <Route path="/time-table" element={<TimeTable />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/grades" element={<Grades />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/mutual-shift" element={<MutualShift />} />
        <Route path="/hostel-info" element={<HostelInfo />} />
        <Route path="/ai-buddy" element={<AiBuddy />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/backlogs" element={<MobileBacklogs />} />
        <Route path="/" element={<ByeBye />} />
      </Routes>
      <GlobalSearch />
      {!isLoginPage && (
        <MobileBottomNav
          messageCount={0}
          studentPhoto={studentPhoto}
          studentName={studentName}
        />
      )}
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
