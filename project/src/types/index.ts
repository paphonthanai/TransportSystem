export interface Booking {
  id: string
  date: string
  customer: string
  goods: string
  origin: string
  destination: string
  price: number
  status: 'draft' | 'pending' | 'assigned' | 'in-transit' | 'completed' | 'cancelled'
  shipNo?: string
  owner?: string
  createdAt: Date
  updatedAt: Date
}

export interface Job {
  id: string
  bookingId: string
  driver: string
  vehicle: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  startTime?: Date
  endTime?: Date
  progress: number
}

export interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  contact?: string
  totalJobs: number
  totalAmount: number
  status: 'active' | 'inactive'
}

export interface Driver {
  id: string
  name: string
  phone: string
  code?: string
  vehicle?: string
  status: 'available' | 'busy' | 'off-duty' | 'inactive'
  totalTrips: number
  monthlyIncome: number
  rating: number
}

export interface Vehicle {
  id: string
  plate: string
  type: string
  capacity: number
  driver?: string
  status: 'available' | 'in-use' | 'maintenance' | 'inactive'
  taxExpiry?: Date
  insuranceExpiry?: Date
}

export interface Workflow {
  id: string
  jobId: string
  stages: WorkflowStage[]
  currentStage: number
}

export interface WorkflowStage {
  id: string
  name: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  timestamp?: Date
  notes?: string
}

export interface Document {
  id: string
  number: string
  type: 'quote' | 'invoice' | 'receipt' | 'shipment'
  jobId: string
  customer: string
  date: Date
  amount: number
}

export interface Bill {
  id: string
  number: string
  customer: string
  jobId: string
  date: Date
  dueDate: Date
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
}

export interface DriverIncome {
  id: string
  driver: string
  period: string
  trips: number
  baseIncome: number
  bonus: number
  penalty: number
  netIncome: number
  paymentStatus: 'pending' | 'paid' | 'overdue'
}

export interface KPI {
  label: string
  value: string | number
  icon: string
  color: string
  soft: string
  delta: string
  deltaIcon: string
  deltaColor: string
  deltaNote: string
}

export interface DashboardStats {
  totalRevenue: number
  totalTrips: number
  activeTrips: number
  efficiency: number
}
