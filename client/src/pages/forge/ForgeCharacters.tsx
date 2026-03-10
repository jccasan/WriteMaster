import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Zap } from "lucide-react";

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

  const { data: characters, isLoading } = useQuery<any[]>({
    queryKey: ["/api/forge/projects", projectId, "characters"],
    enabled: !!projectId,
  });

  return (
    <ForgeLayout projectId={projectId}>
      <div className="animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-characters-heading">Characters</h1>

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {characters.map((char: any) => (
              <Card key={char.id} className="bg-gray-900 border-amber-900/20" data-testid={`card-character-${char.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-amber-400 text-lg" data-testid={`text-character-name-${char.id}`}>
                    {char.name}
                  </CardTitle>
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

                  {char.firstAppearanceChapter && (
                    <p className="text-xs text-gray-500">First appears: Chapter {char.firstAppearanceChapter}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
