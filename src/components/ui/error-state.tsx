import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  heading?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  heading = "Something went wrong",
  description = "We couldn\u2019t load this data. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertTriangle className="h-10 w-10 text-[rgba(0,0,0,0.15)]" />
      <p className="mt-4 text-[14px] font-medium text-[#242529]">{heading}</p>
      <p className="mt-1 text-[13px] text-[rgba(0,0,0,0.55)]">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
