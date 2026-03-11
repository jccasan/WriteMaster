import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState } from "react";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Users, Zap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import RelationshipWeb from "@/components/forge/RelationshipWeb";
import { useToast } from "@/hooks/use-toast";

function parseJson(val: any): any {
  if (!val) return null;
  if (typeof val === "string") {
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

function formatItem(item: any): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    if (item.character && item.type) {
      let label = `${item.character} (${item.type})`;
      if (item.notes) label += ` — ${item.notes}`;
      return label;
    }
    if (item.name) return item.name;
    if (item.description) return item.description;
    const vals = Object.values(item).filter(Boolean);
    if (vals.length > 0) return vals.join(" — ");
  }
  return JSON.stringify(item);
}

function renderList(items: any, asBlock = false): React.ReactNode {
  const parsed = parseJson(items);
  if (!parsed) return null;
  if (Array.isArray(parsed)) {
    if (asBlock) {
      return (
        <div className="space-y-1.5">
          {parsed.map((item, i) => (
            <div key={i} className="text-sm text-gray-300 bg-gray-800/50 rounded px-2.5 py-1.5 leading-snug">
              {formatItem(item)}
            </div>
          ))}
        </div>
      );
    }
    return parsed.map((item, i) => (
      <Badge key={i} variant="outline" className="border-gray-700 text-gray-300 text-xs mr-1 mb-1">
        {formatItem(item)}
      </Badge>
    ));
  }
  if (typeof parsed === "string") return <span className="text-gray-300 text-sm">{parsed}</span>;
  return <span className="text-gray-300 text-sm">{formatItem(parsed)}</span>;
}

export default function ForgeCharacters() {
  const [, params] = useRoute("/forge/project/:id/characters");
  const projectId = params?.id || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showMinor, setShowMinor] = useState(false);

  const { data: characters, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "characters"],
    enabled: !!projectId,
  });

  const significantCharacters = characters?.filter((c) => (c.appearanceCount || 1) >= 2) || [];
  const minorCharacters = characters?.filter((c) => (c.appearanceCount || 1) < 2) || [];
  const displayCharacters = showMinor ? (characters || []) : significantCharacters;

  const handleSaveRelationships = async (characterId: string, relationships: any[]) => {
    const res = await fetch(`/api/forge/characters/${characterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ relationshipsJson: relationships, projectId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to save");
    }
    toast({ title: "Relationships saved" });
    queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId, "characters"] });
  };

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-amber-400" data-testid="text-characters-heading">Characters</h1>
          {minorCharacters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMinor(!showMinor)}
              className="text-gray-400 hover:text-amber-400 hover:bg-amber-600/10 h-8 gap-1.5 text-xs"
              data-testid="button-toggle-minor"
            >
              {showMinor ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {showMinor ? "Hide" : "Show"} {minorCharacters.length} minor character{minorCharacters.length !== 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : !characters || characters.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-characters">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No characters tracked yet.</p>
            <Link
              href={`/forge/project/${projectId}/analyze`}
              className="inline-flex items-center gap-2 rounded-md border border-amber-900/30 text-amber-400 hover:bg-amber-600/20 transition-colors text-sm font-medium h-9 px-4 no-underline"
              data-testid="link-run-character-tracker"
            >
              <Zap className="w-4 h-4" /> Run Character Tracker Analysis
            </Link>
          </div>
        ) : (
          <Tabs defaultValue="web" className="w-full">
            <TabsList className="bg-gray-900 border border-amber-900/20 mb-4">
              <TabsTrigger value="web" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400" data-testid="tab-relationship-web">
                Relationship Web
              </TabsTrigger>
              <TabsTrigger value="cards" className="data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400" data-testid="tab-character-cards">
                Character Cards ({displayCharacters.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="web" className="mt-0">
              <RelationshipWeb characters={displayCharacters} onSave={handleSaveRelationships} />
            </TabsContent>

            <TabsContent value="cards" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayCharacters.map((char: any) => (
                  <Card key={char.id} className="bg-gray-900 border-amber-900/20" data-testid={`card-character-${char.id}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-amber-400 text-lg" data-testid={`text-character-name-${char.id}`}>
                          {char.name}
                        </CardTitle>
                        {(char.appearanceCount || 1) < 2 && (
                          <Badge variant="outline" className="border-gray-700 text-gray-500 text-[10px]">minor</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {char.description && (
                        <p className="text-gray-300 text-sm" data-testid={`text-character-desc-${char.id}`}>{char.description}</p>
                      )}

                      {char.traitsJson && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Traits</p>
                          <div className="flex flex-wrap">{renderList(char.traitsJson)}</div>
                        </div>
                      )}

                      {char.relationshipsJson && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Relationships</p>
                          {renderList(char.relationshipsJson, true)}
                        </div>
                      )}

                      {char.injuriesJson && (
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Injuries</p>
                          {renderList(char.injuriesJson, true)}
                        </div>
                      )}

                      {(char.firstAppearanceChapter || char.appearanceCount > 1) && (
                        <div className="pt-2 border-t border-gray-800 flex items-center gap-3 text-xs text-gray-500">
                          {char.firstAppearanceChapter && <span>First: Ch. {char.firstAppearanceChapter}</span>}
                          {char.lastAppearanceChapter && char.lastAppearanceChapter !== char.firstAppearanceChapter && (
                            <span>Last: Ch. {char.lastAppearanceChapter}</span>
                          )}
                          {(char.appearanceCount || 1) > 1 && (
                            <span>{char.appearanceCount} chunks</span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ForgeLayout>
  );
}
