'use client'

import Link from 'next/link'
import { useLanguage } from '@/lib/i18n/useLanguage'
import LangSwitcher from '@/components/LangSwitcher'

function NeuralNet({ opacity = 0.45 }: { opacity?: number }) {
  const nodes = [
    { x: 80,  y: 80  }, { x: 80,  y: 200 }, { x: 80,  y: 320 }, { x: 80,  y: 440 },
    { x: 220, y: 40  }, { x: 220, y: 160 }, { x: 220, y: 280 }, { x: 220, y: 400 }, { x: 220, y: 460 },
    { x: 370, y: 80  }, { x: 370, y: 200 }, { x: 370, y: 320 }, { x: 370, y: 440 },
    { x: 520, y: 40  }, { x: 520, y: 160 }, { x: 520, y: 280 }, { x: 520, y: 400 }, { x: 520, y: 460 },
    { x: 660, y: 80  }, { x: 660, y: 200 }, { x: 660, y: 320 }, { x: 660, y: 440 },
    { x: 760, y: 140 }, { x: 760, y: 280 }, { x: 760, y: 400 },
  ]
  const links = [
    [0,4],[0,5],[1,4],[1,5],[1,6],[2,5],[2,6],[2,7],[3,6],[3,7],[3,8],
    [4,9],[4,10],[5,9],[5,10],[5,11],[6,10],[6,11],[6,12],[7,11],[7,12],[8,12],
    [9,13],[9,14],[10,13],[10,14],[10,15],[11,14],[11,15],[11,16],[12,15],[12,16],[12,17],
    [13,18],[13,19],[14,18],[14,19],[14,20],[15,19],[15,20],[15,21],[16,20],[16,21],[17,21],
    [18,22],[18,23],[19,22],[19,23],[20,23],[20,24],[21,24],
  ]
  return (
    <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity }}>
      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#FB7185" />
          <stop offset="40%"  stopColor="#E11D8B" />
          <stop offset="70%"  stopColor="#A21CAF" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <radialGradient id="node-rose" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FCA5A5" />
          <stop offset="100%" stopColor="#E11D8B" />
        </radialGradient>
        <radialGradient id="node-mag" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#F0ABFC" />
          <stop offset="100%" stopColor="#A21CAF" />
        </radialGradient>
        <radialGradient id="node-blue" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#93C5FD" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {links.map(([a, b], i) => (
        <line key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke="url(#line-grad)" strokeWidth="1.4" strokeOpacity="0.85"
        />
      ))}
      {nodes.map((n, i) => {
        const grad = i < 9 ? 'url(#node-rose)' : i < 18 ? 'url(#node-mag)' : 'url(#node-blue)'
        const r = i % 4 === 0 ? 8 : i % 3 === 0 ? 6 : 4.5
        return (
          <circle key={i} cx={n.x} cy={n.y} r={r}
            fill={grad} opacity="1" filter="url(#glow)" />
        )
      })}
    </svg>
  )
}

