import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Academy Enrollment System',
  description: 'Class management system for Transcend AI Academy',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-slate-100">
          {children}
        </div>
      </body>
    </html>
  );
}
