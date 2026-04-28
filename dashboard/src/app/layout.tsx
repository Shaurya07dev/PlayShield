import type { Metadata } from 'next';
import './globals.css';
import { ShieldAlert } from 'lucide-react';

export const metadata: Metadata = {
  title: 'PlayShield | Video Asset Protection',
  description: 'Proactive digital asset protection and piracy detection framework.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="atmospheric-bg"></div>
        <div className="noise-overlay"></div>
        <div className="layout-container">
          <header>
            <div className="logo-group fade-in">
              <div className="logo-icon-wrapper">
                <ShieldAlert size={20} strokeWidth={2.5} />
              </div>
              <span>PlayShield</span>
            </div>
            <div className="nav-actions">
              <div className="status-badge fade-in">
                <div className="status-dot" />
                SYSTEM ARMED
              </div>
            </div>
          </header>
          <main className="grid-pattern">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
