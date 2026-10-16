import { useEffect, useState } from 'react';
import { Autocomplete, Box, Chip, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { SalesOrderOption } from '../../lib/types';

interface SalesOrderFieldProps {
  value: string;
  onChange: (value: string) => void;
  /** The SO and customer already saved on the entry being edited, if any. */
  saved?: { number?: string | null; customer?: string | null };
}

/** Odoo's sale.order states in the words people use. */
const STATE_LABEL: Record<string, string> = {
  draft: 'Quotation',
  sent: 'Quotation sent',
  sale: 'Sales order',
  done: 'Locked',
};

/**
 * Sales order (SO) number for an entry, searched by number or customer in the
 * orders synced from Odoo. It decides billing: time booked to an SO is
 * billable, time without one is not — the chip says which as you type. A
 * number Odoo doesn't list can still be typed; it is saved as typed. The
 * customer underneath follows the SO and can't be edited.
 */
export default function SalesOrderField({ value, onChange, saved }: SalesOrderFieldProps) {
  // Search a moment after typing stops, not on every keystroke.
  const [query, setQuery] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setQuery(value.trim()), 250);
    return () => clearTimeout(t);
  }, [value]);

  const search = useQuery<{ configured: boolean; orders: SalesOrderOption[] }>({
    queryKey: ['sales-orders', query],
    queryFn: async () => (await api.get('/sales-orders', { params: { q: query } })).data,
    staleTime: 60_000,
    placeholderData: (prev) => prev, // keep the last list while the next loads
  });

  const orders = search.data?.orders ?? [];
  const typed = value.trim();
  const match = orders.find((o) => o.number.toLowerCase() === typed.toLowerCase());
  const known = !!match;
  // Until the search confirms it, an unchanged SO keeps the customer it was saved with.
  const unchanged = !!typed && typed.toLowerCase() === (saved?.number ?? '').toLowerCase();
  const customer = match?.customerName ?? (unchanged ? saved?.customer ?? '' : '');
  const billable = typed !== '';

  let helper = 'Search by SO number or customer. Leave blank for non-billable time.';
  if (typed && search.data?.configured && !known && !search.isFetching) {
    // Matches showing = still searching (perhaps by customer); none = a number Odoo lacks.
    helper = orders.length
      ? 'Pick a sales order from the list, or keep typing to narrow it down.'
      : 'Not found in Odoo. It will be saved as typed, without a customer.';
  }

  return (
    <>
      <Autocomplete<SalesOrderOption, false, false, true>
        freeSolo
        options={orders}
        inputValue={value}
        onInputChange={(_, text) => onChange(text)}
        onChange={(_, picked) => onChange(typeof picked === 'string' ? picked : picked?.number ?? '')}
        // The server already filtered by number and customer.
        filterOptions={(opts) => opts}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.number)}
        isOptionEqualToValue={(a, b) => a.number === b.number}
        loading={search.isFetching}
        noOptionsText={search.data?.configured ? 'No matching sales orders' : 'Type the SO number'}
        renderOption={(props, o) => (
          <Box component="li" {...props} key={o.number}>
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace' }}>
                  {o.number}
                </Typography>
                <Chip size="small" variant="outlined" label={STATE_LABEL[o.state] ?? o.state} />
              </Stack>
              <Typography variant="caption" color="text.secondary" noWrap>
                {o.customerName ?? 'No customer'}
              </Typography>
            </Stack>
          </Box>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Sales order (SO) number"
            size="small"
            inputProps={{ ...params.inputProps, maxLength: 50 }}
            helperText={helper}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  <InputAdornment position="end">
                    <Chip
                      size="small"
                      variant="outlined"
                      label={billable ? 'Billable' : 'Non-billable'}
                      color={billable ? 'success' : 'default'}
                    />
                  </InputAdornment>
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <TextField
        label="Customer"
        size="small"
        value={customer}
        placeholder={typed ? 'No customer for this SO' : 'Comes with the SO number'}
        InputLabelProps={{ shrink: true }}
        InputProps={{ readOnly: true }}
        helperText="Filled in from Odoo when you pick a sales order."
      />
    </>
  );
}
