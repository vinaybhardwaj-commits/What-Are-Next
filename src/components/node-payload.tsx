import { getNodePayload, type NodeType } from "@/lib/payload";
import { ArtefactUploader } from "@/components/artefact-uploader";
import { LinkAdder } from "@/components/link-adder";
import { ProcessBlock } from "@/components/process-block";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider font-mono text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export async function NodePayload({ nodeType, nodeId }: { nodeType: NodeType; nodeId: string }) {
  const { artefacts, links, processes, people } = await getNodePayload(nodeType, nodeId);
  return (
    <>
      <Section title="Links">
        <LinkAdder nodeType={nodeType} nodeId={nodeId}
          links={links.map((l) => ({ id: l.id, url: l.url, type: l.type, title: l.title, preview: (l.preview as any) || null }))} />
      </Section>
      <Section title="Artefacts">
        <ArtefactUploader nodeType={nodeType} nodeId={nodeId}
          artefacts={artefacts.map((a) => ({ id: a.id, label: a.label, blobUrl: a.blobUrl, contentType: a.contentType, sizeBytes: a.sizeBytes }))} />
      </Section>
      <Section title="Process / SOP">
        <ProcessBlock nodeType={nodeType} nodeId={nodeId} people={people}
          processes={processes.map((p) => ({ id: p.id, title: p.title, steps: p.steps.map((s) => ({ id: s.id, stepNo: s.stepNo, text: s.text, status: s.status, ownerPersonId: s.ownerPersonId })) }))} />
      </Section>
    </>
  );
}
