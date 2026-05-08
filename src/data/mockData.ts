import {
  Member,
  Membership,
  Payment,
  Attendance,
  Enquiry,
  Trainer,
  GymInfo,
  DashboardWidget,
  TrainerAttendance,
  FeeStructure,
} from "@/types/gym";

// Gym Information
export const gymInfo: GymInfo = {
  name: "Hardcore Fitness Gym",
  address: "123 Fitness Street, Health City, HC 12345",
  phone: "+1 (555) 123-4567",
  email: "info@hardcorefitnessgym.com",
  timings: "Mon-Sat: 5:00 AM - 10:00 PM | Sun: 6:00 AM - 8:00 PM",
  welcomeMessage:
    "Welcome to Hardcore Fitness Gym! Your journey to fitness starts here. We're committed to helping you achieve your health and fitness goals.",
};

// Mock Trainers
export const mockTrainers: Trainer[] = [
  { trainerId: "TR001", name: "John Smith", phone: "+1 555-0101", specialization: "Strength Training", isActive: true },
  { trainerId: "TR002", name: "Sarah Johnson", phone: "+1 555-0102", specialization: "Cardio & HIIT", isActive: true },
  {
    trainerId: "TR003",
    name: "Mike Davis",
    phone: "+1 555-0103",
    specialization: "Yoga & Flexibility",
    isActive: true,
  },
  { trainerId: "TR004", name: "Emily Brown", phone: "+1 555-0104", specialization: "CrossFit", isActive: false },
];

// Mock Members
export const mockMembers: Member[] = [
  {
    memberId: "MEM001",
    name: "Alex Thompson",
    phone: "+1 555-1001",
    dob: "1990-05-15",
    address: "456 Oak Street, Health City",
    status: "active",
    hasPersonalTrainer: true,
    assignedTrainerId: "TR001",
    createdAt: "2024-01-15",
  },
  {
    memberId: "MEM002",
    name: "Jessica Martinez",
    phone: "+1 555-1002",
    dob: "1988-01-07",
    address: "789 Pine Avenue, Health City",
    status: "expiring",
    hasPersonalTrainer: false,
    createdAt: "2024-02-20",
  },
  {
    memberId: "MEM003",
    name: "David Wilson",
    phone: "+1 555-1003",
    dob: "1995-08-22",
    address: "321 Elm Road, Health City",
    status: "expired",
    hasPersonalTrainer: true,
    assignedTrainerId: "TR002",
    createdAt: "2023-11-10",
  },
  {
    memberId: "MEM004",
    name: "Amanda Lee",
    phone: "+1 555-1004",
    dob: "1992-03-30",
    address: "654 Maple Drive, Health City",
    status: "active",
    hasPersonalTrainer: false,
    createdAt: "2024-03-05",
  },
  {
    memberId: "MEM005",
    name: "Robert Garcia",
    phone: "+1 555-1005",
    dob: "1985-12-18",
    address: "987 Cedar Lane, Health City",
    status: "cancelled",
    hasPersonalTrainer: false,
    createdAt: "2023-09-01",
  },
];

// Mock Memberships
export const mockMemberships: Membership[] = [
  {
    id: "MS001",
    memberId: "MEM001",
    startDate: "2024-12-01",
    endDate: "2025-06-01",
    duration: 6,
    status: "active",
    totalFees: 6000,
    paid: 6000,
    pending: 0,
  },
  {
    id: "MS002",
    memberId: "MEM002",
    startDate: "2024-10-15",
    endDate: "2025-01-15",
    duration: 3,
    status: "active",
    totalFees: 3000,
    paid: 2000,
    pending: 1000,
  },
  {
    id: "MS003",
    memberId: "MEM003",
    startDate: "2024-06-01",
    endDate: "2024-12-01",
    duration: 6,
    status: "expired",
    totalFees: 6000,
    paid: 4000,
    pending: 2000,
  },
  {
    id: "MS004",
    memberId: "MEM004",
    startDate: "2024-12-05",
    endDate: "2025-12-05",
    duration: 12,
    status: "active",
    totalFees: 10000,
    paid: 10000,
    pending: 0,
  },
];

// Mock Payments
export const mockPayments: Payment[] = [
  {
    id: "PAY001",
    memberId: "MEM001",
    membershipId: "MS001",
    totalFees: 6000,
    discount: 500,
    paid: 6000,
    pending: 0,
    paymentMode: "upi",
    receiptId: "RCP001",
    paymentDate: "2024-12-01",
  },
  {
    id: "PAY002",
    memberId: "MEM002",
    membershipId: "MS002",
    totalFees: 3000,
    discount: 0,
    paid: 2000,
    pending: 1000,
    paymentMode: "cash",
    receiptId: "RCP002",
    paymentDate: "2024-10-15",
    dueDate: "2024-11-15",
  },
];

// Mock Attendance
export const mockAttendance: Attendance[] = [
  { id: "ATT001", memberId: "MEM001", date: "2025-01-07", status: "present", checkInTime: "06:30" },
  { id: "ATT002", memberId: "MEM004", date: "2025-01-07", status: "present", checkInTime: "07:15" },
  { id: "ATT003", memberId: "MEM001", date: "2025-01-06", status: "present", checkInTime: "06:45" },
  { id: "ATT004", memberId: "MEM002", date: "2025-01-06", status: "present", checkInTime: "08:00" },
  { id: "ATT005", memberId: "MEM004", date: "2025-01-06", status: "present", checkInTime: "07:30" },
];

