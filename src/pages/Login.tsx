import { useNavigate } from "react-router-dom";
import { usePhoenix } from "@/context/PhoenixContext";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { personas, signIn } = usePhoenix();
  const navigate = useNavigate();

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-6 py-12">
      <div className="card-surface w-full max-w-xl p-8">
        <p className="label-caps">World Bank Group demonstration</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">PHOENIX 360</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI-powered client, project and relationship platform. Choose a persona to enter the workspace.
        </p>
        <div className="mt-6 space-y-2">
          {personas.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                signIn(p.id);
                navigate("/home");
              }}
              className="card-hover flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left hover:bg-secondary"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
                {p.initials}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{p.name}</span>
                <span className="block text-xs text-muted-foreground">{p.title} · {p.unit}</span>
              </span>
            </button>
          ))}
        </div>
        <Button variant="ghost" className="mt-4 w-full" onClick={() => { signIn("investment_officer"); navigate("/home"); }}>
          Continue as default persona
        </Button>
      </div>
    </main>
  );
}