export default function LandingPage() {
  const { lang, setLang, t, isRTL } = useLanguage()
  const land = t.landing

  return (
    <div className="min-h-screen bg-white text-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        @keyframes fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-node { 0%,100%{opacity:.18} 50%{opacity:.28} }
        .fade-up{animation:fade-up .6s ease both}
        .fade-up-1{animation:fade-up .6s .1s ease both}
        .fade-up-2{animation:fade-up .6s .2s ease both}
        .fade-up-3{animation:fade-up .6s .3s ease both}
        .neural-anim{animation:pulse-node 4s ease-in-out infinite}
        .grad-text{background:linear-gradient(135deg,#7C3AED 0%,#C026D3 50%,#2563EB 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .grad-text-2{background:linear-gradient(135deg,#5B21B6,#9333EA);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .card{border:1px solid #F0EBF8;border-radius:16px;background:white;transition:box-shadow .25s,transform .25s,border-color .25s}
        .card:hover{box-shadow:0 8px 32px rgba(124,58,237,.12);border-color:#DDD6FE;transform:translateY(-2px)}
        .btn-primary{background:linear-gradient(135deg,#7C3AED,#9333EA);color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;transition:opacity .2s,transform .15s,box-shadow .2s;display:inline-block;text-align:center}
        .btn-primary:hover{opacity:.9;box-shadow:0 6px 24px rgba(124,58,237,.4);transform:translateY(-1px)}
        .btn-secondary{background:white;color:#374151;border:1px solid #E5E7EB;border-radius:10px;font-weight:600;cursor:pointer;display:inline-block;text-align:center;transition:border-color .2s,background .2s}
        .btn-secondary:hover{border-color:#7C3AED;background:#FAFAFF}
        .badge{background:#F5F3FF;color:#7C3AED;border:1px solid #EDE9FE;border-radius:999px;font-size:12px;font-weight:600;padding:4px 14px;display:inline-flex;align-items:center;gap:6px}
        .stat-num{font-size:36px;font-weight:900;letter-spacing:-1px;line-height:1;background:linear-gradient(135deg,#7C3AED,#C026D3);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .divider-v{width:1px;height:18px;background:#EDE9FE;display:inline-block}
        .feature-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px}
        .feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        .roles-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
        .dash-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
        .hero-h1{font-size:64px;font-weight:900;line-height:1.05;letter-spacing:-2px;color:#1E1B4B;margin-bottom:24px}
        .trust-bar{display:flex;align-items:center;justify-content:center;gap:24px;font-size:14px;color:#9CA3AF}
        .cta-trust{display:flex;gap:24px;justify-content:center;margin-top:20px;font-size:13px;color:#C4B5FD}
        .cta-inner{padding:64px 48px}
        .dash-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
        @media(max-width:767px){
          .hero-h1{font-size:36px!important;letter-spacing:-1px!important;margin-bottom:16px!important}
          .feat-grid{grid-template-columns:1fr!important}
          .roles-grid{grid-template-columns:1fr!important}
          .dash-grid{grid-template-columns:1fr 1fr!important}
          .dash-hdr{flex-direction:column!important;align-items:flex-start!important;gap:8px!important}
          .trust-bar{flex-wrap:wrap!important;gap:8px!important}
          .divider-v{display:none!important}
          .cta-trust{flex-wrap:wrap!important;gap:8px!important;justify-content:center!important}
          .cta-inner{padding:32px 20px!important}
          .hdr-hide{display:none!important}
          .hero-cta-btn{width:100%;text-align:center}
          .stat-num{font-size:28px!important}
        }
        @media(min-width:768px) and (max-width:1023px){
          .hero-h1{font-size:50px!important;letter-spacing:-1.5px!important}
          .feat-grid{grid-template-columns:repeat(2,1fr)!important}
          .roles-grid{grid-template-columns:repeat(2,1fr)!important}
        }
      `}</style>

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-purple-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#7C3AED,#C026D3)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:14}}>É</div>
            <span style={{fontWeight:700,fontSize:15,color:'#1E1B4B'}}>École du Savoir</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm" style={{color:'#6B7280'}}>
            <a href="#features" className="hover:text-purple-700 transition">{t.nav.fonctionnalites}</a>
            <a href="#roles" className="hover:text-purple-700 transition">{t.nav.roles}</a>
            <a href="#stats" className="hover:text-purple-700 transition">{t.nav.statistiques}</a>
          </nav>
          <div className="flex items-center gap-2 md:gap-3">
            <LangSwitcher lang={lang} setLang={setLang} />
            <Link href="/connexion" className="btn-secondary hdr-hide text-sm px-4 py-2">{t.nav.seConnecter}</Link>
            <Link href="/inscription" className="btn-primary text-sm px-4 py-2 md:px-5 md:py-2.5">{t.nav.commencer}</Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden" style={{background:'linear-gradient(160deg,#FAF5FF 0%,#FDF4FF 40%,#EFF6FF 100%)'}}>
        <div className="neural-anim" style={{position:'absolute',inset:0,pointerEvents:'none'}}><NeuralNet opacity={0.52} /></div>
        <div style={{position:'absolute',top:'-10%',left:'30%',width:600,height:400,background:'radial-gradient(ellipse,rgba(192,38,211,.12) 0%,transparent 70%)',pointerEvents:'none'}} />
        <div style={{position:'absolute',bottom:0,right:'20%',width:400,height:300,background:'radial-gradient(ellipse,rgba(37,99,235,.08) 0%,transparent 70%)',pointerEvents:'none'}} />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <div className="badge fade-up mb-6"><span>✦</span> {land.badge}</div>
          <h1 className="fade-up-1 hero-h1">
            {land.titre1}{' '}<span className="grad-text">{land.titre2}</span>
          </h1>
          <p className="fade-up-2" style={{fontSize:18,color:'#6B7280',maxWidth:520,margin:'0 auto 28px',lineHeight:1.7}}>{land.sousTitre}</p>
          <div className="fade-up-3 flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center mb-10">
            <Link href="/inscription?role=enseignant" className="btn-primary hero-cta-btn text-base px-8 py-3.5">{land.cta1} →</Link>
            <Link href="/inscription" className="btn-secondary hero-cta-btn text-base px-8 py-3.5">{land.cta2}</Link>
          </div>
          <div className="trust-bar">
            <span className="flex items-center gap-1.5"><span style={{color:'#10B981',fontSize:8}}>●</span> 500+ utilisateurs actifs</span>
            <span className="divider-v" />
            <span>Aucune carte bancaire</span>
            <span className="divider-v" />
            <span>Prêt en 30 secondes</span>
          </div>
        </div>
        <div className="relative max-w-4xl mx-auto px-6 pb-0">
          <div style={{background:'white',borderRadius:20,border:'1px solid #EDE9FE',boxShadow:'0 24px 80px rgba(124,58,237,.15),0 4px 20px rgba(0,0,0,.05)',overflow:'hidden'}}>
            <div style={{background:'#F9F5FF',borderBottom:'1px solid #F0EBF8',padding:'12px 16px',display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',gap:6}}>{['#FCA5A5','#FCD34D','#6EE7B7'].map(c=><div key={c} style={{width:10,height:10,borderRadius:'50%',background:c}} />)}</div>
              <div style={{flex:1,background:'#EDE9FE',borderRadius:6,height:22,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 12px'}}>
                <span style={{fontSize:10,color:'#7C3AED'}}>app.ecoledusavoir.fr/dashboard</span>
              </div>
            </div>
            <div style={{padding:24}}>
              <div className="dash-grid" style={{gap:14}}>
              <div className="dash-hdr" style={{gridColumn:'1/-1'}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:'#1E1B4B'}}>Bonjour, Fatima 👋</div>
                  <div style={{fontSize:12,color:'#9CA3AF',marginTop:2}}>3 sessions planifiées aujourd&apos;hui</div>
                </div>
                <span style={{background:'#ECFDF5',color:'#059669',border:'1px solid #D1FAE5',borderRadius:999,fontSize:11,fontWeight:600,padding:'4px 12px'}}>🟢 Session en cours</span>
              </div>
              {[{val:'24',label:'Élèves connectés',bg:'#F5F3FF',color:'#7C3AED'},{val:'8',label:'Exercices envoyés',bg:'#FDF4FF',color:'#C026D3'},{val:'92%',label:'Taux de réponse',bg:'#EFF6FF',color:'#2563EB'}].map(({val,label,bg,color})=>(
                <div key={label} style={{background:bg,borderRadius:12,padding:16}}>
                  <div style={{fontSize:28,fontWeight:800,color,lineHeight:1}}>{val}</div>
                  <div style={{fontSize:11,color:'#9CA3AF',marginTop:4}}>{label}</div>
                </div>
              ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="stats" style={{borderTop:'1px solid #F5F3FF',borderBottom:'1px solid #F5F3FF',padding:'48px 24px',background:'white'}}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[{val:'500+',label:'Élèves actifs'},{val:'50+',label:'Enseignants'},{val:'98%',label:'Satisfaction'},{val:'4–16',label:'Ans couverts'}].map(({val,label})=>(
            <div key={label}>
              <div className="stat-num">{val}</div>
              <div style={{fontSize:14,color:'#9CA3AF',marginTop:6,fontWeight:500}}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" style={{padding:'96px 24px',background:'#FAF5FF'}}>
        <div className="max-w-6xl mx-auto">
          <div style={{textAlign:'center',marginBottom:64}}>
            <div className="badge mb-4">Fonctionnalités</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'#1E1B4B',letterSpacing:-1,marginTop:12,marginBottom:12,lineHeight:1.15}}>
              {land.features.titre}<br /><span className="grad-text-2">{land.features.sousTitre}</span>
            </h2>
          </div>
          <div className="feat-grid">
            {[{emoji:'⚡',bg:'#F5F3FF',featured:false},{emoji:'🧠',bg:'#FDF4FF',featured:true},{emoji:'📊',bg:'#EFF6FF',featured:false},{emoji:'📋',bg:'#FFF7ED',featured:false},{emoji:'🔔',bg:'#F0FDF4',featured:false},{emoji:'🌍',bg:'#EFF6FF',featured:false}].map((f,i)=>{
              const item = land.features.items[i]
              return (
                <div key={i} className="card" style={{padding:24,...(f.featured?{borderColor:'#DDD6FE',boxShadow:'0 0 0 1px #DDD6FE'}:{})}}>
                  {f.featured&&<div style={{marginBottom:12}}><span style={{background:'#F5F3FF',color:'#7C3AED',fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:999}}>⭐ Le plus utilisé</span></div>}
                  <div className="feature-icon" style={{background:f.bg}}>{f.emoji}</div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:8,color:'#1E1B4B'}}>{item.titre}</div>
                  <div style={{fontSize:14,color:'#9CA3AF',lineHeight:1.65}}>{item.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="roles" style={{padding:'96px 24px',background:'white'}}>
        <div className="max-w-6xl mx-auto">
          <div style={{textAlign:'center',marginBottom:64}}>
            <div className="badge mb-4">Rôles</div>
            <h2 style={{fontSize:40,fontWeight:900,color:'#1E1B4B',letterSpacing:-1,marginTop:12}}>{land.pourQui.titre}</h2>
          </div>
          <div className="roles-grid">
            {[{gradient:'linear-gradient(135deg,#7C3AED,#9333EA)'},{gradient:'linear-gradient(135deg,#C026D3,#DB2777)'},{gradient:'linear-gradient(135deg,#2563EB,#4F46E5)'}].map((style,i)=>{
              const role = land.pourQui.roles[i]
              return (
                <div key={i} className="card" style={{overflow:'hidden'}}>
                  <div style={{background:style.gradient,padding:'28px 24px',textAlign:'center',color:'white'}}>
                    <div style={{fontSize:48,marginBottom:8}}>{role.emoji}</div>
                    <div style={{fontSize:20,fontWeight:800}}>{role.titre}</div>
                  </div>
                  <div style={{padding:24}}>
                    <p style={{fontSize:14,color:'#6B7280',lineHeight:1.65,marginBottom:20}}>{role.desc}</p>
                    <Link href="/inscription" className="btn-primary" style={{display:'block',padding:'12px 0',fontSize:14,textAlign:'center'}}>Commencer →</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section style={{background:'#FAF5FF',padding:'80px 24px',borderTop:'1px solid #F5F3FF'}}>
        <div className="max-w-3xl mx-auto text-center">
          <div style={{fontSize:48,marginBottom:20}}>💬</div>
          <blockquote style={{fontSize:22,fontWeight:700,color:'#1E1B4B',lineHeight:1.55,marginBottom:20}}>
            &ldquo;Mes élèves sont beaucoup plus engagés. Les exercices en temps réel ont complètement changé la dynamique de mes cours.&rdquo;
          </blockquote>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#7C3AED,#C026D3)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:16}}>F</div>
            <div style={{textAlign:'left'}}>
              <div style={{fontWeight:700,fontSize:14,color:'#1E1B4B'}}>Fatima Benali</div>
              <div style={{fontSize:12,color:'#9CA3AF'}}>Enseignante — Paris</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{padding:'96px 24px',background:'white'}}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="cta-inner" style={{background:'linear-gradient(135deg,#FAF5FF 0%,#FDF4FF 50%,#EFF6FF 100%)',border:'1px solid #EDE9FE',borderRadius:24,position:'relative',overflow:'hidden'}}>
            <div style={{position:'absolute',inset:0,pointerEvents:'none'}}><NeuralNet opacity={0.18} /></div>
            <div style={{position:'relative'}}>
              <div className="badge mb-6">✦ Prêt ?</div>
              <h2 style={{fontSize:40,fontWeight:900,color:'#1E1B4B',letterSpacing:-1,marginTop:12,marginBottom:12,lineHeight:1.15}}>{land.cta.titre}</h2>
              <p style={{fontSize:16,color:'#9CA3AF',marginBottom:32,lineHeight:1.6}}>{land.cta.sousTitre}</p>
              <Link href="/inscription" className="btn-primary" style={{fontSize:16,padding:'14px 40px'}}>{land.cta.btn} →</Link>
              <div className="cta-trust">
                <span>✓ Aucune carte bancaire</span>
                <span>✓ Gratuit pour démarrer</span>
                <span>✓ 30 secondes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer style={{borderTop:'1px solid #F5F3FF',padding:'32px 24px'}}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#7C3AED,#C026D3)',display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontWeight:800,fontSize:12}}>É</div>
            <span style={{fontWeight:700,fontSize:14,color:'#1E1B4B'}}>École du Savoir</span>
          </div>
          <p style={{fontSize:13,color:'#D1D5DB'}}>{land.footer}</p>
          <div style={{display:'flex',gap:24,fontSize:13,color:'#9CA3AF'}}>
            <Link href="/connexion" className="hover:text-purple-600 transition">{t.nav.seConnecter}</Link>
            <Link href="/inscription" className="hover:text-purple-600 transition">{t.nav.commencer}</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
