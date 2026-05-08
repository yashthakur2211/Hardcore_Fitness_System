import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reportsAPI } from '@/lib/api';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  UserCheck,
  Calendar,
  CreditCard,
  Wallet,
  Banknote,
  Target,
  Activity,
  Clock,
  Award,
  PieChart as PieChartIcon,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  User,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart,
} from 'recharts';
import { format } from 'date-fns';

type PeriodType = 'daily' | 'monthly' | 'yearly' | 'custom';

const COLORS = {
  primary: 'hsl(24, 95%, 53%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(38, 92%, 50%)',
  info: 'hsl(221, 83%, 53%)',
  purple: 'hsl(262, 83%, 58%)',
  pink: 'hsl(330, 81%, 60%)',
};

const MEMBERSHIP_COLORS = [
  COLORS.primary, COLORS.success, COLORS.info, COLORS.purple, COLORS.warning, COLORS.pink,
];

const PAYMENT_MODE_COLORS: Record<string, string> = {
  cash: COLORS.success, upi: COLORS.info, cheque: COLORS.warning,
};

// ─── Member Drill-down Dialog ───────────────────────────────────────────────
type DrillStatus = 'active' | 'expired' | 'expiring' | 'cancelled' | null;

function MemberDrillDialog({
  status,
  onClose,
}: {
  status: DrillStatus;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['report-members-by-status', status],
    queryFn: () => reportsAPI.getMembersByStatus(status!),
    enabled: !!status,
  });

  const filtered = members.filter((m: any) =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.memberId?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  );

  const statusLabel: Record<string, string> = {
    active: 'Active Members',
    expired: 'Expired Members',
    expiring: 'Expiring Soon',
    cancelled: 'Cancelled Members',
  };

  const statusIcon: Record<string, JSX.Element> = {
    active: <CheckCircle2 className="h-5 w-5 text-success" />,
    expired: <XCircle className="h-5 w-5 text-destructive" />,
    expiring: <AlertCircle className="h-5 w-5 text-warning" />,
    cancelled: <XCircle className="h-5 w-5 text-muted-foreground" />,
  };

  return (
    <Dialog open={!!status} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status && statusIcon[status]}
            {status ? statusLabel[status] : ''} ({filtered.length})
          </DialogTitle>
        </DialogHeader>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, ID or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((member: any) => (
                <div
                  key={member.memberId}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.memberId} · {member.phone}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    {member.endDate && (
                      <p>Ends: {format(new Date(member.endDate), 'dd MMM yyyy')}</p>
                    )}
                    {member.daysLeft !== undefined && (
                      <p className="text-warning font-medium">{member.daysLeft}d left</p>
                    )}
                    {member.totalPending !== undefined && (
                      <p className="text-destructive font-medium">Due: ₹{member.totalPending}</p>
                    )}
                    {member.duration && (
                      <p>{member.duration === 1 ? '1 Month' : `${member.duration} Months`}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ReportsPage ────────────────────────────────────────────────────────
const ReportsPage = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drill-down state
  const [drillStatus, setDrillStatus] = useState<DrillStatus>(null);

  // Payment by Date state
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentDateQueried, setPaymentDateQueried] = useState(todayStr);

  // Payment Range state
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [rangeQueried, setRangeQueried] = useState<{ start: string; end: string } | null>(null);

  // Audit state
  const [auditStart, setAuditStart] = useState('');
  const [auditEnd, setAuditEnd] = useState('');
  const [auditQueried, setAuditQueried] = useState<{ start?: string; end?: string }>({});

  const { data: overview, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: () => reportsAPI.getOverview(),
    refetchOnWindowFocus: false,
  });

  const { data: revenueData = [] } = useQuery({
    queryKey: ['reports-revenue', period, selectedYear, selectedMonth, startDate, endDate],
    queryFn: () => reportsAPI.getRevenue({
      period,
      year: selectedYear,
      month: period === 'daily' ? selectedMonth : undefined,
      startDate: period === 'custom' ? startDate : undefined,
      endDate: period === 'custom' ? endDate : undefined,
    }),
    enabled: period !== 'custom' || (!!startDate && !!endDate),
  });

  const { data: availableYears = [currentYear] } = useQuery({
    queryKey: ['reports-years'],
    queryFn: () => reportsAPI.getYears(),
  });

  // Payment by date query
  const { data: paymentsByDate, isLoading: loadingPaymentDate, refetch: refetchPaymentDate } = useQuery({
    queryKey: ['reports-payments-by-date', paymentDateQueried],
    queryFn: () => reportsAPI.getPaymentsByDate(paymentDateQueried),
    enabled: !!paymentDateQueried,
  });

  // Payment range query
  const { data: paymentsRange, isLoading: loadingRange, refetch: refetchRange } = useQuery({
    queryKey: ['reports-payments-range', rangeQueried],
    queryFn: () => reportsAPI.getPaymentsRange(rangeQueried!.start, rangeQueried!.end),
    enabled: !!rangeQueried,
  });

  // Audit query
  const { data: auditReport, isLoading: loadingAudit, refetch: refetchAudit } = useQuery({
    queryKey: ['reports-audit', auditQueried],
    queryFn: () => reportsAPI.getAuditReport(auditQueried.start, auditQueried.end),
    refetchOnWindowFocus: false,
  });

  const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const revenue = overview?.revenue || {};
  const members = overview?.members || {};
  const attendance = overview?.attendance || {};
  const paymentModes = overview?.paymentModes || [];
  const membershipDistribution = overview?.membershipDistribution || [];
  const trends = overview?.trends || {};
  const topMembers = overview?.topMembers || [];

  const membershipChartData = membershipDistribution.map((md: any, index: number) => ({
    ...md, fill: MEMBERSHIP_COLORS[index % MEMBERSHIP_COLORS.length],
  }));

  const paymentModeChartData = paymentModes.map((pm: any) => ({
    ...pm,
    name: pm.mode.charAt(0).toUpperCase() + pm.mode.slice(1),
    fill: PAYMENT_MODE_COLORS[pm.mode] || COLORS.primary,
  }));

  const memberStatusData = [
    { name: 'Active', value: members.active || 0, fill: COLORS.success },
    { name: 'Expiring', value: members.expiring || 0, fill: COLORS.warning },
    { name: 'Expired', value: members.expired || 0, fill: '#ef4444' },
    { name: 'Cancelled', value: members.cancelled || 0, fill: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Business Reports & Analytics
            </h1>
            <p className="text-muted-foreground mt-1">Comprehensive insights for your gym business</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Revenue Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden border-0 shadow-lg group h-40">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop)' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-orange-600/90 via-orange-500/85 to-amber-500/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <CardContent className="relative z-10 h-full flex flex-col justify-between py-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                  <ArrowUpRight className="h-3 w-3 mr-1" />All Time
                </Badge>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Total Revenue</p>
                <p className="text-3xl font-bold text-white drop-shadow-lg">{formatCurrency(revenue.total || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg group h-40">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=300&fit=crop)' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 via-green-500/85 to-teal-500/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <CardContent className="relative z-10 h-full flex flex-col justify-between py-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <span className="text-white/80 text-xs bg-white/15 px-2 py-1 rounded-full backdrop-blur-sm">
                  Avg: {formatCurrency(revenue.avgDaily || 0)}/day
                </span>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Today's Revenue</p>
                <p className="text-3xl font-bold text-white drop-shadow-lg">{formatCurrency(revenue.today || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg group h-40">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop)' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-indigo-500/85 to-purple-500/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <CardContent className="relative z-10 h-full flex flex-col justify-between py-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                  <Calendar className="h-3 w-3 mr-1" />{format(new Date(), 'MMMM')}
                </Badge>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">This Month</p>
                <p className="text-3xl font-bold text-white drop-shadow-lg">{formatCurrency(revenue.thisMonth || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-0 shadow-lg group h-40">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400&h=300&fit=crop)' }} />
            <div className="absolute inset-0 bg-gradient-to-br from-amber-600/90 via-yellow-500/85 to-orange-500/80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <CardContent className="relative z-10 h-full flex flex-col justify-between py-5">
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm text-xs">
                  <Clock className="h-3 w-3 mr-1" />To Collect
                </Badge>
              </div>
              <div>
                <p className="text-white/80 text-sm font-medium">Pending Fees</p>
                <p className="text-3xl font-bold text-white drop-shadow-lg">{formatCurrency(revenue.pending || 0)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Member Stats Row — CLICKABLE for drill-down */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Total Members', value: members.total || 0, icon: Users, color: 'primary', status: null },
            { label: 'Active', value: members.active || 0, icon: UserCheck, color: 'success', status: 'active' as DrillStatus },
            { label: 'Expiring Soon', value: members.expiring || 0, icon: Clock, color: 'warning', status: 'expiring' as DrillStatus },
            { label: 'Expired', value: members.expired || 0, icon: TrendingDown, color: 'destructive', status: 'expired' as DrillStatus },
            { label: "Today's Check-ins", value: attendance.todayCheckIns || 0, icon: Activity, color: 'muted', status: null },
          ].map(({ label, value, icon: Icon, color, status }) => (
            <Card
              key={label}
              className={`gradient-card gradient-border border-border/50 ${status ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all' : ''}`}
              onClick={() => { if (status) setDrillStatus(status); }}
            >
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${color}/10`}>
                    <Icon className={`h-5 w-5 text-${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold ${color !== 'muted' && color !== 'primary' ? `text-${color}` : ''}`}>{value}</p>
                  </div>
                </div>
                {status && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" /> Click to view list
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Payment by Date ──────────────────────────────────────────────────── */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Payment by Date
            </CardTitle>
            <CardDescription>View all payments collected on a specific date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">Select Date</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="bg-input h-9 w-[160px]" />
              </div>
              <Button size="sm" onClick={() => setPaymentDateQueried(paymentDate)} disabled={loadingPaymentDate}>
                {loadingPaymentDate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>

            {paymentsByDate && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Transactions', value: paymentsByDate.summary.totalPayments, color: 'text-foreground' },
                    { label: 'Collected', value: formatCurrency(paymentsByDate.summary.totalPaid), color: 'text-success' },
                    { label: 'Discounts', value: formatCurrency(paymentsByDate.summary.totalDiscount), color: 'text-warning' },
                    { label: 'Pending', value: formatCurrency(paymentsByDate.summary.totalPending), color: 'text-destructive' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-lg font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
                {paymentsByDate.payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No payments on this date</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          {['Receipt ID', 'Member', 'Phone', 'Total Fees', 'Paid', 'Discount', 'Pending', 'Mode'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paymentsByDate.payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 font-mono text-xs">{p.receiptId || p.id}</td>
                            <td className="px-3 py-2 font-medium">{p.memberName || p.memberId}</td>
                            <td className="px-3 py-2 text-muted-foreground">{p.memberPhone}</td>
                            <td className="px-3 py-2">{formatCurrency(p.totalFees)}</td>
                            <td className="px-3 py-2 text-success font-medium">{formatCurrency(p.paid)}</td>
                            <td className="px-3 py-2 text-warning">{formatCurrency(p.discount)}</td>
                            <td className="px-3 py-2 text-destructive">{formatCurrency(p.pending)}</td>
                            <td className="px-3 py-2 capitalize">{p.paymentMode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Payments Between Dates ───────────────────────────────────────────── */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Payments Between Dates
            </CardTitle>
            <CardDescription>Detailed payment report for a custom date range</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className="bg-input h-9 w-[150px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className="bg-input h-9 w-[150px]" />
              </div>
              <Button
                size="sm"
                disabled={!rangeStart || !rangeEnd || loadingRange}
                onClick={() => setRangeQueried({ start: rangeStart, end: rangeEnd })}
              >
                {loadingRange ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>

            {paymentsRange && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Transactions', value: paymentsRange.summary.totalPayments, color: 'text-foreground' },
                    { label: 'Gross Fees', value: formatCurrency(paymentsRange.summary.totalFees), color: 'text-foreground' },
                    { label: 'Collected', value: formatCurrency(paymentsRange.summary.totalPaid), color: 'text-success' },
                    { label: 'Discounts', value: formatCurrency(paymentsRange.summary.totalDiscount), color: 'text-warning' },
                    { label: 'Pending', value: formatCurrency(paymentsRange.summary.totalPending), color: 'text-destructive' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-muted/30 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-base font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {paymentsRange.daily.length > 0 && (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentsRange.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} angle={-30} textAnchor="end" height={50} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                        <Bar dataKey="revenue" fill={COLORS.info} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {paymentsRange.payments.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No payments in this period</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border max-h-72 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          {['Date', 'Receipt ID', 'Member', 'Paid', 'Discount', 'Pending', 'Mode'].map(h => (
                            <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paymentsRange.payments.map((p: any) => (
                          <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap">
                              {p.paymentDate ? format(new Date(p.paymentDate), 'dd MMM yyyy') : '-'}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{p.receiptId || p.id}</td>
                            <td className="px-3 py-2 font-medium">{p.memberName || p.memberId}</td>
                            <td className="px-3 py-2 text-success font-medium">{formatCurrency(p.paid)}</td>
                            <td className="px-3 py-2 text-warning">{formatCurrency(p.discount)}</td>
                            <td className="px-3 py-2 text-destructive">{formatCurrency(p.pending)}</td>
                            <td className="px-3 py-2 capitalize">{p.paymentMode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />Revenue Analysis
                </CardTitle>
                <CardDescription>Track your gym's financial performance</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Period</Label>
                  <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
                    <SelectTrigger className="w-[120px] bg-input h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(period === 'daily' || period === 'monthly') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Year</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="w-[100px] bg-input h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableYears.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {period === 'daily' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Month</Label>
                    <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger className="w-[130px] bg-input h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {period === 'custom' && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-input h-9 w-[140px]" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-input h-9 w-[140px]" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey={period === 'yearly' ? 'year' : period === 'monthly' ? 'monthLabel' : 'day'} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke={COLORS.primary} strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><PieChartIcon className="h-5 w-5 text-primary" />Membership Distribution</CardTitle>
              <CardDescription>Members by subscription duration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={membershipChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="count" label={({ label, count }) => `${label}: ${count}`}>
                      {membershipChartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number, name: string, props: any) => [`${value} members (${formatCurrency(props.payload.totalValue)})`, props.payload.label]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {membershipChartData.map((item: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment Methods</CardTitle>
              <CardDescription>Revenue breakdown by payment mode</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentModeChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={60} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number) => [formatCurrency(v), 'Amount']} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {paymentModeChartData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                {paymentModeChartData.map((item: any, index: number) => (
                  <div key={index} className="text-center p-3 rounded-lg" style={{ backgroundColor: `${item.fill}15` }}>
                    <div className="flex justify-center mb-1">
                      {item.mode === 'cash' && <Banknote className="h-5 w-5" style={{ color: item.fill }} />}
                      {item.mode === 'upi' && <CreditCard className="h-5 w-5" style={{ color: item.fill }} />}
                      {item.mode === 'cheque' && <Wallet className="h-5 w-5" style={{ color: item.fill }} />}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.name}</p>
                    <p className="text-sm font-semibold">{formatCurrency(item.amount)}</p>
                    <p className="text-xs text-muted-foreground">{item.count} payments</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Users className="h-5 w-5 text-primary" />Member Growth</CardTitle>
              <CardDescription>New member registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends.memberGrowth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="newMembers" name="New Members" stroke={COLORS.success} strokeWidth={3} dot={{ fill: COLORS.success, strokeWidth: 2, r: 4 }} activeDot={{ r: 6, stroke: COLORS.success, strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Member Status — clicking segments drills down */}
          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Member Status Overview</CardTitle>
              <CardDescription>Click a segment below to see member list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={memberStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      onClick={(data) => {
                        const map: Record<string, DrillStatus> = { Active: 'active', Expired: 'expired', Expiring: 'expiring', Cancelled: 'cancelled' };
                        const s = map[data.name];
                        if (s) setDrillStatus(s);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      {memberStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {memberStatusData.map((item, index) => (
                  <button
                    key={index}
                    className="flex items-center gap-2 hover:underline"
                    onClick={() => {
                      const map: Record<string, DrillStatus> = { Active: 'active', Expired: 'expired', Expiring: 'expiring', Cancelled: 'cancelled' };
                      const s = map[item.name];
                      if (s) setDrillStatus(s);
                    }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Members */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Award className="h-5 w-5 text-primary" />Top Contributing Members</CardTitle>
            <CardDescription>Members with highest payment contributions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {topMembers.map((member: any, index: number) => (
                <div key={member.memberId} className="relative p-4 rounded-xl border border-border/50 bg-card/50 hover:bg-card/80 transition-colors">
                  {index < 3 && (
                    <div className="absolute -top-2 -right-2">
                      <Badge className={`${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'} text-white`}>#{index + 1}</Badge>
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mb-3">
                      {member.photo ? <img src={member.photo} alt={member.name} className="w-full h-full object-cover" /> : <User className="h-8 w-8 text-primary" />}
                    </div>
                    <p className="font-semibold text-sm truncate w-full">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.memberId}</p>
                    <p className="text-lg font-bold text-primary mt-2">{formatCurrency(member.totalPaid)}</p>
                    <p className="text-xs text-muted-foreground">{member.paymentCount} payments</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend (Last 12 Months) */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Monthly Revenue Trend (Last 12 Months)</CardTitle>
            <CardDescription>Track your revenue performance month over month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends.monthlyRevenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number, name: string) => [formatCurrency(v), name === 'revenue' ? 'Revenue' : name]} />
                  <Bar dataKey="revenue" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ── Audit Report ─────────────────────────────────────────────────────── */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Audit Report
            </CardTitle>
            <CardDescription>Profit analysis, collection efficiency, and business health overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-xs">From (optional)</Label>
                <Input type="date" value={auditStart} onChange={(e) => setAuditStart(e.target.value)} className="bg-input h-9 w-[150px]" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To (optional)</Label>
                <Input type="date" value={auditEnd} onChange={(e) => setAuditEnd(e.target.value)} className="bg-input h-9 w-[150px]" />
              </div>
              <Button size="sm" onClick={() => setAuditQueried({ start: auditStart || undefined, end: auditEnd || undefined })} disabled={loadingAudit}>
                {loadingAudit ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Run Audit
              </Button>
            </div>

            {auditReport && (
              <div className="space-y-6">
                {/* Key metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Gross Revenue', value: formatCurrency(auditReport.summary.grossRevenue), sub: 'Total fees billed', icon: DollarSign, color: 'text-foreground', bg: 'bg-primary/10' },
                    { label: 'Collected', value: formatCurrency(auditReport.summary.collectedAmount), sub: 'Actual cash in', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
                    { label: 'Discounts Given', value: formatCurrency(auditReport.summary.totalDiscounts), sub: 'Revenue forgone', icon: TrendingDown, color: 'text-warning', bg: 'bg-warning/10' },
                    { label: 'Net Revenue', value: formatCurrency(auditReport.summary.netRevenue), sub: 'Collected − Discounts', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
                    { label: 'Pending Dues', value: formatCurrency(auditReport.summary.pendingAmount), sub: 'To be collected', icon: Clock, color: 'text-destructive', bg: 'bg-destructive/10' },
                    { label: 'Collection Rate', value: `${auditReport.summary.collectionEfficiency}%`, sub: 'Of gross revenue', icon: Activity, color: auditReport.summary.collectionEfficiency >= 90 ? 'text-success' : 'text-warning', bg: 'bg-muted' },
                    { label: 'New Members', value: auditReport.summary.newMembers, sub: 'In selected period', icon: Users, color: 'text-info', bg: 'bg-info/10' },
                    { label: 'Active Memberships', value: auditReport.summary.activeMemberships, sub: 'Currently active', icon: UserCheck, color: 'text-success', bg: 'bg-success/10' },
                  ].map(({ label, value, sub, icon: Icon, color, bg }) => (
                    <div key={label} className={`rounded-xl p-4 ${bg} border border-border/40`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-4 w-4 ${color}`} />
                        <p className="text-xs text-muted-foreground">{label}</p>
                      </div>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Payment mode breakdown */}
                {auditReport.byMode.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-4 w-4 text-primary" />Payment Mode Breakdown</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {auditReport.byMode.map((m: any) => (
                        <div key={m.mode} className="rounded-lg border border-border p-3 flex items-center gap-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${PAYMENT_MODE_COLORS[m.mode] || COLORS.primary}20` }}>
                            {m.mode === 'cash' && <Banknote className="h-5 w-5" style={{ color: PAYMENT_MODE_COLORS[m.mode] || COLORS.primary }} />}
                            {m.mode === 'upi' && <CreditCard className="h-5 w-5" style={{ color: PAYMENT_MODE_COLORS[m.mode] || COLORS.primary }} />}
                            {m.mode === 'cheque' && <Wallet className="h-5 w-5" style={{ color: PAYMENT_MODE_COLORS[m.mode] || COLORS.primary }} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold capitalize">{m.mode}</p>
                            <p className="text-lg font-bold text-primary">{formatCurrency(m.amount)}</p>
                            <p className="text-xs text-muted-foreground">{m.count} txns · {formatCurrency(m.discounts)} discounts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monthly trend */}
                {auditReport.monthlyTrend.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Monthly Breakdown</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={auditReport.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(v: number, name: string) => [formatCurrency(v), name]} />
                          <Bar dataKey="collected" name="Collected" fill={COLORS.success} radius={[3, 3, 0, 0]} stackId="a" />
                          <Bar dataKey="pending" name="Pending" fill="#ef4444" radius={[3, 3, 0, 0]} stackId="a" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Top paying members */}
                {auditReport.topMembers.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Award className="h-4 w-4 text-primary" />Top 10 Paying Members</p>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            {['#', 'Member', 'Phone', 'Transactions', 'Total Paid', 'Discounts'].map(h => (
                              <th key={h} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {auditReport.topMembers.map((m: any, i: number) => (
                            <tr key={m.memberId} className="hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                              <td className="px-3 py-2 font-medium">{m.name || m.memberId}</td>
                              <td className="px-3 py-2 text-muted-foreground">{m.phone}</td>
                              <td className="px-3 py-2 text-center">{m.transactions}</td>
                              <td className="px-3 py-2 text-success font-bold">{formatCurrency(m.totalPaid)}</td>
                              <td className="px-3 py-2 text-warning">{formatCurrency(m.totalDiscount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!auditReport && (
              <div className="text-center py-10 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Click "Run Audit" to generate the report (leave dates empty for all-time)</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Drill-down Dialog */}
        <MemberDrillDialog status={drillStatus} onClose={() => setDrillStatus(null)} />
      </div>
    </MainLayout>
  );
};

export default ReportsPage;
