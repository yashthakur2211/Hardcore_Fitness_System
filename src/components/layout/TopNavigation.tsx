import { NavLink as RouterNavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Home, UserPlus, MessageSquare, Dumbbell, Users, BarChart3, CalendarCheck, CreditCard, LogOut, IndianRupee, Menu, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { path: '/', label: 'Home', icon: Home, adminOnly: false },
  { path: '/register', label: 'Register', icon: UserPlus, adminOnly: false },
  { path: '/enquiry', label: 'Enquiry', icon: MessageSquare, adminOnly: false },
  { path: '/trainers', label: 'Trainers', icon: Dumbbell, adminOnly: false },
  { path: '/members', label: 'Members', icon: Users, adminOnly: false },
  { path: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { path: '/attendance', label: 'Attendance', icon: CalendarCheck, adminOnly: false },
  { path: '/payments', label: 'Payments', icon: CreditCard, adminOnly: false },
  { path: '/fees', label: 'Fees', icon: IndianRupee, adminOnly: true },
];

export function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    navigate('/login');
  };
  
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Main Nav Bar */}
      <div className="bg-white border-b border-border shadow-sm">
        <div className="w-full px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Logo - Left Corner */}
            <div className="flex items-center gap-2.5 shrink-0">
              <img
                src="/gym_logo.png"
                alt="Gym Logo"
                className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20"
              />
            
            </div>

            {/* Navigation - Center, Desktop */}
            <nav className="hidden xl:flex items-center gap-1 flex-1 justify-center max-w-4xl mx-8">
              {navItems
                .filter(item => !item.adminOnly || user?.role === 'admin')
                .map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <RouterNavLink
                    key={item.path}
                    to={item.path}
                    className={cn(
                      'relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap group',
                      isActive 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <Icon className={cn(
                      "h-4 w-4 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                    )} />
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                    )}
                  </RouterNavLink>
                );
              })}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3 shrink-0">
              {/* User Dropdown */}
              {user && (
                <div className="hidden sm:block relative group">
                  <button className="flex items-center gap-3 px-4 py-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                      <span className="text-xs font-bold text-white uppercase">
                        {user.username.charAt(0)}
                      </span>
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-medium text-foreground">{user.username}</span>
                      {user.role === 'admin' && (
                        <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">Admin</span>
                      )}
                      {user.role !== 'admin' && (
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">User</span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground rotate-90 group-hover:rotate-[270deg] transition-transform duration-200" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl border border-border shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="p-2">
                      <div className="px-3 py-2 border-b border-border mb-2">
                        <p className="text-sm font-medium text-foreground">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.role === 'admin' ? 'Administrator' : 'User'}</p>
                      </div>
                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="xl:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      <div className={cn(
        "xl:hidden absolute w-full bg-white border-b border-border shadow-lg transition-all duration-300 overflow-hidden",
        mobileMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <nav className="p-4 space-y-1">
          {navItems
            .filter(item => !item.adminOnly || user?.role === 'admin')
            .map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <RouterNavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'text-primary bg-primary/10' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )} />
              </RouterNavLink>
            );
          })}
          
          {/* Mobile User & Logout */}
          <div className="pt-4 mt-4 border-t border-border">
            {user && (
              <div className="flex items-center gap-3 px-4 py-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                  <span className="text-sm font-bold text-white uppercase">
                    {user.username.charAt(0)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs text-primary font-medium">Administrator</span>
                  )}
                  {user.role !== 'admin' && (
                    <span className="text-xs text-muted-foreground font-medium">User</span>
                  )}
                </div>
              </div>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
