import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

const GENRES = [
  "Fantasy", "Science Fiction", "Romance", "Thriller", "Mystery",
  "Horror", "Literary Fiction", "Historical Fiction", "Young Adult",
  "Contemporary", "Dark Romance", "Urban Fantasy", "Epic Fantasy",
  "Crime", "Suspense", "Dystopian", "Paranormal", "Adventure", "Other"
];

interface NewProjectDialogProps {
  onCreated?: (project: any) => void;
}

export default function NewProjectDialog({ onCreated }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/forge/projects", { title, authorName, genre, description });
      return res.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/forge/projects"] });
      setOpen(false);
      setTitle("");
      setAuthorName("");
      setGenre("");
      setDescription("");
      onCreated?.(project);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-amber-600 hover:bg-amber-700 text-gray-950 font-semibold" data-testid="button-new-project">
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-amber-900/30 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Create New Project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-gray-300">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Novel"
              className="bg-gray-800 border-gray-700 text-gray-100 focus:border-amber-500"
              data-testid="input-project-title"
            />
          </div>
          <div>
            <Label className="text-gray-300">Author Name</Label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author name"
              className="bg-gray-800 border-gray-700 text-gray-100 focus:border-amber-500"
              data-testid="input-project-author"
            />
          </div>
          <div>
            <Label className="text-gray-300">Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100" data-testid="select-project-genre">
                <SelectValue placeholder="Select genre" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g} className="text-gray-100 focus:bg-amber-600/20">
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              className="bg-gray-800 border-gray-700 text-gray-100 focus:border-amber-500"
              rows={3}
              data-testid="input-project-description"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className="w-full bg-amber-600 hover:bg-amber-700 text-gray-950 font-semibold"
            data-testid="button-create-project"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Project
          </Button>
          {mutation.isError && (
            <p className="text-red-400 text-sm" data-testid="text-create-error">
              {(mutation.error as Error).message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
