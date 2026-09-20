import { NavLink } from 'react-router-dom'
import {
  ChartBarIcon,
  GearIcon,
  HouseIcon,
  StarIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react'

const items = [
  { to: '/', label: '首页', Icon: HouseIcon },
  { to: '/mistakes', label: '错词', Icon: WarningCircleIcon },
  { to: '/favorites', label: '收藏', Icon: StarIcon },
  { to: '/statistics', label: '统计', Icon: ChartBarIcon },
  { to: '/settings', label: '设置', Icon: GearIcon },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="主导航"
      className="sticky bottom-0 z-10 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex w-full max-w-xl">
        {items.map(({ to, label, Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-0.5 py-1 text-xs ${
                  isActive ? 'text-accent' : 'text-ink-soft'
                }`
              }
            >
              <Icon size={22} aria-hidden="true" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
