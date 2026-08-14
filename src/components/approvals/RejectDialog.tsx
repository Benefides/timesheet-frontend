import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography,
} from '@mui/material';
import type { PendingItem } from '../../lib/types';

interface RejectDialogProps {
  open: boolean;
  item: PendingItem | null;
  comment: string;
  onCommentChange: (comment: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function RejectDialog({
  open,
  item,
  comment,
  onCommentChange,
  onClose,
  onConfirm,
  isPending,
}: RejectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reject {item?.user.displayName}'s week</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tell them what needs to change — a comment is required, and the week returns to them to fix.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          label="Reason"
          value={comment}
          onChange={(e) => onCommentChange(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="error"
          variant="contained"
          disabled={!comment.trim() || isPending}
          onClick={onConfirm}
        >
          Reject week
        </Button>
      </DialogActions>
    </Dialog>
  );
}
