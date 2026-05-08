import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { membersAPI, membershipsAPI, paymentsAPI, dashboardAPI } from '@/lib/api';
import { PaymentReceipt } from '@/components/payments/PaymentReceipt';
import { CreditCard, Search, Receipt, Plus, AlertCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { calculateEndDate } from '@/data/mockData';

const PaymentsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [continuePT, setContinuePT] = useState<boolean | null>(null); // null = not decided, true = with PT, false = without PT
  const [formData, setFormData] = useState({
    duration: '',
    startDate: new Date().toISOString().split('T')[0],
    discount: 0,
    paid: 0,
    paymentMode: 'cash',
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll(),
  });

  const { data: memberMemberships = [], refetch: refetchMemberships } = useQuery({
    queryKey: ['member-memberships', selectedMember?.memberId],
    queryFn: () => membershipsAPI.getByMemberId(selectedMember?.memberId as string),
    enabled: !!selectedMember?.memberId,
  });

  const { data: memberPayments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['payments-by-member', selectedMember?.memberId],
    queryFn: () => paymentsAPI.getByMemberId(selectedMember?.memberId as string),
    enabled: !!selectedMember?.memberId,
  });

  const { data: feeStructure = [] } = useQuery({
    queryKey: ['fee-structure'],
    queryFn: () => dashboardAPI.getFeeStructure(),
  });

  const getCurrentPrice = (duration: number, withPT: boolean = false): number => {
    const fee = (feeStructure as any[]).find((f) => f.duration === duration);
    if (!fee) return 0;
    
    if (withPT) {
      // Return PT pricing
      if (fee.isPtOfferActive && fee.ptOfferPrice) {
        return fee.ptOfferPrice;
      }
      return fee.ptBasePrice || 0;
    } else {
      // Return regular pricing
      if (fee.isOfferActive && fee.offerPrice) {
        return fee.offerPrice;
      }
      return fee.basePrice || 0;
    }
  };

  // Check for member from URL params (either new registration or existing member from Members page)
  useEffect(() => {
    const newMember = searchParams.get('new');
    const memberId = searchParams.get('memberId');
    const memberName = searchParams.get('name');
    const duration = searchParams.get('duration');

    if (memberId && members.length > 0) {
      // Find existing member from API
      const apiMember = (members as any[]).find((m) => m.memberId === memberId);
      
      if (newMember && memberName) {
        // New member from registration
        const tempMember = apiMember || {
          memberId,
          name: decodeURIComponent(memberName),
          phone: 'New Member',
          dob: '',
          address: '',
          status: 'active' as const,
          hasPersonalTrainer: false,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setSelectedMember(tempMember);
        setShowAddForm(true);
        if (duration) {
          setFormData((prev) => ({ ...prev, duration }));
        }
        toast({
          title: 'New Member Selected',
          description: 'Please complete the payment to finalize the membership.',
        });
      } else if (apiMember) {
        // Existing member from Members page (pay pending fees)
        setSelectedMember(apiMember);
        toast({
          title: 'Member Selected',
          description: `${apiMember.name} selected for payment.`,
        });
      }
    }
  }, [searchParams, toast, members]);

  const filteredMembers = (members as any[]).filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.phone || '').includes(searchTerm)
  );

  const getMembership = () => (memberMemberships as any[])[0] || null;

  const currentMembership = getMembership();
  const isPayingPending = !!currentMembership && currentMembership.pending > 0 && !searchParams.get('new');
  
  // Check if member has/had personal trainer
  const memberHasPT = selectedMember?.hasPersonalTrainer || false;
  
  // Determine if we should use PT pricing
  // For new members: check their hasPersonalTrainer flag
  // For renewals (when membership expired): use continuePT choice (defaulting to their current PT status)
  const isRenewal = !!currentMembership && currentMembership.pending === 0 && !searchParams.get('new');
  const shouldUsePTpricing = searchParams.get('new') 
    ? memberHasPT  // New registration - use member's PT status
    : (isRenewal && continuePT !== null) 
      ? continuePT  // Renewal with explicit choice
      : memberHasPT;  // Default to member's current PT status

  // Calculate fees and pending amount
  // For new subscriptions: use fee structure
  // For pending payments: use actual pending amount from membership
  const totalFees = isPayingPending
    ? Number(currentMembership.pending || 0)  // Amount that needs to be paid
    : (formData.duration ? getCurrentPrice(parseInt(formData.duration), shouldUsePTpricing) : 0);
  const finalAmount = totalFees - (isPayingPending ? 0 : formData.discount);
  
  // When paying pending fees: remaining = current pending - amount being paid now
  // When new subscription: remaining = total - discount - amount paid
  const pending = isPayingPending
    ? Math.max(0, Number(currentMembership.pending || 0) - Number(formData.paid || 0))
    : (finalAmount - Number(formData.paid || 0));

  const endDate =
    isPayingPending
      ? (currentMembership?.endDate || '')
      : (formData.duration && formData.startDate
          ? calculateEndDate(formData.startDate, parseInt(formData.duration))
          : '');

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!selectedMember || !formData.duration) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.paid <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Amount paid must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const duration = parseInt(formData.duration);
      const memberId = selectedMember.memberId;

      const existingMembership = getMembership();

      const paid = formData.paid;

      // Use isPayingPending to determine if this is a pending fee payment vs new subscription
      // isPayingPending is already defined in component: membership exists, has pending > 0, not new registration
      const total = isPayingPending ? Number(existingMembership.pending || 0) : totalFees;
      const discount = isPayingPending ? 0 : formData.discount;
      const payable = total - discount;
      const pendingAmount = payable - paid;

      const [{ id: paymentId }, { receiptId }] = await Promise.all([
        paymentsAPI.generateId(),
        paymentsAPI.generateReceiptId(),
      ]);

      let membershipId = existingMembership?.id;

      // Determine PT status for this subscription
      // For renewals: use continuePT choice (if explicitly set) or member's current PT status
      // For new registrations: use member's PT status from registration
      const ptForThisSubscription = searchParams.get('new') 
        ? memberHasPT  // New registration - use member's PT status from registration
        : (continuePT !== null ? continuePT : memberHasPT);  // Renewal - use explicit choice or current status

      // Check if we need to create a new membership:
      // 1. No existing membership at all
      // 2. New registration flow (from URL params)
      // 3. Renewal - existing membership is expired or has no pending fees (user wants to add a new subscription)
      const shouldCreateNewMembership = !existingMembership || searchParams.get('new') || isRenewal;

      if (shouldCreateNewMembership) {
        const { id: newMembershipId } = await membershipsAPI.generateId();
        membershipId = newMembershipId;

        await membershipsAPI.create({
          id: membershipId,
          memberId,
          startDate: formData.startDate,
          endDate,
          duration,
          totalFees: payable,
          paid: 0,
          pending: payable,
          hasPersonalTrainer: ptForThisSubscription,
          assignedTrainerId: ptForThisSubscription ? selectedMember?.assignedTrainerId : null,
        });
        
        // Also update PT status on the member if it changed during renewal
        if (isRenewal && continuePT !== null && continuePT !== memberHasPT) {
          await membersAPI.patch(memberId, {
            hasPersonalTrainer: continuePT,
            assignedTrainerId: continuePT ? selectedMember?.assignedTrainerId : null,
          });
        }
      }
      // Note: Membership update is handled automatically by the payment route
      // No need to manually update here to avoid double updates

      // Create payment (new or pending-fee payment)
      await paymentsAPI.create({
        id: paymentId,
        memberId,
        membershipId,
        totalFees: isPayingPending ? existingMembership.totalFees : payable,
        discount,
        paid,
        pending: Math.max(pendingAmount, 0),
        paymentMode: formData.paymentMode,
        receiptId,
        paymentDate: new Date().toISOString().split('T')[0],
        dueDate: pendingAmount > 0 ? endDate : null,
        isPendingFeePayment: isPayingPending,
      });

      await Promise.all([refetchPayments(), refetchMemberships()]);

      // Invalidate all related queries to refresh data across the app
      await queryClient.invalidateQueries({ queryKey: ['member-memberships', memberId] });
      await queryClient.invalidateQueries({ queryKey: ['member-memberships'] });
      await queryClient.invalidateQueries({ queryKey: ['memberships'] });
      await queryClient.invalidateQueries({ queryKey: ['payments-by-member', memberId] });
      await queryClient.invalidateQueries({ queryKey: ['payments'] });
      await queryClient.invalidateQueries({ queryKey: ['members'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });

      // Get updated membership (for accurate pending display in receipt)
      const updatedMemberships = await membershipsAPI.getByMemberId(memberId);
      const updatedMembership = (updatedMemberships as any[])[0];

      const receipt = {
        receiptId,
        memberName: selectedMember.name,
        memberId: selectedMember.memberId,
        phone: selectedMember.phone,
        duration: updatedMembership?.duration || duration,
        startDate: updatedMembership?.startDate || formData.startDate,
        endDate: updatedMembership?.endDate || endDate,
        totalFees: isPayingPending ? Number(existingMembership.totalFees) : total,
        discount,
        paid,
        pending: Math.max(Number(updatedMembership?.pending ?? pendingAmount), 0),
        // For pending fee payments: track what pending was BEFORE this payment
        previousPending: isPayingPending ? Number(existingMembership.pending) : 0,
        // For pending fee payments: track total paid so far (including this payment)
        totalPaidSoFar: isPayingPending 
          ? Number(existingMembership.paid || 0) + paid 
          : paid,
        paymentMode: formData.paymentMode,
        paymentDate: new Date().toISOString(),
        isPendingFeePayment: isPayingPending, // Flag to indicate this is a pending fee payment
        pendingCleared: isPayingPending && Number(updatedMembership?.pending ?? pendingAmount) === 0, // Flag to show if all pending is cleared
      };

      setReceiptData(receipt);
      setShowReceipt(true);
      refetchPayments();

      toast({
        title: 'Payment Recorded',
        description: `Payment recorded for ${selectedMember?.name}. Receipt generated.`,
      });
    } catch (error: any) {
      toast({
        title: 'Payment Failed',
        description: error.message || 'Could not save payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setShowAddForm(false);
    setContinuePT(null);
    setFormData({
      duration: '',
      startDate: new Date().toISOString().split('T')[0],
      discount: 0,
      paid: 0,
      paymentMode: 'cash',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" />
          Make Payment
        </h1>

        {/* New Member Alert */}
        {searchParams.get('new') && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/30">
            <AlertCircle className="h-5 w-5 text-success" />
            <p className="text-sm">
              <span className="font-medium">New member registered!</span> Please complete the payment below to finalize the membership.
            </p>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader><CardTitle className="text-lg">Search Member</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-input border-border" />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {filteredMembers.map((m) => (
                  <button
                    key={m.memberId}
                    onClick={() => {
                      setSelectedMember(m);
                      setShowAddForm(false);
                      setContinuePT(null); // Reset PT choice when selecting a new member
                    }}
                    className={`w-full p-3 rounded-lg text-left transition-all ${
                      selectedMember?.memberId === m.memberId
                        ? 'bg-primary/20 border border-primary/50'
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                        {m.photo ? (
                          <img
                            src={m.photo}
                            alt={m.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-sm text-muted-foreground">{m.phone}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Payment Details</CardTitle>
                {selectedMember && !showAddForm && (
                  <Button size="sm" onClick={() => setShowAddForm(true)} className="gradient-accent">
                    <Plus className="h-4 w-4 mr-1" />Add Subscription
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!selectedMember ? (
                <div className="text-center py-12 text-muted-foreground">Select a member</div>
              ) : showAddForm ? (
                <div className="space-y-4">
                  {isPayingPending && currentMembership && (() => {
                    // Explicitly extract values to ensure correct mapping
                    const totalFees = Number(currentMembership.totalFees || 0);
                    // IMPORTANT: Verify the field names match what's coming from the API
                    // If values appear swapped, check the API response in browser DevTools Network tab
                    let paidAmount = Number(currentMembership.paid || 0);
                    let pendingAmount = Number(currentMembership.pending || 0);
                    
                    // Validation: If the values don't make logical sense, log a warning
                    // paidAmount should typically be <= totalFees
                    // pendingAmount should typically be <= totalFees
                    // paidAmount + pendingAmount should typically equal totalFees (minus discount)
                    if (process.env.NODE_ENV === 'development') {
                      console.log('[Payment Summary Debug]', {
                        membershipId: currentMembership.id,
                        'currentMembership object': currentMembership,
                        'currentMembership.paid (raw)': currentMembership.paid,
                        'currentMembership.pending (raw)': currentMembership.pending,
                        'paidAmount (processed)': paidAmount,
                        'pendingAmount (processed)': pendingAmount,
                        totalFees,
                        'paid + pending': paidAmount + pendingAmount,
                      });
                    }
                    
                    const discountAmount = Math.max(0, totalFees - (paidAmount + pendingAmount));
                    
                    return (
                      <div className="p-4 rounded-lg bg-muted/30 border border-primary/20 space-y-2">
                        <p className="text-sm font-semibold text-primary">Payment Summary</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <span className="text-muted-foreground">Original Total Fees:</span>
                          <span className="font-medium">₹{totalFees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-muted-foreground">Total Discount Applied:</span>
                          <span className="font-medium">₹{discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-muted-foreground">Paid So Far:</span>
                          <span className="font-medium text-success">₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-muted-foreground">Pending Amount:</span>
                          <span className="font-medium text-destructive">₹{pendingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        {process.env.NODE_ENV === 'development' && (
                          <div className="mt-2 p-2 bg-yellow-100 text-xs text-gray-600 rounded">
                            Debug: API returned paid={paidAmount}, pending={pendingAmount}. Check Network tab if values look wrong.
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* PT Option for members who previously had PT or for renewal */}
                    {memberHasPT && !isPayingPending && (
                      <div className="md:col-span-2 p-4 rounded-lg bg-primary/10 border border-primary/30 space-y-3">
                        <Label className="font-semibold text-primary">Personal Trainer Subscription</Label>
                        <p className="text-sm text-muted-foreground">
                          This member previously had a personal trainer. Would you like to continue with personal training?
                        </p>
                        <RadioGroup
                          value={continuePT === null ? (memberHasPT ? 'yes' : 'no') : (continuePT ? 'yes' : 'no')}
                          onValueChange={(value) => setContinuePT(value === 'yes')}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="yes" id="pt-yes" />
                            <Label htmlFor="pt-yes" className="cursor-pointer">
                              Yes, continue with PT (₹{formData.duration ? getCurrentPrice(parseInt(formData.duration), true) : 0})
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="no" id="pt-no" />
                            <Label htmlFor="pt-no" className="cursor-pointer">
                              No, regular subscription (₹{formData.duration ? getCurrentPrice(parseInt(formData.duration), false) : 0})
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Duration *</Label>
                      <Select value={formData.duration} onValueChange={(v) => setFormData({ ...formData, duration: v })} disabled={isPayingPending}>
                        <SelectTrigger className="bg-input"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Month - ₹{getCurrentPrice(1, shouldUsePTpricing)}</SelectItem>
                          <SelectItem value="3">3 Months - ₹{getCurrentPrice(3, shouldUsePTpricing)}</SelectItem>
                          <SelectItem value="6">6 Months - ₹{getCurrentPrice(6, shouldUsePTpricing)}</SelectItem>
                          <SelectItem value="12">12 Months - ₹{getCurrentPrice(12, shouldUsePTpricing)}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} className="bg-input" disabled={isPayingPending} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Fees</Label>
                      <Input 
                        value={isPayingPending ? `₹${currentMembership?.totalFees || 0}` : `₹${totalFees}`} 
                        readOnly 
                        className="bg-muted/50" 
                      />
                    </div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" value={endDate} readOnly className="bg-muted/50" /></div>
                    <div className="space-y-2">
                      <Label>Discount</Label>
                      <Input 
                        type="number" 
                        value={formData.discount || ''} 
                        onChange={(e) => setFormData({ ...formData, discount: e.target.value === '' ? 0 : +e.target.value })} 
                        placeholder="0"
                        className="bg-input" 
                        disabled={isPayingPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Amount Paid *</Label>
                      <Input 
                        type="number" 
                        value={formData.paid || ''} 
                        onChange={(e) => setFormData({ ...formData, paid: e.target.value === '' ? 0 : +e.target.value })} 
                        placeholder="Enter amount"
                        className="bg-input" 
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Payment Mode</Label>
                      <Select value={formData.paymentMode} onValueChange={(v) => setFormData({ ...formData, paymentMode: v })}>
                        <SelectTrigger className="bg-input"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {!isPayingPending && (
                    <div className="flex justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <span>Pending Amount</span><span className="font-bold text-primary">₹{pending > 0 ? pending : 0}</span>
                    </div>
                  )}
                  {isPayingPending && (
                    <div className="flex justify-between p-3 rounded-lg bg-success/10 border border-success/30">
                      <span>Remaining After Payment</span><span className="font-bold text-success">₹{pending > 0 ? pending : 0}</span>
                      {pending === 0 && (
                        <span className="ml-2 text-xs text-success font-semibold">✓ All Pending Cleared</span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} className="gradient-accent" disabled={isSubmitting}><Receipt className="h-4 w-4 mr-2" />{isSubmitting ? 'Processing...' : 'Save & Generate Receipt'}</Button>
                    <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                      {selectedMember.photo ? (
                        <img
                          src={selectedMember.photo}
                          alt={selectedMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selectedMember.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedMember.phone}</p>
                    </div>
                  </div>

                  {getMembership() && (
                    <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                      <p className="text-sm">
                        Current: {getMembership()?.duration} months
                      </p>
                      <p className="text-sm">
                        Ends:{' '}
                        {format(
                          new Date(getMembership()?.endDate || ''),
                          'MMM dd, yyyy'
                        )}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm">
                          Paid:{' '}
                          <span className="text-success font-semibold">
                            ₹{Number(getMembership()?.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </p>
                        <p className="text-sm">
                          Pending:{' '}
                          <span className={`font-semibold ${Number(getMembership()?.pending || 0) > 0 ? 'text-destructive' : 'text-success'}`}>
                            ₹{Number(getMembership()?.pending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </p>
                      </div>
                      {Number(getMembership()?.pending || 0) > 0 ? (
                        <Button
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            const m = getMembership();
                            if (!m) return;
                            // Format date properly - handle both ISO string and YYYY-MM-DD
                            let formattedStartDate = m.startDate;
                            if (formattedStartDate && formattedStartDate.includes('T')) {
                              formattedStartDate = formattedStartDate.split('T')[0];
                            }
                            // Pre-fill with pending amount - ensure it's a number
                            const pendingAmount = Number(m.pending || 0);
                            setFormData((prev) => ({
                              ...prev,
                              duration: String(m.duration),
                              startDate: formattedStartDate,
                              discount: 0,
                              paid: pendingAmount, // Pre-fill with full pending amount
                            }));
                            setShowAddForm(true);
                          }}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          Pay Pending Fees
                        </Button>
                      ) : (
                        <div className="mt-2 p-2 rounded-lg bg-success/10 border border-success/30 text-center">
                          <p className="text-sm font-semibold text-success">✓ Payment Cleared</p>
                        </div>
                      )}
                    </div>
                  )}

                  {memberPayments && (memberPayments as any[]).length > 0 && (
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        Payment History ({memberPayments.length})
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {(memberPayments as any[]).map((payment, index) => {
                          const m = getMembership();
                          return (
                            <div
                              key={payment.id || index}
                              className="p-3 rounded-lg bg-background border border-border/50 hover:border-primary/50 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="text-xs font-medium">
                                    {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Receipt: {payment.receiptId}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-success">
                                  ₹{payment.paid}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <span>Mode: {payment.paymentMode}</span>
                                {payment.discount > 0 && (
                                  <span>• Discount: ₹{payment.discount}</span>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  const receipt = {
                                    receiptId: payment.receiptId,
                                    memberName: selectedMember.name,
                                    memberId: selectedMember.memberId,
                                    phone: selectedMember.phone,
                                    duration: m?.duration || 0,
                                    startDate: m?.startDate || formData.startDate,
                                    endDate: m?.endDate || endDate,
                                    totalFees: payment.totalFees,
                                    discount: payment.discount,
                                    paid: payment.paid,
                                    pending: payment.pending,
                                    paymentMode: payment.paymentMode,
                                    paymentDate: payment.paymentDate,
                                  };
                                  setReceiptData(receipt);
                                  setShowReceipt(true);
                                }}
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                View Receipt
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Receipt Dialog */}
      <PaymentReceipt
        isOpen={showReceipt}
        onClose={handleReceiptClose}
        data={receiptData}
      />
    </MainLayout>
  );
};

export default PaymentsPage;
