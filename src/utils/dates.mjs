// A tour's dates (startFrom, startUntil) are calendar days, 'YYYY-MM-DD',
// read on the server in each user's own time zone (TourSchedule). In the
// browser they become a local Date at midnight and back, never through UTC,
// which would move a day across the date line.

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * @param {string} iso 'YYYY-MM-DD', or '' for none
 * @return {Date|null} Local midnight of that day
 */
export function isoToDate(iso) {
  const match = typeof iso === 'string' ? iso.match(ISO_DATE) : null
  if (!match) {
    return null
  }
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  // 2026-02-30 is not a day
  return date.getMonth() === Number(match[2]) - 1 ? date : null
}

/**
 * @param {Date|null} date A day, as the date picker gives it
 * @return {string} 'YYYY-MM-DD', or '' for none
 */
export function dateToIso(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return ''
  }
  const pad = (number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
