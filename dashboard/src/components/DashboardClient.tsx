'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ShieldAlert, Fingerprint, ActivitySquare, Crosshair, Zap, ArrowUpRight, ShieldCheck, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PiracyAlert {
  alertId: string;
  assetId: string;
  candidateVideoUrl: string;
  candidateTitle: string;
  candidateThumbnail: string;
  candidateChannel: string;
  matchConfidence: number;
  phashDistance: number;
  audioSimilarity: number;
  riskScore: number;
  status: 'pending_review' | 'takedown_sent' | 'whitelisted';
  detectedAt: any;
}

export default function DashboardClient() {
  const [alerts, setAlerts] = useState<PiracyAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'alerts'), orderBy('riskScore', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: PiracyAlert[] = [];
      snapshot.forEach((doc) => {
        data.push(doc.data() as PiracyAlert);
      });
      setAlerts(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching alerts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusChange = async (alertId: string, newStatus: 'takedown_sent' | 'whitelisted') => {
    try {
      const alertRef = doc(db, 'alerts', alertId);
      await updateDoc(alertRef, { status: newStatus });
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const pendingAlerts = alerts.filter(a => a.status === 'pending_review');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('video', file);
    formData.append('broadcasterId', 'JioCinema');
    formData.append('matchId', 'IPL-2026');

    try {
      alert(`Uploading ${file.name} to Ingestion Server... Look at the Ingestion Terminal!`);
      const res = await fetch('http://localhost:3005/ingest', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert('Upload and Fingerprinting Successful! Asset Registered.');
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert('Upload failed. Is the ingestion server running on port 3005?');
    }
  };

  const handleRunScan = async () => {
    alert('Initiating Sub-Network Sweep (Demo Mode)... Watch the Scanner Logs in the API/Terminal!');
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        console.log('Scanner Output:', data.output);
      } else {
        alert(`Scanner failed: ${data.error}`);
      }
    } catch (err) {
      alert('Failed to trigger scanner.');
    }
  };

  return (
    <div>
      {/* Action Controls */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
        <div style={{ position: 'relative' }}>
          <input 
            type="file" 
            accept="video/*" 
            onChange={handleUpload} 
            style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', zIndex: 10 }}
          />
          <button className="btn btn-outline" style={{ border: '1px solid var(--accent-blue)', color: 'var(--accent-blue)', width: '220px' }}>
            <ActivitySquare size={16} /> INGEST SOURCE MEDIA
          </button>
        </div>
        
        <button className="btn btn-danger" onClick={handleRunScan} style={{ width: '220px', background: 'var(--accent-red)' }}>
          <Crosshair size={16} /> EXECUTE NETWORK SWEEP
        </button>
      </div>

      {/* Tactical Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
        <motion.div 
          className="glass-panel" 
          style={{ padding: '32px' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.1 }}>
            <Crosshair size={64} />
          </div>
          <div style={{ color: 'var(--accent-red)', fontSize: '0.875rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <ActivitySquare size={18} /> Active Threats
          </div>
          <div style={{ fontSize: '3.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, lineHeight: 1 }}>{pendingAlerts.length}</div>
        </motion.div>

        <motion.div 
          className="glass-panel" 
          style={{ padding: '32px' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.1 }}>
            <ShieldCheck size={64} />
          </div>
          <div style={{ color: 'var(--accent-green)', fontSize: '0.875rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Zap size={18} /> Neutralized
          </div>
          <div style={{ fontSize: '3.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, lineHeight: 1 }}>
            {alerts.filter(a => a.status === 'takedown_sent').length}
          </div>
        </motion.div>

        <motion.div 
          className="glass-panel" 
          style={{ padding: '32px' }}
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, padding: '24px', opacity: 0.1 }}>
            <Flame size={64} />
          </div>
          <div style={{ color: 'var(--accent-yellow)', fontSize: '0.875rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            <Fingerprint size={18} /> Threat Index
          </div>
          <div style={{ fontSize: '3.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 800, lineHeight: 1 }}>
            {pendingAlerts.length > 0 ? Math.round(pendingAlerts.reduce((sum, a) => sum + a.riskScore, 0) / pendingAlerts.length) : 0}
            <span style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>/100</span>
          </div>
        </motion.div>
      </div>

      <div className="glass-panel" style={{ padding: '1px' }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'calc(var(--radius-lg) - 1px)', padding: '32px' }}>
          <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert size={24} color="var(--accent-blue)" /> TARGET QUEUE
            </h2>
          </div>
          
          <div className="premium-table-wrapper">
            <table className="premium-table">
              <thead>
                <tr>
                  <th>Visual Telemetry</th>
                  <th>Source Intel</th>
                  <th>Hash Analysis</th>
                  <th>Confidence Matrix</th>
                  <th>Tactical Response</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                      <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
                        INITIALIZING SCANNER ARRAYS...
                      </motion.div>
                    </td>
                  </tr>
                ) : pendingAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <ShieldCheck size={48} color="var(--accent-green)" style={{ opacity: 0.6 }} />
                        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '1.25rem', letterSpacing: '0.05em' }}>NO TARGETS ACQUIRED</p>
                        <p style={{ fontSize: '0.875rem' }}>Awaiting data from ingestion relay.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <AnimatePresence>
                    {pendingAlerts.map((alert, index) => (
                      <motion.tr 
                        key={alert.alertId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.1 }}
                        layout
                      >
                        <td>
                          <div className="thumbnail-container">
                            <div className="scan-line"></div>
                            {alert.candidateThumbnail ? (
                              <img src={alert.candidateThumbnail} alt="Thumbnail captured" />
                            ) : (
                              <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                                <ActivitySquare size={24} color="var(--text-muted)" />
                              </div>
                            )}
                            <div style={{ position: 'absolute', bottom: '6px', left: '6px', right: '6px', display: 'flex', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', border: '1px solid var(--border-prominent)' }}>
                              <span style={{ color: 'var(--accent-blue)', textTransform: 'uppercase' }}>Match Found</span>
                              <span>{new Date(alert.detectedAt?.toDate()).toLocaleTimeString() || "JUST NOW"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ maxWidth: '280px' }}>
                            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-pure)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {alert.candidateTitle}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)' }}></span> 
                              {alert.candidateChannel}
                            </div>
                            <a 
                              href={alert.candidateVideoUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                            >
                              Intercept Link <ArrowUpRight size={14} />
                            </a>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: 'var(--text-muted)', width: '70px' }}>P-HASH:</span>
                              <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.max(0, 100 - (alert.phashDistance * 2))}%`, height: '100%', background: 'var(--accent-blue)' }}></div>
                              </div>
                              <span style={{ fontWeight: 600, width: '40px', textAlign: 'right' }}>{alert.phashDistance}d</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ color: 'var(--text-muted)', width: '70px' }}>AUDIO:</span>
                              <div style={{ flex: 1, height: '4px', background: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${alert.audioSimilarity * 100}%`, height: '100%', background: 'var(--accent-yellow)' }}></div>
                              </div>
                              <span style={{ fontWeight: 600, width: '40px', textAlign: 'right' }}>{(alert.audioSimilarity * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span className={`risk-pill ${alert.riskScore > 80 ? 'risk-high' : alert.riskScore > 50 ? 'risk-med' : 'risk-low'}`}>
                              Lvl {alert.riskScore} Threat
                            </span>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                              Sys. Confidence: {(alert.matchConfidence * 100).toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button 
                              className="btn btn-danger"
                              onClick={() => handleStatusChange(alert.alertId, 'takedown_sent')}
                              style={{ width: '100%' }}
                            >
                              EXECUTE DMCA
                            </button>
                            <button 
                              className="btn btn-outline"
                              onClick={() => handleStatusChange(alert.alertId, 'whitelisted')}
                              style={{ width: '100%' }}
                            >
                              STAND DOWN
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
