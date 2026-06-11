import React, { useState } from 'react';
import { Calendar, MapPin, Clock, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

const SeatingPlanCardCompact = ({ seatingPlan = [] }) => {
    const [expandedItems, setExpandedItems] = useState(new Set());

    console.log('🔍 SeatingPlanCardCompact received:', seatingPlan, 'Length:', seatingPlan?.length);

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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Seating Plan</h3>
                <div className="text-center py-8">
                    <MapPin className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No seating plan available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Seating Plan</h3>

            {/* Seating Plan List - Compact */}
            <div className="space-y-4 max-h-64 overflow-y-auto">
                {seatingPlan.map((item, index) => {
                    const expanded = isExpanded(index);

                    return (
                        <div
                            key={index}
                            className="pb-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 last:pb-0"
                        >
                            {/* Course Info */}
                            <div className="flex items-start justify-between gap-2 mb-3">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                                        {item.courseCode}
                                    </h4>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                        {item.courseName}
                                    </p>
                                </div>
                                {item.status && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded flex-shrink-0 ${getStatusColor(item.status)}`}>
                                        {item.status}
                                    </span>
                                )}
                            </div>

                            {/* Date - Always visible */}
                            <div className="mb-2">
                                {item.date && (
                                    <div className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                                        <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <span className="leading-tight font-medium">{item.date}</span>
                                    </div>
                                )}
                            </div>

                            {/* Expandable Details */}
                            {expanded && (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-600 dark:text-gray-400 mb-3">
                                    {/* Left Column */}
                                    <div className="space-y-2">
                                        {item.exam && (
                                            <div className="flex items-start gap-1.5">
                                                <BookOpen className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                <span className="leading-tight break-words">{item.exam}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-2">
                                        {item.room && (
                                            <div className="flex items-start gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                <span className="leading-tight">Room: {item.room}</span>
                                            </div>
                                        )}
                                        {item.reportingTime && (
                                            <div className="flex items-start gap-1.5">
                                                <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                                <span className="leading-tight break-words">{item.reportingTime}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Show More/Less Button */}
                            <button
                                onClick={() => toggleItem(index)}
                                className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                                {expanded ? (
                                    <>
                                        Show less
                                        <ChevronUp className="h-3 w-3" />
                                    </>
                                ) : (
                                    <>
                                        Show more
                                        <ChevronDown className="h-3 w-3" />
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SeatingPlanCardCompact;
