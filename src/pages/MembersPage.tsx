import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { membersAPI, membershipsAPI, trainersAPI, getPhotoUrl } from '@/lib/api';
import { Member, Membership } from '@/types/gym';
import { Users, Search, Edit, Save, X, Camera, Upload, User, CreditCard, UserX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, differenceInDays, isPast, isAfter } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const MembersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Member>>({});
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll(),
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.getAll(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => membershipsAPI.getAll(),
  });

  // Auto-select member from URL params (e.g., when redirected from Trainers page)
  useEffect(() => {
    const memberId = searchParams.get('memberId');
    if (memberId && members.length > 0) {
      const member = (members as Member[]).find((m) => m.memberId === memberId);
      if (member) {
        setSelectedMember(member);
        // Format dob to YYYY-MM-DD for HTML date input
        const formattedMember = {
          ...member,
          dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : ''
        };
        setEditData(formattedMember);
        setPhotoPreview(getPhotoUrl(member.photo));
      }
    }
  }, [searchParams, members]);

  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => membersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Member Updated', description: 'Member information has been saved.' });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cancelMemberMutation = useMutation({
    mutationFn: (memberId: string) => membersAPI.patch(memberId, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({ title: 'Member Cancelled', description: `${selectedMember?.name} has been moved to cancelled members.` });
      setSelectedMember(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const getMemberMemberships = (memberId: string): Membership[] => {
    return memberships.filter((m: any) => m.memberId === memberId);
  };

  const getTrainerName = (trainerId?: string) => {
    if (!trainerId) return '-';
    const trainer = trainers.find((t: any) => t.trainerId === trainerId);
    return trainer?.name || '-';
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    // Format dob to YYYY-MM-DD for HTML date input
    const formattedMember = {
      ...member,
      dob: member.dob ? new Date(member.dob).toISOString().split('T')[0] : ''
    };
    setEditData(formattedMember);
    setPhotoPreview(getPhotoUrl(member.photo));
    setIsEditing(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setEditData({ ...editData, photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!selectedMember) return;
    updateMemberMutation.mutate({
      id: selectedMember.memberId,
      data: editData,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'expiring':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'expired':
      case 'cancelled':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Get the latest active membership for a member
  const getLatestMembership = (memberId: string): Membership | null => {
    const memberMemberships = memberships.filter((m: Membership) => m.memberId === memberId);
    if (memberMemberships.length === 0) return null;
    // Sort by endDate descending and return the latest
    return memberMemberships.sort((a: Membership, b: Membership) => 
      new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
    )[0];
  };

  // Calculate membership status based on dates
  const getMembershipStatus = (membership: Membership | null): 'active' | 'expiring' | 'expired' | 'none' => {
    if (!membership) return 'none';
    
    const today = new Date();
    const endDate = new Date(membership.endDate);
    const startDate = new Date(membership.startDate);
    
    // Check if expired
    if (isPast(endDate) && !isAfter(endDate, today)) {
      return 'expired';
    }
    
    // Calculate total duration and remaining days
    const totalDays = differenceInDays(endDate, startDate);
    const remainingDays = differenceInDays(endDate, today);
    const percentageRemaining = (remainingDays / totalDays) * 100;
    
    // If less than 50% of membership remaining, show as expiring (yellow)
    if (percentageRemaining <= 50) {
      return 'expiring';
    }
    
    return 'active';
  };

  // Get dynamic status color based on membership
  const getDynamicStatusColor = (memberId: string) => {
    const membership = getLatestMembership(memberId);
    const status = getMembershipStatus(membership);
    
    switch (status) {
      case 'active':
        return 'bg-success/10 text-success border-success/20';
      case 'expiring':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'expired':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Get display status text
  const getDisplayStatus = (memberId: string) => {
    const membership = getLatestMembership(memberId);
    const status = getMembershipStatus(membership);
    
    switch (status) {
      case 'expired':
        return 'Expired';
      case 'expiring':
        return 'Expiring Soon';
      case 'active':
        return 'Active';
      default:
        return 'No Membership';
    }
  };

  // Format membership end date for display
  const getMembershipEndDate = (memberId: string): string | null => {
    const membership = getLatestMembership(memberId);
    if (!membership) return null;
    return format(new Date(membership.endDate), 'dd MMM yyyy');
  };

  // Calculate total pending fees for a member
  const getTotalPendingFees = (memberId: string): number => {
    const memberMemberships = memberships.filter((m: Membership) => m.memberId === memberId);
    return memberMemberships.reduce((total: number, m: Membership) => total + (m.pending || 0), 0);
  };

  // Check if member needs to pay (pending fees or membership expiring/expired)
  const shouldShowPayButton = (memberId: string): boolean => {
    const pendingFees = getTotalPendingFees(memberId);
    const membershipStatus = getMembershipStatus(getLatestMembership(memberId));
    return pendingFees > 0 || membershipStatus === 'expiring' || membershipStatus === 'expired';
  };

  // Navigate to payments page with selected member
  const handlePayFees = (member: Member) => {
    navigate(`/payments?memberId=${member.memberId}&name=${encodeURIComponent(member.name)}`);
  };

  // Filter members based on search and URL filter params
  const filteredMembers = members.filter(
    (m: any) => {
      // First apply search filter
      const matchesSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.phone.includes(searchTerm) ||
        m.memberId.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;
      
      // Then apply URL filter
      const filter = searchParams.get('filter');
      if (!filter) return true;
      
      const membership = getLatestMembership(m.memberId);
      const membershipStatus = getMembershipStatus(membership);
      const pendingFees = getTotalPendingFees(m.memberId);
      
      switch (filter) {
        case 'pending-fees':
          return pendingFees > 0;
        case 'expiring':
          return membershipStatus === 'expiring';
        case 'expired':
          return membershipStatus === 'expired' || m.status === 'expired';
        case 'active':
          return membershipStatus === 'active' || m.status === 'active';
        case 'cancelled':
          return m.status === 'cancelled';
        case 'birthdays':
          const today = new Date();
          const dob = new Date(m.dob);
          return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
        default:
          return true;
      }
    }
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Users className="h-6 w-6 text-primary" />
          </div>
          Member Registration
        </h1>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Search & Member List */}
          <Card className="bg-white border-border shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Search Members</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or Member ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {membersLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading members...</div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No members found</div>
                ) : (
                  filteredMembers.map((member: any) => (
                    <button
                      key={member.memberId}
                      onClick={() => handleSelectMember(member)}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        selectedMember?.memberId === member.memberId
                          ? 'bg-primary/10 border border-primary/30'
                          : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20 flex-shrink-0">
                            {member.photo ? (
                              <img
                                src={getPhotoUrl(member.photo) || ''}
                                alt={member.name}
                                className="w-full h-full object-cover"
                                style={{ imageRendering: 'auto' }}
                              />
                            ) : (
                              <User className="h-6 w-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.phone}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={getDynamicStatusColor(member.memberId)}>
                            {getDisplayStatus(member.memberId)}
                          </Badge>
                          {getMembershipEndDate(member.memberId) && (
                            <span className="text-xs text-muted-foreground">
                              Expires: {getMembershipEndDate(member.memberId)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        ID: {member.memberId}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Member Details */}
          <Card className="bg-white border-border shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold">Member Details</CardTitle>
                {selectedMember && (
                  <div className="flex gap-2 flex-wrap">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={handleSave} className="bg-primary hover:bg-primary/90">
                          <Save className="h-4 w-4 mr-1" />Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                          <X className="h-4 w-4 mr-1" />Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit className="h-4 w-4 mr-1" />Edit
                        </Button>
                        {selectedMember.status !== 'cancelled' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <UserX className="h-4 w-4 mr-1" />Cancel Member
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel Membership?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will mark <strong>{selectedMember.name}</strong> as a cancelled member.
                                  They will be removed from the active members list and moved to cancelled members.
                                  You can search them later using the "cancelled" filter.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Member</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => cancelMemberMutation.mutate(selectedMember.memberId)}
                                >
                                  Yes, Cancel Member
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {selectedMember.status === 'cancelled' && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                            Cancelled
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedMember ? (
                <div className="space-y-4">
                  {/* Photo Section */}
                  <div className="flex items-center gap-4">
                    <div className="w-28 h-28 rounded-lg bg-muted/50 border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {photoPreview ? (
                        <img src={photoPreview} alt={selectedMember.name} className="w-full h-full object-cover" style={{ imageRendering: 'auto' }} />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    {isEditing && (
                      <>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                          <Upload className="h-4 w-4 mr-2" />
                          Change Photo
                        </Button>
                      </>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Member ID</Label>
                      <Input value={selectedMember.memberId} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={isEditing ? editData.name : selectedMember.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        readOnly={!isEditing}
                        className={isEditing ? 'bg-input' : 'bg-muted/50'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={isEditing ? editData.phone : selectedMember.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        readOnly={!isEditing}
                        className={isEditing ? 'bg-input' : 'bg-muted/50'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type={isEditing ? 'date' : 'text'}
                        value={isEditing ? (editData.dob || '') : (selectedMember.dob ? format(new Date(selectedMember.dob), 'MMM dd, yyyy') : 'N/A')}
                        onChange={(e) => setEditData({ ...editData, dob: e.target.value })}
                        readOnly={!isEditing}
                        className={isEditing ? 'bg-input' : 'bg-muted/50'}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address</Label>
                      <Input
                        value={isEditing ? editData.address : selectedMember.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        readOnly={!isEditing}
                        className={isEditing ? 'bg-input' : 'bg-muted/50'}
                      />
                    </div>
                    {selectedMember.hasPersonalTrainer && (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Assigned Trainer</Label>
                        <Input
                          value={getTrainerName(selectedMember.assignedTrainerId)}
                          readOnly
                          className="bg-muted/50"
                        />
                      </div>
                    )}
                  </div>

                  {/* Membership Status Section */}
                  <div className="pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold">Membership Status</h3>
                        <div className="flex items-center gap-3">
                          <Badge className={getDynamicStatusColor(selectedMember.memberId)}>
                            {getDisplayStatus(selectedMember.memberId)}
                          </Badge>
                          {getMembershipEndDate(selectedMember.memberId) && (
                            <span className="text-sm text-muted-foreground">
                              Expires: {getMembershipEndDate(selectedMember.memberId)}
                            </span>
                          )}
                        </div>
                        {getTotalPendingFees(selectedMember.memberId) > 0 && (
                          <p className="text-sm text-destructive font-medium">
                            Pending Fees: ₹{getTotalPendingFees(selectedMember.memberId)}
                          </p>
                        )}
                      </div>
                      {shouldShowPayButton(selectedMember.memberId) && (
                        <Button
                          onClick={() => handlePayFees(selectedMember)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Pay Fees
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Membership History */}
                  <div className="pt-4">
                    <h3 className="text-sm font-semibold mb-3">Membership History</h3>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="text-xs">Start</TableHead>
                          <TableHead className="text-xs">End</TableHead>
                          <TableHead className="text-xs">Duration</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs">Paid</TableHead>
                          <TableHead className="text-xs">Pending</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getMemberMemberships(selectedMember.memberId).map((m) => (
                          <TableRow key={m.id} className="border-border/30">
                            <TableCell className="text-xs">{format(new Date(m.startDate), 'MMM dd, yy')}</TableCell>
                            <TableCell className="text-xs">{format(new Date(m.endDate), 'MMM dd, yy')}</TableCell>
                            <TableCell className="text-xs">{m.duration}M</TableCell>
                            <TableCell>
                              <Badge className={m.status === 'active' ? 'bg-success/20 text-success text-xs' : 'bg-destructive/20 text-destructive text-xs'}>
                                {m.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-success">₹{m.paid}</TableCell>
                            <TableCell className="text-xs text-destructive">₹{m.pending}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a member to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MembersPage;
