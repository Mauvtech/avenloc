'use client';

import { useState } from 'react';

export interface FaqDraft {
  id?: string;
  question: string;
  answer: string;
}

interface Props {
  items: FaqDraft[];
  onAdd: (item: { question: string; answer: string }) => void | Promise<void>;
  onRemove: (item: FaqDraft, index: number) => void | Promise<void>;
}

/** Éditeur de FAQ par annonce, partagé entre la création (état local) et
 * l'édition (persistance immédiate via l'API) — le comportement de
 * add/remove est délégué au parent. */
export default function ListingFaqEditor({ items, onAdd, onRemove }: Props) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!question.trim() || !answer.trim()) return;
    setBusy(true);
    try {
      await onAdd({ question: question.trim(), answer: answer.trim() });
      setQuestion('');
      setAnswer('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={item.id ?? i} className="flex items-start justify-between gap-3 rounded-md border border-line p-3 text-sm">
          <div className="min-w-0">
            <p className="font-semibold text-ink">{item.question}</p>
            <p className="text-muted">{item.answer}</p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item, i)}
            className="flex-none text-xs font-semibold text-danger-fg"
          >
            Retirer
          </button>
        </div>
      ))}
      <div className="space-y-2 rounded-md border border-dashed border-line p-3">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Question"
          className="field"
        />
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Réponse"
          rows={2}
          className="field resize-y"
        />
        <button type="button" disabled={busy} onClick={add} className="btn-ghost">
          + Ajouter une question
        </button>
      </div>
    </div>
  );
}
