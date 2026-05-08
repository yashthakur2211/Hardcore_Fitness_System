import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { dashboardAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { FeeStructure } from '@/types/gym';
import { IndianRupee, Save, Edit, Shield } from 'lucide-react';

const FeesPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingPtId, setEditingPtId] = useState<number | null>(null);
  const [editData, setEditData] = useState<Partial<FeeStructure>>({});
  const [editPtData, setEditPtData] = useState<Partial<FeeStructure>>({});

  const { data: feeStructure = [], isLoading } = useQuery({
    queryKey: ['fee-structure'],
    queryFn: () => dashboardAPI.getFeeStructure(),
  });

  useEffect(() => {
    setFees(feeStructure as FeeStructure[]);
  }, [feeStructure]);

  const updateFeeMutation = useMutation({
    mutationFn: ({ duration, fee }: { duration: number; fee: any }) => dashboardAPI.updateFeeStructure(duration, fee),
    onSuccess: (resp) => {
      queryClient.invalidateQueries({ queryKey: ['fee-structure'] });
      setEditingId(null);
      toast({ title: 'Fee Updated', description: 'Fee structure saved to database.' });
      if (resp?.fees) setFees(resp.fees as FeeStructure[]);
    },
    onError: (error: any) => {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (fee: FeeStructure) => {
    setEditingId(fee.duration);
    setEditData(fee);
  };

  const handleEditPt = (fee: FeeStructure) => {
    setEditingPtId(fee.duration);
    setEditPtData(fee);
  };

  const handleSave = (duration: number) => {
    updateFeeMutation.mutate({
      duration,
      fee: {
        duration,
        basePrice: editData.basePrice,
        offerPrice: editData.offerPrice ?? null,
        offerName: editData.offerName ?? null,
        isOfferActive: !!editData.isOfferActive,
        ptBasePrice: fees.find(f => f.duration === duration)?.ptBasePrice ?? 0,
        ptOfferPrice: fees.find(f => f.duration === duration)?.ptOfferPrice ?? null,
        ptOfferName: fees.find(f => f.duration === duration)?.ptOfferName ?? null,
        isPtOfferActive: fees.find(f => f.duration === duration)?.isPtOfferActive ?? false,
      },
    });
  };

  const handleSavePt = (duration: number) => {
    const currentFee = fees.find(f => f.duration === duration);
    updateFeeMutation.mutate({
      duration,
      fee: {
        duration,
        basePrice: currentFee?.basePrice ?? 0,
        offerPrice: currentFee?.offerPrice ?? null,
        offerName: currentFee?.offerName ?? null,
        isOfferActive: currentFee?.isOfferActive ?? false,
        ptBasePrice: editPtData.ptBasePrice,
        ptOfferPrice: editPtData.ptOfferPrice ?? null,
        ptOfferName: editPtData.ptOfferName ?? null,
        isPtOfferActive: !!editPtData.isPtOfferActive,
      },
    });
    setEditingPtId(null);
  };

  if (!user || user.role !== 'admin') {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-12">
          <Card className="gradient-card gradient-border border-border/50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-gradient">Admin Access Required</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Please login with an admin account to manage fees.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Go to the login page and sign in as <b>admin</b>.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
            <IndianRupee className="h-6 w-6 text-primary" />
            Fee Structure Management
          </h1>
        </div>

        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Membership Pricing</CardTitle>
            <p className="text-sm text-muted-foreground">
              Update base prices and add special offers. Changes will apply to all new memberships.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Duration</TableHead>
                  <TableHead>Base Price</TableHead>
                  <TableHead>Offer Price</TableHead>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Offer Active</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Loading fee structure...
                    </TableCell>
                  </TableRow>
                )}
                {fees.map((fee) => (
                  <TableRow key={fee.duration} className="border-border/30">
                    <TableCell className="font-medium">{fee.duration} Month{fee.duration > 1 ? 's' : ''}</TableCell>
                    <TableCell>
                      {editingId === fee.duration ? (
                        <Input
                          type="number"
                          value={editData.basePrice}
                          onChange={(e) => setEditData({ ...editData, basePrice: +e.target.value })}
                          className="w-24 bg-input"
                        />
                      ) : (
                        `₹${fee.basePrice}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === fee.duration ? (
                        <Input
                          type="number"
                          value={editData.offerPrice || ''}
                          onChange={(e) => setEditData({ ...editData, offerPrice: +e.target.value || undefined })}
                          placeholder="Optional"
                          className="w-24 bg-input"
                        />
                      ) : (
                        fee.offerPrice ? `₹${fee.offerPrice}` : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === fee.duration ? (
                        <Input
                          value={editData.offerName || ''}
                          onChange={(e) => setEditData({ ...editData, offerName: e.target.value || undefined })}
                          placeholder="e.g. Summer Sale"
                          className="w-32 bg-input"
                        />
                      ) : (
                        fee.offerName || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === fee.duration ? (
                        <Switch
                          checked={editData.isOfferActive}
                          onCheckedChange={(checked) => setEditData({ ...editData, isOfferActive: checked })}
                        />
                      ) : (
                        <span className={fee.isOfferActive ? 'text-success' : 'text-muted-foreground'}>
                          {fee.isOfferActive ? 'Yes' : 'No'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      ₹{fee.isOfferActive && fee.offerPrice ? fee.offerPrice : fee.basePrice}
                    </TableCell>
                    <TableCell>
                      {editingId === fee.duration ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSave(fee.duration)} className="gradient-accent">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEdit(fee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Personal Trainer Pricing */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Personal Trainer Pricing</CardTitle>
            <p className="text-sm text-muted-foreground">
              Set pricing for members who opt for personal training. These fees are charged in addition to or instead of regular membership.
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50">
                  <TableHead>Duration</TableHead>
                  <TableHead>PT Base Price</TableHead>
                  <TableHead>PT Offer Price</TableHead>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Offer Active</TableHead>
                  <TableHead>Current PT Price</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fees.map((fee) => (
                  <TableRow key={`pt-${fee.duration}`} className="border-border/30">
                    <TableCell className="font-medium">{fee.duration} Month{fee.duration > 1 ? 's' : ''}</TableCell>
                    <TableCell>
                      {editingPtId === fee.duration ? (
                        <Input
                          type="number"
                          value={editPtData.ptBasePrice}
                          onChange={(e) => setEditPtData({ ...editPtData, ptBasePrice: +e.target.value })}
                          className="w-24 bg-input"
                        />
                      ) : (
                        `₹${fee.ptBasePrice || 0}`
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPtId === fee.duration ? (
                        <Input
                          type="number"
                          value={editPtData.ptOfferPrice || ''}
                          onChange={(e) => setEditPtData({ ...editPtData, ptOfferPrice: +e.target.value || undefined })}
                          placeholder="Optional"
                          className="w-24 bg-input"
                        />
                      ) : (
                        fee.ptOfferPrice ? `₹${fee.ptOfferPrice}` : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPtId === fee.duration ? (
                        <Input
                          value={editPtData.ptOfferName || ''}
                          onChange={(e) => setEditPtData({ ...editPtData, ptOfferName: e.target.value || undefined })}
                          placeholder="e.g. PT Special"
                          className="w-32 bg-input"
                        />
                      ) : (
                        fee.ptOfferName || '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {editingPtId === fee.duration ? (
                        <Switch
                          checked={editPtData.isPtOfferActive}
                          onCheckedChange={(checked) => setEditPtData({ ...editPtData, isPtOfferActive: checked })}
                        />
                      ) : (
                        <span className={fee.isPtOfferActive ? 'text-success' : 'text-muted-foreground'}>
                          {fee.isPtOfferActive ? 'Yes' : 'No'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      ₹{fee.isPtOfferActive && fee.ptOfferPrice ? fee.ptOfferPrice : (fee.ptBasePrice || 0)}
                    </TableCell>
                    <TableCell>
                      {editingPtId === fee.duration ? (
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleSavePt(fee.duration)} className="gradient-accent">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingPtId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEditPt(fee)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Current Active Offers Summary */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Active Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Regular Membership Offers */}
              {fees.filter(f => f.isOfferActive && f.offerPrice).map(fee => (
                <div key={fee.duration} className="p-4 rounded-lg bg-success/10 border border-success/30">
                  <p className="font-semibold text-success">{fee.offerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {fee.duration} Month{fee.duration > 1 ? 's' : ''}: 
                    <span className="line-through mx-2">₹{fee.basePrice}</span>
                    <span className="text-success font-bold">₹{fee.offerPrice}</span>
                    <span className="text-xs ml-2">({Math.round((1 - (fee.offerPrice! / fee.basePrice)) * 100)}% off)</span>
                  </p>
                </div>
              ))}
              {/* PT Offers */}
              {fees.filter(f => f.isPtOfferActive && f.ptOfferPrice).map(fee => (
                <div key={`pt-offer-${fee.duration}`} className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="font-semibold text-primary">{fee.ptOfferName} (Personal Trainer)</p>
                  <p className="text-sm text-muted-foreground">
                    {fee.duration} Month{fee.duration > 1 ? 's' : ''}: 
                    <span className="line-through mx-2">₹{fee.ptBasePrice}</span>
                    <span className="text-primary font-bold">₹{fee.ptOfferPrice}</span>
                    <span className="text-xs ml-2">({Math.round((1 - (fee.ptOfferPrice! / fee.ptBasePrice)) * 100)}% off)</span>
                  </p>
                </div>
              ))}
              {fees.filter(f => (f.isOfferActive && f.offerPrice) || (f.isPtOfferActive && f.ptOfferPrice)).length === 0 && (
                <p className="text-muted-foreground">No active offers at the moment.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FeesPage;
