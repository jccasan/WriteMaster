import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Loader2, Zap, AlertTriangle, Star,
  ThumbsUp, BookOpen, Eye, MessageSquare, Send, User, Bot
} from "lucide-react";

const GENRES = [
  "General Fiction", "Literary Fiction", "Thriller", "Mystery",
  "Science Fiction", "Fantasy", "Romance", "Horror",
  "Historical Fiction", "Young Adult", "Crime", "Dystopian",
];

const BETA_PROFILES = [
  { key: "genre_enthusiast", label: "Genre Enthusiast" },
  { key: "casual_commercial", label: "Casual Commercial Reader" },
  { key: "emotion_first", label: "Emotion-First Reader" },
  { key: "pacing_sensitive", label: "Pacing-Sensitive Reader" },
  { key: "critical_craft", label: "Critical Craft Reader" },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "text-red-800 border-red-300 bg-red-100",
  major: "text-orange-800 border-orange-300 bg-orange-100",
  minor: "text-yellow-800 border-yellow-300 bg-yellow-100",
  suggestion: "text-blue-800 border-blue-300 bg-blue-100",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function buildFeedbackSummary(result: any): string {
  const parts: string[] = [];
  if (result.editorial?.overallImpression) {
    parts.push(`Overall: ${result.editorial.overallImpression}`);
  }
  if (result.editorial?.strengths?.length > 0) {
    parts.push(`Strengths: ${result.editorial.strengths.join("; ")}`);
  }
  if (result.editorial?.weaknesses?.length > 0) {
    parts.push(`Weaknesses: ${result.editorial.weaknesses.join("; ")}`);
  }
  if (result.editorial?.issues?.length > 0) {
    parts.push(`Issues: ${result.editorial.issues.map((i: any) => `[${i.severity}] ${i.title}: ${i.description}`).join(" | ")}`);
  }
  if (result.betaReaders?.length > 0) {
    for (const br of result.betaReaders) {
      parts.push(`${br.profileName}: hooked="${br.hookedAt}", recommendation="${br.recommendation}", wouldKeepReading=${br.wouldKeepReading}`);
    }
  }
  return parts.join("\n");
}

export default function ForgeQuickFeedback() {
  const [text, setText] = useState("");
  const [genre, setGenre] = useState("General Fiction");
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>(
    BETA_PROFILES.map(p => p.key)
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleProfile = (key: string) => {
    setSelectedProfiles(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const feedbackMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/forge/quick-feedback", {
        text,
        genre: genre.toLowerCase(),
        betaProfiles: selectedProfiles,
      });
      return res.json();
    },
    onSuccess: () => {
      setChatMessages([]);
    },
  });

  const chatMutation = useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const res = await apiRequest("POST", "/api/forge/quick-feedback/chat", {
        messages,
        originalText: text,
        genre: genre.toLowerCase(),
        feedbackSummary: feedbackMutation.data ? buildFeedbackSummary(feedbackMutation.data) : "",
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    },
    onError: () => {
      setChatMessages(prev => prev.slice(0, -1));
    },
  });

  const sendMessage = () => {
    const msg = chatInput.trim();
    if (!msg || chatMutation.isPending) return;
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: msg }];
    setChatMessages(newMessages);
    setChatInput("");
    chatMutation.mutate(newMessages);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const result = feedbackMutation.data;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  return (
    <ForgeLayout>
      <div className="max-w-4xl animate-in fade-in duration-300">
        <p className="catalog-label text-xs mb-1">Wing III — Edit</p>
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2" data-testid="text-quick-feedback-heading">
          Quick Feedback
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Paste a chapter or passage and get instant editorial assessment and beta reader reactions.
        </p>

        {!result && (
          <div className="space-y-4">
            <Card className="bookplate rounded-sm">
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label className="text-foreground/80 text-sm mb-2 block">Your Text</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your chapter, scene, or passage here..."
                    className="min-h-[240px] bg-background resize-y font-mono text-sm"
                    data-testid="input-text"
                  />
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-word-count">
                    {wordCount.toLocaleString()} words
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-foreground/80 text-sm mb-2 block">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="bg-background" data-testid="select-genre">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRES.map(g => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-foreground/80 text-sm mb-2 block">Beta Reader Profiles</Label>
                  <div className="space-y-2">
                    {BETA_PROFILES.map(p => (
                      <div key={p.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`qf-${p.key}`}
                          checked={selectedProfiles.includes(p.key)}
                          onCheckedChange={() => toggleProfile(p.key)}
                          data-testid={`checkbox-profile-${p.key}`}
                        />
                        <Label htmlFor={`qf-${p.key}`} className="text-muted-foreground text-sm cursor-pointer">{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => feedbackMutation.mutate()}
                  disabled={text.trim().length < 50 || feedbackMutation.isPending}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                  data-testid="button-get-feedback"
                >
                  {feedbackMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Analyzing (this takes 15-30 seconds)...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Get Feedback
                    </>
                  )}
                </Button>

                {feedbackMutation.isError && (
                  <p className="text-destructive text-sm" data-testid="text-feedback-error">
                    {(feedbackMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <Button
              variant="outline"
              className="border-border text-primary hover:bg-primary/10"
              onClick={() => { feedbackMutation.reset(); setChatMessages([]); }}
              data-testid="button-new-feedback"
            >
              Analyze Another Passage
            </Button>

            <Card className="bookplate rounded-sm" data-testid="card-editorial-result">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-lg flex items-center gap-2 font-serif">
                  <Eye className="w-5 h-5 text-brass" />
                  Editorial Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.editorial.overallImpression && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Overall Impression</h3>
                    <p className="text-sm text-muted-foreground">{result.editorial.overallImpression}</p>
                  </div>
                )}

                {result.editorial.strengths?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                    </h3>
                    <ul className="space-y-1">
                      {result.editorial.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-green-700 shrink-0">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.editorial.weaknesses?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Weaknesses
                    </h3>
                    <ul className="space-y-1">
                      {result.editorial.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-orange-700 shrink-0">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.editorial.issues?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Issues Found</h3>
                    <div className="space-y-2">
                      {result.editorial.issues.map((issue: any, i: number) => (
                        <div key={i} className={`rounded-sm border p-3 ${SEVERITY_COLORS[issue.severity] || "text-foreground/80 border-border bg-muted"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] border-current px-1.5 py-0">{issue.severity}</Badge>
                            <span className="text-sm font-medium">{issue.title}</span>
                          </div>
                          <p className="text-xs opacity-90">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="text-xs mt-1 opacity-75 italic">Suggestion: {issue.suggestion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.editorial.unresolvedQuestions?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Unresolved Questions</h3>
                    <ul className="space-y-1">
                      {result.editorial.unresolvedQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-brass shrink-0">?</span> {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.betaReaders?.length > 0 && (
              <div>
                <h2 className="text-lg font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brass" />
                  Beta Reader Reactions
                </h2>
                <div className="space-y-3">
                  {result.betaReaders.map((br: any, i: number) => (
                    <Card key={i} className="bg-card border border-border rounded-sm" data-testid={`card-beta-reader-${i}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-foreground text-base flex items-center justify-between">
                          <span>{br.profileName}</span>
                          <Badge
                            variant="outline"
                            className={br.wouldKeepReading
                              ? "border-green-700 text-green-700"
                              : "border-red-700 text-red-700"
                            }
                          >
                            {br.wouldKeepReading ? "Would keep reading" : "Might stop reading"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {br.hookedAt && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium block mb-0.5">Hooked At</span>
                              <p className="text-foreground/80">{br.hookedAt}</p>
                            </div>
                          )}
                          {br.attentionSaggedAt && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium block mb-0.5">Attention Sagged At</span>
                              <p className="text-foreground/80">{br.attentionSaggedAt}</p>
                            </div>
                          )}
                          {br.mightQuitAt && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium block mb-0.5">Might Quit At</span>
                              <p className="text-foreground/80">{br.mightQuitAt}</p>
                            </div>
                          )}
                          {br.favoriteCharacterReaction && (
                            <div>
                              <span className="text-muted-foreground text-xs font-medium block mb-0.5">Favorite Character Moment</span>
                              <p className="text-foreground/80">{br.favoriteCharacterReaction}</p>
                            </div>
                          )}
                        </div>

                        {br.strongestMoments?.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-xs font-medium flex items-center gap-1 mb-1">
                              <Star className="w-3 h-3" /> Strongest Moments
                            </span>
                            <ul className="space-y-0.5">
                              {br.strongestMoments.map((m: string, j: number) => (
                                <li key={j} className="text-muted-foreground flex gap-2">
                                  <span className="text-green-700 shrink-0">•</span> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {br.confusionPoints?.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-xs font-medium block mb-1">Confusion Points</span>
                            <ul className="space-y-0.5">
                              {br.confusionPoints.map((c: string, j: number) => (
                                <li key={j} className="text-muted-foreground flex gap-2">
                                  <span className="text-brass shrink-0">?</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {br.leastCredibleMoments?.length > 0 && (
                          <div>
                            <span className="text-muted-foreground text-xs font-medium block mb-1">Least Credible</span>
                            <ul className="space-y-0.5">
                              {br.leastCredibleMoments.map((m: string, j: number) => (
                                <li key={j} className="text-muted-foreground flex gap-2">
                                  <span className="text-red-700 shrink-0">!</span> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {br.finalEmotionalReaction && (
                          <div>
                            <span className="text-muted-foreground text-xs font-medium block mb-0.5">Final Emotional Reaction</span>
                            <p className="text-foreground/80 italic">{br.finalEmotionalReaction}</p>
                          </div>
                        )}

                        {br.recommendation && (
                          <div className="bg-muted rounded-sm p-3 border border-border">
                            <span className="text-muted-foreground text-xs font-medium block mb-0.5">Recommendation</span>
                            <p className="text-foreground">{br.recommendation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Card className="bookplate rounded-sm" data-testid="card-discussion">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-lg flex items-center gap-2 font-serif">
                  <MessageSquare className="w-5 h-5 text-brass" />
                  Discuss with AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-muted-foreground text-sm italic">
                    Ask follow-up questions about the feedback, dig into specific issues, or brainstorm revisions.
                  </p>
                )}

                {chatMessages.length > 0 && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1" data-testid="chat-messages">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className="flex gap-3"
                        data-testid={`chat-message-${i}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          msg.role === "user"
                            ? "bg-muted"
                            : "bg-primary/10"
                        }`}>
                          {msg.role === "user"
                            ? <User className="w-3.5 h-3.5 text-muted-foreground" />
                            : <Bot className="w-3.5 h-3.5 text-primary" />
                          }
                        </div>
                        <div className={`flex-1 rounded-sm p-3 text-sm ${
                          msg.role === "user"
                            ? "bg-secondary text-foreground"
                            : "bg-background text-foreground/90 border border-border"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-primary/10">
                          <Bot className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 rounded-sm p-3 bg-background border border-border">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Ask about an issue, character, or craft element..."
                    className="flex-1 bg-background"
                    disabled={chatMutation.isPending}
                    data-testid="input-chat"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || chatMutation.isPending}
                    size="icon"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                    data-testid="button-send-chat"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {chatMutation.isError && (
                  <p className="text-destructive text-xs" data-testid="text-chat-error">
                    {(chatMutation.error as Error).message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ForgeLayout>
  );
}
