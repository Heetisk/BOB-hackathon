import { useState } from 'react'
import { Play, Zap, AlertTriangle, ArrowRight, CreditCard, Phone, MapPin, UserPlus, LogOut } from 'lucide-react'

const PRESET_ACTIONS = [
  { id: 'login', label: 'Login', icon: <Play className="w-4 h-4" />, risk: 'low', payload: {} },
  { id: 'change_phone_number', label: 'Change Phone', icon: <Phone className="w-4 h-4" />, risk: 'high', payload: {} },
  { id: 'add_beneficiary', label: 'Add Beneficiary', icon: <UserPlus className="w-4 h-4" />, risk: 'high', payload: { type: 'high_risk' } },
  { id: 'transfer_funds', label: 'Transfer Funds', icon: <CreditCard className="w-4 h-4" />, risk: 'critical', payload: { amount: 95000, to: 'new_beneficiary' } },
  { id: 'change_password', label: 'Change Password', icon: <AlertTriangle className="w-4 h-4" />, risk: 'medium', payload: {} },
  { id: 'logout', label: 'Logout', icon: <LogOut className="w-4 h-4" />, risk: 'low', payload: {} },
]

const PERSONA_SCENARIOS = {
  typical_customer: {
    label: 'Typical Customer',
    description: 'Normal banking behavior — known device, standard transactions',
    actions: ['login', 'transfer_funds', 'logout'],
  },
  credential_stuffer: {
    label: 'Credential Stuffer',
    description: 'Multiple failed logins from unknown device, rapid speed',
    actions: ['change_password', 'transfer_funds'],
  },
  account_takeover: {
    label: 'Account Takeover',
    description: 'New device login, phone change, high-risk beneficiary, large transfer',
    actions: ['change_phone_number', 'add_beneficiary', 'transfer_funds'],
  },
  mule_account: {
    label: 'Mule Account',
    description: 'Rapid deposits followed by immediate outflows',
    actions: ['transfer_funds', 'transfer_funds', 'transfer_funds'],
  },
}

function Simulator({ selectedSession, onSimulateAction }) {
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const handleAction = async (actionId, payload) => {
    if (!selectedSession || loading) return
    setLoading(true)
    try {
      const result = await onSimulateAction(selectedSession.id, actionId, payload)
      setLastResult(result)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedSession) {
    return (
      <div className="glass rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-primary-50 mb-4">Simulator</h2>
        <div className="text-center py-8 text-primary-400">
          <Zap className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a session to start simulation</p>
        </div>
      </div>
    )
  }

  const scenario = PERSONA_SCENARIOS[selectedSession.persona]

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-primary-50">Simulator</h2>
        <span className="text-xs text-primary-400 font-mono">{selectedSession.id.slice(0, 8)}...</span>
      </div>

      {/* Persona Info */}
      {scenario && (
        <div className="glass-light rounded-xl p-3 mb-4 border border-primary-700/50">
          <p className="text-sm font-medium text-primary-200">{scenario.label}</p>
          <p className="text-xs text-primary-400 mt-1">{scenario.description}</p>
        </div>
      )}

      {/* Quick Scenario Buttons */}
      {scenario && (
        <div className="mb-4">
          <p className="text-xs text-primary-400 uppercase tracking-wider mb-2">Quick Scenario</p>
          <div className="flex flex-wrap gap-2">
            {scenario.actions.map((actionId, idx) => {
              const action = PRESET_ACTIONS.find(a => a.id === actionId)
              if (!action) return null
              return (
                <button
                  key={idx}
                  onClick={() => handleAction(actionId, action.payload)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-800/50 hover:bg-primary-700/50 text-xs text-primary-200 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-primary-700/30 hover:border-primary-600/50"
                >
                  {action.icon}
                  {action.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Manual Actions */}
      <div>
        <p className="text-xs text-primary-400 uppercase tracking-wider mb-2">Manual Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id, action.payload)}
              disabled={loading}
              className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border
                ${action.risk === 'critical' ? 'border-accent-red/20 bg-accent-red/5 hover:bg-accent-red/10 text-accent-red' :
                  action.risk === 'high' ? 'border-accent-amber/20 bg-accent-amber/5 hover:bg-accent-amber/10 text-accent-amber' :
                  'border-primary-700/30 bg-primary-800/30 hover:bg-primary-700/30 text-primary-200'
                }
              `}
            >
              {action.icon}
              <span className="text-xs font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="mt-4 glass-light rounded-xl p-3 border border-primary-700/50">
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="w-3 h-3 text-accent-cyan" />
            <span className="text-xs text-primary-400">Last Action</span>
          </div>
          <p className="text-sm text-primary-200 font-medium">{lastResult.event?.event_type?.replace(/_/g, ' ')}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className={`text-xs font-mono ${lastResult.score?.trust_score < 50 ? 'text-accent-red' : 'text-accent-green'}`}>
              Score: {lastResult.score?.trust_score?.toFixed(1)}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              lastResult.score?.status === 'safe' ? 'bg-accent-green/10 text-accent-green' :
              lastResult.score?.status === 'step_up' ? 'bg-accent-amber/10 text-accent-amber' :
              'bg-accent-red/10 text-accent-red'
            }`}>
              {lastResult.score?.status?.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-primary-400">
          <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Processing...</span>
        </div>
      )}
    </div>
  )
}

export default Simulator
