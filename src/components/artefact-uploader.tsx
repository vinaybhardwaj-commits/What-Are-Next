"use client";
import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { Paperclip, FileText, ImageIcon, X, Loader2 } from "lucide-react";
import { recordArtefact, removeArtefact } from "@/lib/actions";

type Art = { id: string; label: string | null; blobUrl: string; contentType: string | null; sizeBytes: number | null };

export function ArtefactUploader({ nodeType, nodeId, artefacts }: { nodeType: string; nodeId: string; artefacts: Art[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setErr("");
    try {
      const blob = await upload(file.name, file, { access: "public", handleUploadUrl: "/api/blob/upload" });
      await recordArtefact(nodeType as any, nodeId, blob.url, file.name, file.type, file.size);
    } catch (e: any) {
      setErr(e?.message?.includes("token") || e?.message?.includes("BLOB") ? "Blob store not connected yet." : (e?.message || "Upload failed"));
    } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }

  const isImg = (ct: string | null) => ct?.startsWith("image/");
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {artefacts.map((a) => (
          <div key={a.id} className="group relative w-40 rounded-xl border bg-white p-3">
            <a href={a.blobUrl} target="_blank" rel="noreferrer" className="block">
              {isImg(a.contentType)
                ? <img src={a.blobUrl} alt={a.label || ""} className="mb-2 h-20 w-full rounded object-cover" />
                : <div className="mb-2 flex h-20 items-center justify-center rounded bg-secondary"><FileText className="h-7 w-7 text-muted-foreground" /></div>}
              <div className="truncate text-xs font-medium text-even-navy">{a.label}</div>
              {a.sizeBytes != null && <div className="text-[10px] text-muted-foreground">{Math.round(a.sizeBytes / 1024)} KB</div>}
            </a>
            <button onClick={() => start(() => removeArtefact(a.id, nodeType, nodeId))} className="absolute -right-2 -top-2 hidden rounded-full bg-white p-0.5 shadow group-hover:block" aria-label="Remove"><X className="h-3.5 w-3.5" /></button>
          </div>
        ))}
        <button onClick={() => ref.current?.click()} disabled={busy}
          className="flex h-[112px] w-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-xs text-muted-foreground hover:bg-secondary">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          {busy ? "Uploading…" : "Upload file"}
        </button>
        <input ref={ref} type="file" className="hidden" onChange={onFile} />
      </div>
      {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
    </div>
  );
}
