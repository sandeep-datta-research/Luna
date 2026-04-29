import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";

export default function MarkdownMessage({ content }) {
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
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: false }], rehypeHighlight]}
      className="luna-markdown"
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
        code({ inline, className, children, ...props }) {
          if (inline) {
            return (
              <code className="luna-inline-code" {...props}>
                {children}
              </code>
            );
          }

          return (
            <pre className="luna-code-block">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        },
      }}
    >
      {normalized}
    </ReactMarkdown>
  );
}
