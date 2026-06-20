import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, ChevronDown, ChevronUp, Layers3, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DimensionItem {
  id: string;
  oneLineDefinition: string;
}

interface DimensionTypes {
  types: Record<string, DimensionItem[]>;
  typeOrder: string[];
}

type DimensionSelections = Record<string, string>; // type -> id

interface ConflictEntry {
  fileA: string;
  fileB: string;
  winner: string;
  overrideCondition: string;
}

interface DimensionPickerProps {
  bookId: string;
  initialSelections?: DimensionSelections | null;
  onSave?: (selections: DimensionSelections) => void;
}

const TYPE_COLORS: Record<string, string> = {
  "Moral Register":       "bg-purple-500/10 text-purple-400 border-purple-500/30",
  "Pacing":               "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Supernatural Mechanic":"bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "Plot Engine":          "bg-amber-500/10 text-amber-400 border-amber-500/30",
  "Protagonist Structure":"bg-rose-500/10 text-rose-400 border-rose-500/30",
  "Tone Register":        "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

const TYPE_DOTS: Record<string, string> = {
  "Moral Register":       "bg-purple-500",
  "Pacing":               "bg-blue-500",
  "Supernatural Mechanic":"bg-emerald-500",
  "Plot Engine":          "bg-amber-500",
  "Protagonist Structure":"bg-rose-500",
  "Tone Register":        "bg-sky-500",
};

export default function DimensionPicker({ bookId, initialSelections, onSave }: DimensionPickerProps) {
  const [typeData, setTypeData] = useState<DimensionTypes | null>(null);
  const [selections, setSelections] = useState<DimensionSelections>(initialSelections ?? {});
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([]);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
  const [dimDetail, setDimDetail] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/api/dimensions/types")
      .then(r => r.json())
      .then(setTypeData)
      .catch(() => {});
  }, []);

  // Check conflicts whenever selections change
  useEffect(() => {
    const ids = Object.values(selections).filter(Boolean);
    if (ids.length < 2) { setConflicts([]); return; }
    fetch("/api/dimensions/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then(d => setConflicts(d.conflicts ?? []))
      .catch(() => {});
  }, [selections]);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  const selectDimension = (type: string, id: string) => {
    setSelections(prev => {
      if (prev[type] === id) {
        const next = { ...prev };
        delete next[type];
        return next;
      }
      return { ...prev, [type]: id };
    });
  };

  const loadDimDetail = useCallback(async (id: string) => {
    if (dimDetail[id]) return;
    try {
      const r = await fetch(`/api/dimensions/${id}`);
      const d = await r.json();
      setDimDetail(prev => ({ ...prev, [id]: d }));
    } catch {}
  }, [dimDetail]);

  const toggleDimDetail = (id: string) => {
    if (expandedDim === id) {
      setExpandedDim(null);
    } else {
      setExpandedDim(id);
      loadDimDetail(id);
    }
  };

  const saveSelections = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/dimensions/book/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selections),
      });
      if (r.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        onSave?.(selections);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.values(selections).filter(Boolean).length;
  const incompatibleConflicts = conflicts.filter(c =>
    c.winner?.toLowerCase().includes("mutually exclusive") ||
    c.overrideCondition?.toLowerCase() === "none"
  );

  if (!typeData) {
    return (
      <div className="text-xs text-muted-foreground py-2">
        Loading dimension library...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers3 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Story Blueprint</span>
          {selectedCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedCount}/6 dimensions set
            </Badge>
          )}
        </div>
        {selectedCount > 0 && (
          <Button
            size="sm"
            onClick={saveSelections}
            disabled={saving || incompatibleConflicts.length > 0}
            className={cn("h-7 text-xs gap-1", saved && "bg-green-700 hover:bg-green-700")}
          >
            {saved ? <><Check className="w-3 h-3" /> Saved</> : saving ? "Saving..." : "Save Blueprint"}
          </Button>
        )}
      </div>

      {/* Active selection summary */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {typeData.typeOrder.map(type => {
            const id = selections[type];
            if (!id) return null;
            const name = id.split("-").slice(2).join("-").replace(/-/g, " ");
            return (
              <Badge
                key={type}
                variant="outline"
                className={cn("text-xs gap-1 cursor-pointer border", TYPE_COLORS[type])}
                onClick={() => selectDimension(type, id)}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", TYPE_DOTS[type])} />
                {name}
                <X className="w-2.5 h-2.5" />
              </Badge>
            );
          })}
        </div>
      )}

      {/* Incompatible conflict warning */}
      {incompatibleConflicts.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Incompatible dimensions selected:</span>
            {incompatibleConflicts.map((c, i) => (
              <div key={i}>{c.fileA} + {c.fileB} are mutually exclusive</div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict advisory */}
      {conflicts.length > 0 && incompatibleConflicts.length === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{conflicts.length} active conflict{conflicts.length > 1 ? "s" : ""}</span>
            {" — default winners apply unless override conditions are met. Check the Conflict Matrix for details."}
          </div>
        </div>
      )}

      {/* Type sections */}
      <div className="space-y-2">
        {typeData.typeOrder.map(type => {
          const dims = typeData.types[type] ?? [];
          const selected = selections[type];
          const isOpen = expandedTypes.has(type);
          const dotColor = TYPE_DOTS[type];
          const badgeColor = TYPE_COLORS[type];

          return (
            <div key={type} className="border border-border/60 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleType(type)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                  <span className="text-xs font-semibold text-foreground/80">{type}</span>
                  {selected && (
                    <Badge variant="outline" className={cn("text-xs border", badgeColor)}>
                      {selected.split("-").slice(2).join(" ")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!selected && (
                    <span className="text-xs text-muted-foreground/50">not set</span>
                  )}
                  {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-border/40 divide-y divide-border/30">
                  {dims.map(dim => {
                    const isSelected = selected === dim.id;
                    const isExpanded = expandedDim === dim.id;
                    const detail = dimDetail[dim.id];
                    const shortName = dim.id.split("-").slice(2).join(" ").replace(/-/g, " ");

                    // Does this dim have an incompatible conflict with another selected dim?
                    const hasConflict = incompatibleConflicts.some(
                      c => (c.fileA === dim.id || c.fileB === dim.id) &&
                           Object.values(selections).includes(c.fileA === dim.id ? c.fileB : c.fileA)
                    );

                    return (
                      <div key={dim.id} className={cn(
                        "transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/20",
                        hasConflict && !isSelected && "opacity-50"
                      )}>
                        <div className="flex items-start gap-2 px-4 py-2.5">
                          <button
                            onClick={() => selectDimension(type, dim.id)}
                            className={cn(
                              "w-3.5 h-3.5 rounded-full border-2 shrink-0 mt-0.5 transition-colors",
                              isSelected
                                ? cn("border-transparent", dotColor)
                                : "border-border hover:border-primary/50"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <button
                              onClick={() => selectDimension(type, dim.id)}
                              className="text-left w-full"
                            >
                              <span className="text-xs font-medium capitalize">{shortName}</span>
                              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                                {dim.oneLineDefinition}
                              </p>
                            </button>
                            {/* Expand detail */}
                            <button
                              onClick={() => toggleDimDetail(dim.id)}
                              className="mt-1 text-xs text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1"
                            >
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              {isExpanded ? "Less" : "Prose signature"}
                            </button>
                            {isExpanded && detail && (
                              <div className="mt-2 p-2.5 rounded bg-muted/30 border border-border/40 animate-in fade-in duration-150">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Prose Signature</p>
                                <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed">
                                  {detail.proseSignature}
                                </p>
                                {detail.aiDefaultsToAvoid && (
                                  <>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-3 mb-1.5">AI Defaults to Avoid</p>
                                    <p className="text-xs text-foreground/70 whitespace-pre-wrap leading-relaxed">
                                      {detail.aiDefaultsToAvoid}
                                    </p>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
