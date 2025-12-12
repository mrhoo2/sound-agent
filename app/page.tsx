import { SoundConverter } from "@/components/sound";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <svg
                className="w-5 h-5 text-primary-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.414a5 5 0 001.414-7.072m-2.828 9.9a9 9 0 010-12.728"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-body-md font-bold text-foreground">Sound Agent</h1>
              <p className="text-micro text-muted-foreground">HVAC Sound Analysis Tool</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Hero Section */}
          <div className="text-center space-y-2">
            <h2 className="text-h4 font-bold text-foreground">
              HVAC Sound Analysis Made Simple
            </h2>
            <p className="text-body-sm text-muted-foreground max-w-2xl mx-auto">
              Convert between sones, NC ratings, dBA, and octave band data. 
              Analyze equipment sound data and check compliance with ASHRAE recommendations.
            </p>
          </div>

          {/* Sound Converter */}
          <div className="flex justify-center">
            <SoundConverter />
          </div>

          {/* Quick Reference */}
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            <QuickRefCard
              title="NC Ratings"
              items={[
                { label: "NC-25", desc: "Very quiet (private offices)" },
                { label: "NC-35", desc: "Quiet (conference rooms)" },
                { label: "NC-45", desc: "Moderate (retail stores)" },
              ]}
            />
            <QuickRefCard
              title="Typical Sones"
              items={[
                { label: "< 1 sone", desc: "Very quiet equipment" },
                { label: "1-4 sones", desc: "Typical HVAC equipment" },
                { label: "> 8 sones", desc: "Loud equipment" },
              ]}
            />
            <QuickRefCard
              title="dBA Levels"
              items={[
                { label: "30 dBA", desc: "Quiet library" },
                { label: "45 dBA", desc: "Typical office" },
                { label: "60 dBA", desc: "Normal conversation" },
              ]}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <p className="text-micro text-muted-foreground">
              Sound Agent by BuildVision • Labs Tool
            </p>
            <p className="text-micro text-muted-foreground">
              Conversions are approximate. Verify critical calculations.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function QuickRefCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; desc: string }[];
}) {
  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <h3 className="font-bold text-body-sm mb-3">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex justify-between text-detail">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground">{item.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
