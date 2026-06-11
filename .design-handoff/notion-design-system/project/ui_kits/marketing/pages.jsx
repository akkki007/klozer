// Pages — Home, Pricing, SignUp, AIDark
const { useState } = React;

const HomePage = ({ goSignUp }) => (
  <>
    <Section padY={96}>
      <div style={{textAlign:'center', maxWidth: 720, margin:'0 auto'}}>
        <h1 style={{fontSize:64, fontWeight:500, lineHeight:1.05, color:'var(--fg-display)', letterSpacing:'-0.025em', marginBottom:20, fontFamily:'var(--font-display)'}}>
          Your wiki, docs,<br/>&amp; projects. Together.
        </h1>
        <p style={{fontSize:18, color:'var(--fg)', maxWidth:520, margin:'0 auto 28px'}}>
          Notion is the connected workspace where better, faster work happens.
        </p>
        <div style={{display:'flex', gap:10, justifyContent:'center'}}>
          <button className="btn btn-primary" style={{height:40, padding:'0 18px'}} onClick={goSignUp}>Try Notion free</button>
          <button className="btn btn-secondary" style={{height:40, padding:'0 18px'}}>Request a demo</button>
        </div>
        <div style={{marginTop:14, fontSize:12, color:'var(--fg-muted)'}}>Free to try. No credit card required.</div>
      </div>
      {/* Hero mock */}
      <div style={{
        marginTop: 56, height: 380,
        background: 'var(--bg-elevated)',
        borderRadius: 12,
        boxShadow: 'var(--shadow-3)',
        display:'grid', gridTemplateColumns:'220px 1fr', overflow:'hidden',
        border:'1px solid var(--border-hairline)'
      }}>
        <div style={{background:'var(--bg-soft)', padding:'14px 10px', borderRight:'1px solid var(--border-hairline)'}}>
          {['📓 Engineering wiki','📑 Product roadmap','🚀 Q3 launch','📊 OKRs','🗓 Meeting notes','📚 Templates'].map((t,i) => (
            <div key={i} style={{padding:'5px 8px', borderRadius:3, fontSize:13, color:'var(--fg)', background: i===0 ? 'var(--bg-active)' : 'transparent', marginBottom:1}}>{t}</div>
          ))}
        </div>
        <div style={{padding: '40px 56px'}}>
          <div style={{fontSize:36, fontWeight:700, color:'var(--fg-display)', marginBottom:14}}>📓 Engineering wiki</div>
          <div style={{height:14, background:'var(--bg-soft)', borderRadius:3, marginBottom:8, width:'80%'}} />
          <div style={{height:14, background:'var(--bg-soft)', borderRadius:3, marginBottom:8, width:'70%'}} />
          <div style={{height:14, background:'var(--bg-soft)', borderRadius:3, marginBottom:24, width:'62%'}} />
          <div style={{padding:'14px 16px', background:'#FBF3DB', borderRadius:4, fontSize:14, color:'var(--fg)', marginBottom:14}}>💡 Press <code>/</code> to add any block — text, table, todo, embed.</div>
          <div style={{height:160, background:'var(--bg-soft)', borderRadius:6, border:'1px solid var(--border-hairline)', padding:12}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6}}>
              {['On track','At risk','Done','Blocked','Done','On track'].map((t,i) => (
                <div key={i} style={{padding:'8px 10px', background:'var(--bg-elevated)', borderRadius:4, fontSize:12, border:'1px solid var(--border-hairline)'}}>
                  <div style={{fontSize:11, color:'var(--fg-muted)', marginBottom:4}}>Task {i+1}</div>
                  <div style={{fontWeight:500}}>{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>

    {/* Customer logos */}
    <Section padY={48}>
      <div style={{textAlign:'center', fontSize:14, color:'var(--fg-muted)', marginBottom:28}}>Millions run on Notion every day</div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', opacity:0.85, fontWeight:700, fontSize:18, color:'var(--fg)'}}>
        <span style={{letterSpacing:'-0.04em', fontSize:24}}>PIXAR</span>
        <span style={{fontFamily:'Georgia, serif', fontSize:22, fontStyle:'italic'}}>Curology</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:14,height:14,borderRadius:'50%',background:'#7B61FF'}}/>loom</span>
        <span>MatchGroup</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:6}}><span style={{width:12,height:12,borderRadius:'50%',background:'#F47B20'}}/>headspace</span>
        <span>Toyota</span>
      </div>
    </Section>

    {/* Three feature cards */}
    <Section padY={96} bg="var(--bg-soft)">
      <h2 style={{textAlign:'center', fontSize:36, fontWeight:500, marginBottom:14, fontFamily:'var(--font-display)', letterSpacing:'-0.02em'}}>Tasks. Projects. Infinite flexibility.</h2>
      <p style={{textAlign:'center', color:'var(--fg-muted)', marginBottom:48, fontSize:16}}>Notion adapts to the way your team thinks and works.</p>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:24}}>
        {[
          {icon:<DoodleBlocks size={88}/>, t:'Spreadsheets &amp; databases', d:'Keep records of everything using powerful views with sorts and filters.'},
          {icon:<DoodleDesk size={88}/>, t:'Kanban board', d:'Visually organize tasks and projects. With subtasks, due dates, and tags.'},
          {icon:<DoodleTeam size={88}/>, t:'Calendar', d:'Plan your day, week, or quarter. From dailies to long-term planning.'}
        ].map((f, i) => (
          <div key={i} style={{background:'var(--bg-elevated)', borderRadius:8, padding:'32px 28px', border:'1px solid var(--border-hairline)'}}>
            <div style={{marginBottom:18, height:88, display:'flex', alignItems:'center'}}>{f.icon}</div>
            <div style={{fontSize:18, fontWeight:600, marginBottom:8}}>{f.t}</div>
            <div style={{fontSize:14, color:'var(--fg-muted)', lineHeight:1.5}} dangerouslySetInnerHTML={{__html: f.d}} />
          </div>
        ))}
      </div>
    </Section>

    {/* Powerful building blocks — text + product mock */}
    <Section padY={96}>
      <SectionEyebrow>BUILDING BLOCKS</SectionEyebrow>
      <h2 style={{fontSize:36, fontWeight:500, marginBottom:18, maxWidth:560, fontFamily:'var(--font-display)', letterSpacing:'-0.02em'}}>Powerful building blocks</h2>
      <p style={{fontSize:16, color:'var(--fg-muted)', maxWidth:520, marginBottom:48}}>
        Headers, lists, tables, code — every block is a drag-and-drop, drag-anywhere unit. Build a page, a wiki, a dashboard, or a database. The same blocks compose them all.
      </p>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:24}}>
        {[
          {emoji:'📝', t:'Text', d:'The basic block. Keyboard shortcuts and Markdown supported.'},
          {emoji:'📋', t:'To-do list', d:'Track anything. Check it off when you\u2019re done.'},
          {emoji:'🗂', t:'Database', d:'A spreadsheet, a board, a calendar — your data, six different views.'},
          {emoji:'🔗', t:'Sync block', d:'Edit content in one place; it updates everywhere.'},
        ].map((b,i) => (
          <div key={i} style={{padding:'20px 22px', borderTop:'1px solid var(--border-hairline)', display:'flex', gap:14}}>
            <div style={{fontSize:22}}>{b.emoji}</div>
            <div>
              <div style={{fontWeight:600, marginBottom:4}}>{b.t}</div>
              <div style={{fontSize:14, color:'var(--fg-muted)'}}>{b.d}</div>
            </div>
          </div>
        ))}
      </div>
    </Section>

    {/* Final CTA */}
    <Section padY={96} bg="var(--bg-soft)">
      <div style={{textAlign:'center'}}>
        <DoodleTeam size={120} />
        <h2 style={{fontSize:40, fontWeight:500, margin:'12px 0 22px', fontFamily:'var(--font-display)', letterSpacing:'-0.02em'}}>Get started for free</h2>
        <button className="btn btn-primary" style={{height:42, padding:'0 22px', fontSize:15}} onClick={goSignUp}>Try Notion free</button>
        <div style={{marginTop:14, fontSize:13, color:'var(--fg-muted)'}}>Play with the demo. No credit card.</div>
      </div>
    </Section>
  </>
);

