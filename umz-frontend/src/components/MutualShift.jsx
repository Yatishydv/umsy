import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Pencil, Trash2, Plus, Check, X, Search, Building2, BedDouble, RefreshCw, Users, MessageCircle, Home } from 'lucide-react';
import Sidebar from './Sidebar';
import { getHostelInfo, getMyMutualShiftPost, createMutualShiftPost, updateMutualShiftPost, deleteMutualShiftPost, getAllMutualShiftPosts } from '../services/api';

// ─── Field row ────────────────────────────────────────────────
const Field = ({ label, value, muted }) => (
    <div className="flex items-center justify-between gap-4 px-6 py-3.5 border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
        <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
        <span className={`text-sm font-semibold text-right ${muted ? 'text-gray-400 dark:text-gray-500 italic' : 'text-gray-900 dark:text-white'}`}>
            {value || '—'}
        </span>
    </div>
);

// ─── Hostel options ───────────────────────────────────────────
const HOSTELS = [
    'Boys Hostel 1',
    'Boys Hostel 2',
    'Boys Hostel 3',
    'Boys Hostel 4',
    'Boys Hostel 5',
    'Boys Hostel 6',
    'Boys Hostel 7',
    'Boys Studios 8',
    'Boys Studios 9',
    'Boys Studios 10',
    'Apartment',
];

