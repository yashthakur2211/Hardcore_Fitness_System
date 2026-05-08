import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';
import { DashboardWidgetCard } from './DashboardWidgetCard';
import { Input } from '@/components/ui/input';
import { Search, LayoutGrid } from 'lucide-react';

const getDashboardWidgets = (stats: any) => [
  {
    id: 'pending-fees',
    title: 'Pending Fees',
    count: stats?.pendingFees || 0,
    color: 'destructive' as const,
    icon: 'DollarSign',
    route: '/members?filter=pending-fees',
  },
  {
    id: 'expiring-soon',
    title: 'Expiring Soon',
    count: stats?.expiring || 0,
    color: 'warning' as const,
    icon: 'Clock',
    route: '/members?filter=expiring',
  },
  {
    id: 'expired',
    title: 'Subscription Expired',
    count: stats?.expired || 0,
    color: 'destructive' as const,
    icon: 'AlertCircle',
    route: '/members?filter=expired',
  },
  {
    id: 'birthdays',
    title: "Today's Birthdays",
    count: stats?.birthdays || 0,
    color: 'primary' as const,
    icon: 'Cake',
    route: '/members?filter=birthdays',
  },
  {
    id: 'absent-today',
    title: 'Absent Today',
    count: stats?.absent || 0,
    color: 'warning' as const,
    icon: 'UserX',
    route: '/attendance?filter=absent',
  },
  {
    id: 'enquiries-today',
    title: "Today's Enquiries",
    count: stats?.enquiries || 0,
    color: 'primary' as const,
    icon: 'MessageSquare',
    route: '/enquiry',
  },
  {
    id: 'active',
    title: 'Active Members',
    count: stats?.active || 0,
    color: 'success' as const,
    icon: 'Users',
    route: '/members?filter=active',
  },
  {
    id: 'cancelled',
    title: 'Cancelled Members',
    count: stats?.cancelled || 0,
    color: 'muted' as const,
    icon: 'UserMinus',
    route: '/members?filter=cancelled',
  },
];

export function DashboardSidebar() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats(),
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
  });

  const widgets = getDashboardWidgets(stats);

  const filteredWidgets = widgets.filter(widget =>
    widget.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-full lg:w-80 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <LayoutGrid className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Quick Stats</h2>
          <p className="text-xs text-muted-foreground">Real-time overview</p>
        </div>
      </div>
      
      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="Search stats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white border-border text-sm rounded-xl h-11 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Widgets */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-8 px-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading stats...</p>
          </div>
        ) : (
          <>
            {filteredWidgets.map((widget, index) => (
              <div 
                key={widget.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <DashboardWidgetCard widget={widget} />
              </div>
            ))}
            {filteredWidgets.length === 0 && (
              <div className="text-center py-8 px-4 rounded-xl border-2 border-dashed border-border">
                <Search className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No matching stats found</p>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
