import DashboardClient from '@/components/DashboardClient';

export default function Home() {
  return (
    <div className="slide-up">
      <div style={{ marginBottom: '48px', position: 'relative' }}>
        <h1 
          className="glitch-text" 
          data-text="ENFORCEMENT COMMAND"
          style={{ 
            fontSize: '3.5rem', 
            fontWeight: 800, 
            lineHeight: 1.1,
            textTransform: 'uppercase',
            background: 'linear-gradient(to right, #ffffff, #a5b4fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '16px'
          }}
        >
          ENFORCEMENT COMMAND
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.125rem', 
          maxWidth: '600px',
          fontWeight: 400,
          lineHeight: 1.6
        }}>
          Real-time algorithmic detection of copyright infringement. 
          Assets are continuously fingerprinted and cross-referenced with global video distributions.
        </p>
      </div>

      <DashboardClient />
    </div>
  );
}
