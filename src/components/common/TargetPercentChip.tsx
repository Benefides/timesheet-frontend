import { Chip, Tooltip } from '@mui/material';
import { formatMinutes } from '../../lib/duration';
import { WEEKLY_TARGET_MINUTES, progressAgainst } from '../../lib/weeklyTarget';

interface TargetPercentChipProps {
  loggedMinutes: number;
  /** Defaults to the weekly target. */
  targetMinutes?: number;
}

/** Share of a target as a chip: amber while short, green once met. */
export default function TargetPercentChip({
  loggedMinutes,
  targetMinutes = WEEKLY_TARGET_MINUTES,
}: TargetPercentChipProps) {
  const p = progressAgainst(loggedMinutes, targetMinutes);
  const of = `${formatMinutes(loggedMinutes)} of ${formatMinutes(targetMinutes)}`;
  return (
    <Tooltip
      title={
        p.remainingMinutes
          ? `${of} — ${formatMinutes(p.remainingMinutes)} short`
          : p.overMinutes ? `${of} — ${formatMinutes(p.overMinutes)} over` : `${of} — target met`
      }
    >
      <Chip
        size="small"
        variant="outlined"
        label={`${p.percent}%`}
        color={p.remainingMinutes ? 'warning' : 'success'}
      />
    </Tooltip>
  );
}
