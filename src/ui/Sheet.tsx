// A sheet: slides up from the bottom on phones, a centred dialog on wider screens. Built on
// <dialog>, so focus stays inside, Esc closes it and the page behind can't be clicked.
import { useEffect, useRef, type ReactNode } from 'react'

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="qg-sheet"
      aria-label={title}
      onClose={onClose}
      onCancel={(e) => { e.preventDefault(); onClose() }}
      // A tap on the dimmed backdrop (outside the panel) closes it.
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="qg-sheet-panel">
        <header className="qg-sheet-head">
          <h2 className="card-title" style={{ margin: 0 }}>{title}</h2>
          <button type="button" className="qg-sheet-close" aria-label="Close" onClick={onClose}>✕</button>
        </header>
        {open && children}
      </div>
    </dialog>
  )
}
