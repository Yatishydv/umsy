import React, { useState } from 'react';
import { X, RefreshCw } from 'lucide-react';

const CaptchaModal = ({ isOpen, onClose, captchaImage, onSubmit, onReload, loading }) => {
    const [captcha, setCaptcha] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (captcha.trim()) {
            onSubmit(captcha.toUpperCase());
        }
    };

    const handleClose = () => {
        setCaptcha('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Session Expired</h2>
                        <p className="text-sm text-gray-500 mt-1">Please verify the captcha to continue</p>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={loading}
                        className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Captcha Image */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Captcha</label>
                        {onReload && (
                            <button
                                type="button"
                                onClick={onReload}
                                disabled={loading}
                                className="cursor-pointer p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reload captcha"
                            >
                                <RefreshCw className={`h-4 w-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        )}
                    </div>
                    <div className="flex justify-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                        {captchaImage ? (
                            <img
                                src={captchaImage}
                                alt="Captcha"
                                className="max-h-20 object-contain scale-180 rounded-md"
                            />
                        ) : (
                            <div className="h-20 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Enter captcha"
                            value={captcha}
                            onChange={(e) => setCaptcha(e.target.value.toUpperCase())}
                            required
                            disabled={loading}
                            autoFocus
                            autoComplete="off"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed font-mono text-lg uppercase"
                        />
                        {/* <p className="text-xs text-gray-500">
                            Characters are automatically converted to uppercase
                        </p> */}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="cursor-pointer flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !captcha}
                            className="cursor-pointer flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {loading ? 'Verifying...' : 'Verify'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CaptchaModal;
