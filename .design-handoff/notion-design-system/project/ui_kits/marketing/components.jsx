// Notion marketing — shared components
// Loaded via Babel; exposes everything to window for cross-script use.

const NotionLogo = ({ size = 24, color = "#37352F" }) => (
  <svg width={size} height={size * (29.784/28.571)} viewBox="0 0 28.571 29.784" style={{display:'block'}}>
    <path fill={color} d="M 4.927 5.222 C 5.853 5.974 6.201 5.917 7.94 5.801 L 24.34 4.816 C 24.688 4.816 24.399 4.469 24.283 4.411 L 21.559 2.443 C 21.037 2.037 20.342 1.573 19.009 1.689 L 3.129 2.848 C 2.55 2.905 2.435 3.195 2.665 3.427 L 4.927 5.222 Z M 5.911 9.044 L 5.911 26.299 C 5.911 27.226 6.375 27.573 7.418 27.516 L 25.441 26.473 C 26.485 26.416 26.601 25.778 26.601 25.025 L 26.601 7.885 C 26.601 7.133 26.312 6.727 25.673 6.785 L 6.838 7.885 C 6.143 7.943 5.911 8.291 5.911 9.044 Z M 23.704 9.969 C 23.82 10.491 23.704 11.012 23.181 11.071 L 22.313 11.244 L 22.313 23.983 C 21.559 24.388 20.864 24.62 20.284 24.62 C 19.357 24.62 19.124 24.33 18.43 23.462 L 12.749 14.545 L 12.749 23.172 L 14.547 23.578 C 14.547 23.578 14.547 24.62 13.097 24.62 L 9.099 24.852 C 8.983 24.62 9.099 24.041 9.504 23.925 L 10.548 23.636 L 10.548 12.229 L 9.099 12.113 C 8.983 11.591 9.272 10.839 10.084 10.78 L 14.373 10.491 L 20.284 19.525 L 20.284 11.533 L 18.777 11.36 C 18.661 10.723 19.124 10.26 19.704 10.202 L 23.704 9.969 Z M 1.796 1.284 L 18.314 0.068 C 20.342 -0.106 20.864 0.01 22.139 0.937 L 27.411 4.642 C 28.281 5.28 28.571 5.453 28.571 6.148 L 28.571 26.473 C 28.571 27.747 28.107 28.5 26.485 28.615 L 7.303 29.774 C 6.085 29.832 5.506 29.658 4.868 28.847 L 0.985 23.809 C 0.289 22.882 0 22.188 0 21.377 L 0 3.31 C 0 2.269 0.464 1.4 1.796 1.284 Z" />
  </svg>
);

const TopNav = ({ onSignUp, onLogin }) => {
  const linkStyle = { fontSize: 14, color: 'var(--fg)', cursor: 'pointer', display:'inline-flex', alignItems:'center', gap:2 };
  const caret = <span style={{fontSize:9, color:'var(--fg-faint)'}}>▾</span>;
  return (
    <nav style={{
      height: 64, padding: '0 32px', display:'flex', alignItems:'center', justifyContent:'space-between',
      background: 'var(--bg)', borderBottom: '1px solid transparent', position:'sticky', top:0, zIndex:10
    }}>
      <div style={{display:'flex', alignItems:'center', gap:24}}>
        <a style={{display:'flex', alignItems:'center', gap:8, fontWeight:500, fontSize:16, color:'var(--fg)'}}>
          <NotionLogo size={22} />
          Notion
        </a>
        <a style={linkStyle}>Product {caret}</a>
        <a style={linkStyle}>Download {caret}</a>
        <a style={linkStyle}>Solutions {caret}</a>
        <a style={linkStyle}>Resources {caret}</a>
        <a style={linkStyle}>Pricing</a>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:18}}>
        <a style={linkStyle}>Request a demo</a>
        <a style={linkStyle} onClick={onLogin}>Log in</a>
        <button className="btn btn-primary" onClick={onSignUp}>Try Notion free</button>
      </div>
    </nav>
  );
};

