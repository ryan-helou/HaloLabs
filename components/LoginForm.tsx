import { Suspense } from "react";
import AuthForm from "./AuthForm";

/**
 * The landing-page entry point — now real email + password signup (Auth.js),
 * replacing the old username-in-localStorage stub. Existing visitors get a
 * "Log in" link from within the form.
 */
export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" compact />
    </Suspense>
  );
}
