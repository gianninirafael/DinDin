import type { Category } from '../types'

// Seed categories inspired by the reference app (kept in PT-BR).
// Each has an emoji glyph for now — swap for an icon set later.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'moto-corre', label: 'Moto corre', icon: '🛵', color: '#f4a5a5', kind: 'expense' },
  { id: 'moto', label: 'Moto', icon: '🏍️', color: '#f2b8c6', kind: 'expense' },
  { id: 'bebida', label: 'Bebida', icon: '🍺', color: '#f5d76e', kind: 'expense' },
  { id: 'comida', label: 'Comida', icon: '🍽️', color: '#7fdbca', kind: 'expense' },
  { id: 'rua', label: 'Rua', icon: '⛽', color: '#f6cbb0', kind: 'expense' },
  { id: 'maconha', label: 'Maconha', icon: '🌿', color: '#8ed99a', kind: 'expense' },
  { id: 'farmacia', label: 'Farmácia', icon: '💊', color: '#9ec5f0', kind: 'expense' },
  { id: 'compras', label: 'Compras', icon: '🛒', color: '#f5c96b', kind: 'expense' },
  { id: 'nao-sei', label: 'Não sei', icon: '👻', color: '#c9b8f0', kind: 'expense' },
  { id: 'lazer', label: 'Lazer', icon: '🎮', color: '#a5d8f4', kind: 'expense' },
  { id: 'dividas', label: 'Dívidas', icon: '🏷️', color: '#f0a5a5', kind: 'expense' },
  { id: 'telefone', label: 'Telefone', icon: '📱', color: '#b8e0d2', kind: 'expense' },
  { id: 'banca', label: 'Banca', icon: '📖', color: '#f4d19b', kind: 'expense' },
  { id: 'beleza', label: 'Beleza', icon: '💇', color: '#f2c6dd', kind: 'expense' },
  { id: 'trabalho', label: 'Trabalho', icon: '🖥️', color: '#a5c9f4', kind: 'expense' },
  { id: 'carro', label: 'Carro', icon: '🚗', color: '#c6d2dd', kind: 'expense' },
  { id: 'reparos', label: 'Reparos', icon: '🛠️', color: '#d0c4b0', kind: 'expense' },
  // Income
  { id: 'salario', label: 'Salário', icon: '💰', color: '#7fdbca', kind: 'income' },
  { id: 'extra', label: 'Extra', icon: '✨', color: '#f5d76e', kind: 'income' },
  { id: 'vendas', label: 'Vendas', icon: '🤝', color: '#8ed99a', kind: 'income' },
]

export const CATEGORY_MAP = Object.fromEntries(
  DEFAULT_CATEGORIES.map((c) => [c.id, c]),
) as Record<string, Category>
