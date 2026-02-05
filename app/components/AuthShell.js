"use client";

export default function AuthShell({ title, subtitle, children }) {
  const outer = {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '28px',
    boxSizing: 'border-box',
    backgroundImage: `url('/game/images/galaxiaintro.png'), radial-gradient(ellipse at bottom, #01030a 0%, #000016 40%, #000000 100%)`,
    backgroundSize: 'cover, auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
    position: 'relative',
    fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
  };

  const overlay = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    backdropFilter: 'blur(6px) saturate(120%)',
    WebkitBackdropFilter: 'blur(6px) saturate(120%)',
    pointerEvents: 'none',
  };

  const card = {
    position: 'relative',
    width: '520px',
    maxWidth: '96vw',
    borderRadius: '14px',
    padding: '26px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
    border: '1px solid rgba(0,230,255,0.08)',
    outline: '1px solid rgba(0,230,255,0.02)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    color: '#E6FBFF',
    zIndex: 2,
    pointerEvents: 'auto',
  };

  const neonBorder = {
    position: 'absolute',
    inset: '-2px',
    borderRadius: '16px',
    background: 'linear-gradient(90deg, rgba(0,229,255,0.12), rgba(0,122,255,0.06))',
    filter: 'blur(8px)',
    zIndex: 1,
    pointerEvents: 'none',
  };

  const header = {
    marginBottom: '12px',
    textAlign: 'center',
  };

  const titleStyle = {
    fontFamily: "'Orbitron', sans-serif",
    color: '#9FF6FF',
    letterSpacing: '1px',
    fontSize: '22px',
    margin: 0,
  };

  const subtitleStyle = {
    fontSize: '13px',
    color: 'rgba(230,251,255,0.8)',
    marginTop: 6,
  };

  return (
    <div style={outer}>
      <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap" rel="stylesheet" />
      <div style={overlay} aria-hidden />

      <div style={card}>
        <div style={neonBorder} aria-hidden />

        <div style={header}>
          {title ? <h1 style={titleStyle}>{title}</h1> : null}
          {subtitle ? <div style={subtitleStyle}>{subtitle}</div> : null}
        </div>

        <div>
          {children}
        </div>
      </div>
    </div>
  );
}
