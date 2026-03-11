import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Save, ChevronRight, Edit2 } from "lucide-react";

interface Relationship {
  character: string;
  type: string;
  notes: string;
}

interface CharacterNode {
  id: string;
  name: string;
  relationships: Relationship[];
  description: string;
  traits: string[];
  goals: string[];
  motives: string[];
  injuries: any[];
  voiceNotes: string[];
  continuityNotes: string[];
  aliases: string[];
  appearanceCount: number;
  firstAppearanceChapter?: number | null;
  lastAppearanceChapter?: number | null;
}

interface Edge {
  from: string;
  to: string;
  type: string;
  notes: string;
  fromName: string;
  toName: string;
}

interface NodePosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

const TYPE_COLORS: Record<string, string> = {
  ally: "#22c55e",
  friend: "#22c55e",
  lover: "#ec4899",
  romantic: "#ec4899",
  love_interest: "#ec4899",
  family: "#3b82f6",
  mentor: "#8b5cf6",
  antagonist: "#ef4444",
  enemy: "#ef4444",
  rival: "#f97316",
  colleague: "#06b6d4",
  neutral: "#6b7280",
};

function getEdgeColor(type: string): string {
  const lower = type.toLowerCase();
  for (const [key, color] of Object.entries(TYPE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#d97706";
}

function parseJson(val: any): any[] {
  if (!val) return [];
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return []; }
  }
  return Array.isArray(val) ? val : [];
}

interface RelationshipWebProps {
  characters: any[];
  onSave: (characterId: string, relationships: Relationship[]) => Promise<void>;
}

