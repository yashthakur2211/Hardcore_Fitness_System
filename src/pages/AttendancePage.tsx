import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { attendanceAPI, trainerAttendanceAPI, membersAPI, trainersAPI } from '@/lib/api';
import { MemberAttendanceEntry } from '@/components/attendance/MemberAttendanceEntry';
import { TrainerAttendanceEntry } from '@/components/attendance/TrainerAttendanceEntry';
import { CalendarCheck, Search, User, Calendar, Clock, Dumbbell, Keyboard } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { Member } from '@/types/gym';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type FilterType = 'day' | 'week' | 'month' | 'year';

const AttendancePage = () => {
  const [searchParams] = useSearchParams();
  const absentFilter = searchParams.get('filter') === 'absent';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>(absentFilter ? 'week' : 'month');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showMemberEntry, setShowMemberEntry] = useState(false);
  const [selectedTrainer, setSelectedTrainer] = useState<any>(null);
  const [showTrainerEntry, setShowTrainerEntry] = useState(false);
  const [activeTab, setActiveTab] = useState('members');

  // Keyboard buffer for quick attendance entry
  const [keyBuffer, setKeyBuffer] = useState('');
  const keyBufferRef = useRef('');
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll(),
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.getAll(),
  });

  const getDateRange = () => {
    if (filterType === 'day') {
      return { start: selectedDate, end: selectedDate };
    } else if (filterType === 'week') {
      const today = new Date();
      return {
        start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    } else if (filterType === 'month') {
      const date = parseISO(`${selectedMonth}-01`);
      return {
        start: format(startOfMonth(date), 'yyyy-MM-dd'),
        end: format(endOfMonth(date), 'yyyy-MM-dd'),
      };
    } else {
      const date = parseISO(`${selectedYear}-01-01`);
      return {
        start: format(startOfYear(date), 'yyyy-MM-dd'),
        end: format(endOfYear(date), 'yyyy-MM-dd'),
      };
    }
  };

  const { start, end } = getDateRange();

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance-range', start, end],
    queryFn: () => attendanceAPI.getRange(start, end),
    enabled: !!start && !!end,
  });

  const { data: trainerAttendance = [] } = useQuery({
    queryKey: ['trainer-attendance-range', start, end],
    queryFn: () => trainerAttendanceAPI.getRange(start, end),
    enabled: !!start && !!end,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: trainerTodayAttendance = [] } = useQuery({
    queryKey: ['trainer-attendance-today', today],
    queryFn: () => trainerAttendanceAPI.getAll(today),
  });

  const { data: memberTodayAttendance = [] } = useQuery({
    queryKey: ['attendance-today', today],
    queryFn: () => attendanceAPI.getAll(today),
  });

  const activeMembers = (members as any[]).filter(
    (m) => m.status === 'active' || m.status === 'expiring'
  );
  const activeTrainers = (trainers as any[]).filter((t: any) => t.isActive);

  const filteredMembers = activeMembers.filter(
    (m) => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.memberId.includes(searchTerm)
  );

  const getAttendanceCount = (memberId: string) =>
    (attendance as any[]).filter((a) => a.memberId === memberId && a.status === 'present').length;

  const getTrainerAttendanceCount = (trainerId: string) =>
    (trainerAttendance as any[]).filter((a) => a.trainerId === trainerId && a.status === 'present').length;

  const getTrainerTodayAttendance = (trainerId: string) =>
    (trainerTodayAttendance as any[]).find((a) => a.trainerId === trainerId && a.date === today);

  const getTotalDays = () => {
    if (filterType === 'day') return 1;
    if (filterType === 'week') return 7;
    if (filterType === 'month') {
      const date = parseISO(`${selectedMonth}-01`);
      return endOfMonth(date).getDate();
    }
    return 365;
  };

  const getStatusColor = (status: string) =>
    status === 'active'
      ? 'bg-success/20 text-success border-success/30'
      : status === 'expiring'
      ? 'bg-warning/20 text-warning border-warning/30'
      : 'bg-destructive/20 text-destructive border-destructive/30';

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const getFilterLabel = () => {
    if (filterType === 'day') return format(parseISO(selectedDate), 'PPP');
    if (filterType === 'week') return 'This Week';
    if (filterType === 'month') {
      const [year, month] = selectedMonth.split('-');
      return `${months.find((m) => m.value === month)?.label} ${year}`;
    }
    return selectedYear;
  };

  const handleMemberClick = (member: Member) => {
    setSelectedMember(member);
    setShowMemberEntry(true);
  };

  const handleTrainerClick = (trainer: any) => {
    setSelectedTrainer(trainer);
    setShowTrainerEntry(true);
  };

  // ── Keyboard quick-entry logic ──────────────────────────────────────────────

  const processKeyboardEntry = useCallback(async (input: string) => {
    const num = parseInt(input, 10);
    if (isNaN(num) || input.trim() === '') return;

    if (activeTab === 'members') {
      const member = (members as any[]).find((m) => {
        const mNum = parseInt(m.memberId.replace(/\D/g, ''), 10);
        return mNum === num && (m.status === 'active' || m.status === 'expiring');
      });

      if (!member) {
        toast({ title: 'Member not found', description: `No active member with ID number ${num}`, variant: 'destructive' });
        return;
      }

      // Always fetch fresh from server — avoids stale-closure bug after check-in
      const freshAttendance = await attendanceAPI.getAll(today);
      const alreadyMarked = (freshAttendance as any[]).some(
        (a) => a.memberId === member.memberId && a.status === 'present'
      );

      if (alreadyMarked) {
        toast({ title: 'Already marked', description: `${member.name}'s attendance is already recorded for today` });
        return;
      }

      try {
        const { id } = await attendanceAPI.generateId();
        const now = new Date();
        await attendanceAPI.mark({ id, memberId: member.memberId, date: today, status: 'present', checkInTime: format(now, 'HH:mm') });
        queryClient.invalidateQueries({ queryKey: ['attendance-range'] });
        queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
        toast({ title: `✓ ${member.name}`, description: `Checked in at ${format(now, 'hh:mm a')}` });
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Could not mark attendance', variant: 'destructive' });
      }
    } else {
      const trainer = (trainers as any[]).find((t) => {
        const tNum = parseInt(t.trainerId.replace(/\D/g, ''), 10);
        return tNum === num && t.isActive;
      });

      if (!trainer) {
        toast({ title: 'Trainer not found', description: `No active trainer with ID number ${num}`, variant: 'destructive' });
        return;
      }

      // Always fetch fresh from server — avoids stale-closure bug between check-in and check-out
      const freshAttendance = await trainerAttendanceAPI.getAll(today);
      const todayRecord = (freshAttendance as any[]).find(
        (a) => a.trainerId === trainer.trainerId && a.date === today
      );

      const now = new Date();
      const time = format(now, 'HH:mm');

      if (!todayRecord) {
        try {
          const { id } = await trainerAttendanceAPI.generateId();
          await trainerAttendanceAPI.mark({ id, trainerId: trainer.trainerId, date: today, status: 'present', checkInTime: time, checkOutTime: null });
          queryClient.invalidateQueries({ queryKey: ['trainer-attendance-range'] });
          queryClient.invalidateQueries({ queryKey: ['trainer-attendance-today'] });
          queryClient.invalidateQueries({ queryKey: ['trainer-attendance'] });
          toast({ title: `✓ ${trainer.name} — Checked In`, description: `Check-in at ${format(now, 'hh:mm a')}` });
        } catch (err: any) {
          toast({ title: 'Error', description: err.message || 'Could not check in', variant: 'destructive' });
        }
      } else if (!todayRecord.checkOutTime) {
        try {
          const result = await trainerAttendanceAPI.checkout(trainer.trainerId);
          queryClient.invalidateQueries({ queryKey: ['trainer-attendance-range'] });
          queryClient.invalidateQueries({ queryKey: ['trainer-attendance-today'] });
          queryClient.invalidateQueries({ queryKey: ['trainer-attendance'] });
          toast({ title: `✓ ${trainer.name} — Checked Out`, description: `Check-out at ${result.checkOutTime}` });
        } catch (err: any) {
          toast({ title: 'Error', description: err.message || 'Could not check out', variant: 'destructive' });
        }
      } else {
        toast({ title: 'Already complete', description: `${trainer.name} has already checked in and out today` });
      }
    }
  }, [activeTab, members, trainers, today, queryClient, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when user is typing in a form field
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      // Don't intercept when a dialog is open
      if (showMemberEntry || showTrainerEntry) return;

      if (/^\d$/.test(e.key)) {
        keyBufferRef.current += e.key;
        setKeyBuffer(keyBufferRef.current);
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => {
          keyBufferRef.current = '';
          setKeyBuffer('');
        }, 5000);
      } else if (e.key === 'Backspace') {
        keyBufferRef.current = keyBufferRef.current.slice(0, -1);
        setKeyBuffer(keyBufferRef.current);
      } else if (e.key === 'Escape') {
        keyBufferRef.current = '';
        setKeyBuffer('');
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      } else if (e.key === 'Enter') {
        if (keyBufferRef.current && !isProcessingRef.current) {
          e.preventDefault();
          const input = keyBufferRef.current;
          keyBufferRef.current = '';
          setKeyBuffer('');
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
          isProcessingRef.current = true;
          processKeyboardEntry(input).finally(() => {
            isProcessingRef.current = false;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [showMemberEntry, showTrainerEntry, processKeyboardEntry]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Attendance
          </h1>
          {/* Keyboard shortcut hint */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" />
            Type member/trainer number + Enter to mark attendance
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="members">Member Attendance</TabsTrigger>
            <TabsTrigger value="trainers">Trainer Attendance</TabsTrigger>
          </TabsList>

          {/* Common Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Filter Type</label>
              <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                <SelectTrigger className="w-[140px] bg-input border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === 'day' && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Select Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[180px] bg-input border-border"
                />
              </div>
            )}

            {filterType === 'month' && (
              <div className="flex gap-2">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Month</label>
                  <Select
                    value={selectedMonth.split('-')[1]}
                    onValueChange={(v) => setSelectedMonth(`${selectedMonth.split('-')[0]}-${v}`)}
                  >
                    <SelectTrigger className="w-[140px] bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Year</label>
                  <Select
                    value={selectedMonth.split('-')[0]}
                    onValueChange={(v) => setSelectedMonth(`${v}-${selectedMonth.split('-')[1]}`)}
                  >
                    <SelectTrigger className="w-[100px] bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {filterType === 'year' && (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Select Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px] bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2 flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-input border-border"
                />
              </div>
            </div>
          </div>

          {/* Period Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Showing attendance for: <span className="text-foreground font-medium">{getFilterLabel()}</span></span>
          </div>

          {/* Member Attendance Tab */}
          <TabsContent value="members">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredMembers.map((member) => {
                const attendanceCount = getAttendanceCount(member.memberId);
                const totalDays = getTotalDays();
                const percentage = Math.round((attendanceCount / totalDays) * 100);
                const markedToday = (memberTodayAttendance as any[]).some(
                  (a) => a.memberId === member.memberId && a.status === 'present'
                );

                return (
                  <Card
                    key={member.memberId}
                    className="gradient-card gradient-border border-border/50 hover:scale-[1.02] transition-transform cursor-pointer"
                    onClick={() => handleMemberClick(member)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                          {member.photo ? (
                            <img src={member.photo} alt={member.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="h-8 w-8 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs text-muted-foreground">{member.memberId}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getStatusColor(member.status)}>{member.status}</Badge>
                          {markedToday && (
                            <Badge className="bg-success/20 text-success border-success/30 text-[10px]">Today ✓</Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Attendance:</span>
                          <span className="font-semibold text-primary">
                            {attendanceCount} / {totalDays} days
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-muted-foreground">{percentage}% attendance</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredMembers.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">No members found matching your search.</div>
            )}
          </TabsContent>

          {/* Trainer Attendance Tab */}
          <TabsContent value="trainers">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeTrainers.map((trainer) => {
                const attendanceCount = getTrainerAttendanceCount(trainer.trainerId);
                const totalDays = getTotalDays();
                const percentage = Math.round((attendanceCount / totalDays) * 100);
                const todayAttendance = getTrainerTodayAttendance(trainer.trainerId);

                return (
                  <Card
                    key={trainer.trainerId}
                    className="gradient-card gradient-border border-border/50 hover:scale-[1.02] transition-transform cursor-pointer"
                    onClick={() => handleTrainerClick(trainer)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center border-2 border-warning/30">
                          <Dumbbell className="h-8 w-8 text-warning" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{trainer.name}</p>
                          <p className="text-xs text-muted-foreground">{trainer.specialization}</p>
                        </div>
                        <Badge className="bg-success/20 text-success border-success/30">Active</Badge>
                      </div>

                      {/* Today's Time */}
                      {todayAttendance && (
                        <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Today:</span>
                          </div>
                          <div className="flex justify-between mt-1 text-sm">
                            <span>In: <span className="font-medium text-success">{todayAttendance.checkInTime}</span></span>
                            <span>Out: <span className="font-medium text-destructive">{todayAttendance.checkOutTime || '—'}</span></span>
                          </div>
                        </div>
                      )}

                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Attendance:</span>
                          <span className="font-semibold text-primary">
                            {attendanceCount} / {totalDays} days
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-warning h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-right text-xs text-muted-foreground">{percentage}% attendance</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Floating keyboard input HUD */}
      {keyBuffer && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl bg-gray-900 text-white shadow-2xl border border-white/10 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-200">
          <Keyboard className="h-4 w-4 text-primary" />
          <span className="text-sm text-gray-400">
            {activeTab === 'members' ? 'Member' : 'Trainer'} ID:
          </span>
          <span className="text-2xl font-mono font-bold tracking-widest text-primary">
            {keyBuffer}
          </span>
          <span className="text-xs text-gray-500 ml-1">↵ Enter</span>
        </div>
      )}

      {/* Member Attendance Entry Dialog */}
      <MemberAttendanceEntry
        member={selectedMember}
        isOpen={showMemberEntry}
        onClose={() => setShowMemberEntry(false)}
      />

      {/* Trainer Attendance Entry Dialog */}
      <TrainerAttendanceEntry
        trainer={selectedTrainer}
        isOpen={showTrainerEntry}
        onClose={() => setShowTrainerEntry(false)}
      />
    </MainLayout>
  );
};

export default AttendancePage;
