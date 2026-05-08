import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { authAPI } from '@/lib/api';
import { UserPlus, Dumbbell, ArrowLeft, Shield, User } from 'lucide-react';

const UserRegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'admin' | 'user',
    contactMethod: 'email' as 'email' | 'phone',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    authAPI.checkStatus()
      .then(({ hasAdmin }) => setHasAdmin(hasAdmin))
      .catch(() => setHasAdmin(false))
      .finally(() => setStatusLoading(false));
  }, []);

  // If admin already exists and user tries to select admin, reset to user
  useEffect(() => {
    if (hasAdmin && formData.role === 'admin') {
      setFormData(prev => ({ ...prev, role: 'user' }));
    }
  }, [hasAdmin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      toast({ title: 'Validation Error', description: 'Username and password are required', variant: 'destructive' });
      return;
    }

    if (formData.contactMethod === 'email') {
      if (!formData.email) {
        toast({ title: 'Validation Error', description: 'Email is required', variant: 'destructive' });
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({ title: 'Validation Error', description: 'Please enter a valid email address', variant: 'destructive' });
        return;
      }
    } else {
      if (!formData.phone) {
        toast({ title: 'Validation Error', description: 'Phone number is required', variant: 'destructive' });
        return;
      }
    }

    if (formData.password.length < 6) {
      toast({ title: 'Validation Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: 'Validation Error', description: 'Passwords do not match', variant: 'destructive' });
      return;
    }

    if (formData.role === 'admin' && hasAdmin) {
      toast({ title: 'Not Allowed', description: 'An admin account already exists', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.register({
        username: formData.username,
        email: formData.contactMethod === 'email' ? formData.email : undefined,
        phone: formData.contactMethod === 'phone' ? formData.phone : undefined,
        password: formData.password,
        role: formData.role,
      });
      toast({
        title: 'Registration Successful',
        description: `Your ${formData.role} account has been created. Please login.`,
      });
      navigate('/login');
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md bg-white border-border shadow-xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <Dumbbell className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Create Account</CardTitle>
            <CardDescription className="mt-2">Register for GymMaster Hub</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {statusLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              {/* Contact Method Toggle */}
              <div className="space-y-2">
                <Label>Contact Method *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contactMethod: 'email' }))}
                    className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                      formData.contactMethod === 'email'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, contactMethod: 'phone' }))}
                    className={`h-11 rounded-lg border text-sm font-medium transition-colors ${
                      formData.contactMethod === 'phone'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    Phone Number
                  </button>
                </div>
              </div>

              {/* Email or Phone */}
              {formData.contactMethod === 'email' ? (
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password (min 6 characters)"
                  className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className="h-11 bg-white border-border focus:border-primary focus:ring-1 focus:ring-primary/20"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label>Account Role *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: 'user' }))}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-sm font-medium transition-colors ${
                      formData.role === 'user'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <User className="h-5 w-5" />
                    User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasAdmin) setFormData(prev => ({ ...prev, role: 'admin' }));
                    }}
                    disabled={!!hasAdmin}
                    title={hasAdmin ? 'An admin account already exists' : 'Register as administrator'}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 text-sm font-medium transition-colors ${
                      formData.role === 'admin'
                        ? 'bg-primary text-white border-primary'
                        : hasAdmin
                        ? 'bg-muted text-muted-foreground border-border cursor-not-allowed opacity-50'
                        : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    <Shield className="h-5 w-5" />
                    Admin
                    {hasAdmin && <span className="text-[10px] opacity-70">Not available</span>}
                  </button>
                </div>
                {formData.role === 'admin' && !hasAdmin && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    You are registering as the system administrator. This is only allowed once.
                  </p>
                )}
                {hasAdmin && (
                  <p className="text-xs text-muted-foreground">
                    Admin account already exists. You can register as a User.
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-medium"
                disabled={isLoading || statusLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create {formData.role === 'admin' ? 'Admin' : 'User'} Account
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserRegisterPage;
