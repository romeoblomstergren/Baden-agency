import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import GlobalAI from './GlobalAI'

const NAV = [
  { to:'/',          icon:'⚓', label:'Ops'      },
  { to:'/register',  icon:'📋', label:'Register' },
  { to:'/new',       icon:'➕', label:'New'      },
  { to:'/tasks',     icon:'✓',  label:'Tasks'    },
  { to:'/finance',   icon:'💰', label:'Finance'  },
]

const NAV_FULL = [
  { to:'/',              label:'Operational'   },
  { to:'/register',      label:'Register'      },
  { to:'/new',           label:'New Entry'     },
  { to:'/tasks',         label:'Tasks'         },
  { to:'/tally',         label:'Tally'         },
  { to:'/stats',         label:'Stats'         },
  { to:'/finance',       label:'Finance'       },
  { to:'/ports',         label:'Port Info'     },
  { to:'/port-overview', label:'Port Overview' },
  { to:'/soa',           label:'SOA'           },
  { to:'/templates',     label:'Templates'     },
  { to:'/vessels',       label:'Vessels'       },
  { to:'/contacts',      label:'Contacts'      },
  { to:'/daily',         label:'Daily Report'  },
  { to:'/health',        label:'⚙ Health'      },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const handleSignOut = async () => { await signOut(); navigate('/login') }

  return (
    <div style={{minHeight:'100dvh',display:'flex',flexDirection:'column'}}>
      <header style={{
        background:'var(--navy)',height:'var(--nav-h)',
        display:'flex',alignItems:'center',padding:'0 20px',gap:4,
        position:'sticky',top:0,zIndex:100,
        boxShadow:'0 1px 3px rgba(0,0,0,0.3)',
        overflowX:'auto',
      }}>
        <span style={{color:'#fff',fontWeight:700,fontSize:'0.88rem',marginRight:8,whiteSpace:'nowrap',letterSpacing:'-0.01em'}}>
          ⚓ Baden
        </span>
        <nav style={{display:'flex',gap:1,flex:1}} className="desktop-nav">
          {NAV_FULL.map(n=>(
            <NavLink key={n.to} to={n.to} end={n.to==='/'}
              style={({isActive})=>({
                color:isActive?'#fff':'rgba(255,255,255,0.55)',
                textDecoration:'none',fontSize:'0.78rem',fontWeight:isActive?600:400,
                padding:'5px 8px',borderRadius:5,
                background:isActive?'rgba(255,255,255,0.14)':'transparent',
                transition:'all 0.15s',whiteSpace:'nowrap',
              })}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <button onClick={handleSignOut} style={{
            background:'transparent',color:'rgba(255,255,255,0.5)',
            fontSize:'0.75rem',padding:'5px 10px',border:'1px solid rgba(255,255,255,0.15)',
            borderRadius:6,cursor:'pointer',whiteSpace:'nowrap',flexShrink:0,marginLeft:8,
          }}>Sign out</button>
        )}
      </header>

      <main style={{flex:1}}>{children}</main>

      <GlobalAI />

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
    'Underway':    'badge badge-underway',
    'At Anchorage':'badge badge-in-port',
    'Alongside':   'badge badge-alongside',
    'Sailed':      'badge badge-sailed',
  }[status] || 'badge badge-sailed'
  const dot = { 'Underway':'🟢', 'At Anchorage':'🔵', 'Alongside':'🟡', 'Sailed':'⚫' }[status] || ''
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
      display:'inline-block', background:bg, color:'#fff',
      fontSize:'0.7rem', fontWeight:600, padding:'2px 8px',
      borderRadius:4, fontFamily:'var(--mono)',
    }}>{code}</span>
  )
}
