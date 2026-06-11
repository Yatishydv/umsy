import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';

const PrivacySettingsModal = ({ isOpen, onClose }) => {
    const [hideCGPA, setHideCGPA] = useState(false);
    const [hideProfile, setHideProfile] = useState(false);

    // Load preferences from localStorage on mount
    useEffect(() => {
        const savedHideCGPA = localStorage.getItem('umz_hide_cgpa') === 'true';
        const savedHideProfile = localStorage.getItem('umz_hide_profile') === 'true';
        setHideCGPA(savedHideCGPA);
        setHideProfile(savedHideProfile);
    }, []);

    // Save preferences to localStorage
    const handleToggleCGPA = () => {
        const newValue = !hideCGPA;
        setHideCGPA(newValue);
        localStorage.setItem('umz_hide_cgpa', newValue.toString());
        // Trigger a custom event to notify Dashboard
        window.dispatchEvent(new Event('privacy-settings-changed'));
    };

    const handleToggleProfile = () => {
        const newValue = !hideProfile;
        setHideProfile(newValue);
        localStorage.setItem('umz_hide_profile', newValue.toString());
        // Trigger a custom event to notify Dashboard
        window.dispatchEvent(new Event('privacy-settings-changed'));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Privacy Settings</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Control what information is visible on your dashboard. Hidden items will be blurred.
                    </p>

                    {/* CGPA Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                                {hideCGPA ? (
                                    <EyeOff className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Hide CGPA</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Blur CGPA information</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleCGPA}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${hideCGPA
                                    ? 'bg-blue-600'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hideCGPA ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Profile Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                                {hideProfile ? (
                                    <EyeOff className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                ) : (
                                    <Eye className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                )}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Hide Profile</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Blur profile information</p>
                            </div>
                        </div>
                        <button
                            onClick={handleToggleProfile}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${hideProfile
                                    ? 'bg-blue-600'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${hideProfile ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacySettingsModal;
