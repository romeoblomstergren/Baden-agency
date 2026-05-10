export const OP_TYPES = [
  { code: 'OPA', label: 'Owners Protective Agent' },
  { code: 'BOC', label: 'Bunkers Only Call' },
  { code: 'HUS', label: 'Husbandry Services' },
  { code: 'PAG', label: 'Port Agency' },
  { code: 'BRO', label: 'Brokerage' },
  { code: 'TRA', label: 'Suez Canal Transit' },
  { code: 'MAR', label: 'Marine Services' },
  { code: 'ENQ', label: 'Enquiry / Other' },
]

export const OP_COLORS = {
  OPA: '#1B2A4A', BOC: '#2E5090', HUS: '#1A5E38',
  PAG: '#7B3F00', BRO: '#5C3566', TRA: '#B5510A',
  MAR: '#1A4A6B', ENQ: '#7F3F3F',
}

export const VESSEL_STATUSES = ['Underway', 'At Anchorage', 'Alongside', 'Sailed']
export const ENTRY_STATUSES  = ['Open', 'Closed', 'Pending', 'Disputed', 'Partial', 'Cancelled']
export const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
export const CURRENT_YEAR = new Date().getFullYear()

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB')
}

export function formatMoney(val, currency = 'EUR') {
  if (val == null) return '—'
  const sym = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€'
  return sym + Number(val).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
