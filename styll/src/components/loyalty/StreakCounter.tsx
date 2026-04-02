import React from 'react'
import { Flame } from 'lucide-react'

interface StreakCounterProps {
  streak: number
  longestStreak?: number
  thresholdDays?: number
}

export const StreakCounter: React.FC<StreakCounterProps> = ({
  streak,
  longestStreak,
  thresholdDays = 45,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 ${streak > 0 ? 'text-orange-500' : 'text-gray-300'}`}>
        <Flame className="w-5 h-5" />
        <span className="text-lg font-bold">{streak}</span>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-700">Streak visite</p>
        {longestStreak !== undefined && longestStreak > 0 && (
          <p className="text-xs text-gray-400">Record: {longestStreak}</p>
        )}
      </div>
    </div>
  )
}
