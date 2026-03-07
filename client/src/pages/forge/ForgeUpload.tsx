import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { queryClient } from "@/lib/queryClient";
import ForgeLayout from "@/components/forge/ForgeLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle, FileText } from "lucide-react";

export default function ForgeUpload() {
  const [, params] = useRoute("/forge/project/:id/upload");
  const projectId = params?.id || "";

  const [fileType, setFileType] = useState("manuscript");
  const [pastedText, setPastedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("fileType", fileType);
      if (selectedFile) {
        formData.append("manuscript", selectedFile);
      } else if (pastedText.trim()) {
        formData.append("text", pastedText);
      } else {
        throw new Error("Provide a file or paste text");
      }
      const res = await fetch(`/api/forge/projects/${projectId}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects", projectId] });
    },
  });

  const result = uploadMutation.data;

  return (
    <ForgeLayout projectId={projectId}>
      <div className="max-w-2xl animate-in fade-in duration-300">
        <h1 className="text-2xl font-bold text-amber-400 mb-6" data-testid="text-upload-heading">Upload Manuscript</h1>

        <Card className="bg-gray-900 border-amber-900/20 mb-6">
          <CardContent className="p-6 space-y-5">
            <div>
              <Label className="text-gray-300 mb-2 block">File Type</Label>
              <Select value={fileType} onValueChange={setFileType}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100" data-testid="select-file-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="manuscript" className="text-gray-100">Manuscript</SelectItem>
                  <SelectItem value="outline" className="text-gray-100">Outline</SelectItem>
                  <SelectItem value="story_bible" className="text-gray-100">Story Bible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300 mb-2 block">Upload File (.txt, .docx)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                className="w-full border-dashed border-amber-900/40 text-gray-300 hover:bg-gray-800 h-20"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-choose-file"
              >
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-5 h-5 text-amber-500" />
                  {selectedFile ? (
                    <span className="text-amber-400 text-sm">{selectedFile.name}</span>
                  ) : (
                    <span className="text-sm">Click to choose a file</span>
                  )}
                </div>
              </Button>
            </div>

            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 border-t border-gray-700" />
                <span className="text-xs text-gray-500">OR paste text</span>
                <div className="flex-1 border-t border-gray-700" />
              </div>
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your manuscript text here..."
                className="bg-gray-800 border-gray-700 text-gray-100 focus:border-amber-500 min-h-[200px] font-mono text-sm"
                data-testid="textarea-paste"
              />
            </div>

            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || (!selectedFile && !pastedText.trim())}
              className="w-full bg-amber-600 hover:bg-amber-700 text-gray-950 font-semibold"
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload & Parse
            </Button>

            {uploadMutation.isError && (
              <p className="text-red-400 text-sm" data-testid="text-upload-error">
                {(uploadMutation.error as Error).message}
              </p>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card className="bg-gray-900 border-green-900/30" data-testid="card-upload-result">
            <CardHeader className="pb-2">
              <CardTitle className="text-green-400 flex items-center gap-2 text-lg">
                <CheckCircle className="w-5 h-5" /> Upload Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="grid grid-cols-3 gap-4">
                {result.chaptersDetected !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-100" data-testid="stat-chapters-detected">{result.chaptersDetected}</p>
                    <p className="text-xs text-gray-400">Chapters Detected</p>
                  </div>
                )}
                {result.chunksCreated !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-100" data-testid="stat-chunks-created">{result.chunksCreated}</p>
                    <p className="text-xs text-gray-400">Chunks Created</p>
                  </div>
                )}
                {result.totalWords !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-100" data-testid="stat-word-count">{result.totalWords.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Total Words</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ForgeLayout>
  );
}
