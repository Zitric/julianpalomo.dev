import { createFileRoute } from "@tanstack/react-router";
import { Chat } from "../components/chat/Chat";
import { site } from "../lib/site";

export const Route = createFileRoute("/")({ component: Home });

// One column on mobile. From lg, a four-column grid: two gutters and, centred
// between them, the intro (300px) and the chat, at most 1120px together. The
// header spans every column on a subgrid, so the hero runs edge to edge in its
// first row and the intro sits in the second row's left column, while main
// takes the second row's right column beside it.
const page = "pb-12 lg:grid lg:grid-cols-[1fr_300px_minmax(0,772px)_1fr] lg:gap-x-12";
const header =
  "lg:col-span-full lg:row-span-2 lg:row-start-1 lg:grid lg:grid-cols-subgrid lg:grid-rows-subgrid";
const portrait =
  "ml-1 -mt-[60px] h-[120px] w-24 -scale-x-100 rounded-[26px] ring-4 ring-background [image-rendering:pixelated] sm:ml-0 lg:-mt-[75px] lg:h-[150px] lg:w-[120px] lg:rounded-[32px] lg:ring-[6px]";
const chatCard =
  "px-4 pt-8 sm:px-6 lg:col-start-3 lg:row-start-2 lg:mt-8 lg:self-start lg:rounded-[20px] lg:border-2 lg:border-border lg:p-6";

function Home() {
  return (
    <div className={page}>
      <header className={header}>
        <div className="h-[230px] bg-tint lg:col-span-full lg:h-80" />
        <div className="flex flex-col px-4 sm:px-6 lg:col-start-2 lg:px-0">
          <img
            src="/images/julian.png"
            alt="Pixel-art portrait of Julian Palomo"
            width={96}
            height={120}
            className={portrait}
          />
          <h1 className="mt-4 font-display text-[34px] leading-tight font-extrabold tracking-[-0.02em] sm:text-[44px]">
            {site.name}
          </h1>
          <p className="mt-1 font-display text-lg font-bold text-accent lg:text-xl">{site.role}</p>
          <p className="mt-3 text-muted">
            Ask about my experience. Answers come only from facts I've confirmed, with their
            sources.
          </p>
        </div>
      </header>
      <main className={chatCard}>
        <Chat />
      </main>
    </div>
  );
}
