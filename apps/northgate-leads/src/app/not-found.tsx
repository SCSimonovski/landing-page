import { redirect } from "next/navigation";

// Catches every unmatched route in the app. Middleware already redirects
// unauthenticated requests to /login before resolution reaches this page,
// so by the time we render here the user is signed in — send them to
// the dashboard. (Public routes like /api/health are exact matches and
// don't fall through to not-found anyway.)
export default function NotFound() {
  redirect("/leads");
}
