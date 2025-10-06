import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Ovida Console',
  description: 'Control demos, review replays, and monitor live rooms.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <h1 className={styles.title}>Ovida</h1>
            <nav className={styles.nav}>
              <Link href="/">Demo</Link>
              <Link href="/player/demo">Player</Link>
              <Link href="/replay/demo">Replay</Link>
              <Link href="/room/demo">Room</Link>
              <Link href="/admin">Admin</Link>
            </nav>
          </aside>
          <main className={styles.main}>{children}</main>
        </div>
      </body>
    </html>
  );
}