// ─── Select helper ────────────────────────────────────────────
const Select = ({ label, id, value, onChange, required }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <select
            id={id}
            value={value}
            onChange={e => onChange(e.target.value)}
            required={required}
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all appearance-none cursor-pointer"
        >
            <option value="" disabled>Select a hostel…</option>
            {HOSTELS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
    </div>
);

const Input = ({ label, id, value, onChange, placeholder, required }) => (
    <div>
        <label htmlFor={id} className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <input
            id={id} type="text" value={value}
            onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
            className="w-full px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white focus:border-transparent transition-all"
        />
    </div>
);

// ─── Chat Redirect Modal ──────────────────────────────────────
const ChatModal = ({ person, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
            className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
        >
            {/* Icon */}
            <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto">
                <MessageCircle className="h-7 w-7 text-blue-500" />
            </div>

            {/* Text */}
            <div className="text-center space-y-1.5">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">Open LPU Live</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    You're being redirected to the{' '}
                    <span className="font-semibold text-gray-700 dark:text-gray-200">LPU Live chat app</span>
                    {' '}to connect with
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{person.name}</p>
                <p className="text-xs text-gray-400">{person.vid}</p>
            </div>

            {/* Coming soon badge */}
            {/* <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-4 py-2.5 text-center">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400">🚧 Chat integration coming soon</p>
                <p className="text-xs text-amber-600/70 dark:text-amber-500/70 mt-0.5">Full implementation will be available in the next update</p>
            </div> */}

            {/* Close */}
            <button
                onClick={onClose}
                className="cursor-pointer w-full py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                Got it
            </button>
        </div>
    </div>
);

// ─── Post Card (Browse view) ───────────────────────────────────
const PostCard = ({ post, isOwn, onChat }) => {
    const initials = post.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '??';
    const postedDate = new Date(post.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <div className={`bg-white dark:bg-gray-800 border rounded-xl overflow-hidden transition-all hover:shadow-md ${isOwn ? 'border-emerald-200 dark:border-emerald-800/50' : 'border-gray-200 dark:border-gray-700'}`}>
            {/* Card header */}
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700/60">
                <div className="w-9 h-9 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-white dark:text-gray-900">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{post.name}</p>
                    <p className="text-xs text-gray-400">{post.vid} · {postedDate}</p>
                </div>
                {isOwn ? (
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
                        You
                    </span>
                ) : (
                    <button
                        onClick={() => onChat(post)}
                        title="Chat via LPU Live"
                        className="cursor-pointer w-8 h-8 rounded-full flex items-center justify-center text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    >
                        <MessageCircle className="h-4.5 w-4.5" />
                    </button>
                )}
            </div>

            {/* Current → Desired */}
            <div className="px-5 py-4 space-y-3">
                <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">Current</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{post.currentHostel}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{post.currentRoom}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                    <ArrowLeftRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                </div>

                <div className="flex items-start gap-3">
                    <BedDouble className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 mb-0.5">Wants</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{post.desiredHostel}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {post.desiredFloor}{post.desiredRoom ? ` · Room ${post.desiredRoom}` : ' · Any room'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────
const MutualShift = () => {
    const [activeTab, setActiveTab] = useState('browse'); // 'my-post' | 'browse'

    // My post state
    const [hostelInfo, setHostelInfo] = useState(null);
    const [myPost, setMyPost] = useState(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState({ desiredHostel: '', desiredFloor: '', desiredRoom: '' });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(false);

    // Browse state
    const [allPosts, setAllPosts] = useState([]);
    const [browsing, setBrowsing] = useState(false);
    const [search, setSearch] = useState('');

    // ── Load my hostel info + post ────────────────────────────
    useEffect(() => {
        const load = async () => {
            const cookies = localStorage.getItem('umz_cookies');
            if (!cookies) { setPageError('No session. Please login again.'); setPageLoading(false); return; }
            try {
                setPageLoading(true);
                const hostelResult = await getHostelInfo(cookies);
                const info = hostelResult.data;
                setHostelInfo(info);
                if (info?.vid) {
                    const postResult = await getMyMutualShiftPost(info.vid);
                    setMyPost(postResult.data);
                }
            } catch (err) {
                setPageError(err.message || 'Failed to load data.');
            } finally {
                setPageLoading(false);
            }
        };
        load();
    }, []);

    // ── Load all posts when Browse tab active ─────────────────
    const loadAllPosts = useCallback(async () => {
        setBrowsing(true);
        try {
            const res = await getAllMutualShiftPosts();
            setAllPosts(res.data || []);
        } catch { setAllPosts([]); }
        finally { setBrowsing(false); }
    }, []);

    useEffect(() => {
        if (activeTab === 'browse') loadAllPosts();
    }, [activeTab, loadAllPosts]);

    // ── Chat modal state ───────────────────────────────────────
    const [chatTarget, setChatTarget] = useState(null); // post object to chat with

    // ── My Post handlers ──────────────────────────────────────
    const openEditForm = () => {
        setForm(myPost ? { desiredHostel: myPost.desiredHostel, desiredRoom: myPost.desiredRoom || '' } : { desiredHostel: '', desiredRoom: '' });
        setFormError('');
        setIsEditing(true);
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!form.desiredHostel) { setFormError('Please select a desired hostel.'); return; }
        try {
            setSubmitting(true); setFormError('');
            if (myPost) {
                const res = await updateMutualShiftPost(hostelInfo.vid, { desiredHostel: form.desiredHostel, desiredFloor: '', desiredRoom: form.desiredRoom.trim() });
                setMyPost(res.data);
            } else {
                const res = await createMutualShiftPost({ vid: hostelInfo.vid, name: hostelInfo.name, currentHostel: hostelInfo.hostel, currentRoom: hostelInfo.roomNo, desiredHostel: form.desiredHostel, desiredFloor: '', desiredRoom: form.desiredRoom.trim() });
                setMyPost(res.data);
            }
            setIsEditing(false);
        } catch (err) { setFormError(err.message || 'Something went wrong.'); }
        finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        try {
            setSubmitting(true);
            await deleteMutualShiftPost(hostelInfo.vid);
            setMyPost(null); setDeleteConfirm(false);
        } catch (err) { setFormError(err.message || 'Failed to delete.'); }
        finally { setSubmitting(false); }
    };

    // ── Filter posts by search ────────────────────────────────
    const filteredPosts = allPosts.filter(p => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return p.name?.toLowerCase().includes(q) || p.currentHostel?.toLowerCase().includes(q) || p.desiredHostel?.toLowerCase().includes(q) || p.vid?.toLowerCase().includes(q);
    });

    // ── Filter posts ─────────────────────────────────────────
    // ── Loading / Error states ────────────────────────────────
    if (pageLoading) return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <main className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block h-7 w-7 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-r-transparent" />
                    <p className="mt-3 text-sm text-gray-400">Loading…</p>
                </div>
            </main>
        </div>
    );

    if (pageError) return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <main className="flex-1 p-8">
                <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Error</p>
                    <p className="text-sm text-gray-500">{pageError}</p>
                </div>
            </main>
        </div>
    );

    // ── Day scholar gate ──────────────────────────────────────
    if (!pageLoading && !pageError && hostelInfo && !hostelInfo.hostel) return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
            <Sidebar />
            <main className="flex-1 flex items-center justify-center p-8">
                <div className="max-w-sm w-full text-center space-y-5">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
                        <Home className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Not Eligible</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                            Day scholars are not eligible for hostel mutual shift.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            This feature is only available for students with an active hostel allotment.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );

    // ── Main render ───────────────────────────────────────────
    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 lg:px-10 py-8 space-y-6">

                    {/* Header */}
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Hostel</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Your hostel info &amp; mutual shift board</p>
                    </div>

                    {/* ── Hostel Info card ── */}
                    {hostelInfo && (
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-5 py-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                <Home className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{hostelInfo.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {hostelInfo.hostel} &bull; Room&nbsp;{hostelInfo.roomNo}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-gray-400">VID</p>
                                <p className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">{hostelInfo.vid}</p>
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                        {[
                            { id: 'browse', label: 'Browse Posts', icon: Users },
                            { id: 'my-post', label: 'My Post', icon: ArrowLeftRight },
                        ].map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === id ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                                {id === 'browse' && allPosts.length > 0 && (
                                    <span className="ml-1 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full px-1.5 py-0.5 font-semibold">
                                        {allPosts.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* ════ BROWSE TAB ════ */}
                    {activeTab === 'browse' && (
                        <div className="space-y-4">
                            {/* Search + Refresh */}
                            <div className="flex gap-2">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search by name, hostel, VID…"
                                        className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white transition-all"
                                    />
                                </div>
                                <button
                                    onClick={loadAllPosts}
                                    disabled={browsing}
                                    className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                                >
                                    <RefreshCw className={`h-4 w-4 ${browsing ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {/* Stats bar */}
                            {!browsing && allPosts.length > 0 && (
                                <p className="text-xs text-gray-400 px-1">
                                    {filteredPosts.length === allPosts.length
                                        ? `${allPosts.length} active post${allPosts.length !== 1 ? 's' : ''}`
                                        : `${filteredPosts.length} of ${allPosts.length} posts`}
                                </p>
                            )}

                            {/* Chat Modal */}
                            {chatTarget && <ChatModal person={chatTarget} onClose={() => setChatTarget(null)} />}

                            {/* Posts grid */}
                            {browsing ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-gray-800 dark:border-white border-r-transparent" />
                                </div>
                            ) : filteredPosts.length === 0 ? (
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-16 text-center">
                                    <ArrowLeftRight className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {search ? 'No posts match your search' : 'No active posts yet'}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {search ? 'Try different keywords' : 'Be the first to post a shift request!'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredPosts.map(post => (
                                        <PostCard
                                            key={post._id}
                                            post={post}
                                            isOwn={hostelInfo?.vid === post.vid}
                                            onChat={setChatTarget}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════ MY POST TAB ════ */}
                    {activeTab === 'my-post' && (
                        <div className="space-y-4">
                            {/* Active post */}
                            {myPost && !isEditing && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-3 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                            Post active
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(myPost.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">Your Current Details</p>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                            <Field label="Name" value={myPost.name} />
                                            <Field label="VID" value={myPost.vid} />
                                            <Field label="Current Hostel" value={myPost.currentHostel} />
                                            <Field label="Current Room" value={myPost.currentRoom} />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">Desired Location</p>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                            <Field label="Desired Hostel" value={myPost.desiredHostel} />
                                            <Field label="Desired Room" value={myPost.desiredRoom} muted={!myPost.desiredRoom} />
                                        </div>
                                    </div>

                                    {!deleteConfirm ? (
                                        <div className="flex gap-3">
                                            <button onClick={openEditForm} className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <Pencil className="h-4 w-4" /> Edit Post
                                            </button>
                                            <button onClick={() => setDeleteConfirm(true)} className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-900/10 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors">
                                                <Trash2 className="h-4 w-4" /> Delete
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Delete this post?</p>
                                            <p className="text-xs text-gray-500 mb-4">This cannot be undone.</p>
                                            <div className="flex gap-3">
                                                <button onClick={handleDelete} disabled={submitting} className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                                                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="h-4 w-4" /> Confirm</>}
                                                </button>
                                                <button onClick={() => setDeleteConfirm(false)} disabled={submitting} className="cursor-pointer flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* No post CTA */}
                            {!myPost && !isEditing && (
                                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                                        <ArrowLeftRight className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                                    </div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">No active post</p>
                                    <p className="text-xs text-gray-400 mb-6">Create a mutual shift request and let others find you.</p>
                                    <button onClick={openEditForm} className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium transition-colors">
                                        <Plus className="h-4 w-4" /> Create Post
                                    </button>
                                </div>
                            )}

                            {/* Create / Edit form */}
                            {isEditing && (
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 px-1">Auto-filled from your hostel details</p>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                            <Field label="Name" value={hostelInfo?.name} />
                                            <Field label="VID" value={hostelInfo?.vid} />
                                            <Field label="Current Hostel" value={hostelInfo?.hostel} />
                                            <Field label="Current Room" value={hostelInfo?.roomNo} />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">Where do you want to shift?</p>
                                        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4">
                                            <Select id="desiredHostel" label="Desired Hostel" value={form.desiredHostel} onChange={v => setForm(f => ({ ...f, desiredHostel: v }))} required />
                                            <Input id="desiredRoom" label="Desired Room (optional)" value={form.desiredRoom} onChange={v => setForm(f => ({ ...f, desiredRoom: v }))} placeholder="e.g. B204 (leave blank for any)" />
                                            {formError && <p className="text-xs text-red-500 dark:text-red-400 font-medium">{formError}</p>}
                                            <div className="flex gap-3 pt-1">
                                                <button type="submit" disabled={submitting} className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium transition-colors disabled:opacity-50">
                                                    {submitting ? <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin" /> : <><Check className="h-4 w-4" /> {myPost ? 'Save Changes' : 'Post'}</>}
                                                </button>
                                                <button type="button" onClick={() => { setIsEditing(false); setFormError(''); }} disabled={submitting} className="cursor-pointer flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                    <X className="h-4 w-4" /> Cancel
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MutualShift;
