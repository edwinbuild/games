// The "Sign in" key in the top bar: words on wider screens, a person icon on narrow phones.
export function SignInKey({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="qg-signin-key" aria-label="Sign in" onClick={onClick}>
      <svg className="qg-signin-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="2.4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      <span className="qg-signin-text">Sign in</span>
    </button>
  )
}
