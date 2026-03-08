import { Code, Terminal, Paintbrush, Rocket, Book, PlusCircle } from "lucide-react";

const features = [
  {
    icon: <Code className="h-5 w-5" />,
    title: "Multi-Model Router",
    desc: "Access multiple AI models from a single interface. Luna intelligently connects different providers so users can interact with powerful models without switching platforms.",
  },
  {
    icon: <Terminal className="h-5 w-5" />,
    title: "Secure Backend Control",
    desc: "API keys and routing logic remain protected on the server. Luna manages provider connections and model handling securely behind the scenes.",
  },
  {
    icon: <Paintbrush className="h-5 w-5" />,
    title: "Professional Chat Interface",
    desc: "A clean, modern chat experience designed for focus. Includes conversation history, smooth message flow, and an intuitive interface for seamless interaction.",
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "Launch-Ready Architecture",
    desc: "Built to support real conversations and scalable AI usage, allowing Luna to grow from a prototype into a production-ready platform.",
  },
  {
    icon: <Book className="h-5 w-5" />,
    title: "Conversation History",
    desc: "Automatically store and manage previous chats so users can revisit ideas, continue discussions, and track their AI interactions easily.",
  },
  {
    icon: <PlusCircle className="h-5 w-5" />,
    title: "Modular System",
    desc: "Luna is designed with flexible components, allowing new features, models, and tools to be added without rebuilding the entire platform.",
  },
];

export default function Feature1() {
  return (
    <section className="relative overflow-hidden py-14">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-violet-500/20 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-screen-xl px-4 md:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h3 className="text-3xl font-semibold tracking-tight text-zinc-100 sm:text-4xl md:text-5xl">
            What Luna is
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            Everything is designed to make AI interaction fast, powerful, and simple.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((item, idx) => (
            <article
              key={idx}
              className="group relative overflow-hidden rounded-2xl border border-violet-300/20 bg-gradient-to-b from-zinc-900/92 to-zinc-950/92 p-5 shadow-[0_20px_60px_-35px_rgba(82,39,255,0.85)] transition duration-300 hover:-translate-y-1 hover:border-violet-300/45 hover:shadow-[0_24px_70px_-30px_rgba(82,39,255,0.95)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(177,158,239,0.2),transparent_60%)] opacity-80" />

              <div className="relative">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-violet-300/35 bg-violet-500/15 text-violet-100 shadow-[0_0_24px_rgba(82,39,255,0.45)]">
                  {item.icon}
                </div>
                <h4 className="text-lg font-semibold tracking-tight text-zinc-100">{item.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.desc}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}