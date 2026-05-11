import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileProfile from './MobileProfile';

const Profile = () => {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);

    useEffect(() => {
        const cached = localStorage.getItem('umz_student_info');
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setStudentInfo({
                    name: parsed.StudentName,
                    rollNo: parsed.Registrationnumber,
                    actualRollNo: parsed.RollNumber,
                    programme: parsed.Program,
                    section: parsed.Section,
                    email: parsed.StudentEmail,
                    mobile: parsed.StudentMobile,
                    profilePic: parsed.StudentPicture ? `data:image/png;base64,${parsed.StudentPicture}` : null
                });
            } catch (e) {
                console.error('Error parsing student info:', e);
            }
        }
    }, []);

    const handleLogout = () => {
        // Keep credentials for auto-fill in NewLogin, clear everything else
        const keep = new Set(['umz_regno', 'umz_password', 'theme']);
        Object.keys(localStorage).forEach(key => {
            if (!keep.has(key)) localStorage.removeItem(key);
        });
        navigate('/newlogin');
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
            <Sidebar />
            <main className="flex-1 lg:ml-64 min-h-screen">
                {/* Desktop Placeholder (since we're focusing on mobile first as requested) */}
                <div className="hidden lg:flex items-center justify-center min-h-screen text-gray-400 font-medium">
                    Profile Page (Desktop Version Coming Soon)
                </div>

                {/* Mobile Profile Component */}
                <div className="lg:hidden">
                    <MobileProfile 
                        studentInfo={studentInfo} 
                        onLogout={handleLogout}
                        onNavigate={(label) => console.log('Navigating to:', label)}
                    />
                </div>
            </main>
        </div>
    );
};

export default Profile;