// Hand-drawn placeholder illustration — abstract person at desk
const DoodleDesk = ({ size = 110 }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} fill="none" stroke="#37352F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="60" cy="50" rx="14" ry="16" />
    <path d="M 55 45 q 2 -2 4 0 M 65 45 q 2 -2 4 0" />
    <path d="M 56 55 q 4 3 8 0" />
    <path d="M 46 70 q 14 -8 28 0 l 6 25 l -40 0 z" />
    <rect x="22" y="92" width="76" height="4" rx="1" />
    <rect x="36" y="80" width="48" height="14" rx="1" />
    <path d="M 40 85 l 40 0 M 40 89 l 30 0" />
  </svg>
);

const DoodleBlocks = ({ size = 110 }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} fill="none" stroke="#37352F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <rect x="20" y="30" width="32" height="22" rx="2" />
    <rect x="58" y="22" width="42" height="30" rx="2" />
    <rect x="30" y="60" width="50" height="20" rx="2" />
    <circle cx="92" cy="80" r="12" />
    <path d="M 28 38 l 18 0 M 28 44 l 12 0" />
    <path d="M 66 30 l 26 0 M 66 36 l 22 0 M 66 42 l 18 0" />
    <path d="M 38 68 l 34 0 M 38 73 l 22 0" />
  </svg>
);

const DoodleTeam = ({ size = 110 }) => (
  <svg viewBox="0 0 140 100" width={size} height={size} fill="none" stroke="#37352F" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="30" cy="40" r="11" />
    <path d="M 18 78 q 12 -16 24 0" />
    <circle cx="70" cy="34" r="13" />
    <path d="M 56 76 q 14 -18 28 0" />
    <circle cx="110" cy="42" r="10" />
    <path d="M 100 78 q 10 -14 20 0" />
  </svg>
);

const Section = ({ children, bg, padY = 96 }) => (
  <section style={{ background: bg || 'transparent', padding: `${padY}px 32px` }}>
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>
  </section>
);

const SectionEyebrow = ({ children }) => (
  <div style={{fontSize:13, fontWeight:500, color:'var(--accent-text)', marginBottom: 12, letterSpacing:'0.02em'}}>{children}</div>
);

const Footer = () => {
  const Col = ({ title, items }) => (
    <div style={{display:'flex', flexDirection:'column', gap:8}}>
      <div style={{fontSize:14, fontWeight:600, color:'var(--fg)', marginBottom:4}}>{title}</div>
      {items.map(i => <a key={i} style={{fontSize:13, color:'var(--fg-muted)'}}>{i}</a>)}
    </div>
  );
  return (
    <footer style={{borderTop:'1px solid var(--border-hairline)', padding:'56px 32px 40px'}}>
      <div style={{maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr 1fr 1fr', gap:32}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:16}}>
            <NotionLogo size={20} /><span style={{fontWeight:500}}>Notion</span>
          </div>
          <div style={{display:'flex', gap:12, color:'var(--fg-muted)', fontSize:14}}>
            <span>📷</span><span>𝕏</span><span>in</span><span>f</span><span>▶</span>
          </div>
          <div style={{marginTop:18, display:'inline-flex', alignItems:'center', gap:6, padding:'4px 10px', border:'1px solid var(--border)', borderRadius:4, fontSize:13}}>🌐 English ▾</div>
        </div>
        <Col title="Product" items={['Wikis','Projects','Docs','Notion AI',"What's new"]} />
        <Col title="Download" items={['iOS &amp; Android','Mac &amp; Windows','Web Clipper']} />
        <Col title="Resources" items={['Help center','Pricing','Blog','Community','Integrations']} />
        <Col title="Get started" items={['Sign up','Log in','Contact sales','Request a demo']} />
      </div>
      <div style={{maxWidth:1100, margin:'40px auto 0', display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--fg-muted)'}}>
        <span>Do Not Sell or Share My Info</span>
        <span>© 2026 Notion Labs, Inc.</span>
      </div>
    </footer>
  );
};

Object.assign(window, { NotionLogo, TopNav, DoodleDesk, DoodleBlocks, DoodleTeam, Section, SectionEyebrow, Footer });
