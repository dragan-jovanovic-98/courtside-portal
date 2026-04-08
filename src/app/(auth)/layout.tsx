import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-[440px]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm">
          <div className="flex items-center justify-center gap-2.5">
            <Image
              src="/courtside.png"
              alt="Courtside AI"
              width={30}
              height={30}
            />
            <span className="text-[17px] font-semibold text-zinc-900">Courtside AI</span>
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
