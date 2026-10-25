// SPDX-License-Identifier: MIT
import type { Milestone } from '../hooks/useBastion'

/** Progress toward each milestone — drawn as measured rules, not glossy bars. */
export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  return (
    <div>
      {milestones.map((milestone, index) => (
        <div
          key={milestone.id}
          className="animate-fade-up grid grid-cols-[3rem_1fr_6rem] items-center gap-4 border-b border-ink/10 py-3.5"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <span className="figure text-xs text-ink-faint">
            {String(index + 1).padStart(2, '0')}
          </span>

          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`text-sm ${milestone.earned ? 'font-medium text-ink' : 'text-ink-soft'}`}
              >
                {milestone.title}
              </span>
              <span className="figure shrink-0 text-[11px] text-ink-faint">
                {milestone.current} / {milestone.target}
              </span>
            </div>
            <div className="mt-2 h-[3px] w-full bg-ink/10">
              <div
                className={`h-full origin-left transition-all duration-700 ${
                  milestone.earned ? 'bg-verdigris' : 'bg-ink/25'
                }`}
                style={{
                  width: `${milestone.earned ? 100 : Math.max(milestone.progress, 1)}%`,
                  transform: 'scaleX(1)',
                }}
              />
            </div>
          </div>

          <span
            className={`figure justify-self-end text-xs ${
              milestone.earned ? 'text-verdigris' : 'text-ink-faint'
            }`}
          >
            {milestone.earned ? 'UNLOCKED' : `${Math.floor(milestone.progress)}%`}
          </span>
        </div>
      ))}
    </div>
  )
}
