import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { membershipsAPI, trainersAPI, attendanceAPI } from '@/lib/api';
import { Member } from '@/types/gym';
import { User, Phone, MapPin, Calendar, CreditCard, Dumbbell, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface MemberAttendanceEntryProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberAttendanceEntry({ member, isOpen, onClose }: MemberAttendanceEntryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMarked, setIsMarked] = useState(false);

  const memberId = member?.memberId ?? '';
  const trainerId = member?.assignedTrainerId ?? '';
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: memberMemberships = [], refetch: refetchMemberships } = useQuery({
    queryKey: ['member-memberships', memberId],
    queryFn: () => membershipsAPI.getByMemberId(memberId),
    enabled: !!memberId && isOpen,
  });

  // Reset isMarked when member changes and refetch membership data
  useEffect(() => {
    setIsMarked(false);
    if (memberId && isOpen) {
      // Refetch membership data when dialog opens to get latest payment info
      refetchMemberships();
    }
  }, [memberId, isOpen, refetchMemberships]);

  const membership = (memberMemberships as any[])[0] || null;

  const { data: trainer } = useQuery({
    queryKey: ['trainer', trainerId],
    queryFn: () => trainersAPI.getById(trainerId as string),
    enabled: !!trainerId,
  });

  const { data: todayAttendance = [], refetch: refetchTodayAttendance } = useQuery({
    queryKey: ['member-attendance-today', memberId, today],
    queryFn: async () => {
      const allToday = await attendanceAPI.getAll(today);
      return (allToday as any[]).filter(a => a.memberId === memberId);
    },
    enabled: !!memberId && isOpen,
  });

  const alreadyMarked = (todayAttendance as any[]).some(
    (a) => a.status === 'present'
  ) || isMarked;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/20 text-success border-success/30';
      case 'expiring': return 'bg-warning/20 text-warning border-warning/30';
      case 'expired': return 'bg-destructive/20 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleMarkAttendance = async () => {
    try {
      if (!member) return;
      const { id } = await attendanceAPI.generateId();
      const now = new Date();
      const time = format(now, 'HH:mm');

      await attendanceAPI.mark({
        id,
        memberId: member.memberId,
        date: today,
        status: 'present',
        checkInTime: time,
      });

      setIsMarked(true);
      
      // Invalidate all attendance queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['member-attendance-today'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance-range'] });
      await queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      // Refetch today's attendance
      await refetchTodayAttendance();
      
      toast({
        title: 'Attendance Marked',
        description: `${member.name}'s attendance has been recorded at ${format(now, 'hh:mm a')}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to mark attendance',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gradient">Member Check-In</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Photo & Basic Info */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
              {member.photo ? (
                <img src={member.photo} alt={member.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.memberId}</p>
              <Badge className={`mt-1 ${getStatusColor(member.status)}`}>{member.status}</Badge>
            </div>
          </div>

          {/* Contact Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{member.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{member.address}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>DOB: {format(new Date(member.dob), 'MMM dd, yyyy')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Membership Info */}
          {membership && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="font-semibold">Membership Details</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Plan</p>
                    <p className="font-medium">{membership.duration} Months</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className="font-medium">{format(new Date(membership.endDate), 'MMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-medium text-success">
                      ₹{Number(membership.paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pending</p>
                    {Number(membership.pending || 0) > 0 ? (
                      <p className="font-medium text-destructive">
                        ₹{Number(membership.pending || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    ) : (
                      <p className="font-medium text-success">₹0.00 ✓</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trainer Info */}
          {trainer && (
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Dumbbell className="h-4 w-4 text-warning" />
                  <span className="font-semibold">Personal Trainer</span>
                </div>
                <p className="text-sm mt-1">{trainer.name} - {trainer.specialization}</p>
              </CardContent>
            </Card>
          )}

          {/* Mark Attendance Button */}
          {alreadyMarked || isMarked ? (
            <div className="flex items-center justify-center gap-2 p-4 bg-success/10 rounded-lg border border-success/30">
              <CheckCircle className="h-5 w-5 text-success" />
              <span className="font-medium text-success">Attendance Already Marked Today</span>
            </div>
          ) : (
            <Button onClick={handleMarkAttendance} className="w-full gradient-accent" size="lg">
              <CheckCircle className="h-5 w-5 mr-2" />
              Mark Attendance - {format(new Date(), 'hh:mm a')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
