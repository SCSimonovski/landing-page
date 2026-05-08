// Form posting to /auth/signout. POST so it can't be triggered by accident
// via a link or prefetch. Server action handles the actual sign-out + redirect.
export function SignOutButton() {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className="text-sm text-muted hover:text-foreground"
      >
        Sign out
      </button>
    </form>
  );
}
