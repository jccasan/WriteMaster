import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Share2, Copy, Check } from "lucide-react";

// Mock data for the final dossier
const MOCK_DOSSIER = {
  logline: "A disgraced magical detective must team up with the ghost of the city's most notorious thief to solve a locked-room murder that implicates the ruling Shadow Council, risking his own soul to expose the truth before the city's protective wards fail completely.",
  pitch: "In the rain-slicked, gas-lit streets of Oakhaven, magic is heavily regulated by the Shadow Council. Silas Vance was their best investigator until a case gone wrong cost him his badge and his ability to touch a living person without inflicting pain. Now scraping by as a private eye for the mundane underclass, he's hired to investigate the impossible locked-room murder of a Council member.\n\nThe twist? His only witness and involuntary partner is the ghost of Elara Vance, the city's most infamous thief, who also happens to be the suspect in the murder. As they unravel a conspiracy that reaches the highest echelons of power, they discover the city's magical wards are being drained to fuel a dark ritual. With the ticking clock of the failing wards and a corrupt authority hunting them down, Silas must choose between protecting his own fractured soul or sacrificing what little he has left to save a city that abandoned him.",
  characters: [
    {
      name: "Silas Vance",
      role: "Protagonist",
      desc: "Tall, gaunt, and always wrapped in a heavy trench coat to hide his cursed hands. He has the weary eyes of a man who has seen too many lies.",
      personality: "Cynical and sharp-tongued, but secretly harbors a desperate need to protect the innocent. He uses sarcasm as a shield.",
      motivation: "To uncover the truth behind his disgrace and find a way to break his curse.",
      flaw: "Refuses to trust anyone, pushing away those who try to help because he believes his curse will ultimately hurt them.",
      arc: "Must learn to accept help and trust Elara, moving from self-imposed isolation to sacrificing his own chance at a cure for the greater good."
    },
    {
      name: "Elara Thorne",
      role: "Reluctant Ally / Ghost",
      desc: "Shimmering, translucent, and perpetually shifting form slightly. She retains the confident smirk and elegant posture she had in life.",
      personality: "Charming, manipulative, and deeply pragmatic. She views rules as mere suggestions.",
      motivation: "To clear her name from the murder she didn't commit so her spirit can finally rest.",
      flaw: "Self-preservation at all costs; she struggles to care about the broader conspiracy until it threatens Silas.",
      arc: "Evolves from a selfish opportunist to someone willing to risk total soul-annihilation to stop the Council's plot."
    },
    {
      name: "Lord Malakor",
      role: "Corrupt Noble / Antagonist",
      desc: "Impeccably dressed, exuding an aura of unnatural calm and suppressed power. His eyes are entirely black, a sign of his deep magical corruption.",
      personality: "Arrogant, calculating, and utterly convinced of his own righteousness. He believes the ends always justify the means.",
      motivation: "To siphon the city's wards to achieve immortality and absolute control over Oakhaven.",
      flaw: "Underestimates those he considers 'lesser', specifically Silas and the mundane underclass.",
      arc: "His hubris leads him to ignore minor threats until they orchestrate his downfall."
    }
  ],
  world: {
    setting: "Oakhaven, a sprawling, industrialized city where gaslight meets rudimentary magical technology.",
    rules: "Magic (Aether) is a finite resource. Using too much without proper grounding causes physical and spiritual corruption. The Shadow Council hoards the safest Aether sources.",
    structure: "A rigid class system where the magically gifted (Patricians) rule over the mundane (Dregs). The Council acts as both government and law enforcement.",
    locations: [
      "The Drowning Wards: The flooded lower levels of the city, reeking of ozone and decay, where Silas has his office.",
      "The Spire: The floating citadel of the Shadow Council, gleaming with stolen Aether and enforcing the oppressive class divide.",
      "The Whispering Catacombs: An illegal underground market where raw magic and secrets are traded, filled with shifting shadows and desperate faces."
    ]
  },
  beats: [
    { name: "Opening Image", desc: "Silas failing to save a client due to his curse, establishing his isolation and the grim reality of Oakhaven." },
    { name: "Inciting Incident", desc: "Elara's ghost appears in Silas's warded office, demanding he solve the locked-room murder of a Councilman she's framed for." },
    { name: "Act 1 Twist", desc: "Silas realizes the murder weapon was Council-issued, forcing him to operate completely outside the law and making him a target." },
    { name: "Midpoint Shift", desc: "They discover the murder was a cover-up for the systematic draining of the city's wards. The stakes shift from personal survival to saving Oakhaven." },
    { name: "Dark Night of the Soul", desc: "Silas is captured and tortured, his curse weaponized against him. Elara realizes she can't save him without risking her own spirit fading forever." },
    { name: "Climax", desc: "Silas and Elara infiltrate the Spire. Elara sacrifices her stability to short-circuit Malakor's ritual, allowing Silas to land the finishing blow, accepting the permanent intensification of his curse to do so." },
    { name: "Closing Image", desc: "The wards are stabilized, the Council fractured. Silas stands in the rain, permanently cursed but no longer alone, as a faint, stable Elara smiles beside him." }
  ]
};

