/** Body of a zombie (programmatic SEO) page; the /z layout adds the website header and footer */
export default function ZombieArticle({ htmlChunk, pageTitle }: { htmlChunk?: string; pageTitle?: string }) {
  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">
      {/* HTML authored by administrators in the Super Admin panel */}
      <div dangerouslySetInnerHTML={{ __html: htmlChunk || `<h1>${pageTitle || ""}</h1>` }} />
    </article>
  );
}
