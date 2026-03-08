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
  critical: "text-red-400 border-red-800 bg-red-950/40",
  major: "text-orange-400 border-orange-800 bg-orange-950/40",
  minor: "text-yellow-400 border-yellow-800 bg-yellow-950/40",
  suggestion: "text-blue-400 border-blue-800 bg-blue-950/40",
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
        <h1 className="text-2xl font-bold text-amber-400 mb-2" data-testid="text-quick-feedback-heading">
          Quick Feedback
        </h1>
        <p className="text-gray-400 text-sm mb-6">
          Paste a chapter or passage and get instant editorial assessment and beta reader reactions.
        </p>

        {!result && (
          <div className="space-y-4">
            <Card className="bg-gray-900 border-amber-900/20">
              <CardContent className="p-5 space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Your Text</Label>
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste your chapter, scene, or passage here..."
                    className="min-h-[240px] bg-gray-950 border-gray-700 text-gray-100 placeholder:text-gray-600 resize-y font-mono text-sm"
                    data-testid="input-text"
                  />
                  <p className="text-xs text-gray-500 mt-1" data-testid="text-word-count">
                    {wordCount.toLocaleString()} words
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 text-sm mb-2 block">Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="bg-gray-950 border-gray-700 text-gray-100" data-testid="select-genre">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700">
                        {GENRES.map(g => (
                          <SelectItem key={g} value={g} className="text-gray-200 focus:bg-gray-800 focus:text-gray-100">
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300 text-sm mb-2 block">Beta Reader Profiles</Label>
                  <div className="space-y-2">
                    {BETA_PROFILES.map(p => (
                      <div key={p.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`qf-${p.key}`}
                          checked={selectedProfiles.includes(p.key)}
                          onCheckedChange={() => toggleProfile(p.key)}
                          className="border-gray-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                          data-testid={`checkbox-profile-${p.key}`}
                        />
                        <Label htmlFor={`qf-${p.key}`} className="text-gray-400 text-sm cursor-pointer">{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={() => feedbackMutation.mutate()}
                  disabled={text.trim().length < 50 || feedbackMutation.isPending}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-gray-950 font-semibold"
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
                  <p className="text-red-400 text-sm" data-testid="text-feedback-error">
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
              className="border-amber-900/30 text-amber-400"
              onClick={() => { feedbackMutation.reset(); setChatMessages([]); }}
              data-testid="button-new-feedback"
            >
              Analyze Another Passage
            </Button>

            <Card className="bg-gray-900 border-amber-900/20" data-testid="card-editorial-result">
              <CardHeader className="pb-3">
                <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Editorial Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {result.editorial.overallImpression && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-1">Overall Impression</h3>
                    <p className="text-sm text-gray-400">{result.editorial.overallImpression}</p>
                  </div>
                )}

                {result.editorial.strengths?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                      <ThumbsUp className="w-3.5 h-3.5" /> Strengths
                    </h3>
                    <ul className="space-y-1">
                      {result.editorial.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm text-gray-400 flex gap-2">
                          <span className="text-green-600 shrink-0">•</span> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.editorial.weaknesses?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Weaknesses
                    </h3>
                    <ul className="space-y-1">
                      {result.editorial.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-sm text-gray-400 flex gap-2">
                          <span className="text-orange-600 shrink-0">•</span> {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.editorial.issues?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Issues Found</h3>
                    <div className="space-y-2">
                      {result.editorial.issues.map((issue: any, i: number) => (
                        <div key={i} className={`rounded-lg border p-3 ${SEVERITY_COLORS[issue.severity] || "text-gray-400 border-gray-700 bg-gray-800/40"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] border-current px-1.5 py-0">{issue.severity}</Badge>
                            <span className="text-sm font-medium">{issue.title}</span>
                          </div>
                          <p className="text-xs opacity-80">{issue.description}</p>
                          {issue.suggestion && (
                            <p className="text-xs mt-1 opacity-60 italic">Suggestion: {issue.suggestion}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.editorial.unresolvedQuestions?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Unresolved Questions</h3>
                    <ul className="space-y-1">
                      {result.editorial.unresolvedQuestions.map((q: string, i: number) => (
                        <li key={i} className="text-sm text-gray-400 flex gap-2">
                          <span className="text-amber-600 shrink-0">?</span> {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {result.betaReaders?.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Beta Reader Reactions
                </h2>
                <div className="space-y-3">
                  {result.betaReaders.map((br: any, i: number) => (
                    <Card key={i} className="bg-gray-900 border-amber-900/15" data-testid={`card-beta-reader-${i}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-gray-100 text-base flex items-center justify-between">
                          <span>{br.profileName}</span>
                          <Badge
                            variant="outline"
                            className={br.wouldKeepReading
                              ? "border-green-700 text-green-400"
                              : "border-red-700 text-red-400"
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
                              <span className="text-gray-500 text-xs font-medium block mb-0.5">Hooked At</span>
                              <p className="text-gray-300">{br.hookedAt}</p>
                            </div>
                          )}
                          {br.attentionSaggedAt && (
                            <div>
                              <span className="text-gray-500 text-xs font-medium block mb-0.5">Attention Sagged At</span>
                              <p className="text-gray-300">{br.attentionSaggedAt}</p>
                            </div>
                          )}
                          {br.mightQuitAt && (
                            <div>
                              <span className="text-gray-500 text-xs font-medium block mb-0.5">Might Quit At</span>
                              <p className="text-gray-300">{br.mightQuitAt}</p>
                            </div>
                          )}
                          {br.favoriteCharacterReaction && (
                            <div>
                              <span className="text-gray-500 text-xs font-medium block mb-0.5">Favorite Character Moment</span>
                              <p className="text-gray-300">{br.favoriteCharacterReaction}</p>
                            </div>
                          )}
                        </div>

                        {br.strongestMoments?.length > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs font-medium flex items-center gap-1 mb-1">
                              <Star className="w-3 h-3" /> Strongest Moments
                            </span>
                            <ul className="space-y-0.5">
                              {br.strongestMoments.map((m: string, j: number) => (
                                <li key={j} className="text-gray-400 flex gap-2">
                                  <span className="text-green-600 shrink-0">•</span> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {br.confusionPoints?.length > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs font-medium block mb-1">Confusion Points</span>
                            <ul className="space-y-0.5">
                              {br.confusionPoints.map((c: string, j: number) => (
                                <li key={j} className="text-gray-400 flex gap-2">
                                  <span className="text-amber-600 shrink-0">?</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {br.leastCredibleMoments?.length > 0 && (
                          <div>
                            <span className="text-gray-500 text-xs font-medium block mb-1">Least Credible</span>
                            <ul className="space-y-0.5">
                              {br.leastCredibleMoments.map((m: string, j: number) => (
                                <li key={j} className="text-gray-400 flex gap-2">
                                  <span className="text-red-600 shrink-0">!</span> {m}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {br.finalEmotionalReaction && (
                          <div>
                            <span className="text-gray-500 text-xs font-medium block mb-0.5">Final Emotional Reaction</span>
                            <p className="text-gray-300 italic">{br.finalEmotionalReaction}</p>
                          </div>
                        )}

                        {br.recommendation && (
                          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                            <span className="text-gray-500 text-xs font-medium block mb-0.5">Recommendation</span>
                            <p className="text-gray-200">{br.recommendation}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Card className="bg-gray-900 border-amber-900/20" data-testid="card-discussion">
              <CardHeader className="pb-3">
                <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Discuss with AI
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {chatMessages.length === 0 && (
                  <p className="text-gray-500 text-sm italic">
                    Ask follow-up questions about the feedback, dig into specific issues, or brainstorm revisions.
                  </p>
                )}

                {chatMessages.length > 0 && (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1" data-testid="chat-messages">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex gap-3 ${msg.role === "user" ? "" : ""}`}
                        data-testid={`chat-message-${i}`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          msg.role === "user"
                            ? "bg-amber-600/20"
                            : "bg-purple-600/20"
                        }`}>
                          {msg.role === "user"
                            ? <User className="w-3.5 h-3.5 text-amber-400" />
                            : <Bot className="w-3.5 h-3.5 text-purple-400" />
                          }
                        </div>
                        <div className={`flex-1 rounded-lg p-3 text-sm ${
                          msg.role === "user"
                            ? "bg-gray-800/60 text-gray-200"
                            : "bg-gray-800/30 text-gray-300 border border-gray-800"
                        }`}>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-purple-600/20">
                          <Bot className="w-3.5 h-3.5 text-purple-400" />
                        </div>
                        <div className="flex-1 rounded-lg p-3 bg-gray-800/30 border border-gray-800">
                          <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
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
                    className="flex-1 bg-gray-950 border-gray-700 text-gray-100 placeholder:text-gray-600"
                    disabled={chatMutation.isPending}
                    data-testid="input-chat"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!chatInput.trim() || chatMutation.isPending}
                    size="icon"
                    className="bg-amber-600 hover:bg-amber-700 text-gray-950 shrink-0"
                    data-testid="button-send-chat"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {chatMutation.isError && (
                  <p className="text-red-400 text-xs" data-testid="text-chat-error">
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
