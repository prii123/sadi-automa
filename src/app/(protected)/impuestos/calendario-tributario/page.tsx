'use client';

import CalendarioTributarioComponent from '@/components/calendario-tributario/CalendarioTributarioComponent';

export default function CalendarioTributarioPage() {
  return (
    <CalendarioTributarioComponent
      empresasSource="all"
      titulo="Calendario Tributario - Todas las Empresas"
    />
  );
}
