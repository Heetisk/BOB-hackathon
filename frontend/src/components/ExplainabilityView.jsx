import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Area, AreaChart } from 'recharts'
import { Brain, TrendingDown, TrendingUp, Clock, Info } from 'lucide-react'

function ExplainabilityView({ selectedSession }) {
  const shapData = useMemo(() => {
    if (!selectedSession?.score_history?.length) return []
    const latest = selectedSession.score_history[selectedSession.score_history.length - 1]
    if (!latest?.shap_values) return []
    try {
      const values = JSON.parse(latest.shap_values)
      return Object.entries(values)
        .map(([feature, value]) => ({
          feature: feature.replace(/_/g, ' '),
          rawFeature: feature,
          value: value,
          absValue: Math.abs(value),
          isRisk: value < 0,
        }))
        .sort((a, b) => b.absValue - a.absValue)
    } catch {
      return []
    }
  }, [selectedSession])

  const timelineData = useMemo(() => {
    if (!selectedSession?.score_history?.length) return []
    return selectedSession.score_history.map((s, i) => ({
      time: i + 1,
      score: s.score,
      anomaly: s.anomaly_score ? s.anomaly_score * 100 : 50,
      rf: s.rf_probability ? s.rf_probability * 100 : 50,
      xgb: s.xgb_probability ? s.xgb_probability * 100 : 50,
    }))
  }, [selectedSession])

  if (!selectedSession) {
    return (
      <div className="glass rounded-2xl p-5 h-full">
        <h2 className="text-lg font-semibold text-primary-50 mb-4">Explainability</h2>
        <div className="text-center py-8 text-primary-400">
          <Brain className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Select a session to view SHAP analysis</p>
        </div>
      </div>
    )
  }

  const currentScore = selectedSession.trust_score

  return (
    <div className="glass rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-50">Explainability</h2>
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent-cyan" />
          <span className="text-xs text-primary-400">SHAP Analysis</span>
        </div>
      </div>

      {/* Current Score Display */}
      <div className="glass-light rounded-xl p-4 border border-primary-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-primary-400 uppercase tracking-wider">Trust Score</span>
          <span className={`text-2xl font-bold font-mono ${
            currentScore > 50 ? 'text-accent-green text-glow-green' :
            currentScore > 20 ? 'text-accent-amber' :
            'text-accent-red text-glow-red'
          }`}>
            {currentScore.toFixed(1)}
          </span>
        </div>
        <div className="w-full h-2 bg-primary-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              currentScore > 50 ? 'bg-accent-green' :
              currentScore > 20 ? 'bg-accent-amber' :
              'bg-accent-red'
            }`}
            style={{ width: `${currentScore}%` }}
          />
        </div>
      </div>

      {/* SHAP Feature Contributions */}
      {shapData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-3 h-3 text-primary-400" />
            <span className="text-xs text-primary-400 uppercase tracking-wider">Feature Contributions</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fill: '#94A3B8', fontSize: 10 }}
                  width={100}
                />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                  formatter={(value) => [value.toFixed(3), 'Impact']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {shapData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isRisk ? '#EF4444' : '#22C55E'}
                      fillOpacity={Math.min(1, 0.4 + entry.absValue / 0.5)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Score Timeline */}
      {timelineData.length > 1 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-3 h-3 text-primary-400" />
            <span className="text-xs text-primary-400 uppercase tracking-wider">Score Timeline</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ left: -20, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    background: '#1E293B',
                    border: '1px solid rgba(148, 163, 184, 0.1)',
                    borderRadius: '8px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#22C55E"
                  fill="url(#scoreGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Model Comparison */}
      {timelineData.length > 0 && (
        <div className="glass-light rounded-xl p-3 border border-primary-700/50">
          <p className="text-xs text-primary-400 uppercase tracking-wider mb-2">Model Probabilities</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xs text-primary-400">Isolation Forest</p>
              <p className="text-sm font-mono font-medium text-accent-cyan">
                {timelineData[timelineData.length - 1]?.anomaly?.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-primary-400">Random Forest</p>
              <p className="text-sm font-mono font-medium text-accent-amber">
                {timelineData[timelineData.length - 1]?.rf?.toFixed(1)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-primary-400">XGBoost</p>
              <p className="text-sm font-mono font-medium text-accent-red">
                {timelineData[timelineData.length - 1]?.xgb?.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExplainabilityView
