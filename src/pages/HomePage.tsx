import { MainLayout } from '@/components/layout/MainLayout';
import { GymInfoCard } from '@/components/dashboard/GymInfoCard';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { Dumbbell, Users, Calendar, Trophy, ArrowUpRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { membersAPI, trainersAPI } from '@/lib/api';

const HomePage = () => {
  const navigate = useNavigate();

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll(),
    refetchInterval: 60 * 1000,
  });

  const { data: trainers = [] } = useQuery({
    queryKey: ['trainers'],
    queryFn: () => trainersAPI.getAll(),
    refetchInterval: 60 * 1000,
  });

  const totalMembers = (members as any[]).length;
  const activeTrainers = (trainers as any[]).filter((t: any) => t.isActive).length;

  return (
    <MainLayout>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar - Stats Widgets */}
        <DashboardSidebar />
        
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Gym Info Card with Banner */}
          <GymInfoCard />
          
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">Our Services</h2>
              <p className="text-sm text-muted-foreground">Explore what we offer to our members</p>
            </div>
            <div className="flex items-center gap-1 text-sm text-primary font-medium cursor-pointer hover:underline">
              View All
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>

          {/* Feature Cards Grid - Inspired by the screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={Dumbbell}
              title="Personal Training"
              description="Get personalized workout plans and one-on-one coaching from certified trainers."
              accentColor="primary"
              onClick={() => navigate('/trainers')}
            />
            <FeatureCard
              icon={Users}
              title="Member Management"
              description="Easily manage member registrations, renewals, and track their fitness journey."
              accentColor="success"
              onClick={() => navigate('/members')}
            />
            <FeatureCard
              icon={Calendar}
              title="Attendance Tracking"
              description="Monitor daily attendance and analyze member engagement patterns."
              accentColor="warning"
              onClick={() => navigate('/attendance')}
            />
          </div>

          {/* Promotional Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-6 md:p-8">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/4 w-48 h-48 bg-primary/10 rounded-full blur-2xl" />
            
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary text-xs font-semibold mb-3">
                  <Sparkles className="h-3 w-3" />
                  SPECIAL OFFER
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Transform Your Gym Today
                </h3>
                <p className="text-gray-400 text-sm md:text-base max-w-md">
                  Streamline operations, boost member engagement, and grow your fitness business with our comprehensive management system.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => navigate('/register')}
                  className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold transition-colors flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Add Member
                </button>
                <button 
                  onClick={() => navigate('/reports')}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors flex items-center gap-2 backdrop-blur-sm"
                >
                  View Reports
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Special Services - Personal Training Section */}
          <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
                  <Sparkles className="h-3 w-3" />
                  SPECIAL SERVICES
                </div>
                <h2 className="text-xl font-bold text-foreground">Personal Training</h2>
                <p className="text-sm text-muted-foreground">Meet our expert trainers who will guide your fitness journey</p>
              </div>
              <button 
                onClick={() => navigate('/trainers')}
                className="hidden sm:flex items-center gap-1 text-sm text-primary font-medium hover:underline"
              >
                View All Trainers
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>

            {/* Trainer Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <TrainerCard
                name="Sujit Naikwadi"
                role="Head Trainer"
                experience="8+ Years Experience"
                specialization="Fitness Coach"
                image="public\sujit naikwadi.jpeg"
              />
              <TrainerCard
                name="Ashish "
                role="Fitness Coach"
                experience="5+ Years Experience"
                specialization="Fitness Coach"
                image="public\ashish.jpeg"
              />
              <TrainerCard
                name="Mahesh Patil"
                role="Fitness Coach"
                experience="2+ Years Experience"
                specialization="Fitness Coach"
                image="public\mahesh patil.jpeg"
              />
              <TrainerCard
                name="Rohit Kore"
                role="Fitness Coach"
                experience="2+ Years Experience"
                specialization="Fitness Coach"
                image="public\rohit kore.jpeg"
              />
              <TrainerCard
                name="Disha Matkar"
                role="Fitness Coach"
                experience="2+ Years Experience"
                specialization="Fitness Coach"
                image="public\disha matkar.jpeg"
              />
            </div>
          </div>

          {/* Achievement Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AchievementCard number={totalMembers > 0 ? String(totalMembers) : '—'} label="Total Members" />
            <AchievementCard number={activeTrainers > 0 ? String(activeTrainers) : '—'} label="Active Trainers" />
            <AchievementCard number="50+" label="Fitness Programs" />
            <AchievementCard number="24/7" label="Support Available" />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

interface TrainerCardProps {
  name: string;
  role: string;
  experience: string;
  specialization: string;
  image: string;
}

function TrainerCard({ name, role, experience, specialization, image }: TrainerCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300">
      {/* Image Container */}
      <div className="relative h-56 overflow-hidden">
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Experience Badge */}
        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">
          {experience}
        </div>
        
        {/* Name & Role on Image */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{name}</h3>
          <p className="text-white/80 text-sm font-medium">{role}</p>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm text-muted-foreground">{specialization}</span>
          </div>
          <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors">
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accentColor: 'primary' | 'success' | 'warning';
  onClick?: () => void;
}

function FeatureCard({ icon: Icon, title, description, accentColor, onClick }: FeatureCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-primary',
      light: 'bg-primary/10',
      text: 'text-primary',
      border: 'group-hover:border-primary/30',
    },
    success: {
      bg: 'bg-success',
      light: 'bg-success/10',
      text: 'text-success',
      border: 'group-hover:border-success/30',
    },
    warning: {
      bg: 'bg-warning',
      light: 'bg-warning/10',
      text: 'text-warning',
      border: 'group-hover:border-warning/30',
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div 
      onClick={onClick}
      className={`group relative bg-white rounded-2xl p-6 border border-border shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden ${colors.border}`}
    >
      {/* Accent line on top */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${colors.bg} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
      
      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl ${colors.light} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
        <Icon className={`h-7 w-7 ${colors.text}`} />
      </div>
      
      {/* Content */}
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
      
      {/* Learn More Link */}
      <div className={`flex items-center gap-1 ${colors.text} text-sm font-semibold`}>
        Learn More
        <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>

      {/* Decorative circle */}
      <div className={`absolute -bottom-8 -right-8 w-24 h-24 ${colors.light} rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300`} />
    </div>
  );
}

interface AchievementCardProps {
  number: string;
  label: string;
}

function AchievementCard({ number, label }: AchievementCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-border shadow-sm text-center hover:shadow-md transition-shadow">
      <p className="text-2xl md:text-3xl font-bold text-primary mb-1">{number}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default HomePage;
