import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft, Search, MessageSquare, Settings, LayoutDashboard,
  Users, Camera, Pencil, Cog, Video, Radio, Send, ChevronLeft,
  Plus, Play, Megaphone, Heart, ThumbsUp, DollarSign, UserMinus, Star, X,
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

type ProfilePost = {
  id: string;
  url: string;
  type: 'image' | 'video';
  caption: string;
  paid: boolean;
  price?: number;
};



/* ---------------- design tokens (scoped to sandbox) ---------------- */
const ACCENT = 'bg-sky-400';
const ACCENT_TXT = 'text-sky-400';
const ACCENT_SOFT = 'bg-sky-400/15';
const BUBBLE = 'bg-sky-400 text-white';

/* ---------------- shared header ---------------- */
const PieHeader = ({
  following,
  rightSlot,
  avatar,
  initial,
}: {
  following: number;
  rightSlot?: React.ReactNode;
  avatar?: string;
  initial?: string;
}) => (
  <div className="flex items-center justify-between px-5 pt-5 pb-3">
    {avatar ? (
      <img src={avatar} className="w-10 h-10 rounded-full ring-2 ring-sky-400/60 object-cover" alt="me" />
    ) : initial ? (
      <div className="w-10 h-10 rounded-full ring-2 ring-sky-400/60 bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
        {initial}
      </div>
    ) : (
      <img src={CURRENT_USER.avatar} className="w-10 h-10 rounded-full ring-2 ring-sky-400/60 object-cover" alt="me" />
    )}
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
const InboxScreen = ({
  onOpen,
  onNav,
  onLogin,
}: {
  onOpen: (id: string) => void;
  onNav: (k: NavKey) => void;
  onLogin: () => void;
}) => (
  <div className="flex flex-col h-full">
    <PieHeader
      following={CURRENT_USER.following}
      rightSlot={
        <button
          onClick={onLogin}
          className={`${ACCENT} text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow hover:opacity-90 transition`}
        >
          Login
        </button>
      }
    />
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

/* ---------------- screen: login / profile details ---------------- */
const LoginDetailsScreen = ({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (creds: { username: string; email: string }) => void;
}) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const canSubmit = username.trim().length > 0 && email.trim().length > 0;
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-200">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-700"><ChevronLeft className="w-6 h-6" /></button>
        <div className="font-semibold text-slate-800">Profile Details</div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-5">
        <div>
          <div className="text-xl font-bold text-slate-800 mb-1">Welcome to PIE</div>
          <div className="text-xs text-slate-500">Enter your details to preview the new inbox.</div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Username</label>
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="your_username"
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email Address</label>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-400 text-slate-800 placeholder:text-slate-400"
          />
        </div>
        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ username: username.trim(), email: email.trim() })}
          className={`w-full mt-4 py-3 rounded-full font-semibold text-sm transition ${
            canSubmit ? `${ACCENT} text-white shadow hover:opacity-90` : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Submit
        </button>
        <div className="text-[10px] text-slate-400 text-center pt-2">
          Testing phase — no data is stored.
        </div>
      </div>
    </div>
  );
};

/* ---------------- screen: new inbox (with test message) ---------------- */
const TEST_MERCHANT = {
  id: 'test1',
  name: 'Test Merchant',
  avatar: 'https://i.pravatar.cc/150?img=15',
  subs: '1.2k',
  lastMsg: 'Tap to open our new chat 👋',
  when: 'Now',
  unread: 1,
};

type ChatPerson = { name: string; avatar?: string };

const NewInboxScreen = ({
  onNav,
  onOpen,
  self,
  peer,
}: {
  onNav: (k: NavKey) => void;
  onOpen: () => void;
  self: ChatPerson;
  peer: ChatPerson;
}) => (
  <div className="flex flex-col h-full bg-white">
    <PieHeader
      following={0}
      rightSlot={<span className="w-10" />}
      avatar={self.avatar}
      initial={self.name?.[0]?.toUpperCase()}
    />
    <div className="px-5 pb-3">
      <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2.5">
        <Search className="w-4 h-4 text-slate-400" />
        <input placeholder="Search Merchant" className="bg-transparent flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
      </div>
    </div>
    <div className="flex-1 overflow-y-auto">
      <button
        onClick={onOpen}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 border-b border-slate-100 text-left"
      >
        {peer.avatar ? (
          <img src={peer.avatar} className="w-12 h-12 rounded-full object-cover" alt={peer.name} />
        ) : (
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-semibold">
            {peer.name?.[0]?.toUpperCase() ?? '·'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-semibold text-slate-800 truncate">{peer.name}</span>
            <span className="text-[11px] text-slate-400 shrink-0">Now</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-slate-500 truncate">Tap to open our new chat 👋</span>
            <span className={`shrink-0 w-5 h-5 rounded-full ${ACCENT} text-white text-[11px] font-bold flex items-center justify-center`}>
              1
            </span>
          </div>
        </div>
      </button>
    </div>
    <BottomNav active="messages" onNav={onNav} variant="inbox" />
  </div>
);

/* ---------------- screen: new chat (empty) ---------------- */
const NewChatScreen = ({
  onBack,
  onOpenMerchant,
  self,
  peer,
}: {
  onBack: () => void;
  onOpenMerchant: () => void;
  self: ChatPerson;
  peer: ChatPerson;
}) => {
  const [reactions, setReactions] = useState<Record<string, number>>({});
  const [bursts, setBursts] = useState<{ id: number; label: string; paid: boolean }[]>([]);
  const [tokens, setTokens] = useState(0);

  const react = (key: string, label: string, paid: boolean, price = 0) => {
    setReactions(r => ({ ...r, [key]: (r[key] ?? 0) + 1 }));
    if (paid) setTokens(t => t + price);
    const id = Date.now() + Math.random();
    setBursts(b => [...b, { id, label, paid }]);
    setTimeout(() => setBursts(b => b.filter(x => x.id !== id)), 1200);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header — tester's inbox */}
      <div className="flex items-center gap-3 px-3 py-3 bg-white border-b border-slate-200">
        <button onClick={onBack} className="p-1 -ml-1 text-slate-700"><ChevronLeft className="w-6 h-6" /></button>
        {self.avatar ? (
          <img src={self.avatar} className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-400/60" alt={self.name} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-100 ring-2 ring-sky-400/60 flex items-center justify-center text-slate-500 text-sm font-semibold">
            {self.name?.[0]?.toUpperCase() ?? '·'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 truncate">
            {self.name || 'You'}
          </div>
          <div className="text-[11px] text-slate-500 truncate">Inbox</div>
        </div>
        {tokens > 0 && (
          <div className="text-[11px] font-semibold text-amber-600 bg-amber-100 rounded-full px-2 py-1">
            ${tokens} sent
          </div>
        )}
      </div>

      {/* Conversation body with dummy peer message */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 relative">
        <div className="flex items-end gap-2">
          <button onClick={onOpenMerchant} className="shrink-0">
            {peer.avatar ? (
              <img
                src={peer.avatar}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                alt={peer.name}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                {peer.name?.[0]?.toUpperCase() ?? '·'}
              </div>
            )}
          </button>
          <div className="max-w-[75%]">
            <button
              onClick={onOpenMerchant}
              className="text-[11px] text-slate-500 mb-1 hover:text-sky-500 transition"
            >
              {peer.name}
            </button>
            <button
              onClick={onOpenMerchant}
              className="block text-left bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-slate-700 shadow-sm hover:border-sky-300 hover:bg-sky-50 transition w-full"
            >
              Hey! Thanks for checking out my page 👋 Tap here to view my profile.
            </button>
            <div className="text-[10px] text-slate-400 mt-1">Now</div>
          </div>
        </div>

        {/* Reaction summary chips */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex flex-wrap gap-2 pl-10">
            {Object.entries(reactions).map(([k, n]) => {
              const emoji = [...FREE_EMOJIS, ...PAID_EMOJIS].find(e => e.key === k)?.label ?? '❔';
              return (
                <span key={k} className="bg-white border border-slate-200 rounded-full px-2 py-0.5 text-xs shadow-sm">
                  {emoji} {n}
                </span>
              );
            })}
          </div>
        )}

        {/* Floating burst animations */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
          {bursts.map(b => (
            <span
              key={b.id}
              className={`absolute text-3xl ${b.paid ? 'drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]' : ''}`}
              style={{
                left: `${40 + Math.random() * 20}%`,
                animation: 'newchat-float 1.2s ease-out forwards',
              }}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>

      {/* Emoji rails */}
      <div className="px-3 pt-2 pb-1 bg-white border-t border-slate-200 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-8">Free</span>
          <div className="flex gap-2">
            {FREE_EMOJIS.map(e => (
              <button
                key={e.key}
                onClick={() => react(e.key, e.label, false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 transition text-lg flex items-center justify-center"
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-400 w-8">Paid</span>
          <div className="flex gap-2">
            {PAID_EMOJIS.map(e => (
              <button
                key={e.key}
                onClick={() => react(e.key, e.label, true, e.price)}
                className="relative w-9 h-9 rounded-full bg-sky-100 hover:bg-sky-200 active:scale-90 transition text-lg flex items-center justify-center"
              >
                {e.label}
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  ${e.price}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 pt-1 pb-2">
          <div className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-400">Message…</div>
          <button className={`w-10 h-10 rounded-full ${ACCENT} text-white flex items-center justify-center`}>
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes newchat-float {
          0%   { transform: translateY(0) scale(0.8); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(-140px) scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};



/* ---------------- screen: test merchant profile ---------------- */
const TestMerchantProfileScreen = ({
  onBack,
  onNav,
  supporterUsername,
}: {
  onBack: () => void;
  onNav: (k: NavKey) => void;
  supporterUsername: string | null;
}) => (

  <div className="flex flex-col h-full bg-white">
    <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-200">
      <button onClick={onBack} className="p-1 -ml-1 text-slate-700"><ChevronLeft className="w-6 h-6" /></button>
      <div className="flex-1 flex items-baseline justify-center gap-1">
        <span className="text-2xl font-bold tracking-wide text-slate-800">PIE</span>
        <span className="text-xl text-sky-500">Φ</span>
      </div>
      <span className="w-6" />
    </div>

    <div className="flex flex-col items-center pt-6 pb-4 px-6">
      <div className="relative">
        <img
          src={TEST_MERCHANT.avatar}
          className="w-24 h-24 rounded-full object-cover ring-4 ring-sky-400/40"
          alt={TEST_MERCHANT.name}
        />
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 ring-2 ring-white" />
      </div>
      <div className="mt-3 text-lg font-semibold text-slate-800">{TEST_MERCHANT.name}</div>
      <div className="text-xs text-slate-500">{TEST_MERCHANT.subs} subscribers</div>
    </div>

    <div className="grid grid-cols-4 gap-2 px-5 pb-4">
      <button className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 transition">
        <UserMinus className="w-5 h-5 text-slate-700" />
        <span className="text-[10px] font-semibold text-slate-700">Unfollow</span>
      </button>
      <button className={`flex flex-col items-center gap-1 py-3 rounded-xl ${ACCENT_SOFT} hover:opacity-90 transition`}>
        <Star className={`w-5 h-5 ${ACCENT_TXT}`} />
        <span className={`text-[10px] font-semibold ${ACCENT_TXT}`}>Subscribe</span>
      </button>
      <button className="flex flex-col items-center gap-1 py-3 rounded-xl bg-amber-100 hover:bg-amber-200 transition">
        <DollarSign className="w-5 h-5 text-amber-600" />
        <span className="text-[10px] font-semibold text-amber-700">Tip</span>
      </button>
      <button
        disabled
        aria-disabled="true"
        title="Merchant is not live"
        className="flex flex-col items-center gap-1 py-3 rounded-xl bg-slate-100 opacity-60 cursor-not-allowed"
      >
        <Radio className="w-5 h-5 text-slate-400" />
        <span className="text-[10px] font-semibold text-slate-400">Offline</span>
      </button>
    </div>


    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center border-t border-slate-100">
      <div className={`w-16 h-16 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center mb-4`}>
        <Camera className="w-7 h-7" />
      </div>
      <div className="text-base font-semibold text-slate-800 mb-1">No posts yet</div>
      <div className="text-xs text-slate-500 max-w-[240px]">
        {TEST_MERCHANT.name}'s posts and videos will appear here.
      </div>
    </div>

    <BottomNav active="messages" onNav={onNav} variant="inbox" />
  </div>
);






/* ---------------- screen: new (empty) profile ---------------- */



const NewProfileScreen = ({
  onNav,
  profile,
  posts,
  setPosts,
}: {
  onNav: (k: NavKey) => void;
  profile: { username: string; email: string; avatar?: string } | null;
  posts: ProfilePost[];
  setPosts: React.Dispatch<React.SetStateAction<ProfilePost[]>>;
}) => {

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<{ url: string; type: 'image' | 'video' } | null>(null);
  const [step, setStep] = useState<'caption' | 'monetize' | null>(null);
  const [caption, setCaption] = useState('');
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState('');

  const resetFlow = () => {
    if (pending) URL.revokeObjectURL(pending.url);
    setPending(null); setStep(null); setCaption(''); setPaid(false); setPrice('');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const isVideo = f.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = () => {
      setPending({ url: String(reader.result), type: isVideo ? 'video' : 'image' });
      setStep('caption');
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const publish = () => {
    if (!pending) return;
    const p: ProfilePost = {
      id: `${Date.now()}`,
      url: pending.url,
      type: pending.type,
      caption: caption.trim(),
      paid,
      price: paid ? parseFloat(price) || 0 : undefined,
    };
    setPosts(prev => [p, ...prev]);
    setPending(null); setStep(null); setCaption(''); setPaid(false); setPrice('');
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        {profile?.avatar ? (
          <img src={profile.avatar} alt={profile.username} className="w-10 h-10 rounded-full ring-2 ring-sky-400/60 object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-100 ring-2 ring-sky-400/60 flex items-center justify-center text-slate-500 text-lg font-semibold">
            {profile?.username?.[0]?.toUpperCase() ?? '·'}
          </div>
        )}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-wide text-slate-800">PIE</span>
          <span className="text-xl text-sky-500">Φ</span>
        </div>
        <span className="w-10" />
      </div>


      <div className="flex items-center justify-around px-6 pt-2 pb-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          className={`w-12 h-12 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center hover:scale-105 transition`}
          aria-label="Upload photo or video"
        >
          <Camera className="w-5 h-5" />
        </button>
        <button className={`w-12 h-12 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center`}><Pencil className="w-5 h-5" /></button>
        <button className={`w-12 h-12 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center`}><Cog className="w-5 h-5" /></button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <div className="px-6 pb-3">
        <div className="text-base font-semibold text-slate-800">
          {profile?.username || '—'}
        </div>
        <div className="text-xs text-slate-500">
          {profile?.email || '—'}
        </div>
      </div>


      {posts.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`w-16 h-16 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center mb-4 hover:scale-105 active:scale-95 transition`}
            aria-label="Upload photo or video"
          >
            <Camera className="w-7 h-7" />
          </button>
          <div className="text-base font-semibold text-slate-800 mb-1">No posts yet</div>
          <div className="text-xs text-slate-500 max-w-[240px]">
            Tap the camera to share a photo or video.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-3 gap-1">
            {posts.map(p => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                {p.type === 'image' ? (
                  <img
                    src={p.url}
                    alt=""
                    className={`w-full h-full object-cover ${p.paid ? 'blur-lg scale-110' : ''}`}
                  />
                ) : (
                  <video
                    src={p.url}
                    className={`w-full h-full object-cover ${p.paid ? 'blur-lg scale-110' : ''}`}
                    muted
                  />
                )}
                {p.paid && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 text-white">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-xs font-semibold">${p.price?.toFixed(2)}</span>
                  </div>
                )}
                {p.type === 'video' && !p.paid && (
                  <div className="absolute top-1 right-1 bg-black/50 rounded-full p-1">
                    <Play className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {step && pending && (
        <div className="absolute inset-0 z-30 flex items-end sm:items-center justify-center bg-black/50" onClick={resetFlow}>
          <div className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl p-5 max-h-[92%] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={resetFlow} className="text-sm text-slate-500">Cancel</button>
              <div className="text-sm font-semibold text-slate-800">
                {step === 'caption' ? 'New Post' : 'Post Options'}
              </div>
              {step === 'caption' ? (
                <button onClick={() => setStep('monetize')} className={`text-sm font-semibold ${ACCENT_TXT}`}>Next</button>
              ) : (
                <button onClick={() => setStep('caption')} className="text-sm text-slate-500">Back</button>
              )}
            </div>

            <div className="rounded-xl overflow-hidden bg-slate-100 mb-4 flex items-center justify-center">
              {pending.type === 'image' ? (
                <img src={pending.url} className="w-full object-contain max-h-64" alt="preview" />
              ) : (
                <video src={pending.url} className="w-full max-h-64" controls />
              )}
            </div>

            {step === 'caption' && (
              <div>
                <label className="text-xs font-medium text-slate-600">Current thought (optional)</label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  placeholder="Add a caption..."
                  className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
            )}

            {step === 'monetize' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaid(false)}
                    className={`rounded-xl border p-3 text-sm font-semibold transition ${
                      !paid ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Free
                  </button>
                  <button
                    onClick={() => setPaid(true)}
                    className={`rounded-xl border p-3 text-sm font-semibold transition ${
                      paid ? 'border-sky-400 bg-sky-50 text-sky-600' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Paid
                  </button>
                </div>

                {paid && (
                  <div>
                    <label className="text-xs font-medium text-slate-600">Price (USD)</label>
                    <div className="mt-1 flex items-center rounded-lg border border-slate-200 px-3 focus-within:ring-2 focus-within:ring-sky-400">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={price}
                        onChange={e => setPrice(e.target.value)}
                        placeholder="4.99"
                        className="flex-1 p-3 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Paid posts appear blurred on your profile until purchased.
                    </p>
                  </div>
                )}

                <button
                  onClick={publish}
                  disabled={paid && (!price || parseFloat(price) <= 0)}
                  className={`w-full rounded-xl ${ACCENT} text-white py-3 text-sm font-semibold disabled:opacity-50`}
                >
                  Post
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav active="dashboard" onNav={onNav} variant="profile" />
    </div>
  );
};

/* ---------------- screen: new (empty) following ---------------- */
const NewFollowingScreen = ({ onNav }: { onNav: (k: NavKey) => void }) => (
  <div className="flex flex-col h-full bg-white">
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <span className="w-10" />
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-wide text-slate-800">PIE</span>
        <span className="text-xl text-sky-500">Φ</span>
      </div>
      <span className="w-10" />
    </div>

    <div className="px-6 pt-2 pb-4">
      <div className="text-xs uppercase tracking-widest text-slate-500">Following</div>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
      <div className={`w-16 h-16 rounded-full ${ACCENT_SOFT} ${ACCENT_TXT} flex items-center justify-center mb-4`}>
        <Users className="w-7 h-7" />
      </div>
      <div className="text-base font-semibold text-slate-800 mb-1">Following no one</div>
      <div className="text-xs text-slate-500 max-w-[240px]">
        Merchants you follow will show up here.
      </div>
    </div>

    <BottomNav active="following" onNav={onNav} variant="profile" />
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
  | { name: 'post' }
  | { name: 'login' }
  | { name: 'newInbox' }
  | { name: 'newProfile' }
  | { name: 'newFollowing' }
  | { name: 'newChat' }
  | { name: 'testMerchantProfile' }
  | { name: 'youProfileView' };


const SANDBOX_ID_KEY = 'pie-sandbox-id-v1';

const getSandboxId = () => {
  try {
    let id = localStorage.getItem(SANDBOX_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SANDBOX_ID_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
};

type SandboxState = {
  credentials: { username: string; email: string } | null;
  activeAccount: 'you' | 'merchant';
  postsByAccount: Record<'you' | 'merchant', ProfilePost[]>;
};

const NewUserUITestPage = () => {
  const navigate = useNavigate();
  const sandboxIdRef = useRef<string>(typeof window !== 'undefined' ? getSandboxId() : '');
  const [screen, setScreen] = useState<Screen>({ name: 'inbox' });
  const [credentials, setCredentials] = useState<SandboxState['credentials']>(null);
  const [activeAccount, setActiveAccount] = useState<'you' | 'merchant'>('you');
  const [postsByAccount, setPostsByAccount] = useState<Record<'you' | 'merchant', ProfilePost[]>>({ you: [], merchant: [] });
  const [loaded, setLoaded] = useState(false);

  // Load state from Supabase on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('sandbox_state')
        .select('state')
        .eq('sandbox_id', sandboxIdRef.current)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data?.state) {
        const s = data.state as SandboxState;
        if (s.credentials) setCredentials(s.credentials);
        if (s.activeAccount) setActiveAccount(s.activeAccount);
        if (s.postsByAccount) setPostsByAccount(s.postsByAccount);
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist to Supabase whenever state changes (after initial load)
  useEffect(() => {
    if (!loaded) return;
    const payload: SandboxState = { credentials, activeAccount, postsByAccount };
    supabase
      .from('sandbox_state')
      .upsert({ sandbox_id: sandboxIdRef.current, state: payload as any, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.warn('sandbox_state save failed', error);
      });
  }, [credentials, activeAccount, postsByAccount, loaded]);


  const currentProfile =
    activeAccount === 'merchant'
      ? { username: TEST_MERCHANT.name, email: `${TEST_MERCHANT.name.toLowerCase().replace(/\s+/g, '')}@pie.app`, avatar: TEST_MERCHANT.avatar }
      : credentials
        ? { username: credentials.username, email: credentials.email }
        : null;

  const currentPosts = postsByAccount[activeAccount];
  const setCurrentPosts: React.Dispatch<React.SetStateAction<ProfilePost[]>> = (updater) => {
    setPostsByAccount(prev => ({
      ...prev,
      [activeAccount]: typeof updater === 'function' ? (updater as (p: ProfilePost[]) => ProfilePost[])(prev[activeAccount]) : updater,
    }));
  };

  const handleNav = (k: NavKey) => {
    if (k === 'messages') setScreen({ name: 'inbox' });
    else if (k === 'dashboard' || k === 'following') setScreen({ name: 'profile' });
  };

  // Nav for the "new" (post-login) flow — routes dashboard to the empty new profile.
  const handleNewNav = (k: NavKey) => {
    if (k === 'messages') setScreen({ name: 'newInbox' });
    else if (k === 'dashboard') setScreen({ name: 'newProfile' });
    else if (k === 'following') setScreen({ name: 'newFollowing' });
  };




  const renderScreen = () => {
    switch (screen.name) {
      case 'inbox':
        return (
          <InboxScreen
            onOpen={id => setScreen({ name: 'chat', merchantId: id })}
            onNav={handleNav}
            onLogin={() => setScreen({ name: 'login' })}
          />
        );
      case 'chat':
        return <ChatScreen merchantId={screen.merchantId} onBack={() => setScreen({ name: 'inbox' })} />;
      case 'profile':
        return <ProfileScreen onNav={handleNav} onAddPost={() => setScreen({ name: 'post' })} />;
      case 'post':
        return <PostScreen onBack={() => setScreen({ name: 'profile' })} />;
      case 'login':
        return (
          <LoginDetailsScreen
            onBack={() => setScreen({ name: 'inbox' })}
            onSubmit={creds => {
              // Session-only — never persisted.
              setCredentials(creds);
              setScreen({ name: 'newInbox' });
            }}
          />
        );
      case 'newInbox': {
        const you: ChatPerson = { name: credentials?.username ?? 'You', avatar: undefined };
        const merchant: ChatPerson = { name: TEST_MERCHANT.name, avatar: TEST_MERCHANT.avatar };
        const self = activeAccount === 'merchant' ? merchant : you;
        const peer = activeAccount === 'merchant' ? you : merchant;
        return <NewInboxScreen onNav={handleNewNav} onOpen={() => setScreen({ name: 'newChat' })} self={self} peer={peer} />;
      }
      case 'newProfile':
        return (
          <NewProfileScreen
            onNav={handleNewNav}
            profile={currentProfile}
            posts={currentPosts}
            setPosts={setCurrentPosts}
          />
        );

      case 'newFollowing':
        return <NewFollowingScreen onNav={handleNewNav} />;
      case 'newChat': {
        const you: ChatPerson = { name: credentials?.username ?? 'You', avatar: undefined };
        const merchant: ChatPerson = { name: TEST_MERCHANT.name, avatar: TEST_MERCHANT.avatar };
        const self = activeAccount === 'merchant' ? merchant : you;
        const peer = activeAccount === 'merchant' ? you : merchant;
        return (
          <NewChatScreen
            onBack={() => setScreen({ name: 'newInbox' })}
            onOpenMerchant={() =>
              setScreen(
                activeAccount === 'merchant'
                  ? { name: 'youProfileView' }
                  : { name: 'testMerchantProfile' }
              )
            }
            self={self}
            peer={peer}
          />
        );
      }
      case 'testMerchantProfile':
        return (
          <TestMerchantProfileScreen
            onBack={() => setScreen({ name: 'newChat' })}
            onNav={handleNewNav}
            supporterUsername={credentials?.username ?? null}
          />
        );
      case 'youProfileView': {
        const youProfile = credentials
          ? { username: credentials.username, email: credentials.email }
          : null;
        return (
          <NewProfileScreen
            onNav={(k) => {
              if (k === 'messages') setScreen({ name: 'newInbox' });
              else if (k === 'dashboard') setScreen({ name: 'newProfile' });
              else if (k === 'following') setScreen({ name: 'newFollowing' });
            }}
            profile={youProfile}
            posts={postsByAccount.you}
            setPosts={(updater) =>
              setPostsByAccount((prev) => ({
                ...prev,
                you: typeof updater === 'function' ? (updater as (p: ProfilePost[]) => ProfilePost[])(prev.you) : updater,
              }))
            }
          />
        );
      }
    }
  };

  const tabs: { key: Screen['name']; label: string }[] = [
    { key: 'inbox', label: 'Inbox' },
    { key: 'chat', label: 'Chat' },
    { key: 'profile', label: 'Profile' },
    { key: 'post', label: 'Post UI' },
    { key: 'login', label: 'Login' },
    { key: 'newInbox', label: 'New Inbox' },
    { key: 'newProfile', label: 'New Profile' },
    { key: 'newFollowing', label: 'New Following' },
    { key: 'newChat', label: 'New Chat' },
    { key: 'testMerchantProfile', label: 'Merchant Profile' },
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
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Account</div>
            <select
              value={activeAccount}
              onChange={e => {
                const next = e.target.value as 'you' | 'merchant';
                setActiveAccount(next);
                // Land on the profile of the newly-active account so the switch is visible.
                setScreen({ name: 'newProfile' });
              }}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400 mb-3"
            >
              <option value="you">
                You{credentials?.username ? ` (${credentials.username})` : ''}
              </option>
              <option value="merchant">Test Merchant</option>
            </select>


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
