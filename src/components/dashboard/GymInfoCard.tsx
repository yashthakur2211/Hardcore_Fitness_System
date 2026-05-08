import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '@/lib/api';
import { MapPin, Phone, Mail, Clock, Dumbbell, Star, Play } from 'lucide-react';

export function GymInfoCard() {
  const { data: gymInfo, isLoading } = useQuery({
    queryKey: ['gym-info'],
    queryFn: () => dashboardAPI.getGymInfo(),
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="animate-pulse">
          <div className="h-48 bg-muted"></div>
          <div className="p-6 space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!gymInfo) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Banner Image Section */}
      <div className="relative h-56 md:h-64 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        {/* Background Pattern/Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80')`,
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold uppercase tracking-wider">
                  Premium Gym
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                  <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                  <span className="text-xs font-medium text-white">4.8</span>
                </div>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-1">
                {gymInfo.name}
              </h2>
              <p className="text-white/70 text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {gymInfo.address?.split(',')[0] || 'Fitness & Wellness Center'}
              </p>
            </div>
            
            {/* Play Button / Virtual Tour */}
            <button className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors text-white text-sm font-medium">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Play className="h-4 w-4 text-white fill-white ml-0.5" />
              </div>
              <span>Virtual Tour</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Info Section */}
      <div className="p-6 space-y-5">
        {/* Welcome Message */}
        {gymInfo.welcomeMessage && (
          <div className="relative p-4 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-primary" />
            <p className="text-foreground italic pl-3 text-sm leading-relaxed">
              "{gymInfo.welcomeMessage}"
            </p>
          </div>
        )}
        
        {/* Info Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoItem 
            icon={MapPin}
            label="Address"
            value={gymInfo.address}
          />
          <InfoItem 
            icon={Phone}
            label="Phone"
            value={gymInfo.phone}
          />
          <InfoItem 
            icon={Mail}
            label="Email"
            value={gymInfo.email}
          />
          <InfoItem 
            icon={Clock}
            label="Timings"
            value={gymInfo.timings}
          />
        </div>
      </div>
    </div>
  );
}

interface InfoItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-foreground font-medium mt-0.5 truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
