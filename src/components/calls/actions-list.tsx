import { Badge } from "@/components/ui/badge";
import type { CallAction } from "@/lib/types";

export function ActionsList({ actions }: { actions: CallAction[] }) {
  if (!actions || actions.length === 0) {
    return (
      <p className="text-[14px] text-[rgba(0,0,0,0.45)]">No actions taken during this call.</p>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => (
        <div
          key={action.id}
          className="rounded-md border border-[#eeeff1] bg-white p-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-[11px]">
                {action.tool_name}
              </Badge>
              {action.error && (
                <Badge variant="destructive" className="text-[11px]">
                  Error
                </Badge>
              )}
            </div>
            {action.duration_ms && (
              <span className="text-[11px] text-[rgba(0,0,0,0.45)]">
                {action.duration_ms}ms
              </span>
            )}
          </div>
          {action.error && (
            <p className="mt-1 text-[11px] text-red-600">{action.error}</p>
          )}
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <p className="font-medium text-[rgba(0,0,0,0.45)]">Input</p>
              <pre className="mt-0.5 overflow-x-auto rounded bg-[#f8f9fa] p-1.5 text-[11px]">
                {JSON.stringify(action.input, null, 2)}
              </pre>
            </div>
            <div>
              <p className="font-medium text-[rgba(0,0,0,0.45)]">Output</p>
              <pre className="mt-0.5 overflow-x-auto rounded bg-[#f8f9fa] p-1.5 text-[11px]">
                {JSON.stringify(action.output, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
