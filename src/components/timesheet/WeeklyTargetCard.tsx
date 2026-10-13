import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import { formatMinutes } from '../../lib/duration';
import { WEEKLY_TARGET_HOURS, WEEKLY_TARGET_MINUTES, weekProgress } from '../../lib/weeklyTarget';

interface WeeklyTargetCardProps {
  /** Time already recorded this week. */
  loggedMinutes: number;
  /** The entry being typed, previewed before it is added. */
  pendingMinutes?: number;
}

/**
 * Progress towards the weekly target. While an entry is being typed, the
 * remaining time and percentage show what they will be once it is added.
 */
export default function WeeklyTargetCard({ loggedMinutes, pendingMinutes = 0 }: WeeklyTargetCardProps) {
  const now = weekProgress(loggedMinutes);
  const after = weekProgress(loggedMinutes + Math.max(pendingMinutes, 0));
  const previewing = after.loggedMinutes !== now.loggedMinutes;
  const shown = previewing ? after : now;

  const bar = (m: number) => Math.min((m / WEEKLY_TARGET_MINUTES) * 100, 100);
  const met = shown.remainingMinutes === 0;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'flex-end' }}
        spacing={1}
        sx={{ mb: 1.5 }}
      >
        <Box>
          <Typography variant="caption" color="text.secondary">
            Weekly target · {WEEKLY_TARGET_HOURS}h
          </Typography>
          <Typography variant="h6">
            {formatMinutes(shown.loggedMinutes)} logged{' '}
            <Typography component="span" color={met ? 'success.main' : 'primary.main'} fontWeight={600}>
              ({shown.percent}%)
            </Typography>
          </Typography>
        </Box>
        <Box sx={{ textAlign: { sm: 'right' } }}>
          <Typography variant="caption" color="text.secondary">
            {met ? (shown.overMinutes ? 'Over target' : 'Target met') : 'Remaining'}
          </Typography>
          <Typography variant="h6" color={met ? 'success.main' : 'text.primary'}>
            {met
              ? shown.overMinutes ? `+${formatMinutes(shown.overMinutes)}` : '0h'
              : formatMinutes(shown.remainingMinutes)}
          </Typography>
        </Box>
      </Stack>

      <LinearProgress
        variant="buffer"
        value={bar(now.loggedMinutes)}
        valueBuffer={bar(after.loggedMinutes)}
        color={met ? 'success' : 'primary'}
        sx={{ height: 10, borderRadius: 5, '& .MuiLinearProgress-dashed': { display: 'none' } }}
      />

      {previewing && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Including the {formatMinutes(after.loggedMinutes - now.loggedMinutes)} you’re adding —
          currently {formatMinutes(now.loggedMinutes)} ({now.percent}%),{' '}
          {now.remainingMinutes ? `${formatMinutes(now.remainingMinutes)} remaining` : 'target met'}.
        </Typography>
      )}
    </Paper>
  );
}
