import { LucideIcon } from "lucide-react";

export interface NavLink {
  label: string;
  href: string;
  ariaLabel?: string;
}

export interface NavItem {
  label: string;
  bgColor: string;
  textColor: string;
  links: NavLink[];
  icon?: LucideIcon;
}

export interface SignalItem {
  label: string;
  value: string;
  icon: LucideIcon;
}

export interface FeaturePillar {
  title: string;
  body: string;
  icon: LucideIcon;
}

export interface MotionStackItem {
  title: string;
  detail: string;
  icon: LucideIcon;
  className: string;
  accent: string;
}

export interface CommandMode {
  label: string;
  prompt: string;
  tone: string;
}

export interface WorkflowStep {
  step: string;
  title: string;
  body: string;
}

export interface UserMetrics {
  total: number;
  series: Array<{ count: number }>;
  days: number;
}

export interface FeedbackForm {
  name: string;
  email: string;
  message: string;
  rating: number;
}

export interface Testimonial {
  text: string;
  imageSrc: string;
  name: string;
  username: string;
  role: string;
}
