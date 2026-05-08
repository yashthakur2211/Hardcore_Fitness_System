// Member status types
export type MemberStatus = 'active' | 'expired' | 'expiring' | 'cancelled' | 'inactive';

// Membership duration options
export type MembershipDuration = 1 | 3 | 6 | 12;

// Payment modes
export type PaymentMode = 'cash' | 'upi' | 'cheque';

// Member interface
export interface Member {
  memberId: string;
  name: string;
  phone: string;
  dob: string;
  address: string;
  photo?: string;
  status: MemberStatus;
  hasPersonalTrainer: boolean;
  assignedTrainerId?: string;
  createdAt: string;
}

// Membership interface
export interface Membership {
  id: string;
  memberId: string;
  startDate: string;
  endDate: string;
  duration: MembershipDuration;
  status: 'active' | 'expired';
  totalFees: number;
  paid: number;
  pending: number;
}

// Payment interface
export interface Payment {
  id: string;
  memberId: string;
  membershipId: string;
  totalFees: number;
  discount: number;
  paid: number;
  pending: number;
  paymentMode: PaymentMode;
  receiptId: string;
  paymentDate: string;
  dueDate?: string;
}

// Attendance interface
export interface Attendance {
  id: string;
  memberId: string;
  date: string;
  status: 'present' | 'absent';
  checkInTime?: string;
}

// Trainer Attendance interface
export interface TrainerAttendance {
  id: string;
  trainerId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'present' | 'absent';
}

// Enquiry interface
export interface Enquiry {
  id: string;
  name: string;
  phone: string;
  visitDate: string;
  notes?: string;
  referralSource?: string;
  createdAt: string;
}

// Trainer interface
export interface Trainer {
  trainerId: string;
  name: string;
  phone: string;
  specialization: string;
  isActive: boolean;
}

// Dashboard widget types
export interface DashboardWidget {
  id: string;
  title: string;
  count: number;
  color: 'success' | 'warning' | 'destructive' | 'primary' | 'muted';
  icon: string;
  route: string;
}

// Gym info interface
export interface GymInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  timings: string;
  welcomeMessage: string;
}

// Fee Structure interface
export interface FeeStructure {
  duration: number;
  basePrice: number;
  offerPrice?: number;
  offerName?: string;
  isOfferActive: boolean;
  ptBasePrice: number;
  ptOfferPrice?: number;
  ptOfferName?: string;
  isPtOfferActive: boolean;
}
