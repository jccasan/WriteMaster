import { useLocation, useParams } from "wouter";
import StoryResult from "@/components/StoryResult";
import Layout from "@/components/Layout";

export default function PipelineResult() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();

  if (!params.id) {
    navigate("/pipeline");
    return null;
  }

  return (
    <Layout>
      <StoryResult
        projectId={params.id}
        onReset={() => navigate("/pipeline/new")}
      />
    </Layout>
  );
}
