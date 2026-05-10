import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Layout      from './components/Layout'
import Login       from './pages/Login'
import Operational from './pages/Operational'
import Register    from './pages/Register'
import NewEntry    from './pages/NewEntry'
import Tally       from './pages/Tally'
import Stats       from './pages/Stats'
import Finance     from './pages/Finance'
import PortInfo    from './pages/PortInfo'
import SOA         from './pages/SOA'
import Templates   from './pages/Templates'
import Vessels     from './pages/Vessels'
import DailyReport from './pages/DailyReport'
import VesselHistory from './pages/VesselHistory'
import Contacts    from './pages/Contacts'
import PortOverview from './pages/PortOverview'
import Health      from './pages/Health'
import './styles.css'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh'}}>
      <div className="spinner"/>
    </div>
  )
  if (!user) return <Navigate to="/login" replace/>
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<Login/>}/>
        <Route path="/"         element={<Protected><Operational/></Protected>}/>
        <Route path="/register" element={<Protected><Register/></Protected>}/>
        <Route path="/new"      element={<Protected><NewEntry/></Protected>}/>
        <Route path="/tally"    element={<Protected><Tally/></Protected>}/>
        <Route path="/stats"    element={<Protected><Stats/></Protected>}/>
        <Route path="/finance"  element={<Protected><Finance/></Protected>}/>
        <Route path="/ports"    element={<Protected><PortInfo/></Protected>}/>
        <Route path="/soa"      element={<Protected><SOA/></Protected>}/>
        <Route path="/templates" element={<Protected><Templates/></Protected>}/>
        <Route path="/vessels"   element={<Protected><Vessels/></Protected>}/>
        <Route path="/daily"    element={<Protected><DailyReport/></Protected>}/>
        <Route path="/contacts"  element={<Protected><Contacts/></Protected>}/>
        <Route path="/port-overview" element={<Protected><PortOverview/></Protected>}/>
        <Route path="/health"       element={<Protected><Health/></Protected>}/>
        <Route path="/vessels/:vesselName" element={<Protected><VesselHistory/></Protected>}/>
        <Route path="*"         element={<Navigate to="/" replace/>}/>
      </Routes>
    </BrowserRouter>
  )
}