export default function RelationshipWeb({ characters, onSave }: RelationshipWebProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [positions, setPositions] = useState<Record<string, NodePosition>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<{ from: string; to: string } | null>(null);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [editingChar, setEditingChar] = useState<string | null>(null);
  const [editRels, setEditRels] = useState<Relationship[]>([]);
  const [saving, setSaving] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodes: CharacterNode[] = useMemo(() =>
    characters.map((c) => ({
      id: c.id,
      name: c.name,
      relationships: parseJson(c.relationshipsJson),
      description: c.description || "",
      traits: parseJson(c.traitsJson),
      goals: parseJson(c.goalsJson),
      motives: parseJson(c.motivesJson),
      injuries: parseJson(c.injuriesJson),
      voiceNotes: parseJson(c.voiceNotesJson),
      continuityNotes: parseJson(c.continuityNotesJson),
      aliases: parseJson(c.aliasesJson),
      appearanceCount: c.appearanceCount || 1,
      firstAppearanceChapter: c.firstAppearanceChapter,
      lastAppearanceChapter: c.lastAppearanceChapter,
    })),
    [characters]
  );

  const nameToId = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach((n) => {
      map[n.name.toLowerCase()] = n.id;
    });
    return map;
  }, [nodes]);

  const edges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = [];
    const seen = new Set<string>();
    nodes.forEach((node) => {
      node.relationships.forEach((rel) => {
        const targetId = nameToId[rel.character?.toLowerCase()] || rel.character;
        const type = rel.type || "unknown";
        const key = [node.id, targetId].sort().join("__") + "__" + type.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          edgeList.push({
            from: node.id,
            to: targetId,
            type,
            notes: rel.notes || "",
            fromName: node.name,
            toName: rel.character,
          });
        }
      });
    });
    return edgeList;
  }, [nodes, nameToId]);

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions({ width: Math.max(400, width), height: Math.max(400, Math.min(600, width * 0.6)) });
      }
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (nodes.length === 0) return;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;
    const radius = Math.min(cx, cy) * 0.65;
    const newPos: Record<string, NodePosition> = {};
    nodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
      if (positions[node.id]) {
        newPos[node.id] = positions[node.id];
      } else {
        newPos[node.id] = {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
          vx: 0, vy: 0,
        };
      }
    });
    setPositions(newPos);
  }, [nodes, dimensions]);

  const handleMouseDown = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    const pos = positions[nodeId];
    if (!pos) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left - pos.x, y: e.clientY - rect.top - pos.y };
    setDragging(nodeId);
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.max(30, Math.min(dimensions.width - 30, e.clientX - rect.left - dragOffset.current.x));
    const y = Math.max(30, Math.min(dimensions.height - 30, e.clientY - rect.top - dragOffset.current.y));
    setPositions((prev) => ({ ...prev, [dragging]: { ...prev[dragging], x, y } }));
  }, [dragging, dimensions]);

  const handleMouseUp = useCallback(() => { setDragging(null); }, []);

  const handleNodeClick = (charId: string) => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      openEditor(charId);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        setSelectedChar(selectedChar === charId ? null : charId);
        setSelectedEdge(null);
        setEditingChar(null);
      }, 250);
    }
  };

  const openEditor = (charId: string) => {
    const node = nodes.find((n) => n.id === charId);
    if (!node) return;
    setEditingChar(charId);
    setEditRels([...node.relationships]);
    setSelectedEdge(null);
    setSelectedChar(null);
  };

  const handleSaveRels = async () => {
    if (!editingChar) return;
    setSaving(true);
    try {
      await onSave(editingChar, editRels);
      setEditingChar(null);
    } finally {
      setSaving(false);
    }
  };

  const addRel = () => {
    setEditRels([...editRels, { character: "", type: "ally", notes: "" }]);
  };

  const removeRel = (i: number) => {
    setEditRels(editRels.filter((_, idx) => idx !== i));
  };

  const updateRel = (i: number, field: keyof Relationship, value: string) => {
    const updated = [...editRels];
    updated[i] = { ...updated[i], [field]: value };
    setEditRels(updated);
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set<string>();
    edges.forEach((e) => types.add(e.type.toLowerCase()));
    return Array.from(types);
  }, [edges]);

  const selectedNode = selectedChar ? nodes.find((n) => n.id === selectedChar) : null;

  if (nodes.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full" data-testid="relationship-web">
      <div className="flex flex-wrap gap-3 mb-3">
        {uniqueTypes.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: getEdgeColor(t) }} />
            <span className="capitalize">{t}</span>
          </div>
        ))}
      </div>

      <Card className="bg-gray-900 border-amber-900/20 overflow-hidden">
        <CardContent className="p-0">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="w-full cursor-default select-none"
            style={{ height: dimensions.height }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => { setSelectedChar(null); setSelectedEdge(null); }}
            data-testid="relationship-web-svg"
          >
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-selected">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {edges.map((edge, i) => {
              const fromPos = positions[edge.from];
              const toPos = positions[edge.to];
              if (!fromPos || !toPos) return null;
              const color = getEdgeColor(edge.type);
              const isSelected = selectedEdge && (
                (selectedEdge.from === edge.from && selectedEdge.to === edge.to) ||
                (selectedEdge.from === edge.to && selectedEdge.to === edge.from)
              );
              const isConnectedToSelected = selectedChar && (edge.from === selectedChar || edge.to === selectedChar);
              const mx = (fromPos.x + toPos.x) / 2;
              const my = (fromPos.y + toPos.y) / 2;
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={fromPos.x} y1={fromPos.y}
                    x2={toPos.x} y2={toPos.y}
                    stroke={color}
                    strokeWidth={isSelected || isConnectedToSelected ? 3 : 1.5}
                    strokeOpacity={isSelected || isConnectedToSelected ? 1 : selectedChar ? 0.15 : 0.5}
                    className="cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); setSelectedEdge(isSelected ? null : { from: edge.from, to: edge.to }); setSelectedChar(null); }}
                  />
                  <text
                    x={mx} y={my - 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize={10}
                    fontWeight={isSelected || isConnectedToSelected ? 600 : 400}
                    opacity={isSelected || isConnectedToSelected ? 1 : selectedChar ? 0.15 : 0.7}
                    className="pointer-events-none select-none"
                  >
                    {edge.type}
                  </text>
                </g>
              );
            })}

            {nodes.map((node) => {
              const pos = positions[node.id];
              if (!pos) return null;
              const hasEdges = edges.some((e) => e.from === node.id || e.to === node.id);
              const isSelected = selectedChar === node.id;
              const isConnected = selectedChar ? edges.some((e) =>
                (e.from === selectedChar && e.to === node.id) || (e.to === selectedChar && e.from === node.id)
              ) : false;
              const dimmed = selectedChar && !isSelected && !isConnected;
              const nodeRadius = hasEdges ? 22 : 16;
              return (
                <g
                  key={node.id}
                  className="cursor-grab active:cursor-grabbing"
                  onMouseDown={(e) => handleMouseDown(node.id, e)}
                  onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id); }}
                  style={{ opacity: dimmed ? 0.25 : 1 }}
                  data-testid={`node-${node.id}`}
                >
                  <circle
                    cx={pos.x} cy={pos.y}
                    r={nodeRadius}
                    fill={isSelected ? "#292524" : "#1f2937"}
                    stroke={isSelected ? "#f59e0b" : "#d97706"}
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={isSelected ? "url(#glow-selected)" : "url(#glow)"}
                  />
                  <text
                    x={pos.x} y={pos.y + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#fbbf24"
                    fontSize={hasEdges ? 11 : 10}
                    fontWeight={600}
                    className="pointer-events-none select-none"
                  >
                    {node.name.length > 10 ? node.name.slice(0, 9) + "…" : node.name}
                  </text>
                  <text
                    x={pos.x} y={pos.y + (hasEdges ? 34 : 28)}
                    textAnchor="middle"
                    fill="#9ca3af"
                    fontSize={9}
                    className="pointer-events-none select-none"
                  >
                    {node.relationships.length} rel{node.relationships.length !== 1 ? "s" : ""}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-600 mt-2">Click a character to view details. Double-click to edit relationships. Drag to rearrange.</p>

      {selectedNode && !editingChar && (
        <Card className="bg-gray-900 border-amber-900/20 mt-3 animate-in fade-in slide-in-from-top-2 duration-200" data-testid="character-detail-panel">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-amber-400 font-bold text-lg" data-testid="detail-character-name">{selectedNode.name}</h3>
                {selectedNode.aliases.length > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">aka {selectedNode.aliases.join(", ")}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditor(selectedNode.id)}
                  className="text-amber-400 hover:bg-amber-600/20 h-7 gap-1 text-xs"
                  data-testid="button-edit-from-detail"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedChar(null)} className="text-gray-400 h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {selectedNode.description && (
              <p className="text-sm text-gray-300 mb-4 leading-relaxed" data-testid="detail-description">{selectedNode.description}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedNode.traits.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Traits</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.traits.map((t, i) => (
                      <Badge key={i} variant="outline" className="border-amber-900/30 text-amber-300/80 text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.goals.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Goals</p>
                  <div className="space-y-1">
                    {selectedNode.goals.map((g, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-sm text-gray-300">
                        <ChevronRight className="w-3 h-3 text-amber-600 mt-1 shrink-0" />
                        <span>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.motives.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Motives</p>
                  <div className="space-y-1">
                    {selectedNode.motives.map((m, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-sm text-gray-300">
                        <ChevronRight className="w-3 h-3 text-orange-600 mt-1 shrink-0" />
                        <span>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.relationships.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Relationships</p>
                  <div className="space-y-1.5">
                    {selectedNode.relationships.map((rel, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getEdgeColor(rel.type) }} />
                        <span className="text-gray-200 font-medium">{rel.character}</span>
                        <span className="text-gray-500 text-xs capitalize">({rel.type})</span>
                        {rel.notes && <span className="text-gray-400 text-xs">— {rel.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.injuries.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Injuries</p>
                  <div className="space-y-1">
                    {selectedNode.injuries.map((inj, i) => {
                      const desc = typeof inj === "string" ? inj : inj.description || JSON.stringify(inj);
                      const resolved = typeof inj === "object" && inj.resolved;
                      return (
                        <div key={i} className={`text-sm ${resolved ? "text-gray-500 line-through" : "text-red-300"}`}>
                          {desc}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedNode.voiceNotes.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Voice &amp; Dialogue Notes</p>
                  <div className="space-y-1">
                    {selectedNode.voiceNotes.map((v, i) => (
                      <p key={i} className="text-sm text-gray-300 italic">"{v}"</p>
                    ))}
                  </div>
                </div>
              )}

              {selectedNode.continuityNotes.length > 0 && (
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5 font-medium">Continuity Notes</p>
                  <div className="space-y-1">
                    {selectedNode.continuityNotes.map((n, i) => (
                      <p key={i} className="text-sm text-gray-400">{n}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {(selectedNode.firstAppearanceChapter || selectedNode.appearanceCount > 1) && (
              <div className="mt-4 pt-3 border-t border-gray-800 flex items-center gap-4 text-xs text-gray-500">
                {selectedNode.firstAppearanceChapter && (
                  <span>First seen: Ch. {selectedNode.firstAppearanceChapter}</span>
                )}
                {selectedNode.lastAppearanceChapter && selectedNode.lastAppearanceChapter !== selectedNode.firstAppearanceChapter && (
                  <span>Last seen: Ch. {selectedNode.lastAppearanceChapter}</span>
                )}
                <span>Appeared in {selectedNode.appearanceCount} analysis chunk{selectedNode.appearanceCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedEdge && !selectedChar && (() => {
        const edge = edges.find((e) =>
          (e.from === selectedEdge.from && e.to === selectedEdge.to) ||
          (e.from === selectedEdge.to && e.to === selectedEdge.from)
        );
        if (!edge) return null;
        return (
          <Card className="bg-gray-900 border-amber-900/20 mt-3" data-testid="edge-detail">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400 font-medium">{edge.fromName}</span>
                <span className="text-gray-500">→</span>
                <span className="text-amber-400 font-medium">{edge.toName}</span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded" style={{ backgroundColor: getEdgeColor(edge.type) + "30", color: getEdgeColor(edge.type) }}>
                  {edge.type}
                </span>
              </div>
              {edge.notes && <p className="text-sm text-gray-300">{edge.notes}</p>}
            </CardContent>
          </Card>
        );
      })()}

      {editingChar && (
        <Card className="bg-gray-900 border-amber-600/40 mt-3" data-testid="relationship-editor">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-amber-400 font-semibold">
                Edit Relationships — {nodes.find((n) => n.id === editingChar)?.name}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setEditingChar(null)} className="text-gray-400 h-7 w-7 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2 mb-3">
              {editRels.map((rel, i) => (
                <div key={i} className="flex gap-2 items-start" data-testid={`edit-rel-${i}`}>
                  <Input
                    value={rel.character}
                    onChange={(e) => updateRel(i, "character", e.target.value)}
                    placeholder="Character name"
                    className="bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm flex-[2]"
                    data-testid={`input-rel-character-${i}`}
                  />
                  <select
                    value={rel.type}
                    onChange={(e) => updateRel(i, "type", e.target.value)}
                    className="bg-gray-800 border border-gray-700 text-gray-200 rounded-md h-8 text-sm px-2 flex-1"
                    data-testid={`select-rel-type-${i}`}
                  >
                    {["ally", "friend", "lover", "love_interest", "family", "mentor", "colleague", "rival", "antagonist", "enemy", "neutral"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <Input
                    value={rel.notes}
                    onChange={(e) => updateRel(i, "notes", e.target.value)}
                    placeholder="Notes"
                    className="bg-gray-800 border-gray-700 text-gray-200 h-8 text-sm flex-[3]"
                    data-testid={`input-rel-notes-${i}`}
                  />
                  <Button variant="ghost" size="sm" onClick={() => removeRel(i)} className="text-red-400 h-8 w-8 p-0 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={addRel} className="border-amber-900/30 text-amber-400 hover:bg-amber-600/20 h-8 gap-1" data-testid="button-add-relationship">
                <Plus className="w-3.5 h-3.5" /> Add Relationship
              </Button>
              <Button size="sm" onClick={handleSaveRels} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-gray-950 h-8 gap-1 ml-auto" data-testid="button-save-relationships">
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
