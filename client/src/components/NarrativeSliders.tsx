import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NarrativeSliderValues {
  tension: number;
  intimacy: number;
  violence_risk: number;
  wonder: number;
  dread: number;
  trust: number;
  stress: number;
  control: number;
  hope: number;
}

export const DEFAULT_SLIDERS: NarrativeSliderValues = {
  tension: 5,
  intimacy: 3,
  violence_risk: 3,
  wonder: 3,
  dread: 3,
  trust: 0,
  stress: 0,
  control: 0,
  hope: 0,
};

interface SliderConfig {
  key: keyof NarrativeSliderValues;
  label: string;
  description: string;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: "tension", label: "Tension", description: "Overall scene pressure", min: 0, max: 10, minLabel: "Calm", maxLabel: "Explosive" },
  { key: "intimacy", label: "Intimacy", description: "Emotional closeness or vulnerability", min: 0, max: 10, minLabel: "Distant", maxLabel: "Raw" },
  { key: "violence_risk", label: "Violence Risk", description: "Proximity to physical danger", min: 0, max: 10, minLabel: "Safe", maxLabel: "Lethal" },
  { key: "wonder", label: "Wonder", description: "Sense of discovery or awe", min: 0, max: 10, minLabel: "Routine", maxLabel: "Awestruck" },
  { key: "dread", label: "Dread", description: "Anticipation of something terrible", min: 0, max: 10, minLabel: "Secure", maxLabel: "Terrified" },
  { key: "trust", label: "Trust", description: "Willingness to be vulnerable", min: -10, max: 10, minLabel: "Paranoid", maxLabel: "Open" },
  { key: "stress", label: "Stress", description: "Accumulated mental/emotional load", min: -10, max: 10, minLabel: "Serene", maxLabel: "Breaking" },
  { key: "control", label: "Control", description: "Sense of agency over the situation", min: -10, max: 10, minLabel: "Helpless", maxLabel: "Commanding" },
  { key: "hope", label: "Hope", description: "Belief that things can improve", min: -10, max: 10, minLabel: "Nihilistic", maxLabel: "Radiant" },
];

interface NarrativeSlidersProps {
  values: NarrativeSliderValues;
  onChange: (values: NarrativeSliderValues) => void;
  defaultCollapsed?: boolean;
}

export default function NarrativeSliders({ values, onChange, defaultCollapsed = true }: NarrativeSlidersProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const handleSliderChange = (key: keyof NarrativeSliderValues, val: number[]) => {
    onChange({ ...values, [key]: val[0] });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_SLIDERS });
  };

  const isDefault = Object.keys(DEFAULT_SLIDERS).every(
    k => values[k as keyof NarrativeSliderValues] === DEFAULT_SLIDERS[k as keyof NarrativeSliderValues]
  );

  return (
    <div className="border rounded-lg bg-card mb-4" data-testid="narrative-sliders-panel">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors rounded-lg"
        data-testid="button-toggle-sliders"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary uppercase tracking-wider">Scene Atmosphere</span>
          {!isDefault && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Modified</span>
          )}
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          <p className="text-xs text-muted-foreground">
            Adjust these sliders to shape the emotional and situational tone of the scene. The AI will express these through prose style, not labels.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {SLIDER_CONFIGS.map(config => (
              <div key={config.key} className="space-y-1" data-testid={`slider-group-${config.key}`}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    {config.label}
                    <span className="text-muted-foreground ml-1 font-normal">({values[config.key]})</span>
                  </label>
                  <span className="text-[10px] text-muted-foreground">{config.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-16 text-right">{config.minLabel}</span>
                  <Slider
                    min={config.min}
                    max={config.max}
                    step={1}
                    value={[values[config.key]]}
                    onValueChange={(val) => handleSliderChange(config.key, val)}
                    className={cn(
                      "flex-1",
                      config.min < 0 && values[config.key] < 0 && "[&_.bg-primary]:bg-red-500/70",
                      config.min < 0 && values[config.key] > 0 && "[&_.bg-primary]:bg-emerald-500/70"
                    )}
                    data-testid={`slider-${config.key}`}
                  />
                  <span className="text-[10px] text-muted-foreground w-16">{config.maxLabel}</span>
                </div>
              </div>
            ))}
          </div>

          {!isDefault && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-xs gap-1 h-7"
                data-testid="button-reset-sliders"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Defaults
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
