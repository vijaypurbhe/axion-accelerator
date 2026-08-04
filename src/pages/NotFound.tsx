import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <p className="label-caps">Phoenix 360</p>
      <h1 className="text-2xl font-semibold text-foreground">This module is not available yet</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The requested record or module is not part of the current build. Return to the command center to continue.
      </p>
      <Link to="/home" className="text-sm font-medium text-brand hover:underline">
        Back to Command Center
      </Link>
    </main>
  );
}
