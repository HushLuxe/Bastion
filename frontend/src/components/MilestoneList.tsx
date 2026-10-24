// SPDX-License-Identifier: MIT
import type { Milestone } from '../hooks/useBastion'
import { CheckIcon } from './icons'

/** Progress list toward each milestone. Every bar is driven by on-chain state. */
export function MilestoneList({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="space-y-4">
      {milestones.map((milestone, index) => (
        <div
          key={milestone.id}
          className="animate-fade-up"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span
              className={`flex items-center gap-2 font-display text-sm font-medium ${
                milestone.earned ? 'text-bastion-ink' : 'text-bastion-muted'
              }`}
            >
              {milestone.earned && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-bastion-amber text-bastion-bg">
                  <CheckIcon className="h-3 w-3" />
                </span>
              )}
              {milestone.title}
            </span>
            <span className="font-mono text-[11px] text-bastion-muted">
              {milestone.current} / {milestone.target}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-bastion-bg-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                milestone.earned
                  ? 'bg-gradient-to-r from-bastion-amber-deep to-bastion-amber-soft'
                  : 'bg-bastion-stone-3'
              }`}
              style={{ width: `${milestone.earned ? 100 : Math.max(milestone.progress, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
