import { Typography } from '@mui/material';

/** An entry's SO number with its Odoo customer underneath, or a dash. */
export default function SalesOrderCell({ number, customer }: { number?: string | null; customer?: string | null }) {
  if (!number) return <>—</>;
  return (
    <>
      <Typography component="span" variant="body2" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
        {number}
      </Typography>
      {customer && (
        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          {customer}
        </Typography>
      )}
    </>
  );
}
