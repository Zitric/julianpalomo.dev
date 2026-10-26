import { createFileRoute } from "@tanstack/react-router";
import { site } from "../lib/site";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-2 px-6">
      <h1 className="text-4xl font-semibold">{site.name}</h1>
      <p className="text-lg">{site.role}</p>
      <p className="text-muted">Coming soon</p>
    </main>
  );
}
