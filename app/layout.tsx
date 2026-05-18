import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/contexts/AuthContext';

export const metadata: Metadata = {
  title: '9jacodekids Academy Enrollment System',
  description: 'Student enrollment and class management system for 9jacodekids Academy',
  icons: {
    icon: '/brand/9jacodekids-web-icon.png',
    apple: '/brand/9jacodekids-web-icon.png',
  },
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
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
