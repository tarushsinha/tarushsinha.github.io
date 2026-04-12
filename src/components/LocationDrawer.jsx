export default function LocationDrawer({ location, onClose }) {
  if (!location) return null;

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div className="drawer-name">{location.name}</div>
            <div className="drawer-country">{location.country}</div>
            {location.hub && (
              <div className="drawer-hub-badge">
                <span style={{ fontSize: 12 }}>★</span> Home base
              </div>
            )}
          </div>
          <button className="drawer-close" onClick={onClose}>×</button>
        </div>

        <div className="drawer-visits">
          <div className="drawer-visits-title">
            {location.visits.length > 0
              ? `${location.visits.length} visit${location.visits.length > 1 ? "s" : ""}`
              : "Visits"}
          </div>

          {location.visits.length === 0 ? (
            <div className="drawer-no-visits">No visits logged yet.</div>
          ) : (
            location.visits.map((visit) => (
              <div key={visit.id} className="visit-card">
                <div className="visit-label">{visit.label}</div>
                <div className="visit-date">{visit.dateRange}</div>
                {visit.notes && (
                  <div className="visit-notes">{visit.notes}</div>
                )}
                {visit.albumUrl ? (
                  <a
                    href={visit.albumUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="visit-album"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="5.5" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M1 11l4-3 3 2.5 3-3 4 3.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
                    </svg>
                    View photos
                  </a>
                ) : (
                  <div className="visit-no-album">No album linked yet</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
