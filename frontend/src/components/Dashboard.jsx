import { useState } from 'react'
import { Shield, Activity, AlertTriangle, Ban, TrendingUp, Users } from 'lucide-react'
import SessionList from './SessionList'
import Simulator from './Simulator'
import ExplainabilityView from './ExplainabilityView'
import StepUpChallenge from './StepUpChallenge'

function Dashboard({ sessions, metrics, selectedSession, onSelectSession, onSimulateAction, onResolve }) {
  const [activeTab, setActiveTab] = useState('sessions')

  const statusCounts = {
    safe: sessions.filter(s => s.status === 'safe').length,
    step_up: sessions.filter(s => s.status === 'step_up').length,
    blocked: sessions.filter(s => s.status === 'blocked').length,
  }

  return (
    <div className="min-h-screen bg-primary-950">
      {/* Header */}
      <header className="glass sticky top-0 z-50 px-6 py-4">
        <div className="max-w-[1920px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-accent-green" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-green rounded-full animate-pulse-slow" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-50 tracking-tight">TrustPulse</h1>
              <p className="text-xs text-primary-400">Identity Trust Engine</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary-400">
            <Activity className="w-4 h-4 text-accent-green" />
            <span>Live</span>
          </div>
        </div>
      </header>

      <main className="max-w-[1920px] mx-auto px-6 py-6 space-y-6">
        {/* Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            label="Active Sessions"
            value={metrics.total_sessions}
            color="cyan"
          />
          <MetricCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Flagged"
            value={metrics.flagged_sessions}
            color="amber"
          />
          <MetricCard
            icon={<Ban className="w-5 h-5" />}
            label="Blocked"
            value={metrics.blocked_sessions}
            color="red"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Trust Score"
            value={metrics.avg_trust_score.toFixed(1)}
            color="green"
          />
        </div>

        {/* Status Bar */}
        <div className="glass rounded-xl px-6 py-3 flex items-center gap-6">
          <StatusPill label="Safe" count={statusCounts.safe} color="green" />
          <StatusPill label="Step-Up" count={statusCounts.step_up} color="amber" />
          <StatusPill label="Blocked" count={statusCounts.blocked} color="red" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Sessions */}
          <div className="lg:col-span-4 space-y-6">
            <SessionList
              sessions={sessions}
              selectedSession={selectedSession}
              onSelect={onSelectSession}
            />
          </div>

          {/* Center Panel - Simulator + Step-Up */}
          <div className="lg:col-span-4 space-y-6">
            <Simulator
              selectedSession={selectedSession}
              onSimulateAction={onSimulateAction}
            />
            {selectedSession?.status === 'step_up' && (
              <StepUpChallenge
                sessionId={selectedSession.id}
                onResolve={onResolve}
              />
            )}
          </div>

          {/* Right Panel - Explainability */}
          <div className="lg:col-span-4">
            <ExplainabilityView
              selectedSession={selectedSession}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

function MetricCard({ icon, label, value, color }) {
  const colors = {
    green: 'text-accent-green border-accent-green/20 bg-accent-green/5',
    red: 'text-accent-red border-accent-red/20 bg-accent-red/5',
    amber: 'text-accent-amber border-accent-amber/20 bg-accent-amber/5',
    cyan: 'text-accent-cyan border-accent-cyan/20 bg-accent-cyan/5',
  }

  return (
    <div className={`glass rounded-xl px-5 py-4 border ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <div className={colors[color].split(' ')[0]}>{icon}</div>
        <div>
          <p className="text-xs text-primary-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-bold ${colors[color].split(' ')[0]}`}>{value}</p>
        </div>
      </div>
    </div>
  )
}

function StatusPill({ label, count, color }) {
  const colors = {
    green: 'bg-accent-green/10 text-accent-green border-accent-green/20',
    amber: 'bg-accent-amber/10 text-accent-amber border-accent-amber/20',
    red: 'bg-accent-red/10 text-accent-red border-accent-red/20',
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors[color]}`}>
      <div className={`w-2 h-2 rounded-full bg-current`} />
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs opacity-70">({count})</span>
    </div>
  )
}

export default Dashboard
