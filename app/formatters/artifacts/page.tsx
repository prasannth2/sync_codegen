import { ArtifactCodeViewer, type ArtifactResponse } from "@/components/artifacts/artifact-code-viewer";

export default function ArtifactPage({ artifact }: { artifact: ArtifactResponse }) {
  return (
    <div className="p-4">
      <ArtifactCodeViewer artifact={artifact} />
    </div>
  );
}
