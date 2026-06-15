import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const STATS = [
  { value: '38+', label: 'Districts Covered', icon: '🗺️' },
  { value: '10K+', label: 'Reports Resolved', icon: '✅' },
  { value: '48h', label: 'Avg. Response Time', icon: '⚡' },
  { value: '94%', label: 'Citizen Satisfaction', icon: '⭐' },
];

const FEATURES = [
  { icon: '📍', title: 'GPS-Precise Reporting', description: 'Automatic GPS capture pinpoints the exact damage location, ensuring the right district team gets notified instantly.', color: '#2563eb' },
  { icon: '🤖', title: 'AI Damage Verification', description: 'Our image analysis engine classifies road damage types — potholes, cracks, waterlogging — and validates reports automatically.', color: '#7c3aed' },
  { icon: '🔔', title: 'Real-time Updates', description: 'Get instant notifications as your report moves through verification, assignment, and repair stages via Socket.IO.', color: '#0891b2' },
  { icon: '📊', title: 'District Dashboards', description: 'Dedicated portals for District Administrators to manage, prioritize and update road repair operations efficiently.', color: '#059669' },
  { icon: '🗺️', title: 'Interactive Map View', description: 'Visualize all reports across Tamil Nadu on an interactive map with severity-coded markers and cluster views.', color: '#d97706' },
  { icon: '📈', title: 'Analytics & Reports', description: 'State-level and district-level analytics for government officials to track trends, resolution rates and resource allocation.', color: '#dc2626' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Spot & Photograph', description: 'See a pothole or cracked road? Open RoadWatch and take a photo. Your GPS coordinates are captured automatically.' },
  { step: '02', title: 'AI Verifies & Routes', description: 'Our AI analyzes the image, classifies the damage type, and routes the report to the correct District Administrator.' },
  { step: '03', title: 'Track to Resolution', description: 'Receive real-time notifications as your report moves from review to assignment, repair, and final resolution.' },
];

function StatCounter({ value, label, icon }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '2.25rem', marginBottom: 4 }}>{icon}</div>
      <div className="font-display" style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="hero-section" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 1.5rem 4rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 740 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: 999, padding: '6px 16px',
            fontSize: '0.8125rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)',
            marginBottom: '1.5rem',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            Tamil Nadu's Official Road Damage Platform
          </div>

          <h1 className="font-display" style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
            Report Road Damage.
            <br />
            <span style={{ color: '#93c5fd' }}>Track the Fix.</span>
          </h1>

          <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: '2.5rem', maxWidth: 580, marginLeft: 'auto', marginRight: 'auto' }}>
            Take a photo, mark the location, and our AI routes your report directly to the right District Administrator. Real-time tracking from report to repair.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" id="hero-cta-register" className="btn btn-xl" style={{ background: '#fff', color: '#2563eb', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              🚀 Start Reporting — It's Free
            </Link>
            <Link to="/reports" className="btn btn-xl" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.3)', backdropFilter: 'blur(10px)' }}>
              🗺️ View Live Map
            </Link>
          </div>
        </div>

        {/* Floating cards decoration */}
        <div style={{ position: 'absolute', right: '5%', top: '20%', display: 'none', flexDirection: 'column', gap: 12, opacity: 0.9 }}>
          {/* decorative */}
        </div>

        {/* Wave divider */}
        <div style={{ position: 'absolute', bottom: -1, left: 0, right: 0 }}>
          <svg viewBox="0 0 1440 64" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
            <path d="M0 64L60 53.3C120 43 240 21 360 16C480 11 600 21 720 26.7C840 32 960 32 1080 26.7C1200 21 1320 11 1380 5.3L1440 0V64H1380C1320 64 1200 64 1080 64C960 64 840 64 720 64C600 64 480 64 360 64C240 64 120 64 60 64H0Z" fill="#f1f5f9"/>
          </svg>
        </div>
      </section>

      {/* ── Stats Banner ────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', padding: '3rem 1.5rem', marginTop: -1 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem' }}>
          {STATS.map((s, i) => <StatCounter key={i} {...s} />)}
        </div>
      </section>

      {/* ── Features Grid ──────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: 'var(--bg-base)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ display: 'inline-block', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 999, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              What We Offer
            </div>
            <h2 className="font-display section-title" style={{ marginBottom: '0.75rem' }}>Built for Citizens, Powered by Government</h2>
            <p style={{ color: '#64748b', fontSize: '1.0625rem', maxWidth: 560, margin: '0 auto' }}>
              A comprehensive platform that bridges the gap between road damage reports and government action.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card-hover" style={{ padding: '1.5rem', animationDelay: `${i * 60}ms` }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: `${f.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', marginBottom: '1rem',
                  border: `1px solid ${f.color}30`,
                }}>
                  {f.icon}
                </div>
                <h3 className="font-display" style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{f.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.6 }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────── */}
      <section style={{ padding: '5rem 1.5rem', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div style={{ display: 'inline-block', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 999, padding: '4px 14px', fontSize: '0.75rem', fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
              Simple Process
            </div>
            <h2 className="font-display section-title" style={{ marginBottom: '0.75rem' }}>How RoadWatch Works</h2>
            <p style={{ color: '#64748b', fontSize: '1.0625rem' }}>Three simple steps to turn your report into action</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', position: 'relative' }}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div className="font-display" style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'linear-gradient(135deg,#2563eb,#7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem', fontWeight: 900, color: '#fff',
                  margin: '0 auto 1.25rem',
                  boxShadow: '0 8px 24px rgba(37,99,235,0.25)',
                }}>
                  {step.step}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 32, left: 'calc(50% + 40px)', right: '-10px',
                    height: 2, background: 'linear-gradient(90deg,#bfdbfe,transparent)',
                    display: 'none'
                  }} />
                )}
                <h3 className="font-display" style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>{step.title}</h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7 }}>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#7c3aed 100%)', padding: '5rem 1.5rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 600, margin: '0 auto' }}>
          <h2 className="font-display" style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: '#fff', marginBottom: '1rem', letterSpacing: '-0.025em' }}>
            Ready to Make a Difference?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.05rem', marginBottom: '2rem', lineHeight: 1.7 }}>
            Join thousands of citizens already reporting road damage across Tamil Nadu. Every report brings safer roads closer.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-xl" style={{ background: '#fff', color: '#2563eb', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
              🗺️ Report Damage Now
            </Link>
            <Link to="/login" className="btn btn-xl" style={{ background: 'transparent', color: '#fff', border: '1.5px solid rgba(255,255,255,0.4)' }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '2rem 1.5rem', textAlign: 'center', fontSize: '0.875rem' }}>
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#2563eb,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" fill="none" stroke="white" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <span style={{ color: '#e2e8f0', fontWeight: 700 }}>RoadWatch v2</span>
        </div>
        <p>© 2025 RoadWatch · Tamil Nadu Road Damage Management System · Built for citizens, powered by AI</p>
      </footer>
    </div>
  );
}
