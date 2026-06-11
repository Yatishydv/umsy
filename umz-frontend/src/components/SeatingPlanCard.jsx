import React, { useState } from 'react';
import { Calendar, MapPin, Clock, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const SeatingPlanCard = ({ seatingPlan = [] }) => {
    const [expandedItems, setExpandedItems] = useState(new Set());

    console.log('🔍 SeatingPlanCard received:', seatingPlan, 'Length:', seatingPlan?.length);

    const toggleItem = (index) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedItems(newExpanded);
    };

    const isExpanded = (index) => expandedItems.has(index);

    // Helper function to get status color
    const getStatusColor = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower.includes('upcoming') || statusLower.includes('scheduled')) {
            return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
        }
        if (statusLower.includes('completed') || statusLower.includes('done')) {
            return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
        }
        if (statusLower.includes('cancelled') || statusLower.includes('postponed')) {
            return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
        }
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    };

    if (!seatingPlan || seatingPlan.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Seating Plan</h2>
                </div>
                <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No seating plan available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <MapPin className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Seating Plan</h2>
                    </div>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        {seatingPlan.length} {seatingPlan.length === 1 ? 'exam' : 'exams'}
                    </span>
                </div>
            </div>

            {/* Seating Plan List */}
            <div className="max-h-96 overflow-y-auto">
                {seatingPlan.map((item, index) => {
                    const expanded = isExpanded(index);

                    return (
                        <div
                            key={index}
                            className="border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            <div
                                className="p-6 cursor-pointer"
                                onClick={() => toggleItem(index)}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                                            {item.courseCode} - {item.courseName}
                                        </h3>
                                        {item.status && (
                                            <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${getStatusColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleItem(index);
                                        }}
                                    >
                                        {expanded ? (
                                            <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                        )}
                                    </button>
                                </div>

                                {/* Basic Info - Always Visible */}
                                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                    {item.date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">Date:</span>
                                            <span>{item.date}</span>
                                        </div>
                                    )}
                                    {item.exam && (
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-gray-400" />
                                            <span className="font-medium">Exam:</span>
                                            <span>{item.exam}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Expanded Details */}
                                {expanded && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                                        {item.room && (
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <div>
                                                    <span className="font-medium">Room No:</span>
                                                    <span className="ml-2">{item.room}</span>
                                                </div>
                                            </div>
                                        )}
                                        {item.reportingTime && (
                                            <div className="flex items-start gap-2">
                                                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                                                <div>
                                                    <span className="font-medium">Reporting Time:</span>
                                                    <span className="ml-2">{item.reportingTime}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Expand/Collapse Hint */}
                                {!expanded && (item.room || item.reportingTime) && (
                                    <button
                                        className="cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mt-3 flex items-center gap-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleItem(index);
                                        }}
                                    >
                                        View details
                                        <ChevronDown className="h-3 w-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SeatingPlanCard;
