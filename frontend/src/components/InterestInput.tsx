import { useState } from "react";
import { Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onAsk: (prompt: string) => Promise<void>;
  busy: boolean;
  onReset?: () => void;
  hasActivePrompt?: boolean;
}

const STARTERS = [
  "Acting group for beginners",
  "English-speaking sports in Rotterdam",
  "Quiet weekday-evening hobby",
];

export function InterestInput({ onAsk, busy, onReset, hasActivePrompt }: Props) {
  const [text, setText] = useState("");

  const send = async (prompt: string) => {
    if (!prompt.trim() || busy) return;
    setText("");
    await onAsk(prompt);
  };

  return (
    <div className="vintage-card rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80">Optional</p>
          <p className="font-display text-base leading-tight">Ask The Scout</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Describe a vibe and we'll narrow the board for you.
          </p>
        </div>
        {hasActivePrompt && onReset && (
          <button
            onClick={() => { setText(""); onReset(); }}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-primary hover:underline shrink-0"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. weekend hiking, English"
          className="flex-1 bg-background/60 border border-primary/25 rounded-md px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !text.trim()} size="icon" className="h-8 w-8">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
      <div className="flex flex-wrap gap-1">
        {STARTERS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={busy}
            className="text-[10px] rounded-full border border-dashed border-primary/30 px-2 py-0.5 text-primary/80 hover:bg-primary/5 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
