import { ReactNode } from 'react';
import RouteProtection from '@/components/RouteProtection';
import ContadorNavbar from '@/components/ContadorNavbar';

interface ContadorLayoutProps {
  children: ReactNode;
}

export default function ContadorLayout({ children }: ContadorLayoutProps) {
  return (
    <RouteProtection requiredPermission="ver">
      <div>
        <ContadorNavbar />
        {children}
      </div>
    </RouteProtection>
  );
}
