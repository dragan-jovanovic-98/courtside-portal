import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-zinc-50 sm:items-center sm:justify-center sm:px-4">
      <div className="flex w-full flex-1 flex-col bg-white sm:max-w-[440px] sm:flex-none sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-sm">
        <div className="safe-area-top flex flex-col px-6 pt-10 pb-6 sm:px-10 sm:pt-10 sm:pb-0">
          <div className="flex items-center justify-center gap-2.5">
            <Image
              src="/courtside.png"
              alt="Courtside AI"
              width={30}
              height={30}
            />
            <span className="text-[17px] font-semibold text-zinc-900">
              Courtside AI
            </span>
          </div>
        </div>
        <div className="flex flex-1 flex-col px-6 pb-10 sm:px-10 sm:pb-10 sm:pt-2 safe-area-bottom">
          <div className="mt-2 sm:mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
