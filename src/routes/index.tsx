import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "../components/chat/Chat";
import { site } from "../lib/site";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">{site.name}</h1>
        <p className="text-lg">{site.role}</p>
        <p className="text-muted">
          Ask about my experience. Answers come only from facts I've confirmed, with their sources.
        </p>
      </header>
      <Chat />
    </main>
  );
}
