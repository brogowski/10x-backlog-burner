import type { GamePlayStatus } from "@/types";

export interface GameRowProps {
  steamAppId: number;
  title: string;
  lastUpdatedAt: string;
  importedAt: string;
  achievementsUnlocked?: number | null;
  achievementsTotal?: number | null;
  status: GamePlayStatus;
  slug: string;
}

const formatDate = (value: string) => {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toLocaleDateString();
};

const GameRow = ({ title, lastUpdatedAt, achievementsUnlocked, achievementsTotal, slug }: GameRowProps) => {
  const updatedLabel = formatDate(lastUpdatedAt);
  const hasAchievements = achievementsUnlocked != null && achievementsUnlocked >= 0;

  return (
    <div className="flex flex-col gap-1">
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{slug}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-foreground/70">
        {updatedLabel ? <span>Updated {updatedLabel}</span> : null}
        {hasAchievements ? (
          <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-medium text-foreground">
            {achievementsTotal && achievementsTotal > 0
              ? `${achievementsUnlocked} / ${achievementsTotal} achievements`
              : `${achievementsUnlocked} achievements unlocked`}
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default GameRow;
