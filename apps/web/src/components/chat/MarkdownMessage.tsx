import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

type MarkdownMessageProps = {
  content: string;
  className?: string;
};

export function MarkdownMessage({
  content,
  className = "",
}: MarkdownMessageProps) {
  return (
    <Markdown
      className={className}
      components={{
        // Headings
        h1: ({ children, ...props }) => (
          <h1 className="mb-4 font-bold text-3xl" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="mb-3 font-semibold text-2xl" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="mb-2 font-semibold text-xl" {...props}>
            {children}
          </h3>
        ),
        h4: ({ children, ...props }) => (
          <h4 className="mb-2 font-semibold text-lg" {...props}>
            {children}
          </h4>
        ),

        // Paragraphs
        p: ({ children, ...props }) => (
          <p className="mb-4 leading-7" {...props}>
            {children}
          </p>
        ),

        // Lists
        ul: ({ children, ...props }) => (
          <ul className="mb-4 ml-6 list-disc space-y-2" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="mb-4 ml-6 list-decimal space-y-2" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => (
          <li className="leading-7" {...props}>
            {children}
          </li>
        ),

        // Links
        a: ({ children, href, ...props }) => (
          <a
            className="text-primary underline hover:text-primary/80"
            href={href}
            rel="noopener noreferrer"
            target="_blank"
            {...props}
          >
            {children}
          </a>
        ),

        // Blockquotes
        blockquote: ({ children, ...props }) => (
          <blockquote
            className="border-border border-l-4 pl-4 text-muted-foreground italic"
            {...props}
          >
            {children}
          </blockquote>
        ),

        // Inline code
        code: ({ inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || "");
          const language = match ? match[1] : "";

          if (!inline && language) {
            // Code block with syntax highlighting
            return (
              <div className="my-4 overflow-hidden rounded-lg">
                <SyntaxHighlighter
                  customStyle={{
                    margin: 0,
                    padding: "1rem",
                    fontSize: "0.875rem",
                  }}
                  language={language}
                  PreTag="div"
                  style={oneDark}
                  {...props}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              </div>
            );
          }

          // Inline code
          return (
            <code
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm"
              {...props}
            >
              {children}
            </code>
          );
        },

        // Tables
        table: ({ children, ...props }) => (
          <div className="my-4 overflow-x-auto">
            <table
              className="w-full border-collapse border border-border"
              {...props}
            >
              {children}
            </table>
          </div>
        ),
        thead: ({ children, ...props }) => (
          <thead className="bg-muted" {...props}>
            {children}
          </thead>
        ),
        th: ({ children, ...props }) => (
          <th
            className="border border-border px-4 py-2 text-left font-semibold"
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border border-border px-4 py-2" {...props}>
            {children}
          </td>
        ),

        // Horizontal rule
        hr: ({ ...props }) => (
          <hr className="my-6 border-border border-t" {...props} />
        ),

        // Strong/Bold
        strong: ({ children, ...props }) => (
          <strong className="font-semibold" {...props}>
            {children}
          </strong>
        ),

        // Emphasis/Italic
        em: ({ children, ...props }) => (
          <em className="italic" {...props}>
            {children}
          </em>
        ),
      }}
      remarkPlugins={[remarkGfm]}
    >
      {content}
    </Markdown>
  );
}
