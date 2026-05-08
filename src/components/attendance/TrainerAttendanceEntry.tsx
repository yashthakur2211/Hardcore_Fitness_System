import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { trainerAttendanceAPI, membersAPI } from '@/lib/api';
import { Dumbbell, Phone, Clock, CheckCircle, LogOut, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Trainer {
  trainerId: string;
  name: string;
  phone: string;
  specialization: string;
  isActive: boolean;
}

interface TrainerAttendanceEntryProps {
  trainer: Trainer | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TrainerAttendanceEntry({ trainer, isOpen, onClose }: TrainerAttendanceEntryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMarkedIn, setIsMarkedIn] = useState(false);
  const [isMarkedOut, setIsMarkedOut] = useState(false);
  const [currentAttendance, setCurrentAttendance] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const trainerId = trainer?.trainerId ?? '';
  const today = format(new Date(), 'yyyy-MM-dd');

  // Get today's attendance for this trainer
  const { data: todayAttendance, refetch: refetchTodayAttendance } = useQuery({
    queryKey: ['trainer-attendance-today-entry', trainerId, today],
    queryFn: async () => {
      const allToday = await trainerAttendanceAPI.getAll(today);
      return (allToday as any[]).find(a => a.trainerId === trainerId);
    },
    enabled: !!trainerId && isOpen,
  });

  // Get members assigned to this trainer
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll(),
  });

  const assignedMembers = (members as any[]).filter(
    m => m.hasPersonalTrainer && m.assignedTrainerId === trainerId
  );

  // Reset states when trainer changes and sync with fetched data
  useEffect(() => {
    setIsMarkedIn(false);
    setIsMarkedOut(false);
    setCurrentAttendance(null);
  }, [trainerId]);

  // Sync currentAttendance with fetched todayAttendance
  useEffect(() => {
    if (todayAttendance) {
      setCurrentAttendance(todayAttendance);
      setIsMarkedIn(true);
      if (todayAttendance.checkOutTime) {
        setIsMarkedOut(true);
      }
    }
  }, [todayAttendance]);

  const alreadyCheckedIn = !!currentAttendance || isMarkedIn;
  const alreadyCheckedOut = !!currentAttendance?.checkOutTime || isMarkedOut;

  const handleCheckIn = async () => {
    if (isLoading || alreadyCheckedIn) return;
    try {
      setIsLoading(true);
      if (!trainer) return;
      const { id } = await trainerAttendanceAPI.generateId();
      const now = new Date();
      const time = format(now, 'HH:mm');

      const attendanceRecord = {
        id,
        trainerId: trainer.trainerId,
        date: today,
        status: 'present',
        checkInTime: time,
        checkOutTime: null,
      };

      await trainerAttendanceAPI.mark(attendanceRecord);

      // Store the attendance record locally for checkout
      setCurrentAttendance(attendanceRecord);
      setIsMarkedIn(true);
      
      // Invalidate all attendance queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance-range'] });
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance-today'] });
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance-today-entry'] });
      
      toast({
        title: 'Trainer Checked In',
        description: `${trainer.name} checked in at ${format(now, 'hh:mm a')}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to check in',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (isLoading || alreadyCheckedOut) return;
    try {
      setIsLoading(true);
      if (!trainer) return;
      const result = await trainerAttendanceAPI.checkout(trainer.trainerId);

      setCurrentAttendance(prev => prev ? { ...prev, checkOutTime: result.checkOutTime } : prev);
      setIsMarkedOut(true);

      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance'] });
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance-range'] });
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance-today'] });
      await queryClient.invalidateQueries({ queryKey: ['trainer-attendance-today-entry'] });

      toast({
        title: 'Trainer Checked Out',
        description: `${trainer.name} checked out at ${result.checkOutTime}`,
      });
    } catch (error: any) {
      toast({
        title: 'Failed to check out',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!trainer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Trainer Check-In/Out
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Trainer Photo & Basic Info */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{trainer.name}</h3>
              <p className="text-sm text-muted-foreground">{trainer.trainerId}</p>
              <Badge className="mt-1 bg-success/10 text-success border-success/20">
                {trainer.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {/* Contact & Specialization Info */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{trainer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Dumbbell className="h-4 w-4 text-muted-foreground" />
                <span>Specialization: {trainer.specialization || 'General Fitness'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Members */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold">Assigned Members</span>
                <Badge variant="secondary" className="ml-auto">{assignedMembers.length}</Badge>
              </div>
              {assignedMembers.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {assignedMembers.map((member: any) => (
                    <div key={member.memberId} className="flex items-center justify-between text-sm p-2 rounded bg-background/50">
                      <span>{member.name}</span>
                      <Badge 
                        variant="outline" 
                        className={member.status === 'active' 
                          ? 'border-success/30 text-success' 
                          : 'border-warning/30 text-warning'
                        }
                      >
                        {member.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No members assigned yet</p>
              )}
            </CardContent>
          </Card>

          {/* Today's Attendance Status */}
          {currentAttendance && (
            <Card className="bg-warning/5 border-warning/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <span className="font-semibold">Today's Attendance</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Check In</p>
                    <p className="font-medium text-success">
                      {currentAttendance.checkInTime || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Check Out</p>
                    <p className="font-medium text-destructive">
                      {currentAttendance.checkOutTime || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {/* Check In Button */}
            {alreadyCheckedIn ? (
              <div className="flex-1 flex items-center justify-center gap-2 p-3 bg-success/10 rounded-lg border border-success/30">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="font-medium text-success text-sm">Checked In</span>
              </div>
            ) : (
              <Button onClick={handleCheckIn} className="flex-1 bg-success hover:bg-success/90" size="lg" disabled={isLoading}>
                <CheckCircle className="h-5 w-5 mr-2" />
                {isLoading ? 'Processing...' : 'Check In'}
              </Button>
            )}

            {/* Check Out Button */}
            {alreadyCheckedOut ? (
              <div className="flex-1 flex items-center justify-center gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                <LogOut className="h-4 w-4 text-destructive" />
                <span className="font-medium text-destructive text-sm">Checked Out</span>
              </div>
            ) : (
              <Button
                onClick={handleCheckOut}
                className="flex-1 bg-destructive hover:bg-destructive/90"
                size="lg"
                disabled={!alreadyCheckedIn || isLoading}
              >
                <LogOut className="h-5 w-5 mr-2" />
                {isLoading ? 'Processing...' : 'Check Out'}
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Current time: {format(new Date(), 'hh:mm a')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
