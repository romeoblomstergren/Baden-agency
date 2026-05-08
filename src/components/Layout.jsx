import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const NAV = [
  { to:'/',          icon:'⚓', label:'Ops'      },
  { to:'/register',  icon:'📋', label:'Register' },
  { to:'/new',       icon:'➕', label:'New'      },
  { to:'/finance',   icon:'💰', label:'Finance'  },
  { to:'/ports',     icon:'🗂️', label:'Ports'    },
]

const NAV_FULL = [
  { to:'/',          label:'Operational' },
  { to:'/register',  label:'Register'   },
  { to:'/new',       label:'New Entry'  },
  { to:'/tally',     label:'Tally'      },
  { to:'/stats',     label:'Stats'      },
  { to:'/finance',   label:'Finance'    },
  { to:'/ports',     label:'Port Info'  },
  { to:'/soa',       label:'SOA'        },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}>
      {/* Desktop top bar */}
      <header style={{
        background:'var(--navy)',height:'var(--nav-h)',
        display:'flex',alignItems:'center',padding:'0 20px',gap:4,
        position:'sticky',top:0,zIndex:100,
        boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
      }}>
        <span style={{color:'#fff',fontWeight:600,fontSize:'0.9rem',marginRight:12,whiteSpace:'nowrap'}}>
          ⚓ Baden Agency
        </span>
        <nav style={{display:'flex',gap:2,flex:1,flexWrap:'wrap'}} className="desktop-nav">
          {NAV_FULL.map(n=>(
            <NavLink key={n.to} to={n.to} end={n.to==='/'}
              style={({isActive})=>({
                color:isActive?'#fff':'rgba(255,255,255,0.6)',
                textDecoration:'none',fontSize:'0.82rem',fontWeight:500,
                padding:'6px 10px',borderRadius:6,
                background:isActive?'rgba(255,255,255,0.12)':'transparent',
                transition:'all 0.15s',whiteSpace:'nowrap',
              })}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <button onClick={handleSignOut} style={{
            background:'transparent',color:'rgba(255,255,255,0.6)',
            fontSize:'0.78rem',padding:'6px 10px',border:'1px solid rgba(255,255,255,0.2)',
            borderRadius:6,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,
          }}>Sign out</button>
        )}
      </header>

      <main style={{flex:1}}>{children}</main>

      {/* Mobile bottom tabs */}
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,
        height:'var(--bottom-h)',
        background:'var(--surface)',borderTop:'1px solid var(--border)',
        display:'grid',gridTemplateColumns:'repeat(5,1fr)',
        zIndex:100,paddingBottom:'env(safe-area-inset-bottom)',
      }} className="mobile-nav">
        {NAV.map(n=>(
          <NavLink key={n.to} to={n.to} end={n.to==='/'}
            style={({isActive})=>({
              display:'flex',flexDirection:'column',alignItems:'center',
              justifyContent:'center',gap:3,textDecoration:'none',
              color:isActive?'var(--navy)':'var(--muted)',
              fontSize:'0.62rem',fontWeight:isActive?600:400,paddingTop:8,
            })}>
            <span style={{fontSize:'1.2rem',lineHeight:1}}>{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>

      <style>{`
        @media (min-width: 640px) { .mobile-nav { display: none !important; } }
        @media (max-width: 639px) { .desktop-nav { display: none !important; } }
      `}</style>
    </div>
  )
}

export function VesselStatusBadge({ status }) {
  if (!status) return <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>
  const cls = {
    'Underway':  'badge badge-underway',
    'In Port':   'badge badge-in-port',
    'Alongside': 'badge badge-alongside',
    'Sailed':    'badge badge-sailed',
  }[status] || 'badge badge-sailed'
  const dot = { 'Underway':'🟢', 'In Port':'🔵', 'Alongside':'🟡', 'Sailed':'⚫' }[status] || ''
  return <span className={cls}><span style={{ fontSize: '0.6rem' }}>{dot}</span>{status}</span>
}

export function EntryStatusBadge({ status }) {
  if (!status) return null
  const cls = {
    'Open':      'badge badge-open',
    'Closed':    'badge badge-closed',
    'Pending':   'badge badge-pending',
    'Disputed':  'badge badge-disputed',
    'Partial':   'badge badge-pending',
    'Cancelled': 'badge badge-sailed',
  }[status] || 'badge badge-closed'
  return <span className={cls}>{status}</span>
}

export function OpTypeBadge({ code }) {
  const colors = {
    OPA:'#1B2A4A', BOC:'#2E5090', HUS:'#1A5E38',
    PAG:'#7B3F00', BRO:'#5C3566', TRA:'#B5510A',
    MAR:'#1A4A6B', ENQ:'#7F3F3F',
  }
  const bg = colors[code] || '#888'
  return (
    <span style={{
      display: 'inline-block',
      background: bg,
      color: '#fff',
      fontSize: '0.7rem',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: 4,
      fontFamily: 'var(--mono)',
    }}>{code}</span>
  )
}
