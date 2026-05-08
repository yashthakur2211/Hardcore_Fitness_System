import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trainersAPI, membersAPI, membershipsAPI } from '@/lib/api';
import { Dumbbell, Search, Users, Plus, Edit, Trash2, X, Save, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { differenceInDays, isPast, isAfter, format } from 'date-fns';
import { Membership } from '@/types/gym';

const TrainersPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTrainer, setEditingTrainer] = useState<any>(null);
  const [newTrainerId, setNewTrainerId] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    specialization: '',
    isActive: true,
  });

  const { data: trainers = [], isLoading: trainersLoading } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.getAll(),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll(),
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ['memberships'],
    queryFn: () => membershipsAPI.getAll(),
  });

  const { data: trainerIdData } = useQuery({
    queryKey: ['trainer-id'],
    queryFn: () => trainersAPI.generateId(),
    enabled: isAddDialogOpen && !newTrainerId,
  });

  useEffect(() => {
    if (trainerIdData?.trainerId) {
      setNewTrainerId(trainerIdData.trainerId);
    }
  }, [trainerIdData]);

  // Create trainer mutation
  const createTrainerMutation = useMutation({
    mutationFn: (data: any) => trainersAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-id'] });
      toast({ title: 'Trainer Added', description: 'New trainer has been added successfully.' });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update trainer mutation
  const updateTrainerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => trainersAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({ title: 'Trainer Updated', description: 'Trainer information has been updated.' });
      setIsEditDialogOpen(false);
      setEditingTrainer(null);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete trainer mutation
  const deleteTrainerMutation = useMutation({
    mutationFn: (id: string) => trainersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainers'] });
      toast({ title: 'Trainer Deleted', description: 'Trainer has been removed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', phone: '', specialization: '', isActive: true });
    setNewTrainerId('');
  };

  const handleAddTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !newTrainerId) {
      toast({ title: 'Validation Error', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }
    createTrainerMutation.mutate({
      trainerId: newTrainerId,
      ...formData,
    });
  };

  const handleEditTrainer = (trainer: any) => {
    setEditingTrainer(trainer);
    setFormData({
      name: trainer.name,
      phone: trainer.phone,
      specialization: trainer.specialization || '',
      isActive: trainer.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateTrainer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrainer) return;
    updateTrainerMutation.mutate({
      id: editingTrainer.trainerId,
      data: formData,
    });
  };

  const handleDeleteTrainer = (trainerId: string) => {
    if (confirm('Are you sure you want to delete this trainer?')) {
      deleteTrainerMutation.mutate(trainerId);
    }
  };

  // Get members with personal trainers
  const membersWithTrainers = members.filter((m: any) => m.hasPersonalTrainer);

  const filteredMembers = membersWithTrainers.filter((member: any) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.phone.includes(searchTerm) ||
      member.memberId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTrainer = selectedTrainer === 'all' || member.assignedTrainerId === selectedTrainer;
    return matchesSearch && matchesTrainer;
  });

  const getTrainerName = (trainerId?: string) => {
    if (!trainerId) return '-';
    const trainer = trainers.find((t: any) => t.trainerId === trainerId);
    return trainer?.name || '-';
  };

  // Get the latest active membership for a member
  const getLatestMembership = (memberId: string): Membership | null => {
    const memberMemberships = memberships.filter((m: Membership) => m.memberId === memberId);
    if (memberMemberships.length === 0) return null;
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
    
    if (isPast(endDate) && !isAfter(endDate, today)) {
      return 'expired';
    }
    
    const totalDays = differenceInDays(endDate, startDate);
    const remainingDays = differenceInDays(endDate, today);
    const percentageRemaining = (remainingDays / totalDays) * 100;
    
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

  // Check if member needs to pay
  const shouldShowPayButton = (memberId: string): boolean => {
    const pendingFees = getTotalPendingFees(memberId);
    const membershipStatus = getMembershipStatus(getLatestMembership(memberId));
    return pendingFees > 0 || membershipStatus === 'expiring' || membershipStatus === 'expired';
  };

  // Navigate to payments page
  const handlePayFees = (e: React.MouseEvent, member: any) => {
    e.stopPropagation();
    navigate(`/payments?memberId=${member.memberId}&name=${encodeURIComponent(member.name)}`);
  };

  // Navigate to members page with specific member
  const handleMemberClick = (member: any) => {
    navigate(`/members?memberId=${member.memberId}`);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Dumbbell className="h-6 w-6 text-primary" />
            </div>
            Personal Trainers
          </h1>
          
          {/* Add Trainer Button */}
          <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Add Trainer
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  Add New Trainer
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTrainer} className="space-y-4">
                <div className="space-y-2">
                  <Label>Trainer ID</Label>
                  <Input value={newTrainerId} readOnly className="bg-muted/50" />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter trainer name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g., Strength Training, Yoga, CrossFit"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-border"
                  />
                  <Label htmlFor="isActive">Active Status</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                    <Save className="h-4 w-4 mr-2" />
                    Add Trainer
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Trainers List */}
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Trainer List
              <Badge variant="secondary" className="ml-2">{trainers.length} trainers</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Trainer ID</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Specialization</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainersLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Loading trainers...
                    </TableCell>
                  </TableRow>
                ) : trainers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
                        <p>No trainers found. Add your first trainer!</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  trainers.map((trainer: any) => (
                    <TableRow key={trainer.trainerId} className="border-border/50 hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">{trainer.trainerId}</TableCell>
                      <TableCell className="font-medium">{trainer.name}</TableCell>
                      <TableCell>{trainer.phone}</TableCell>
                      <TableCell>{trainer.specialization || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          className={trainer.isActive 
                            ? 'bg-success/10 text-success border-success/20' 
                            : 'bg-muted text-muted-foreground'
                          }
                        >
                          {trainer.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditTrainer(trainer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteTrainer(trainer.trainerId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Trainer Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingTrainer(null);
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                Edit Trainer
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateTrainer} className="space-y-4">
              <div className="space-y-2">
                <Label>Trainer ID</Label>
                <Input value={editingTrainer?.trainerId || ''} readOnly className="bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter trainer name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="e.g., Strength Training, Yoga, CrossFit"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-border"
                />
                <Label htmlFor="editIsActive">Active Status</Label>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Update Trainer
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Members with Personal Trainers */}
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Members with Personal Trainers
              <Badge variant="secondary" className="ml-2">{membersWithTrainers.length} members</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-border"
                />
              </div>
              <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                <SelectTrigger className="w-full sm:w-48 bg-white border-border">
                  <SelectValue placeholder="Filter by trainer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trainers</SelectItem>
                  {trainers.filter((t: any) => t.isActive).map((trainer: any) => (
                    <SelectItem key={trainer.trainerId} value={trainer.trainerId}>
                      {trainer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Members Table */}
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Photo</TableHead>
                  <TableHead className="text-muted-foreground">Member ID</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Assigned Trainer</TableHead>
                  <TableHead className="text-muted-foreground">Membership Status</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {membersLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Loading members...
                    </TableCell>
                  </TableRow>
                ) : filteredMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p>No members with personal training found</p>
                        <p className="text-sm text-muted-foreground/70">Members who register for personal training will appear here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMembers.map((member: any) => (
                    <TableRow 
                      key={member.memberId} 
                      className="border-border/50 hover:bg-muted/30 cursor-pointer"
                      onClick={() => handleMemberClick(member)}
                    >
                      <TableCell>
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="h-6 w-6 text-primary" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{member.memberId}</TableCell>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.phone}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Dumbbell className="h-4 w-4 text-primary" />
                          {getTrainerName(member.assignedTrainerId)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge className={`w-fit ${getDynamicStatusColor(member.memberId)}`}>
                            {getDisplayStatus(member.memberId)}
                          </Badge>
                          {getMembershipEndDate(member.memberId) && (
                            <span className="text-xs text-muted-foreground">
                              Expires: {getMembershipEndDate(member.memberId)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {shouldShowPayButton(member.memberId) && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handlePayFees(e, member)}
                            className="text-primary border-primary/30 hover:bg-primary/10"
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pay Fees
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default TrainersPage;