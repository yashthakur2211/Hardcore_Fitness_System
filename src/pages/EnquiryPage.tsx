import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Enquiry } from '@/types/gym';
import { enquiriesAPI } from '@/lib/api';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { format } from 'date-fns';

const EnquiryPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    visitDate: new Date().toISOString().split('T')[0],
    notes: '',
    referralSource: '',
  });

  const { data: enquiriesData = [], isLoading } = useQuery({
    queryKey: ['enquiries'],
    queryFn: () => enquiriesAPI.getAll(),
  });

  useEffect(() => {
    setEnquiries(enquiriesData as Enquiry[]);
  }, [enquiriesData]);

  const createEnquiryMutation = useMutation({
    mutationFn: async (payload: any) => enquiriesAPI.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enquiries'] });
      toast({ title: 'Enquiry Added', description: 'Enquiry has been recorded.' });
    },
    onError: (error: any) => {
      toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast({
        title: "Validation Error",
        description: "Please fill in name and phone number.",
        variant: "destructive",
      });
      return;
    }

    // Generate next enquiry id from API
    enquiriesAPI.generateId()
      .then(({ id }) => {
        return createEnquiryMutation.mutateAsync({
          id,
          name: formData.name,
          phone: formData.phone,
          visitDate: formData.visitDate,
          notes: formData.notes || null,
          referralSource: formData.referralSource || null,
        });
      })
      .then(() => {
        setFormData({
          name: '',
          phone: '',
          visitDate: new Date().toISOString().split('T')[0],
          notes: '',
          referralSource: '',
        });
        setShowForm(false);
      });
  };

  const filteredEnquiries = enquiries.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.phone.includes(searchTerm)
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Enquiries
          </h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gradient-accent hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Enquiry
          </Button>
        </div>

        {/* New Enquiry Form */}
        {showForm && (
          <Card className="gradient-card gradient-border border-border/50 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Add New Enquiry</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Visitor Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter name"
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone"
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visitDate">Date of Visit</Label>
                  <Input
                    id="visitDate"
                    type="date"
                    value={formData.visitDate}
                    onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referralSource">How did you hear about us?</Label>
                  <Input
                    id="referralSource"
                    value={formData.referralSource}
                    onChange={(e) => setFormData({ ...formData, referralSource: e.target.value })}
                    placeholder="e.g. Google, Friend, Instagram..."
                    className="bg-input border-border"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="bg-input border-border"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" className="gradient-accent">
                    Save Enquiry
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-input border-border max-w-md"
          />
        </div>

        {/* Enquiries Table */}
        <Card className="gradient-card gradient-border border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Visit Date</TableHead>
                  <TableHead className="text-muted-foreground">Referral Source</TableHead>
                  <TableHead className="text-muted-foreground">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Loading enquiries...
                    </TableCell>
                  </TableRow>
                ) : filteredEnquiries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No enquiries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnquiries.map((enquiry) => (
                    <TableRow key={enquiry.id} className="border-border/30 hover:bg-muted/20">
                      <TableCell className="font-medium">{enquiry.name}</TableCell>
                      <TableCell>{enquiry.phone}</TableCell>
                      <TableCell>{format(new Date(enquiry.visitDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell className="text-primary">
                        {enquiry.referralSource || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {enquiry.notes || '-'}
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

export default EnquiryPage;
