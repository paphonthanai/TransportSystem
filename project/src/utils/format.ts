import { format, parseISO } from 'date-fns'
import { th } from 'date-fns/locale'

/**
 * Format currency to Thai Baht
 */
export const formatCurrency = (amount: number): string => {
  return `฿${amount.toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Format date to Thai locale
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'd MMM yyyy', { locale: th })
}

/**
 * Format date to Thai full date
 */
export const formatDateFull = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'EEEE d MMMM yyyy', { locale: th })
}

/**
 * Format time
 */
export const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm', { locale: th })
}

/**
 * Format number as thousands separator
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString('th-TH')
}

/**
 * Calculate driver income based on rate type
 */
export const calculateIncome = (
  rateType: 'ton' | 'trip' | 'piece',
  rate: number,
  quantity: number,
  weight?: number
): number => {
  switch (rateType) {
    case 'ton':
      return (weight || 0) * rate
    case 'trip':
      return rate
    case 'piece':
      return quantity * rate
    default:
      return 0
  }
}

/**
 * Calculate total driver pay with bonuses and penalties
 */
export const calculateDriverPay = (
  baseIncome: number,
  fuelCost: number,
  perDiem: number,
  bonus: number = 0,
  penalty: number = 0
): number => {
  return baseIncome + fuelCost + perDiem + bonus - penalty
}

/**
 * Generate unique booking ID
 */
export const generateBookingId = (): string => {
  const year = new Date().getFullYear() + 543 // Thai Buddha year
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const random = String(Math.floor(Math.random() * 10000)).padStart(5, '0')
  return `BK-${year}-${month}-${random}`
}

/**
 * Get status badge color
 */
export const getStatusColor = (
  status: string
): { bg: string; text: string } => {
  const colors: Record<string, { bg: string; text: string }> = {
    draft: { bg: '#f1f5f9', text: '#64748b' },
    pending: { bg: '#fef3c7', text: '#d97706' },
    assigned: { bg: '#dbeafe', text: '#0284c7' },
    'in-transit': { bg: '#dbeafe', text: '#2563eb' },
    'in-progress': { bg: '#dbeafe', text: '#2563eb' },
    completed: { bg: '#dcfce7', text: '#16a34a' },
    success: { bg: '#dcfce7', text: '#16a34a' },
    failed: { bg: '#fee2e2', text: '#dc2626' },
    cancelled: { bg: '#fee2e2', text: '#dc2626' },
    active: { bg: '#dcfce7', text: '#16a34a' },
    inactive: { bg: '#f1f5f9', text: '#64748b' },
    available: { bg: '#dcfce7', text: '#16a34a' },
    busy: { bg: '#fef3c7', text: '#d97706' },
    'off-duty': { bg: '#f1f5f9', text: '#64748b' },
  }
  return colors[status] || colors.draft
}

/**
 * Get role label in Thai
 */
export const getRoleLabel = (role: string): string => {
  const labels: Record<string, string> = {
    admin: 'ผู้ดูแลระบบ',
    manager: 'ผู้จัดการ',
    dispatcher: 'ผู้ส่งงาน',
    driver: 'คนขับ',
  }
  return labels[role] || role
}

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
) => {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}
