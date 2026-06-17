import { Shield, AlertTriangle, Ban, ChevronRight, Smartphone, Globe, User } from 'lucide-react'

const PERSONA_LABELS = {
  typical_customer: 'Typical Customer',
  credential_stuffer: 'Credential Stuffer',
  account_takeover: 'Account Takeover',
  mule_account: 'Mule Account',
}

const PERSONA_COLORS = {
  typical_customer: 'text-accent-green',
  credential_stuffer: 'text-accent-amber',
  account_takeover: 'text-accent-red',
  mule_account: 'text-accent-red',
}

function SessionList({ sessions, selectedSession, onSelect }) {
  return (
    <div className="glass rounded-2xl p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary-50">Active Sessions</h2>
        <span className="text-xs text-primary-400 bg-primary-800/50 px-2 py-1 rounded-full">
          {sessions.length} total
        </span>
      </div>

      <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
        {sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            isSelected={selectedSession?.id === session.id}
            onClick={() => onSelect(session.id)}
          />
        ))}
      </div>
    </div>
  )
}

function SessionRow({ session, isSelected, onClick }) {
  const statusConfig = {
    safe: { icon: <Shield className="w-4 h-4" />, color: 'text-accent-green', bg: 'bg-accent-green/10', border: 'border-accent-green/20' },
    step_up: { icon: <AlertTriangle className="w-4 h-4" />, color: 'text-accent-amber', bg: 'bg-accent-amber/10', border: 'border-accent-amber/20' },
    blocked: { icon: <Ban className="w-4 h-4" />, color: 'text-accent-red', bg: 'bg-accent-red/10', border: 'border-accent-red/20' },
  }

  const config = statusConfig[session.status] || statusConfig.safe

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl transition-all duration-200 cursor-pointer
        ${isSelected
          ? `glass-light border ${config.border} ${config.bg}`
          : 'hover:bg-primary-800/30 border border-transparent'
        }
        ${session.status === 'blocked' ? 'glow-red animate-pulse-slow' : ''}
        ${session.status === 'step_up' && isSelected ? 'glow-amber' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-medium ${PERSONA_COLORS[session.persona]}`}>
              {PERSONA_LABELS[session.persona]}
            </span>
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.bg} ${config.color}`}>
              {config.icon}
              <span className="capitalize">{session.status.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-primary-400 mt-2">
            <div className="flex items-center gap-1">
              <Smartphone className="w-3 h-3" />
              <span>{session.device_fingerprint || 'Unknown'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>{session.geo_location || 'Unknown'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-primary-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  session.status === 'safe' ? 'bg-accent-green' :
                  session.status === 'step_up' ? 'bg-accent-amber' :
                  'bg-accent-red'
                }`}
                style={{ width: `${session.trust_score}%` }}
              />
            </div>
            <span className="text-xs font-mono font-medium text-primary-300 w-8 text-right">
              {session.trust_score.toFixed(0)}
            </span>
          </div>
        </div>

        <ChevronRight className={`w-4 h-4 text-primary-500 flex-shrink-0 mt-1 transition-transform duration-200 ${isSelected ? 'rotate-90' : ''}`} />
      </div>
    </button>
  )
}

export default SessionList
