import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { membersAPI, trainersAPI, dashboardAPI } from '@/lib/api';
import { MembershipDuration } from '@/types/gym';
import { UserPlus, Camera, Upload, X, Video, FlipHorizontal } from 'lucide-react';

const RegisterPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [memberId, setMemberId] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    address: '',
    membershipDuration: '' as string,
    hasPersonalTrainer: false,
    assignedTrainerId: '',
  });

  const { data: memberIdData } = useQuery({
    queryKey: ['member-id'],
    queryFn: () => membersAPI.generateId(),
    enabled: !memberId,
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.getAll(),
  });

  const { data: feeStructure = [] } = useQuery({
    queryKey: ['fee-structure'],
    queryFn: () => dashboardAPI.getFeeStructure(),
  });

  useEffect(() => {
    if (memberIdData?.memberId) {
      setMemberId(memberIdData.memberId);
    }
  }, [memberIdData]);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraStream]);

  const activeTrainers = trainers.filter((t: any) => t.isActive);

  const getCurrentPrice = (duration: number, withPT: boolean = false): number => {
    const fee = feeStructure.find((f: any) => f.duration === duration);
    if (!fee) return 0;
    if (withPT) {
      if (fee.isPtOfferActive && fee.ptOfferPrice) return fee.ptOfferPrice;
      return fee.ptBasePrice || 0;
    } else {
      if (fee.isOfferActive && fee.offerPrice) return fee.offerPrice;
      return fee.basePrice || 0;
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const openCamera = async (facing: 'user' | 'environment' = facingMode) => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      // Attach stream to video element after dialog renders
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please allow camera permission or use file upload.',
        variant: 'destructive',
      });
    }
  };

  const flipCamera = () => {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    openCamera(newFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Mirror the capture if using front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPhotoPreview(dataUrl);
    closeCamera();
  };

  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
  };

  const createMemberMutation = useMutation({
    mutationFn: (memberData: any) => membersAPI.create(memberData),
    onSuccess: () => {
      toast({
        title: 'Member Registered',
        description: `Successfully registered ${formData.name} with ID: ${memberId}. Redirecting to payment...`,
      });
      setTimeout(() => {
        navigate(`/payments?memberId=${memberId}&name=${encodeURIComponent(formData.name)}&duration=${formData.membershipDuration}&new=true`);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register member. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.dob || !formData.membershipDuration || !memberId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    createMemberMutation.mutate({
      memberId,
      name: formData.name,
      phone: formData.phone,
      dob: formData.dob,
      address: formData.address || '',
      photo: photoPreview || null,
      hasPersonalTrainer: formData.hasPersonalTrainer,
      assignedTrainerId: formData.hasPersonalTrainer && formData.assignedTrainerId
        ? formData.assignedTrainerId
        : null,
    });
  };

  const selectedDuration = formData.membershipDuration ? parseInt(formData.membershipDuration) as MembershipDuration : null;
  const regularFee = selectedDuration ? getCurrentPrice(selectedDuration, false) : 0;
  const ptFee = selectedDuration ? getCurrentPrice(selectedDuration, true) : 0;
  const totalFees = selectedDuration ? getCurrentPrice(selectedDuration, formData.hasPersonalTrainer) : 0;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white border-border shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-primary/10">
                <UserPlus className="h-6 w-6 text-primary" />
              </div>
              Register New Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Member ID */}
              <div className="space-y-2">
                <Label htmlFor="memberId" className="text-foreground">Member ID</Label>
                <Input
                  id="memberId"
                  value={memberId}
                  readOnly
                  className="bg-muted/50 text-muted-foreground cursor-not-allowed h-11"
                />
              </div>

              {/* Profile Photo */}
              <div className="space-y-2">
                <Label className="text-foreground">Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-muted/50 border border-border flex items-center justify-center overflow-hidden">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photo
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => openCamera()}>
                      <Camera className="h-4 w-4 mr-2" />
                      Take Photo
                    </Button>
                    {photoPreview && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoPreview(null)}
                        className="text-destructive hover:text-destructive">
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="dob">Date of Birth *</Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="bg-input border-border focus:ring-primary"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  className="bg-input border-border focus:ring-primary"
                />
              </div>

              {/* Personal Trainer Option - placed before duration so fees update live */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasTrainer"
                    checked={formData.hasPersonalTrainer}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, hasPersonalTrainer: !!checked, assignedTrainerId: '' })
                    }
                  />
                  <Label htmlFor="hasTrainer" className="cursor-pointer font-medium">
                    Opt for Personal Trainer
                  </Label>
                </div>

                {formData.hasPersonalTrainer && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="trainer">Assign Trainer</Label>
                    <Select
                      value={formData.assignedTrainerId}
                      onValueChange={(value) => setFormData({ ...formData, assignedTrainerId: value })}
                    >
                      <SelectTrigger className="bg-input border-border">
                        <SelectValue placeholder="Select trainer" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeTrainers.map((trainer) => (
                          <SelectItem key={trainer.trainerId} value={trainer.trainerId}>
                            {trainer.name} - {trainer.specialization}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Membership Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Membership Duration *</Label>
                <Select
                  value={formData.membershipDuration}
                  onValueChange={(value) => setFormData({ ...formData, membershipDuration: value })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      1 Month — ₹{getCurrentPrice(1, formData.hasPersonalTrainer)}
                      {formData.hasPersonalTrainer && getCurrentPrice(1, false) > 0 && ` (Regular: ₹${getCurrentPrice(1, false)})`}
                    </SelectItem>
                    <SelectItem value="3">
                      3 Months — ₹{getCurrentPrice(3, formData.hasPersonalTrainer)}
                      {formData.hasPersonalTrainer && getCurrentPrice(3, false) > 0 && ` (Regular: ₹${getCurrentPrice(3, false)})`}
                    </SelectItem>
                    <SelectItem value="6">
                      6 Months — ₹{getCurrentPrice(6, formData.hasPersonalTrainer)}
                      {formData.hasPersonalTrainer && getCurrentPrice(6, false) > 0 && ` (Regular: ₹${getCurrentPrice(6, false)})`}
                    </SelectItem>
                    <SelectItem value="12">
                      12 Months — ₹{getCurrentPrice(12, formData.hasPersonalTrainer)}
                      {formData.hasPersonalTrainer && getCurrentPrice(12, false) > 0 && ` (Regular: ₹${getCurrentPrice(12, false)})`}
                    </SelectItem>
                  </SelectContent>
                </Select>

                {/* Fee comparison card */}
                {selectedDuration && (
                  <div className={`rounded-xl border p-4 mt-2 ${formData.hasPersonalTrainer ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'}`}>
                    {formData.hasPersonalTrainer ? (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-primary">Personal Trainer Pricing</p>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-white rounded-lg p-2 border border-border">
                            <p className="text-xs text-muted-foreground">Regular Fee</p>
                            <p className="text-base font-bold text-foreground">₹{regularFee}</p>
                          </div>
                          <div className="bg-primary rounded-lg p-2">
                            <p className="text-xs text-white/80">With PT</p>
                            <p className="text-base font-bold text-white">₹{ptFee}</p>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-border">
                            <p className="text-xs text-muted-foreground">PT Add-on</p>
                            <p className="text-base font-bold text-primary">+₹{ptFee - regularFee}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Total payable: <span className="font-semibold text-primary">₹{ptFee}</span></p>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">Total Fees</p>
                        <p className="text-lg font-bold text-foreground">₹{totalFees}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full gradient-accent hover:opacity-90 transition-opacity"
                disabled={!memberId || createMemberMutation.isPending}
              >
                {createMemberMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Registering...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Register & Proceed to Payment
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Camera Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) closeCamera(); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Take Profile Photo
            </DialogTitle>
          </DialogHeader>
          <div className="relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Overlay guide circle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 rounded-full border-4 border-white/50 border-dashed" />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 gap-3 bg-background">
            <Button variant="outline" size="sm" onClick={closeCamera}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={capturePhoto}
              className="flex-1 gradient-accent hover:opacity-90"
            >
              <Camera className="h-5 w-5 mr-2" />
              Capture Photo
            </Button>
            <Button variant="outline" size="sm" onClick={flipCamera} title="Flip camera">
              <FlipHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default RegisterPage;
