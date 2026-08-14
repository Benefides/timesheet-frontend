import { Button, IconButton, Stack } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

interface WeekNavigationProps {
  offset: number;
  onOffsetChange: (offset: number) => void;
}

export default function WeekNavigation({ offset, onOffsetChange }: WeekNavigationProps) {
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <IconButton onClick={() => onOffsetChange(offset - 1)}>
        <ChevronLeftIcon />
      </IconButton>
      <Button size="small" onClick={() => onOffsetChange(0)} disabled={offset === 0}>
        This week
      </Button>
      <IconButton onClick={() => onOffsetChange(offset + 1)}>
        <ChevronRightIcon />
      </IconButton>
    </Stack>
  );
}
