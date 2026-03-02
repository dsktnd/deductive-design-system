"use client";

import type { StageStatus } from "./constants";

export default function StageImageArea({
  status,
  label,
  onEnlarge,
}: {
  status: StageStatus | undefined;
  label: string;
  onEnlarge: (src: string) => void;
}) {
  if (status?.loading) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900/50">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300" />
          <span className="mt-2 block text-xs text-zinc-500">生成中...</span>
        </div>
      </div>
    );
  }
  if (status?.image) {
    return (
      <button onClick={() => onEnlarge(status.image!.image)} className="block h-full w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={status.image.image}
          alt={label}
          className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
        />
      </button>
    );
  }
  if (status?.error) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-900/50 p-3">
        <span className="text-xs text-red-400 text-center">{status.error}</span>
      </div>
    );
  }
  return (
    <div className="flex h-full items-center justify-center bg-zinc-900/30">
      <span className="text-xs text-zinc-700">Waiting...</span>
    </div>
  );
}
