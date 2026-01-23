import { ReactNode } from 'react';
import RouteProtection from '@/components/RouteProtection';

interface ContadorLayoutProps {
  children: ReactNode;
}

export default function ContadorLayout({ children }: ContadorLayoutProps) {
  return (
    <RouteProtection requiredPermission="ver">
      {children}
    </RouteProtection>
  );
}