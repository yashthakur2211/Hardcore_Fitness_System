import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { DashboardWidget } from '@/types/gym';
import {
  Wallet,
  Hourglass,
  ShieldAlert,
  PartyPopper,
  UserRoundX,
  MessagesSquare,
  UsersRound,
  UserRoundMinus,
  ChevronRight,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign: Wallet,
  Clock: Hourglass,
  AlertCircle: ShieldAlert,
  Cake: PartyPopper,
  UserX: UserRoundX,
  MessageSquare: MessagesSquare,
  Users: UsersRound,
  UserMinus: UserRoundMinus,
};

const colorClasses: Record<string, { iconBg: string; text: string; countBg: string }> = {
  success: {
    iconBg: 'bg-success/10',
    text: 'text-success',
    countBg: 'bg-success/10',
  },
  warning: {
    iconBg: 'bg-warning/10',
    text: 'text-warning',
    countBg: 'bg-warning/10',
  },
  destructive: {
    iconBg: 'bg-destructive/10',
    text: 'text-destructive',
    countBg: 'bg-destructive/10',
  },
  primary: {
    iconBg: 'bg-primary/10',
    text: 'text-primary',
    countBg: 'bg-primary/10',
  },
  muted: {
    iconBg: 'bg-muted',
    text: 'text-muted-foreground',
    countBg: 'bg-muted',
  },
};

interface DashboardWidgetCardProps {
  widget: DashboardWidget;
}

export function DashboardWidgetCard({ widget }: DashboardWidgetCardProps) {
  const navigate = useNavigate();
  const Icon = iconMap[widget.icon] || UsersRound;
  const colors = colorClasses[widget.color] || colorClasses.primary;

  return (
    <button
      onClick={() => navigate(widget.route)}
      className={cn(
        'group w-full p-4 rounded-xl bg-white border border-border transition-all duration-200 cursor-pointer',
        'hover:border-primary/30 hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          'p-3 rounded-xl transition-all duration-200 group-hover:scale-110',
          colors.iconBg
        )}>
          <Icon className={cn("h-6 w-6", colors.text)} strokeWidth={1.5} />
        </div>
        
        {/* Content */}
        <div className="text-left flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {widget.title}
          </p>
        </div>

        {/* Count Badge */}
        <div className={cn(
          'px-3 py-1.5 rounded-xl font-bold text-lg min-w-[48px] text-center',
          colors.countBg,
          colors.text
        )}>
          {widget.count}
        </div>

        {/* Arrow indicator */}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
      </div>
    </button>
  );
}
