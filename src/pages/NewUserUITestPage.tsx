import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, Search, MessageSquare, Settings, LayoutDashboard,
  Users, Camera, Pencil, Cog, Video, Radio, Send, ChevronLeft,
  Plus, Play, Megaphone, Heart, ThumbsUp, DollarSign,
} from 'lucide-react';

/* ---------------- dummy data ---------------- */
const CURRENT_USER = {
  username: 'sunshine_supporter',
  email: 'sunshine@pie.app',
  avatar: 'https://i.pravatar.cc/150?img=47',
  following: 3,
};

const MERCHANTS = [
  { id: 'm1', name: 'Merchant 1', avatar: 'https://i.pravatar.cc/150?img=32', subs: '13.3k', live: true,
    lastMsg: 'You really need to see this...', when: '8:51 PM', unread: 3 },
  { id: 'm2', name: 'Merchant 2', avatar: 'https://i.pravatar.cc/150?img=12', subs: '4.1k', live: false,
    lastMsg: 'I won the contest. Thanks!', when: 'Mon', unread: 1 },
  { id: 'm3', name: 'Merchant 3', avatar: 'https://i.pravatar.cc/150?img=25', subs: '820', live: false,
    lastMsg: 'I took this photo. Was feeling cute', when: 'Mar 28', unread: 0 },
];

