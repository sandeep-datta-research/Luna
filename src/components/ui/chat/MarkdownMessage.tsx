import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";

interface MarkdownMessageProps {
  content: string;
}

export default function MarkdownMessage({ content }: MarkdownMessageProps) {
  const value = typeof content === "string" ? content : "";
  const normalized = value
    .replace(/\\\\\[/g, "$$")
    .replace(/\\\\\]/g, "$$")
    .replace(/\\\\\(/g, "$")
    .replace(/\\\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");

  return (
    <div className="luna-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[[rehypeKatex, { strict: false }], rehypeHighlight]}
        components={{
          a({ href, children, ...props }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-[#8ed3c7] underline decoration-[#4f7c75]/80 underline-offset-2 transition hover:text-[#b6efe5]"
                {...props}
              >
                {children}
              </a>
            );
          },
          code({ className, children, ...props }) {
            if (!className) {
              return (
                <code className="luna-inline-code" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <pre className="luna-code-block overflow-x-auto">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          img({ src, alt, ...props }) {
            return <img src={src} alt={alt || ""} className="max-w-full rounded-2xl object-cover" {...props} />;
          },
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
