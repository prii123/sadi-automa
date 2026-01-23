'use client';

import VistaCalendarioComponent from '@/components/calendario-tributario/VistaCalendarioComponent';

export default function VistaCalendarioPage() {
  return (
    <VistaCalendarioComponent
      empresasSource="all"
      titulo="Vista Calendario Tributario - Todas las Empresas"
    />
  );
}