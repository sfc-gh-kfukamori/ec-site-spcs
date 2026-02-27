import { useState } from 'react'

const CATEGORY_EMOJI: Record<string, string> = {
  '家電': '🔌',
  '衣類': '👕',
  '食品': '🍽️',
  '書籍': '📚',
  'スポーツ': '⚽',
}

const COLORS: Record<string, string> = {
  '家電': '#3b82f6',
  '衣類': '#ec4899',
  '食品': '#f59e0b',
  '書籍': '#8b5cf6',
  'スポーツ': '#10b981',
}

function fallbackSvg(category: string, name: string): string {
  const emoji = CATEGORY_EMOJI[category] ?? '📦'
  const bg = COLORS[category] ?? '#6b7280'
  const label = name.length > 8 ? name.slice(0, 8) + '…' : name
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
    <rect width="300" height="300" fill="${bg}" rx="12"/>
    <text x="150" y="130" text-anchor="middle" font-size="80">${emoji}</text>
    <text x="150" y="200" text-anchor="middle" font-size="20" fill="white" font-family="sans-serif">${label}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

type Props = {
  src: string | null | undefined
  alt: string
  category?: string
  className?: string
}

export default function ProductImage({ src, alt, category = '', className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const imgSrc = (!src || failed) ? fallbackSvg(category, alt) : src

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
