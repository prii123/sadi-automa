import ImpuestosNavbar from '@/components/ImpuestosNavbar';

export default function ImpuestosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ImpuestosNavbar />
      {children}
    </div>
  );
}