// Mock Trainer Attendance
export const mockTrainerAttendance: TrainerAttendance[] = [
  {
    id: "TAT001",
    trainerId: "TR001",
    date: "2025-01-17",
    checkInTime: "05:30",
    checkOutTime: "14:00",
    status: "present",
  },
  {
    id: "TAT002",
    trainerId: "TR002",
    date: "2025-01-17",
    checkInTime: "06:00",
    checkOutTime: "15:00",
    status: "present",
  },
  { id: "TAT003", trainerId: "TR003", date: "2025-01-17", checkInTime: "08:00", status: "present" },
  {
    id: "TAT004",
    trainerId: "TR001",
    date: "2025-01-16",
    checkInTime: "05:45",
    checkOutTime: "14:30",
    status: "present",
  },
  {
    id: "TAT005",
    trainerId: "TR002",
    date: "2025-01-16",
    checkInTime: "06:15",
    checkOutTime: "15:15",
    status: "present",
  },
];

// Mock Enquiries
export const mockEnquiries: Enquiry[] = [
  {
    id: "ENQ001",
    name: "Michael Scott",
    phone: "+1 555-2001",
    visitDate: "2025-01-17",
    notes: "Interested in 6-month membership with personal training",
    referralSource: "Google Search",
    createdAt: "2025-01-17",
  },
  {
    id: "ENQ002",
    name: "Pam Beesly",
    phone: "+1 555-2002",
    visitDate: "2025-01-16",
    notes: "Looking for yoga classes",
    referralSource: "Friend Referral",
    createdAt: "2025-01-16",
  },
  {
    id: "ENQ003",
    name: "Jim Halpert",
    phone: "+1 555-2003",
    visitDate: "2025-01-15",
    referralSource: "Instagram",
    createdAt: "2025-01-15",
  },
];

// Dashboard Widgets Data
export const getDashboardWidgets = (): DashboardWidget[] => [
  {
    id: "pending-fees",
    title: "Pending Fees",
    count: mockMemberships.filter((m) => m.pending > 0).length,
    color: "destructive",
    icon: "DollarSign",
    route: "/members?filter=pending-fees",
  },
  {
    id: "expiring-soon",
    title: "Expiring Soon",
    count: mockMembers.filter((m) => m.status === "expiring").length,
    color: "warning",
    icon: "Clock",
    route: "/members?filter=expiring",
  },
  {
    id: "expired",
    title: "Subscription Expired",
    count: mockMembers.filter((m) => m.status === "expired").length,
    color: "destructive",
    icon: "AlertCircle",
    route: "/members?filter=expired",
  },
  {
    id: "birthdays",
    title: "Today's Birthdays",
    count: mockMembers.filter((m) => {
      const today = new Date();
      const dob = new Date(m.dob);
      return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
    }).length,
    color: "primary",
    icon: "Cake",
    route: "/members?filter=birthdays",
  },
  {
    id: "absent-today",
    title: "Absent Today",
    count:
      mockMembers.filter((m) => m.status === "active").length -
      mockAttendance.filter((a) => a.date === new Date().toISOString().split("T")[0] && a.status === "present").length,
    color: "warning",
    icon: "UserX",
    route: "/attendance?filter=absent",
  },
  {
    id: "enquiries-today",
    title: "Today's Enquiries",
    count: mockEnquiries.filter((e) => e.visitDate === new Date().toISOString().split("T")[0]).length,
    color: "primary",
    icon: "MessageSquare",
    route: "/enquiry",
  },
  {
    id: "active",
    title: "Active Members",
    count: mockMembers.filter((m) => m.status === "active").length,
    color: "success",
    icon: "Users",
    route: "/members?filter=active",
  },
  {
    id: "cancelled",
    title: "Cancelled Members",
    count: mockMembers.filter((m) => m.status === "cancelled").length,
    color: "muted",
    icon: "UserMinus",
    route: "/members?filter=cancelled",
  },
];

// Helper function to generate member ID
export const generateMemberId = (): string => {
  const count = mockMembers.length + 1;
  return `MEM${count.toString().padStart(3, "0")}`;
};

// Helper function to calculate end date (safely handles month-end overflow)
export const calculateEndDate = (startDate: string, durationMonths: number): string => {
  const [year, month, day] = startDate.split('-').map(Number);
  const totalMonths = (year * 12 + (month - 1)) + durationMonths;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
  const targetDay = Math.min(day, lastDayOfMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
};

// Membership pricing (base prices)
export const membershipPricing: Record<number, number> = {
  1: 1000,
  3: 2700,
  6: 5000,
  12: 9000,
};

// Fee Structure with offers
export const feeStructure: FeeStructure[] = [
  { duration: 1, basePrice: 1000, isOfferActive: false },
  { duration: 3, basePrice: 2700, isOfferActive: false },
  { duration: 6, basePrice: 5000, offerPrice: 4500, offerName: "Summer Special", isOfferActive: true },
  { duration: 12, basePrice: 9000, offerPrice: 7500, offerName: "Annual Discount", isOfferActive: true },
];

// Helper to get current price based on fee structure
export const getCurrentPrice = (duration: number): number => {
  const fee = feeStructure.find((f) => f.duration === duration);
  if (fee && fee.isOfferActive && fee.offerPrice) {
    return fee.offerPrice;
  }
  return membershipPricing[duration] || 0;
};
