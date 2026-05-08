import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';
import { format } from 'date-fns';
import { Download, Printer, Check } from 'lucide-react';

interface ReceiptData {
  receiptId: string;
  memberName: string;
  memberId: string;
  phone: string;
  duration: number;
  startDate: string;
  endDate: string;
  totalFees: number;
  discount: number;
  paid: number;
  pending: number;
  previousPending?: number; // Pending amount before this payment (for pending fee payments)
  totalPaidSoFar?: number; // Total paid including this payment
  paymentMode: string;
  paymentDate: string;
  isPendingFeePayment?: boolean; // Flag to indicate this is a pending fee payment
  pendingCleared?: boolean; // Flag to show if all pending is cleared
}

interface PaymentReceiptProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export function PaymentReceipt({ isOpen, onClose, data }: PaymentReceiptProps) {
  if (!data) return null;

  const { data: gymInfo } = useQuery({
    queryKey: ['gym-info'],
    queryFn: () => dashboardAPI.getGymInfo(),
  });

  const safeFormat = (value: string | undefined | null, fmt: string) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return format(d, fmt);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col print:max-w-full print:max-h-full">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-center text-gradient">Payment Receipt</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4 p-4 bg-background rounded-lg border" id="receipt">
            {/* Logo & Header */}
            <div className="text-center space-y-3">
              <div className="flex flex-col items-center gap-2">
                <img
                  src="/gym_logo.png"
                  alt="Gym Logo"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/30"
                />
                <div className="leading-none">
                  <p className="text-lg font-extrabold text-foreground tracking-tight">Hardcore</p>
                  <p className="text-xs font-semibold text-primary tracking-widest uppercase">Fitness</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{gymInfo?.address || ''}</p>
                <p className="text-xs text-muted-foreground">{gymInfo?.phone || ''} {gymInfo?.email ? `| ${gymInfo.email}` : ''}</p>
              </div>
            </div>

          {/* Pending Fees Cleared Badge */}
          {data.pendingCleared && (
            <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-success/10 border border-success/30">
              <Check className="h-4 w-4 text-success" />
              <span className="text-sm font-semibold text-success">Pending Fees Cleared</span>
            </div>
          )}

          <Separator />

          {/* Receipt Info */}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Receipt No:</span>
            <span className="font-mono font-medium">{data.receiptId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Date:</span>
            <span>{safeFormat(data.paymentDate, 'MMM dd, yyyy hh:mm a')}</span>
          </div>

          <Separator />

          {/* Member Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Member Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Name</p>
                <p className="font-medium">{data.memberName}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Member ID</p>
                <p className="font-medium">{data.memberId}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Phone</p>
                <p className="font-medium">{data.phone}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Subscription Info */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Subscription Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Duration</p>
                <p className="font-medium">{data.duration} Month{data.duration > 1 ? 's' : ''}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Payment Mode</p>
                <p className="font-medium uppercase">{data.paymentMode}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Start Date</p>
                <p className="font-medium">{safeFormat(data.startDate, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">End Date</p>
                <p className="font-medium">{safeFormat(data.endDate, 'MMM dd, yyyy')}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Payment Summary</h3>
            <div className="space-y-1 text-sm">
              {data.isPendingFeePayment ? (
                <>
                  {/* For pending fee payments, show simplified breakdown */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pending Amount (Before Payment)</span>
                    <span>₹{(data.previousPending || data.paid + data.pending).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-success font-medium">
                    <span>Amount Paid Now</span>
                    <span>₹{data.paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {data.pending > 0 ? (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>Still Pending</span>
                      <span>₹{data.pending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-success font-medium">
                      <span>Remaining Balance</span>
                      <span>₹0.00 ✓</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-medium bg-muted/50 p-2 rounded">
                    <span>Total Paid Till Date</span>
                    <span className="text-success">₹{(data.totalPaidSoFar || data.paid).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </>
              ) : (
                <>
                  {/* For new subscriptions, show full breakdown */}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Fees</span>
                    <span>₹{data.totalFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {data.discount > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span>-₹{data.discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-medium">
                    <span>Payable Amount</span>
                    <span>₹{(data.totalFees - data.discount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between text-success font-medium">
                    <span>Amount Paid</span>
                    <span>₹{data.paid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {data.pending > 0 && (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>Pending Amount</span>
                      <span>₹{data.pending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Footer */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-success">
              <Check className="h-5 w-5" />
              <span className="font-medium">Payment Received</span>
            </div>
            <p className="text-xs text-muted-foreground">Thank you for being a member!</p>
            <p className="text-xs text-muted-foreground">{gymInfo?.timings || ''}</p>
          </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 print:hidden shrink-0 pt-2">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onClose} className="flex-1 gradient-accent">
            <Download className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
