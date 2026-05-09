"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Textarea } from "@/components/ui/textarea";

// Free-form notes editor with debounced auto-save (1s idle typing).
// Plan 5 Decision #6: NOT blur-only — blur is unreliable on navigation
// (router prefetch / sidebar click). Debounced typing catches the
// "agent types and leaves" case.
//
// Soft-truncate at 1000 chars on the way in (paste-from-CRM tolerance).
// The RPC also enforces this server-side; client-side toast warns the
// user before the cutoff so they don't lose data silently.

const NOTES_MAX = 1000;
const DEBOUNCE_MS = 1000;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "error"; message: string };

export function LeadNotesEditor({
  leadId,
  initial,
}: {
  leadId: string;
  initial: string | null;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [, startTransition] = useTransition();
  const router = useRouter();
  const lastSaved = useRef(initial ?? "");
  const truncWarned = useRef(false);

  useEffect(() => {
    if (value === lastSaved.current) return;
    const handle = setTimeout(async () => {
      setSave({ kind: "saving" });
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.rpc("update_lead_notes", {
        p_lead_id: leadId,
        p_notes: value,
      } as never);
      if (error) {
        setSave({ kind: "error", message: error.message });
        toast.error(`Notes save failed: ${error.message}`);
        return;
      }
      lastSaved.current = value;
      setSave({ kind: "saved", at: Date.now() });
      // Refresh so the activity timeline picks up the new note_added event.
      startTransition(() => router.refresh());
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [value, leadId, router]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    let next = e.target.value;
    if (next.length > NOTES_MAX) {
      next = next.slice(0, NOTES_MAX);
      if (!truncWarned.current) {
        toast.warning(`Notes truncated to ${NOTES_MAX} characters.`);
        truncWarned.current = true;
      }
    } else {
      truncWarned.current = false;
    }
    setValue(next);
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={handleChange}
        placeholder="Notes — left voicemail, asked to call back Thursday, etc."
        className="min-h-24"
        maxLength={NOTES_MAX}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <SaveIndicator state={save} />
        <span>
          {value.length} / {NOTES_MAX}
        </span>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.kind === "saving") return <span>Saving…</span>;
  if (state.kind === "saved") return <span>Saved.</span>;
  if (state.kind === "error")
    return <span className="text-destructive">Error: {state.message}</span>;
  return <span>&nbsp;</span>;
}
