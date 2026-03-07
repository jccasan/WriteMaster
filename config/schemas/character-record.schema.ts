export interface CharacterProfile {
  name: string;
  aliases: string[];
  description: string;
  traits: string[];
  goals: string[];
  motives: string[];
  relationships: { character: string; type: string; notes: string }[];
  injuries: { description: string; chapter: number; resolved: boolean }[];
  voiceNotes: string[];
  continuityNotes: string[];
}