export default function StoryResult() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(MOCK_DOSSIER, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="inline-block px-3 py-1 mb-3 rounded-full bg-primary/10 text-primary text-sm font-medium tracking-wide">
            Final Story Dossier
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            The Obsidian Wards
          </h2>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 flex-1 md:flex-none">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy Content"}
          </Button>
          <Button size="sm" className="gap-2 flex-1 md:flex-none" data-testid="button-download">
            <Download className="w-4 h-4" /> Download Markdown
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border shadow-xl rounded-xl overflow-hidden">
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b border-border bg-muted/20 px-4 pt-4">
            <TabsList className="bg-transparent h-auto p-0 gap-6">
              <TabsTrigger 
                value="overview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-2 text-base font-medium"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="characters" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-2 text-base font-medium"
              >
                Characters
              </TabsTrigger>
              <TabsTrigger 
                value="world" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-2 text-base font-medium"
              >
                World-Building
              </TabsTrigger>
              <TabsTrigger 
                value="plot" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-2 pb-3 pt-2 text-base font-medium"
              >
                Plot Beats
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 md:p-8">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
              <section className="space-y-3">
                <h3 className="text-xl font-serif font-semibold text-primary border-b border-border pb-2">Logline</h3>
                <p className="text-lg leading-relaxed text-foreground italic border-l-4 border-primary/40 pl-4 py-1">
                  "{MOCK_DOSSIER.logline}"
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-xl font-serif font-semibold text-primary border-b border-border pb-2">Full Pitch</h3>
                <div className="text-base text-foreground/90 leading-relaxed whitespace-pre-wrap space-y-4">
                  {MOCK_DOSSIER.pitch.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* CHARACTERS TAB */}
            <TabsContent value="characters" className="space-y-8 mt-0 focus-visible:outline-none">
              {MOCK_DOSSIER.characters.map((char, idx) => (
                <div key={idx} className="bg-muted/10 border border-border/50 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-4 border-b border-border/40 pb-3">
                    <h3 className="text-xl font-serif font-semibold text-foreground">{char.name}</h3>
                    <span className="text-xs uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {char.role}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Appearance</h4>
                        <p className="text-sm">{char.desc}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Personality</h4>
                        <p className="text-sm">{char.personality}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Motivation & Flaw</h4>
                        <p className="text-sm"><strong className="text-foreground/80">Want:</strong> {char.motivation}</p>
                        <p className="text-sm mt-1"><strong className="text-foreground/80">Flaw:</strong> {char.flaw}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Character Arc</h4>
                        <p className="text-sm">{char.arc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* WORLD TAB */}
            <TabsContent value="world" className="space-y-8 mt-0 focus-visible:outline-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <section>
                    <h3 className="text-lg font-serif font-semibold text-primary mb-2">Setting Overview</h3>
                    <p className="text-base text-foreground/90">{MOCK_DOSSIER.world.setting}</p>
                  </section>
                  <section>
                    <h3 className="text-lg font-serif font-semibold text-primary mb-2">Magic & Rules</h3>
                    <p className="text-base text-foreground/90">{MOCK_DOSSIER.world.rules}</p>
                  </section>
                  <section>
                    <h3 className="text-lg font-serif font-semibold text-primary mb-2">Social Structure</h3>
                    <p className="text-base text-foreground/90">{MOCK_DOSSIER.world.structure}</p>
                  </section>
                </div>
                
                <div className="bg-muted/20 p-5 rounded-lg border border-border/50">
                  <h3 className="text-lg font-serif font-semibold text-foreground mb-4">Key Locations</h3>
                  <ul className="space-y-4">
                    {MOCK_DOSSIER.world.locations.map((loc, i) => {
                      const [title, desc] = loc.split(': ');
                      return (
                        <li key={i} className="text-sm">
                          <strong className="block text-foreground mb-1">{title}</strong>
                          <span className="text-muted-foreground">{desc}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* PLOT TAB */}
            <TabsContent value="plot" className="mt-0 focus-visible:outline-none">
              <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-8 py-2">
                {MOCK_DOSSIER.beats.map((beat, i) => (
                  <div key={i} className="relative">
                    {/* Timeline dot */}
                    <div className="absolute w-3 h-3 bg-background border-2 border-primary rounded-full -left-[1.95rem] top-1.5" />
                    
                    <h3 className="text-base font-bold text-foreground mb-1 uppercase tracking-wide">
                      {beat.name}
                    </h3>
                    <p className="text-base text-muted-foreground">
                      {beat.desc}
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}