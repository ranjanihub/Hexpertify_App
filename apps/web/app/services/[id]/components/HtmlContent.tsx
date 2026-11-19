import Script from "next/script";

interface HtmlContentProps {
  content?: string;
}

const HtmlContent = ({ content }: HtmlContentProps) => {
  if (!content) return null;

  // Extract scripts from content
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  const scripts: { src?: string; content?: string }[] = [];

  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const scriptTag = match[0];
    const srcMatch = scriptTag.match(/src=["']([^"']+)["']/);
    if (srcMatch) {
      scripts.push({ src: srcMatch[1] });
    } else if (match[1]?.trim()) {
      scripts.push({ content: match[1] });
    }
  }

  // Remove scripts from HTML content for SSR
  const htmlWithoutScripts = content.replace(scriptRegex, "");

  return (
    <div className="bg-white rounded-xl p-5 md:p-8 border border-gray-100 shadow-sm">
      <div
        className="html-content max-w-none [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mb-3 [&>h2]:mt-5 [&>h3]:text-lg [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-4 [&>p]:text-sm [&>p]:leading-relaxed [&>p]:mb-3 [&>p]:text-gray-700 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-3 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-3 [&>li]:text-sm [&>li]:text-gray-700 [&>strong]:font-semibold [&>strong]:text-gray-900 [&>a]:text-primary [&>a]:underline"
        dangerouslySetInnerHTML={{ __html: htmlWithoutScripts }}
      />
      {scripts.map((script, index) =>
        script.src ? (
          <Script key={index} src={script.src} strategy="lazyOnload" />
        ) : script.content ? (
          <Script key={index} id={`html-script-${index}`} strategy="lazyOnload">
            {script.content}
          </Script>
        ) : null,
      )}
    </div>
  );
};

export default HtmlContent;
