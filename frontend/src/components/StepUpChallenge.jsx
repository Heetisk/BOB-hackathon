import { useState } from 'react'
import { ShieldCheck, KeyRound, Smartphone, CheckCircle, XCircle } from 'lucide-react'

function StepUpChallenge({ sessionId, onResolve }) {
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [verified, setVerified] = useState(false)

  const handleVerify = async () => {
    if (otp.length !== 6) return
    setLoading(true)
    try {
      await onResolve(sessionId, 'otp_verified')
      setVerified(true)
      setTimeout(() => {
        setVerified(false)
        setOtp('')
      }, 3000)
    } finally {
      setLoading(false)
    }
  }

  const handleBlock = async () => {
    setLoading(true)
    try {
      await onResolve(sessionId, 'block')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass rounded-2xl p-5 glow-amber border border-accent-amber/20">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-accent-amber" />
        <h3 className="text-lg font-semibold text-primary-50">Step-Up Verification</h3>
      </div>

      {verified ? (
        <div className="text-center py-6">
          <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-3" />
          <p className="text-sm text-accent-green font-medium">Identity Verified</p>
          <p className="text-xs text-primary-400 mt-1">Trust score has been restored</p>
        </div>
      ) : (
        <>
          <div className="glass-light rounded-xl p-4 mb-4 border border-primary-700/50">
            <div className="flex items-center gap-3 mb-3">
              <Smartphone className="w-5 h-5 text-accent-cyan" />
              <div>
                <p className="text-sm text-primary-200 font-medium">OTP Sent</p>
                <p className="text-xs text-primary-400">A one-time password was sent to the registered device</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-primary-400">
              <KeyRound className="w-3 h-3" />
              <span>Expires in 30 seconds</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs text-primary-400 mb-2">Enter OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full bg-primary-800/50 border border-primary-700/50 rounded-xl px-4 py-3 text-center text-lg font-mono text-primary-50 placeholder-primary-600 focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/20 transition-all"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              className="flex-1 flex items-center justify-center gap-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-accent-green border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Verify
            </button>
            <button
              onClick={handleBlock}
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-accent-red/20 hover:bg-accent-red/30 text-accent-red border border-accent-red/30 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <XCircle className="w-4 h-4" />
              Block
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default StepUpChallenge
