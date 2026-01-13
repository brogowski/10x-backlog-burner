import { cn } from "@/lib/utils";
import type { GamePlayStatus } from "@/types";

interface GameRowProps {
  title: string;
  artworkUrl?: string | null;
  achievementsUnlocked?: number | null;
  achievementsTotal?: number | null;
  status: GamePlayStatus;
  position?: number;
}

const GameRow = ({ title, artworkUrl, achievementsUnlocked, achievementsTotal, status, position }: GameRowProps) => {
  const showAchievements =
    typeof achievementsTotal === "number" && achievementsTotal > 0 && typeof achievementsUnlocked === "number";

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
          {artworkUrl ? (
            <img src={artworkUrl} alt={`${title} cover art`} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-foreground/60">
              {position ?? ""}
            </div>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium leading-tight">{title}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{status.replace("_", " ")}</span>
          {showAchievements ? (
            <span className={cn("text-xs text-foreground/70")}>
              {achievementsUnlocked} / {achievementsTotal} achievements
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default GameRow;
