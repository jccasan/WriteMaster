import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { BookMarked, Repeat2, Type, ChevronRight } from "lucide-react";

export default function PublishingHub() {
  const [, navigate] = useLocation();

  const tools = [
    {
      title: "Trope Research",
      description: "Enter a niche or subgenre and get AI-powered trope analysis: recurring tropes, unique angles, trending combinations, and series branding strategy.",
      icon: <Repeat2 className="w-6 h-6" />,
      route: "/publishing/trope-research",
      cta: "Research Tropes",
      testId: "card-tool-trope-research",
    },
    {
      title: "Title & Keyword Generator",
      description: "Generate 7–10 trope-forward title options plus 7 Amazon-optimized keywords and 2 category recommendations — all from your book's content.",
      icon: <Type className="w-6 h-6" />,
      route: "/publishing/titles-keywords",
      cta: "Generate Titles & Keywords",
      testId: "card-tool-titles-keywords",
    },
    {
      title: "Blurb Generator",
      description: "Generate 3 Amazon-optimized blurb variants from your book's dossier and chapters: hook first, conflict shown, trope signals woven in, cliffhanger ending.",
      icon: <BookMarked className="w-6 h-6" />,
      route: "/publishing/blurbs",
      cta: "Generate Blurbs",
      testId: "card-tool-blurbs",
    },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-3" data-testid="text-page-title">
            Publishing Tools
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to turn a finished book into a KDP listing. Trope research for series planning, title generation, blurbs, and Amazon keyword strategy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
          {tools.map((tool) => (
            <Card
              key={tool.title}
              className="border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group"
              onClick={() => navigate(tool.route)}
              data-testid={tool.testId}
            >
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors text-primary">
                    {tool.icon}
                  </div>
                </div>
                <h3 className="font-serif font-semibold text-lg text-foreground mb-2">{tool.title}</h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">{tool.description}</p>
                <div className="text-sm font-medium text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  {tool.cta} <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="border border-border/40 rounded-lg p-6 bg-muted/20" data-testid="card-contextual-note">
          <h3 className="font-semibold text-foreground mb-2">Tip: use these from your books</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The Blurb Generator and Title & Keyword Generator work best when linked directly to a book with a dossier and written chapters. Open any book from the <button className="text-primary hover:underline" onClick={() => navigate("/books")}>Books</button> page and look for the Publishing Tools links in the header — they'll automatically load your book's content as context.
          </p>
        </div>
      </div>
    </Layout>
  );
}
