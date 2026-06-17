import { useState, useEffect, useCallback } from 'react'
import Dashboard from './components/Dashboard'
import { Shield, Activity, Zap } from 'lucide-react'

const API_BASE = '/api'

function App() {
  const [sessions, setSessions] = useState([])
  const [metrics, setMetrics] = useState({ total_sessions: 0, flagged_sessions: 0, blocked_sessions: 0, avg_trust_score: 0 })
  const [selectedSession, setSelectedSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/sessions`)
      const data = await res.json()
      setSessions(data)
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`)
      const data = await res.json()
      setMetrics(data)
    } catch (err) {
      console.error('Failed to fetch metrics:', err)
    }
  }, [])

  const fetchSessionDetail = useCallback(async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`)
      const data = await res.json()
      setSelectedSession(data)
    } catch (err) {
      console.error('Failed to fetch session detail:', err)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchSessions(), fetchMetrics()])
      setLoading(false)
    }
    init()

    const interval = setInterval(() => {
      fetchSessions()
      fetchMetrics()
      if (selectedSession) {
        fetchSessionDetail(selectedSession.id)
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [fetchSessions, fetchMetrics, fetchSessionDetail, selectedSession?.id])

  const handleSelectSession = (sessionId) => {
    fetchSessionDetail(sessionId)
  }

  const handleSimulateAction = async (sessionId, eventType, payload) => {
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, payload: payload ? JSON.stringify(payload) : null }),
      })
      const data = await res.json()
      fetchSessions()
      fetchMetrics()
      if (selectedSession?.id === sessionId) {
        fetchSessionDetail(sessionId)
      }
      return data
    } catch (err) {
      console.error('Failed to simulate action:', err)
    }
  }

  const handleResolve = async (sessionId, resolution) => {
    try {
      await fetch(`${API_BASE}/sessions/${sessionId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      })
      fetchSessions()
      fetchMetrics()
      if (selectedSession?.id === sessionId) {
        fetchSessionDetail(sessionId)
      }
    } catch (err) {
      console.error('Failed to resolve:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse mb-4">
            <Shield className="w-16 h-16 text-accent-green mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-primary-50 mb-2">TrustPulse</h1>
          <p className="text-primary-400">Initializing trust engine...</p>
        </div>
      </div>
    )
  }

  return (
    <Dashboard
      sessions={sessions}
      metrics={metrics}
      selectedSession={selectedSession}
      onSelectSession={handleSelectSession}
      onSimulateAction={handleSimulateAction}
      onResolve={handleResolve}
    />
  )
}

export default App
