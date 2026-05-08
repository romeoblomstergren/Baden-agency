export default function TrackingModal({ operation, onClose }) {
  const { vessel_name, imo, mmsi } = operation

  const openMT = () => {
    if (imo)  return window.open(`https://www.marinetraffic.com/en/ais/details/ships/imo:${imo}`, '_blank')
    if (mmsi) return window.open(`https://www.marinetraffic.com/en/ais/details/ships/mmsi:${mmsi}`, '_blank')
    const q = (vessel_name || '').replace(/^(MV|MT|MS|SS|SV)\s+/i, '').trim()
    window.open(`https://www.marinetraffic.com/en/ais/index/search/all/keyword:${encodeURIComponent(q)}`, '_blank')
  }

  const openVF = () => {
    if (imo)  return window.open(`https://www.vesselfinder.com/vessels/details/${imo}`, '_blank')
    const q = (vessel_name || '').replace(/^(MV|MT|MS|SS|SV)\s+/i, '').trim()
    window.open(`https://www.vesselfinder.com/vessels?name=${encodeURIComponent(q)}`, '_blank')
  }

  // VesselFinder free embed — works with MMSI
  const embedUrl = mmsi
    ? `https://www.vesselfinder.com/aismap?mmsi=${mmsi}&width=100%25&height=420&names=true&details=true&track=true&zoom=10`
    : imo
    ? `https://www.vesselfinder.com/aismap?imo=${imo}&width=100%25&height=420&names=true&details=true&track=true&zoom=10`
    : null

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 300,
        backdropFilter: 'blur(3px)',
      }} />
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '95vw', maxWidth: 820,
        maxHeight: '90vh',
        background: 'var(--surface)',
        borderRadius: 12,
        zIndex: 301,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        animation: 'fadeUp 0.2s ease',
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translate(-50%,-48%)}to{opacity:1;transform:translate(-50%,-50%)}}`}</style>

        {/* Header */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--navy)',
          display: 'flex', alignItems: 'center', gap: 10,
          flexShrink: 0, flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
              {imo ? `IMO: ${imo}` : ''}
              {imo && mmsi ? '  ·  ' : ''}
              {mmsi ? `MMSI: ${mmsi}` : ''}
              {!imo && !mmsi ? 'No IMO / MMSI on record' : ''}
            </div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', marginTop: 2 }}>
              🚢 {vessel_name || 'Unknown vessel'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={openVF} style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: 'none', borderRadius: 6, padding: '7px 12px',
              fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>VesselFinder ↗</button>
            <button onClick={openMT} style={{
              background: 'rgba(255,255,255,0.15)', color: '#fff',
              border: 'none', borderRadius: 6, padding: '7px 12px',
              fontSize: '0.78rem', cursor: 'pointer', whiteSpace: 'nowrap',
            }}>MarineTraffic ↗</button>
            <button onClick={onClose} style={{
              background: 'transparent', color: 'rgba(255,255,255,0.7)',
              border: 'none', fontSize: '1.4rem',
              cursor: 'pointer', lineHeight: 1, padding: '0 4px', flexShrink: 0,
            }}>×</button>
          </div>
        </div>

        {/* Map */}
        <div style={{ flex: 1, minHeight: 420, background: '#1a2a3a', position: 'relative' }}>
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={`Track ${vessel_name}`}
              style={{ width: '100%', height: '100%', minHeight: 420, border: 'none', display: 'block' }}
              loading="lazy"
              allowFullScreen
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 420,
              color: 'rgba(255,255,255,0.6)', gap: 16, padding: 24,
            }}>
              <div style={{ fontSize: '3rem' }}>🗺️</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: '#fff', marginBottom: 6 }}>No IMO or MMSI on record</div>
                <div style={{ fontSize: '0.85rem', marginBottom: 20 }}>
                  The live map needs an IMO or MMSI number.<br />
                  Add one in the Edit panel, or search directly:
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={openVF} style={{
                    background: '#2E5090', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px 20px',
                    fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600,
                  }}>Search on VesselFinder ↗</button>
                  <button onClick={openMT} style={{
                    background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
                    borderRadius: 8, padding: '10px 20px',
                    fontSize: '0.88rem', cursor: 'pointer', fontWeight: 600,
                  }}>Search on MarineTraffic ↗</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
