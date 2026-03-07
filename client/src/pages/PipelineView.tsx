import { useLocation, useParams } from "wouter";
import StoryPipeline from "@/components/StoryPipeline";
import Layout from "@/components/Layout";

export default function PipelineView() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();

  if (!params.id) {
    navigate("/pipeline");
    return null;
  }

  return (
    <Layout>
      <StoryPipeline
        projectId={params.id}
        onComplete={() => navigate(`/pipeline/${params.id}/result`)}
      />
    </Layout>
  );
}
