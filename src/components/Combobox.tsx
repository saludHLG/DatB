import { useEffect, useMemo, useRef, useState } from 'react'

export interface ComboOption {
  value: string
  label: string
}

interface ComboboxProps {
  id?: string
  options: ComboOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  /** Texto del placeholder mostrado como primera opción vacía. */
  emptyLabel?: string
}

/** Normaliza para comparar sin acentos ni mayúsculas. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Puntuación de coincidencia: exacta > prefijo > palabra > subcadena. */
function score(text: string, query: string): number {
  if (!query) return 1
  const t = norm(text)
  const q = norm(query)
  if (t === q) return 100
  if (t.startsWith(q)) return 90
  if (t.split(/[\s(),—\-./]+/).some((w) => w.startsWith(q))) return 70
  const i = t.indexOf(q)
  if (i >= 0) return 50 - Math.min(i, 20)
  return 0
}

/**
 * Selector con escritura inteligente para los formularios React.
 * Filtra al escribir, ordena por parecido y permite elegir con flechas y
 * Enter. Sustituye a los <select> nativos, que solo muestran una lista.
 */
export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Seleccione',
  disabled,
  emptyLabel,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)
  const display = open ? query : selected?.label ?? ''

  const visibles = useMemo(() => {
    const scored = options
      .map((o) => ({ o, s: score(o.label, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
    return (scored.length ? scored : []).map((x) => x.o).slice(0, 80)
  }, [options, query])

  useEffect(() => {
    function fuera(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [])

  function abrir() {
    if (disabled) return
    setOpen(true)
    setQuery('')
    setActive(0)
  }

  function elegir(i: number) {
    const o = visibles[i]
    if (!o) return
    onChange(o.value)
    setOpen(false)
    setQuery('')
  }

  function alTeclear(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) { abrir(); return }
      if (!visibles.length) return
      setActive((i) =>
        e.key === 'ArrowDown'
          ? (i + 1) % visibles.length
          : (i - 1 + visibles.length) % visibles.length,
      )
    } else if (e.key === 'Enter') {
      if (open) { e.preventDefault(); elegir(active) }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setQuery('')
    } else if (e.key === 'Tab') {
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div
      ref={wrapRef}
      className={`rcombobox${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        className="rcombobox-input"
        autoComplete="off"
        disabled={disabled}
        value={display}
        placeholder={selected ? selected.label : emptyLabel || placeholder}
        onFocus={abrir}
        onMouseDown={abrir}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0) }}
        onKeyDown={alTeclear}
      />
      <button
        type="button"
        className="rcombobox-toggle"
        tabIndex={-1}
        aria-hidden="true"
        onMouseDown={(e) => {
          e.preventDefault()
          if (open) { setOpen(false); setQuery('') } else { abrir(); inputRef.current?.focus() }
        }}
      >
        <i className="bi bi-chevron-down" />
      </button>

      {open && (
        <div className="rcombobox-list" role="listbox">
          {visibles.length === 0 && (
            <div className="rcombobox-empty">Sin coincidencias</div>
          )}
          {visibles.map((o, i) => (
            <div
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              className={
                'rcombobox-opt' +
                (i === active ? ' is-active' : '') +
                (o.value === value ? ' is-selected' : '')
              }
              onMouseDown={(e) => { e.preventDefault(); elegir(i) }}
              onMouseEnter={() => setActive(i)}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
