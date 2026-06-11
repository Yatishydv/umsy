import React, { useState } from 'react';
import { Mail, Calendar, User, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

/** Splits text on URLs and returns mixed array of strings + clickable <a> elements */
const renderWithLinks = (text) => {
    if (!text) return null;
    const URL_REGEX = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
            // Reset lastIndex after test()
            URL_REGEX.lastIndex = 0;
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 underline underline-offset-2 break-all font-medium"
                >
                    {part}
                    <ExternalLink className="h-3 w-3 flex-shrink-0 inline" />
                </a>
            );
        }
        URL_REGEX.lastIndex = 0;
        return part;
    });
};

const MessagesCard = ({ messages = [] }) => {
    const [expandedMessages, setExpandedMessages] = useState(new Set());

    const toggleMessage = (index) => {
        const newExpanded = new Set(expandedMessages);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedMessages(newExpanded);
    };

    const isExpanded = (index) => expandedMessages.has(index);

    if (!messages || messages.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-gray-100 rounded-lg">
                        <Mail className="h-5 w-5 text-gray-600" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                </div>
                <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No messages available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                            <Mail className="h-5 w-5 text-gray-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {messages.length} {messages.length === 1 ? 'message' : 'messages'}
                    </span>
                </div>
            </div>

            {/* Messages List */}
            <div className="max-h-96 overflow-y-auto">
                {messages.map((message, index) => {
                    const expanded = isExpanded(index);
                    const hasLongContent = message.content && message.content.length > 150;

                    return (
                        <div
                            key={index}
                            className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                        >
                            <div
                                className={`p-6 cursor-pointer ${hasLongContent ? 'hover:bg-gray-50' : ''}`}
                                onClick={() => hasLongContent && toggleMessage(index)}
                            >
                                {/* Message Header */}
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <h3 className="font-semibold text-gray-900 text-sm flex-1">
                                        {message.subject || 'No Subject'}
                                    </h3>
                                    {hasLongContent && (
                                        <button
                                            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMessage(index);
                                            }}
                                        >
                                            {expanded ? (
                                                <ChevronUp className="h-4 w-4 text-gray-600" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-gray-600" />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Message Meta Info */}
                                <div className="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-500">
                                    {message.sender && (
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" />
                                            <span>{message.sender}</span>
                                        </div>
                                    )}
                                    {message.date && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>{message.date}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Message Content with clickable links */}
                                {message.content && (
                                    <div>
                                        <p className={`text-sm text-gray-600 whitespace-pre-wrap ${expanded ? '' : 'line-clamp-2'}`}>
                                            {renderWithLinks(message.content)}
                                        </p>
                                        {hasLongContent && !expanded && (
                                            <button
                                                className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMessage(index);
                                                }}
                                            >
                                                Read more
                                                <ChevronDown className="h-3 w-3" />
                                            </button>
                                        )}
                                        {hasLongContent && expanded && (
                                            <button
                                                className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium mt-2 flex items-center gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMessage(index);
                                                }}
                                            >
                                                Show less
                                                <ChevronUp className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MessagesCard;
