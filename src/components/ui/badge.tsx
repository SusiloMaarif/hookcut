import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center h-6 px-2 text-xs font-medium rounded-full bg-raised text-muted tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