const PricingPage = () => {
  const tiers = [
    {name:'Free', price:'Free', desc:'For organizing every corner of your work &amp; life.', cta:'Get started', features:['Collaborative workspace','Integrate with Slack, GitHub &amp; more','Basic page analytics','7-day page history','Invite 10 guests']},
    {name:'Plus', price:'$8', sub:'per user / month, billed annually', desc:'A place for small groups to plan &amp; get organized.', cta:'Get started', accent:true, features:['Everything in Free, plus:','Unlimited file uploads','Unlimited blocks for teams','30-day page history','Invite 100 guests']},
    {name:'Business', price:'$15', sub:'per user / month, billed annually', desc:'For companies using Notion to connect several teams &amp; tools.', cta:'Get started', features:['SAML SSO','Private teamspaces','Bulk PDF export','Advanced page analytics','90-day page history']},
    {name:'Enterprise', price:'Custom', desc:'Advanced controls &amp; support to run your entire organization.', cta:'Request a demo', features:['User provisioning (SCIM)','Advanced security &amp; controls','Audit log','Customer success manager','Workspace analytics']},
  ];
  return (
    <Section padY={80}>
      <div style={{textAlign:'center', marginBottom:48}}>
        <h1 style={{fontSize:48, fontWeight:500, marginBottom:14, fontFamily:'var(--font-display)', letterSpacing:'-0.02em'}}>One tool for your whole company.<br/>Free for teams to try.</h1>
        <div style={{display:'inline-flex', gap:6, fontSize:14, color:'var(--fg-muted)', alignItems:'center'}}>
          <span>Trusted by teams at</span><b style={{color:'var(--fg)'}}>PIXAR</b><b>·</b><b>Loom</b><b>·</b><b>MatchGroup</b>
        </div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:16}}>
        {tiers.map(t => (
          <div key={t.name} style={{
            padding: '28px 24px',
            border:'1px solid var(--border-hairline)',
            borderRadius:6,
            background: t.accent ? 'var(--bg-tinted-red)' : 'var(--bg-elevated)',
          }}>
            <div style={{fontSize:18, fontWeight:600, color: t.accent ? 'var(--accent-text)' : 'var(--fg)', marginBottom:6}}>{t.name}</div>
            <div style={{fontSize:13, color:'var(--fg-muted)', minHeight: 36, marginBottom:18}} dangerouslySetInnerHTML={{__html:t.desc}} />
            <div style={{fontSize:36, fontWeight:700, color:'var(--fg-display)', marginBottom:2}}>{t.price}</div>
            <div style={{fontSize:12, color:'var(--fg-muted)', minHeight:18, marginBottom:18}}>{t.sub || ' '}</div>
            <button className={`btn ${t.accent ? 'btn-primary' : 'btn-secondary'}`} style={{width:'100%', height:36, marginBottom:18}}>{t.cta}</button>
            <div style={{borderTop:'1px solid var(--border-hairline)', paddingTop:14, display:'flex', flexDirection:'column', gap:8}}>
              {t.features.map((f,i) => (
                <div key={i} style={{fontSize:13, color:'var(--fg)', display:'flex', gap:8, alignItems:'flex-start'}}>
                  <span style={{color:'var(--fg-muted)'}}>✓</span>
                  <span dangerouslySetInnerHTML={{__html:f}} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

const SignUpPage = ({ onSubmit, error }) => {
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const submit = (e) => {
    e.preventDefault();
    if (!email.includes('@')) { setShowError(true); return; }
    setShowError(false);
    onSubmit?.(email);
  };
  return (
    <div style={{padding:'80px 0', display:'flex', justifyContent:'center'}}>
      <div style={{width: 320}}>
        <h1 style={{fontSize:50, fontWeight:500, textAlign:'center', lineHeight:1.1, marginBottom:36, color:'var(--fg-display)', fontFamily:'var(--font-display)', letterSpacing:'-0.025em'}}>Sign up</h1>
        <form onSubmit={submit} style={{display:'flex', flexDirection:'column', gap:7}}>
          <label style={{fontSize:12, color:'var(--fg-muted)'}}>Work email</label>
          <input className="input" placeholder="Enter your email address..."
            value={email} onChange={e => { setEmail(e.target.value); setShowError(false); }}
            style={ showError ? {background:'var(--bg-tinted-red)', boxShadow:'inset 0 0 0 1px var(--accent-soft), var(--shadow-1)'} : {} } />
          <button type="submit" className="btn"
            style={{
              height:36, marginTop:7,
              background:'var(--bg-tinted-red)', color:'var(--accent-text)',
              boxShadow:'inset 0 0 0 1px var(--accent-soft), var(--shadow-1)',
              border:'none'
            }}>Continue with email</button>
          <div style={{fontSize:14, color:'var(--fg-muted)', textAlign:'center', padding:'8px 0'}}>You can also continue with SAML SSO</div>
          <div style={{height:1, background:'var(--border)', margin:'4px 0 14px'}} />
          <button type="button" className="btn btn-secondary" style={{height:36, justifyContent:'center', gap:8}}>
            <span style={{display:'inline-flex', width:14, height:14, alignItems:'center', justifyContent:'center'}}>
              <svg viewBox="0 0 18 18" width="14" height="14"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.9c1.7-1.57 2.69-3.88 2.69-6.62Z"/><path fill="#34A853" d="M9 18c2.43 0 4.46-.81 5.95-2.18l-2.9-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.92v2.32A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.96 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.72V4.96H.92a9 9 0 0 0 0 8.08l3.04-2.32Z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .92 4.96l3.04 2.32C4.67 5.16 6.66 3.58 9 3.58Z"/></svg>
            </span>
            <span style={{fontWeight:500, fontSize:14, color:'var(--fg)'}}>Continue with Google</span>
          </button>
          <button type="button" className="btn btn-secondary" style={{height:36, justifyContent:'center', gap:8}}>
            <span style={{fontSize:14}}></span>
            <span style={{fontWeight:500, fontSize:14, color:'var(--fg)'}}>Continue with Apple</span>
          </button>
          <div style={{fontSize:12, color:'var(--fg-faint)', textAlign:'center', marginTop:18, lineHeight:1.5}}>
            By clicking "Continue with Apple/Google/Email/SAML" above, you acknowledge that you have read and understood, and agree to Notion's Terms &amp; Conditions and Privacy Policy.
          </div>
        </form>
      </div>
    </div>
  );
};

const AIPage = () => (
  <div className="theme-dark" style={{minHeight: '100vh'}}>
    <Section padY={80}>
      <div style={{textAlign:'center'}}>
        <h1 style={{fontSize:64, fontWeight:500, marginBottom:18, lineHeight:1.05, fontFamily:'var(--font-display)', letterSpacing:'-0.025em'}}>
          Introducing Notion AI<sup style={{fontSize:24, color:'#A78BFA'}}>✦</sup>
        </h1>
        <p style={{fontSize:16, color:'var(--fg-muted)', maxWidth:420, margin:'0 auto 24px'}}>
          Access the limitless power of AI, right inside Notion. Work faster. It's a one-key shortcut.
        </p>
        <button className="btn btn-primary" style={{height:38, padding:'0 18px', background:'#9F7AEA'}}>Try it now</button>
      </div>
      <div style={{
        marginTop: 48, height: 220,
        background:'linear-gradient(135deg, #2A1B47 0%, #1A1730 100%)',
        borderRadius: 14, padding: 32, display:'flex', alignItems:'center',
      }}>
        <div style={{
          width:'100%', padding: '14px 16px', borderRadius:6,
          background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.85)',
          fontSize:14, lineHeight:1.6
        }}>
          <span style={{color:'#A78BFA'}}>✦</span> Improve writing — Like a personal editor for your notes. Always one keystroke away.
        </div>
      </div>
    </Section>

    <Section padY={64}>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center'}}>
        <div>
          <div style={{fontSize:14, color:'#A78BFA', marginBottom:10}}>WORK FASTER</div>
          <h2 style={{fontSize:36, fontWeight:500, marginBottom:14, fontFamily:'var(--font-display)', letterSpacing:'-0.02em'}}>Automate tedious tasks.</h2>
          <p style={{color:'var(--fg-muted)', maxWidth:380, fontSize:15, lineHeight:1.6}}>
            Notion AI uses your existing pages as context, and writes — drafts, summaries, action items — at the speed of your typing.
          </p>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
          {['Action items','Summaries','Takeaways','Translation'].map((t,i) => (
            <div key={i} style={{padding:'22px 20px', background:'rgba(255,255,255,0.04)', borderRadius:8, border:'1px solid rgba(255,255,255,0.08)'}}>
              <div style={{fontSize:13, color:'#A78BFA', marginBottom:6}}>✦</div>
              <div style={{fontWeight:600, fontSize:15, marginBottom:6}}>{t}</div>
              <div style={{fontSize:13, color:'var(--fg-muted)'}}>Generated from your pages, instantly.</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  </div>
);

Object.assign(window, { HomePage, PricingPage, SignUpPage, AIPage });
