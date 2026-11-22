import "server-only";

import Link from "next/link";
import Image from "next/image";

const LATEST_POSTS_API = "https://hexpertify.com/blogs/api/posts/latest";

interface BlogGridCardProps {
  title: string;
  description: string;
  date: string;
  imageUrl: string;
  imageAlt?: string;
  author: string;
  authorDesignation?: string;
  slug?: string;
  category?: string;
}

interface LatestPostsResponse {
  success: boolean;
  posts?: BlogGridCardProps[];
}

interface BlogGridContainerProps {
  className?: string;
  emptyMessage?: string;
  showSeeMore?: boolean;
}

async function getLatestPosts(): Promise<BlogGridCardProps[]> {
  try {
    const response = await fetch(LATEST_POSTS_API, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Latest blog API returned ${response.status}`);
      return [];
    }

    const data = (await response.json()) as LatestPostsResponse;

    return data.success && Array.isArray(data.posts) ? data.posts : [];
  } catch (error) {
    console.error("Unable to fetch latest blog posts", error);
    return [];
  }
}

function formatPostDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, "");
}
function getPublicBlogPath(slug?: string): string {
  const cleanSlug = trimSlashes(slug || "");

  // always take last part (safe)
  const finalSlug = cleanSlug.split("/").pop();

  if (!finalSlug) return "/";

  return `/blogs/${finalSlug}`;
}

export default function BlogGridCard({
  title,
  description,
  date,
  imageUrl,
  imageAlt,
  author,
  authorDesignation,
  slug = "#",
}: BlogGridCardProps) {
  const href = slug === "#" ? "#" : getPublicBlogPath(slug);

  return (
    <Link href={href} title={`Read blog: ${title}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer h-full flex flex-col">
        <div className="relative w-full h-44 sm:h-60 bg-gray-200">
          <Image
            src={imageUrl}
            alt={imageAlt || title}
            title={title}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 100vw"
          />
        </div>
        <div className="p-4 sm:p-5 flex flex-col flex-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 line-clamp-2">
            {title}
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            By <span className="font-semibold">{author}</span>
            {authorDesignation ? ` • ${authorDesignation}` : ""} • {date}
          </p>
          <p className="text-gray-600 text-sm leading-relaxed line-clamp-3 flex-1">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}

export async function BlogGridContainer({
  className = "",
  emptyMessage = "No blog posts are available right now. Please try again shortly.",
  showSeeMore = true,
}: BlogGridContainerProps = {}) {
  const posts = await getLatestPosts();

  if (posts.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <BlogGridCard
            key={post.slug || post.title}
            {...post}
            date={formatPostDate(post.date)}
          />
        ))}
      </div>

      {showSeeMore && (
        <div className="mt-5 flex justify-end">
          <Link
            href="/blogs"
            className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
          >
            See more
          </Link>
        </div>
      )}
    </div>
  );
}
