interface NotificationTitleBarProps {
  title?: string | null;
  sticky?: boolean;
}

export default function NotificationTitleBar({
  title,
  sticky = false,
}: NotificationTitleBarProps) {
  const trimmedTitle = title?.trim();

  if (!trimmedTitle) return null;

  return (
    <div
      className={`${sticky ? "sticky top-0 z-40" : ""} w-full bg-[#450BC8] px-4 py-2 text-center text-sm font-semibold text-white shadow-sm md:text-base`}
    >
      {trimmedTitle}
    </div>
  );
}
