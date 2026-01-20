import ControlNavbar from '@/components/ControlNavbar';

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <ControlNavbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}