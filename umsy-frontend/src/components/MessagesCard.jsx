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
                    className="inline-flex items-center gap-0.5 text-[#bef227] hover:text-[#d4ff5c] underline underline-offset-2 break-all font-bold"
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
            <div className="bg-white dark:bg-[#1c312e] rounded-3xl shadow-sm border border-slate-200/60 dark:border-white/5 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-[#bef227]/10 rounded-2xl border border-[#bef227]/20">
                        <Mail className="h-5 w-5 text-[#bef227]" />
                    </div>
                    <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Messages</h2>
                </div>
                <div className="text-center py-8">
                    <Mail className="h-10 w-10 text-slate-300 dark:text-zinc-600 mx-auto mb-3" />
                    <p className="text-xs font-bold text-slate-400 dark:text-zinc-500">No messages available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#1c312e] rounded-3xl shadow-sm border border-slate-200/60 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#bef227]/10 rounded-2xl border border-[#bef227]/20">
                            <Mail className="h-4.5 w-4.5 text-[#bef227]" />
                        </div>
                        <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Messages</h2>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 dark:text-zinc-500 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-xl uppercase tracking-widest border border-slate-100 dark:border-white/5">
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
                            className="border-b border-slate-100 dark:border-white/5 last:border-b-0 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                            <div
                                className={`p-5 cursor-pointer`}
                                onClick={() => hasLongContent && toggleMessage(index)}
                            >
                                {/* Message Header */}
                                <div className="flex items-start justify-between gap-4 mb-2.5">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-white flex-1">
                                        {message.subject || 'No Subject'}
                                    </h3>
                                    {hasLongContent && (
                                        <button
                                            className="flex-shrink-0 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleMessage(index);
                                            }}
                                        >
                                            {expanded ? (
                                                <ChevronUp className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Message Meta Info */}
                                <div className="flex flex-wrap items-center gap-3 mb-2.5 text-[9px] font-black text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                                    {message.sender && (
                                        <div className="flex items-center gap-1.5">
                                            <User className="h-3 w-3" />
                                            <span>{message.sender}</span>
                                        </div>
                                    )}
                                    {message.date && (
                                        <div className="flex items-center gap-1.5">
                                            <Calendar className="h-3 w-3" />
                                            <span>{message.date}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Message Content with clickable links */}
                                {message.content && (
                                    <div>
                                        <p className={`text-xs text-slate-500 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
                                            {renderWithLinks(message.content)}
                                        </p>
                                        {hasLongContent && !expanded && (
                                            <button
                                                className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-[#bef227] mt-2 flex items-center gap-1"
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
                                                className="cursor-pointer text-[9px] font-black uppercase tracking-widest text-[#bef227] mt-2 flex items-center gap-1"
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
