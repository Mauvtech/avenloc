'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import Avatar from '@/components/avatar';
import { EmptyState, PageHeader } from '@/components/ui';
import type { Conversation, Message } from '@/lib/types';

const partyName = (c: Conversation | null) =>
  c?.otherParty ? `${c.otherParty.firstName} ${c.otherParty.lastName}`.trim() : 'Correspondant';

const msgTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    Promise.all([api.auth.me().catch(() => null), api.conversations.list().catch(() => [])])
      .then(([me, cs]) => {
        setMeId(me?.id ?? null);
        setConversations(cs);
        if (cs.length > 0) selectConversation(cs[0]);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages]);

  async function selectConversation(conv: Conversation) {
    setActive(conv);
    const msgs = await api.conversations.messages(conv.id).catch(() => []);
    setMessages(msgs);
    await api.conversations.markRead(conv.id).catch(() => {});
    setConversations((cs) =>
      cs.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)),
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setSending(true);
    try {
      const msg = await api.conversations.send(active.id, text.trim());
      setMessages((m) => [...m, msg]);
      setText('');
    } catch {
      /* ignore */
    } finally {
      setSending(false);
    }
  }

  if (loading) return <p className="py-16 text-center text-muted">Chargement…</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Messages" />

      {conversations.length === 0 ? (
        <EmptyState icon="💬" title="Aucune conversation">
          Une conversation s’ouvre automatiquement dès qu’une réservation est confirmée.
        </EmptyState>
      ) : (
        <div className="grid h-[600px] grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Liste */}
          <div className="card col-span-1 overflow-y-auto">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c)}
                className={`flex w-full items-center gap-3 border-b border-line p-3 text-left transition-colors hover:bg-canvas ${
                  active?.id === c.id ? 'bg-brand-tint/60' : ''
                }`}
              >
                <Avatar src={c.otherParty?.avatarUrl} name={partyName(c)} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-bold">{partyName(c)}</span>
                    {(c.unreadCount ?? 0) > 0 && (
                      <span className="h-2 w-2 flex-none rounded-full bg-brand" />
                    )}
                  </div>
                  <div className="truncate text-xs font-semibold text-brand-fg">
                    {c.listingTitle}
                  </div>
                  {c.lastMessage && (
                    <div className="truncate text-xs text-muted">{c.lastMessage.content}</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Fil */}
          <div className="card col-span-1 flex flex-col sm:col-span-2">
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-line p-3">
                  <Avatar src={active.otherParty?.avatarUrl} name={partyName(active)} size={36} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{partyName(active)}</div>
                    <Link
                      href={`/listings/${active.listingId}`}
                      className="truncate text-xs font-semibold text-brand-fg hover:underline"
                    >
                      {active.listingTitle}
                    </Link>
                  </div>
                </div>

                <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.map((m) => {
                    const mine = meId ? m.senderId === meId : m.senderRole === 'TENANT';
                    return (
                      <div
                        key={m.id}
                        className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}
                      >
                        {!mine && (
                          <Avatar
                            src={m.senderAvatarUrl}
                            name={m.senderName || partyName(active)}
                            size={26}
                          />
                        )}
                        <div className="max-w-[75%]">
                          {!mine && m.senderName && (
                            <div className="mb-0.5 text-[11px] font-semibold text-muted">
                              {m.senderName}
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-3 py-2 text-sm ${
                              mine ? 'bg-brand text-white' : 'bg-canvas text-ink'
                            }`}
                          >
                            {m.content}
                          </div>
                          <div
                            className={`mt-0.5 text-[10px] text-muted ${
                              mine ? 'text-right' : ''
                            }`}
                          >
                            {msgTime(m.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleSend} className="flex gap-2 border-t border-line p-3">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Écrire un message…"
                    className="field flex-1"
                  />
                  <button type="submit" disabled={sending || !text.trim()} className="btn-primary">
                    Envoyer
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted">
                Sélectionnez une conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
