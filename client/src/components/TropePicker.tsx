import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface TropeItem {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface TropeSelection {
  primary: string;
  secondary?: string;
  tertiary?: string;
}

interface TropePickerProps {
  bookId: string;
  initialSelection?: TropeSelection | null;
  onSave?: (selection: TropeSelection, label: string) => void;
  compact?: boolean; // Show compact version for inline use
}

const CATEGORY_ORDER = ["genre", "subgenre", "tone", "structure"];
const CATEGORY_LABELS: Record<string, string> = {
  genre: "Genre",
  subgenre: "Subgenre / Style",
  tone: "Tone",
  structure: "Story Structure",
};
const ROLE_LABELS = ["primary", "secondary", "tertiary"] as const;
const ROLE_COLORS = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-primary/20 text-primary border border-primary/40",
  tertiary: "bg-muted text-muted-foreground border border-border",
};

export default function TropePicker({ bookId, initialSelection, onSave, compact = false }: TropePickerProps) {
  const [tropes, setTropes] = useState<TropeItem[]>([]);
  const [selection, setSelection] = useState<Partial<TropeSelection>>(initialSelection ?? {});
  const [preview, setPreview] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/tropes").then(r => r.json()).then(setTropes).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selection.primary) { setPreview(null); return; }
    fetch("/api/tropes/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selection),
    }).then(r => r.json()).then(setPreview).catch(() => {});
  }, [selection]);

  const getRole = (id: string): typeof ROLE_LABELS[number] | null => {
    if (selection.primary === id) return "primary";
    if (selection.secondary === id) return "secondary";
    if (selection.tertiary === id) return "tertiary";
    return null;
  };

  const handleSelect = (id: string) => {
    const role = getRole(id);
    if (role) {
      // Deselect
      const next = { ...selection };
      delete next[role];
      // Compact if gaps
      if (!next.primary && next.secondary) { next.primary = next.secondary; delete next.secondary; }
      if (!next.secondary && next.tertiary) { next.secondary = next.tertiary; delete next.tertiary; }
      setSelection(next);
    } else {
      // Assign to next available slot
      if (!selection.primary) setSelection({ ...selection, primary: id });
      else if (!selection.secondary) setSelection({ ...selection, secondary: id });
      else if (!selection.tertiary) setSelection({ ...selection, tertiary: id });
      // If all slots full, do nothing (user must deselect first)
    }
  };

  const saveSelection = async () => {
    if (!selection.primary) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/tropes/book/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      const data = await r.json();
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSave?.(data.selection, data.label);
      }
    } finally {
      setSaving(false);
    }
  };

  const grouped = CATEGORY_ORDER.reduce<Record<string, TropeItem[]>>((acc, cat) => {
    acc[cat] = tropes.filter(t => t.category === cat);
    return acc;
  }, {});

  const selectedCount = [selection.primary, selection.secondary, selection.tertiary].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Header with selection summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Layers className="w-4 h-4 text-primary" />
            Trope System
          </div>
          {ROLE_LABELS.map(role => {
            const id = selection[role];
            const trope = id ? tropes.find(t => t.id === id) : null;
            return (
              <div key={role} className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground capitalize">{role}:</span>
                {trope ? (
                  <Badge
                    variant="outline"
                    className={cn("text-xs gap-1 cursor-pointer", ROLE_COLORS[role])}
                    onClick={() => handleSelect(id!)}
                  >
                    {trope.name}
                    <X className="w-2.5 h-2.5" />
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground/50 border-dashed">
                    {role === "primary" ? "required" : "optional"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
        {selection.primary && (
          <Button
            size="sm"
            onClick={saveSelection}
            disabled={saving}
            className={cn("h-7 text-xs gap-1 shrink-0", saved && "bg-green-700 hover:bg-green-700")}
          >
            {saved ? <><Check className="w-3 h-3" /> Saved</> : saving ? "Saving..." : "Save Tropes"}
          </Button>
        )}
      </div>

      {/* Trope grid by category */}
      <div className="space-y-3">
        {CATEGORY_ORDER.map(cat => {
          if (!grouped[cat]?.length) return null;
          const isOpen = expanded === cat;
          return (
            <div key={cat} className="border border-border/60 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : cat)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left"
              >
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </span>
                {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {grouped[cat].map(trope => {
                    const role = getRole(trope.id);
                    const slotsAvailable = selectedCount < 3;
                    return (
                      <button
                        key={trope.id}
                        onClick={() => handleSelect(trope.id)}
                        disabled={!role && !slotsAvailable}
                        className={cn(
                          "text-left p-3 rounded-lg border transition-all",
                          role
                            ? cn("border-primary/50 bg-primary/5", role === "primary" ? "border-primary" : "")
                            : slotsAvailable
                            ? "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                            : "border-border/30 opacity-40 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium">{trope.name}</span>
                          {role && (
                            <Badge className={cn("text-xs shrink-0", ROLE_COLORS[role])}>
                              {role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{trope.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview panel */}
      {preview && selection.primary && (
        <div>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPreview ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showPreview ? "Hide" : "Preview"} genre contract for <span className="font-medium text-foreground">{preview.label}</span>
          </button>
          {showPreview && (
            <div className="mt-3 p-4 rounded-lg bg-muted/20 border border-border/60 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reader Expectations</p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{preview.reader_expectations}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Forbidden Violations</p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{preview.forbidden_violations}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pacing</p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{preview.pacing_guidance}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
