import {
  ShoppingCart,
  UtensilsCrossed,
  Car,
  Home,
  HeartPulse,
  Shirt,
  Gamepad2,
  Plane,
  GraduationCap,
  Wrench,
  MoreHorizontal,
} from 'lucide-react';

export const CATEGORIES = {
  Groceries: { icon: ShoppingCart, color: 'text-secondary', bg: 'bg-secondary/10' },
  Dining: { icon: UtensilsCrossed, color: 'text-primary', bg: 'bg-primary/10' },
  Transport: { icon: Car, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  Housing: { icon: Home, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  Health: { icon: HeartPulse, color: 'text-rose-500', bg: 'bg-rose-500/10' },
  Shopping: { icon: Shirt, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  Entertainment: { icon: Gamepad2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  Travel: { icon: Plane, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  Education: { icon: GraduationCap, color: 'text-amber-600', bg: 'bg-amber-500/10' },
  Services: { icon: Wrench, color: 'text-orange-600', bg: 'bg-orange-500/10' },
  Misc: { icon: MoreHorizontal, color: 'text-gray-500', bg: 'bg-gray-500/10' },
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORIES);

export function getCategoryMeta(category) {
  return CATEGORIES[category] || CATEGORIES.Misc;
}
