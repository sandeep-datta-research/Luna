import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export default function MarkdownMessage({ content }) {
  const value = typeof content === "string" ? content : "";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      className="luna-markdown"
      components={{
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
      {value}
    </ReactMarkdown>
  );
}
