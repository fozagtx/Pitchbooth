// SPDX-License-Identifier: MIT
import {
  AlarmClock,
  BookOpen,
  ChartLine,
  Coins,
  Flag,
  Globe,
  Heart,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Target,
  TriangleAlert,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

const icons: Record<string, LucideIcon> = {
  spark: Sparkles,
  target: Target,
  alert: TriangleAlert,
  wrench: Wrench,
  chart: ChartLine,
  users: Users,
  globe: Globe,
  coins: Coins,
  rocket: Rocket,
  flag: Flag,
  heart: Heart,
  book: BookOpen,
  clock: AlarmClock,
  shield: Shield,
  star: Star,
};

export function CueIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && icons[name]) || Sparkles;
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
