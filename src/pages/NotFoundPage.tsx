import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFoundPage = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Error 404</p>
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">This page does not exist</h1>
    <p className="max-w-md text-sm text-muted-foreground">
      The route you requested is not part of the Axion accelerator, or has not been delivered yet.
    </p>
    <Button asChild>
      <Link to="/overview">Back to command overview</Link>
    </Button>
  </div>
);

export default NotFoundPage;
