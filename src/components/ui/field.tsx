import { cn } from "@/lib/utils";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md bg-raised px-3 text-sm text-fg placeholder:text-subtle shadow-[var(--shadow-border)] outline-none focus:shadow-[var(--shadow-border-hover)]",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full min-h-32 rounded-lg bg-raised px-3 py-3 text-sm text-fg placeholder:text-subtle shadow-[var(--shadow-border)] outline-none focus:shadow-[var(--shadow-border-hover)] resize-y",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-sm font-medium text-muted mb-2", className)} {...props} />;
}