const CHAT_MESSAGES = [
  { id: 1, kind: 'image', from: 'them', src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=60' },
  { id: 2, kind: 'text', from: 'them', text: 'I felt cute this morning so...' },
];

const FREE_EMOJIS = [
  { key: 'heart', label: '❤️' },
  { key: 'thumb', label: '👍' },
  { key: 'ok', label: '👌' },
];
const PAID_EMOJIS = [
  { key: 'cherry', label: '🍒', price: 1 },
  { key: 'taco', label: '🌮', price: 2 },
  { key: 'peach', label: '🍑', price: 3 },
  { key: 'egg', label: '🍆', price: 5 },
];

const GRID_MEDIA = [
  { type: 'photo', src: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=300&q=60' },
  { type: 'photo', src: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=60' },
  { type: 'photo', src: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=60' },
  { type: 'photo', src: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=60' },
  { type: 'photo', src: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&q=60' },
  { type: 'video', src: 'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=300&q=60' },
  { type: 'video', src: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&q=60' },
  { type: 'video', src: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&q=60' },
];

/* ---------------- design tokens (scoped to sandbox) ---------------- */
const ACCENT = 'bg-sky-400';
const ACCENT_TXT = 'text-sky-400';
const ACCENT_SOFT = 'bg-sky-400/15';
const BUBBLE = 'bg-sky-400 text-white';

/* ---------------- shared header ---------------- */
const PieHeader = ({
  following,
  rightSlot,
}: {
  following: number;
  rightSlot?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between px-5 pt-5 pb-3">
    <img src={CURRENT_USER.avatar} className="w-10 h-10 rounded-full ring-2 ring-sky-400/60 object-cover" alt="me" />
    <div className="flex items-baseline gap-1">
      <span className="text-2xl font-bold tracking-wide text-slate-800">PIE</span>
      <span className="text-xl text-sky-500">Φ</span>
    </div>
    {rightSlot ?? (
      <div className="text-right leading-tight">
        <div className="text-sm font-semibold text-slate-800">{following}</div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Following</div>
      </div>
    )}
  </div>
);

/* ---------------- bottom nav ---------------- */
type NavKey = 'messages' | 'following' | 'dashboard' | 'settings';
const BottomNav = ({
  active, onNav, variant = 'inbox',
}: { active: NavKey; onNav: (k: NavKey) => void; variant?: 'inbox' | 'profile' }) => {
  const items: { key: NavKey; label: string; icon: React.ReactNode }[] =
    variant === 'inbox'
      ? [
          { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
          { key: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
          { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        ]
      : [
          { key: 'messages', label: 'Messages', icon: <MessageSquare className="w-5 h-5" /> },
          { key: 'following', label: 'Following', icon: <Users className="w-5 h-5" /> },
          { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
        ];
  return (
    <div className="border-t border-slate-200 bg-white/90 backdrop-blur px-2 pt-2 pb-3">
      <div className="flex justify-around">
        {items.map(it => (
          <button
            key={it.key}
            onClick={() => onNav(it.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
              active === it.key ? `${ACCENT_TXT} ${ACCENT_SOFT}` : 'text-slate-500'
            }`}
          >
            {it.icon}
            <span className="text-[10px] font-medium">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- screen: inbox ---------------- */
const InboxScreen = ({ onOpen, onNav }: { onOpen: (id: string) => void; onNav: (k: NavKey) => void }) => (
  <div className="flex flex-col h-full">
    <PieHeader following={CURRENT_USER.following} />
    <div className="px-5 pb-3">
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5">
        <Search className="w-4 h-4 text-slate-400" />
        <input placeholder="Search Merchant" className="bg-transparent flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto">
      {MERCHANTS.map(m => (
        <button
          key={m.id}
          onClick={() => onOpen(m.id)}
          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 border-b border-slate-100 text-left"
        >
          <div className="relative shrink-0">
            <img src={m.avatar} className="w-12 h-12 rounded-full object-cover" alt={m.name} />
            {m.live && (
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-800 truncate">{m.name}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{m.when}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-500 truncate">{m.lastMsg}</span>
              {m.unread > 0 && (
                <span className={`shrink-0 w-5 h-5 rounded-full ${ACCENT} text-white text-[11px] font-bold flex items-center justify-center`}>
                  {m.unread}
                </span>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
    <BottomNav active="messages" onNav={onNav} variant="inbox" />
  </div>
);

/* ---------------- screen: chat ---------------- */
const ChatScreen = ({ merchantId, onBack }: { merchantId: string; onBack: () => void }) => {
  const merchant = MERCHANTS.find(m => m.id === merchantId) ?? MERCHANTS[0];
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const react = (k: string) => setReactions(r => ({ ...r, [k]: (r[k] ?? 0) + 1 }));

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-3 bg-white border-b border-slate-200">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-700"><ChevronLeft className="w-6 h-6" /></button>
        <img src={merchant.avatar} className="w-10 h-10 rounded-full object-cover" alt={merchant.name} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">{merchant.name}</div>
          <div className="text-[11px] text-slate-500">{merchant.subs} subscribers</div>
        </div>
        {/* Live circle */}
        <button
          className={`relative w-11 h-11 rounded-full flex items-center justify-center ${
            merchant.live ? 'bg-red-500 shadow-lg shadow-red-500/40' : 'bg-slate-300'
          }`}
        >
          {merchant.live && <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />}
          <span className="relative text-[10px] font-bold text-white">LIVE</span>
        </button>
        {/* menu */}
        <div className="flex flex-col gap-1 pl-1">
          <button className="text-[10px] font-semibold text-slate-600 hover:text-sky-500">Unfollow</button>
          <button className="text-[10px] font-semibold text-sky-500">Subscribe $</button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {CHAT_MESSAGES.map(m => (
          <div key={m.id} className="flex justify-start">
            <div className="max-w-[75%]">
              {m.kind === 'image' ? (
                <img src={(m as any).src} className="rounded-2xl border border-slate-200 shadow-sm" alt="post" />
              ) : (
                <div className={`${BUBBLE} px-4 py-2 rounded-2xl rounded-tl-sm text-sm shadow`}>
                  {(m as any).text}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Reactions summary */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex gap-2 pl-2">
            {Object.entries(reactions).map(([k, n]) => {
              const emoji =
                [...FREE_EMOJIS, ...PAID_EMOJIS].find(e => e.key === k)?.label ?? '❔';
              return (
                <span key={k} className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs shadow-sm">
                  {emoji} {n}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Emoji rails */}
      <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-8">Free</span>
          <div className="flex gap-2">
            {FREE_EMOJIS.map(e => (
              <button key={e.key} onClick={() => react(e.key)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-lg flex items-center justify-center">
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-8">Paid</span>
          <div className="flex gap-2">
            {PAID_EMOJIS.map(e => (
              <button key={e.key} onClick={() => react(e.key)}
                className="relative w-9 h-9 rounded-full bg-sky-100 hover:bg-sky-200 text-lg flex items-center justify-center">
                {e.label}
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  ${e.price}
                </span>
              </button>
            ))}
          </div>
        </div>
        {/* input */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          <div className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-400">Message…</div>
          <button className={`w-10 h-10 rounded-full ${ACCENT} text-white flex items-center justify-center`}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- screen: profile / dashboard ---------------- */
const ProfileScreen = ({ onNav, onAddPost }: { onNav: (k: NavKey) => void; onAddPost: () => void }) => (
  <div className="flex flex-col h-full bg-white">
    <PieHeader following={CURRENT_USER.following} />

    <div className="flex items-center justify-around px-6 pt-2 pb-4">
      <button className={`w-12 h-12 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center`}><Camera className="w-5 h-5" /></button>
      <button className={`w-12 h-12 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center`}><Pencil className="w-5 h-5" /></button>
      <button className={`w-12 h-12 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center`}><Cog className="w-5 h-5" /></button>
    </div>

    <div className="px-6 pb-3">
      <div className="text-base font-semibold text-slate-800">{CURRENT_USER.username}</div>
      <div className="text-xs text-slate-500">{CURRENT_USER.email}</div>
    </div>

    <div className="flex-1 overflow-y-auto px-3">
      <div className="grid grid-cols-4 gap-1.5">
        {GRID_MEDIA.map((m, i) => (
          <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-100">
            <img src={m.src} className="w-full h-full object-cover" alt="" />
            <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
              {m.type === 'video'
                ? <Video className="w-3 h-3 text-white" />
                : <Camera className="w-3 h-3 text-white" />}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onAddPost}
        className={`mt-6 mb-4 w-full flex flex-col items-center gap-1 py-4 rounded-2xl ${ACCENT_SOFT} ${ACCENT_TXT} hover:bg-sky-400/25 transition`}
      >
        <div className={`w-12 h-12 rounded-full ${ACCENT} text-white flex items-center justify-center shadow`}>
          <Plus className="w-6 h-6" />
        </div>
        <span className="text-sm font-semibold">Add post</span>
      </button>
    </div>

    <BottomNav active="dashboard" onNav={onNav} variant="profile" />
  </div>
);

/* ---------------- screen: post creator ---------------- */
const PostScreen = ({ onBack }: { onBack: () => void }) => {
  const [mode, setMode] = useState<'live' | 'photo' | 'video' | 'promote'>('photo');
  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      <div className="flex items-center gap-3 px-4 py-3 bg-black/40">
        <button onClick={onBack} className="p-1 -ml-1"><ChevronLeft className="w-6 h-6" /></button>
        <div className="font-semibold">New Post</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full aspect-square border-[6px] border-sky-400 rounded-3xl flex items-center justify-center bg-black/40">
          <div className="text-center text-sky-300/80">
            <div className="text-sm uppercase tracking-widest mb-2">Viewfinder</div>
            <div className="text-xs">Mode: {mode}</div>
          </div>
        </div>
      </div>

      {/* capture button */}
      <div className="flex items-center justify-center gap-8 pb-4">
        <button className="w-10 h-10 rounded-full bg-white/10" />
        <button className="w-16 h-16 rounded-full bg-white ring-4 ring-sky-400" />
        <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      {/* mode bar */}
      <div className="grid grid-cols-4 bg-black/60 border-t border-white/10">
        {[
          { k: 'live', label: 'Live', icon: <Radio className="w-5 h-5" /> },
          { k: 'photo', label: 'Photo', icon: <Camera className="w-5 h-5" /> },
          { k: 'video', label: 'Video', icon: <Video className="w-5 h-5" /> },
          { k: 'promote', label: 'Promote', icon: <Megaphone className="w-5 h-5" /> },
        ].map(item => (
          <button
            key={item.k}
            onClick={() => setMode(item.k as any)}
            className={`flex flex-col items-center gap-1 py-3 ${
              mode === item.k ? 'text-sky-400' : 'text-white/70'
            }`}
          >
            {item.icon}
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/* ---------------- shell ---------------- */
type Screen =
  | { name: 'inbox' }
  | { name: 'chat'; merchantId: string }
  | { name: 'profile' }
  | { name: 'post' };

const NewUserUITestPage = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>({ name: 'inbox' });

  const handleNav = (k: NavKey) => {
    if (k === 'messages') setScreen({ name: 'inbox' });
    else if (k === 'dashboard' || k === 'following') setScreen({ name: 'profile' });
  };

  const renderScreen = () => {
    switch (screen.name) {
      case 'inbox':
        return <InboxScreen onOpen={id => setScreen({ name: 'chat', merchantId: id })} onNav={handleNav} />;
      case 'chat':
        return <ChatScreen merchantId={screen.merchantId} onBack={() => setScreen({ name: 'inbox' })} />;
      case 'profile':
        return <ProfileScreen onNav={handleNav} onAddPost={() => setScreen({ name: 'post' })} />;
      case 'post':
        return <PostScreen onBack={() => setScreen({ name: 'profile' })} />;
    }
  };

  const tabs: { key: Screen['name']; label: string }[] = [
    { key: 'inbox', label: 'Inbox' },
    { key: 'chat', label: 'Chat' },
    { key: 'profile', label: 'Profile' },
    { key: 'post', label: 'Post UI' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-slate-200 text-slate-800">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
          <div className="text-xs text-slate-500">Admin sandbox · Supporter UI prototype</div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-6">
          {/* screen selector */}
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-2">Screens</div>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key === 'chat') setScreen({ name: 'chat', merchantId: 'm1' });
                  else setScreen({ name: t.key } as Screen);
                }}
                className={`w-full text-left px-4 py-2 rounded-lg border transition ${
                  screen.name === t.key
                    ? 'bg-sky-400 text-white border-sky-400 shadow'
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="pt-4 text-[11px] text-slate-500 leading-relaxed">
              Isolated prototype. Nothing here writes to the backend. Rebuilt from your PDF mockup with dummy data.
            </div>
          </div>

          {/* phone frame */}
          <div className="flex justify-center">
            <div className="relative w-[380px] h-[780px] rounded-[44px] bg-slate-900 p-3 shadow-2xl">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-2xl z-10" />
              <div className="w-full h-full rounded-[34px] overflow-hidden bg-white">
                {renderScreen()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewUserUITestPage;
