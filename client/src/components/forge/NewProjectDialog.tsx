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
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" data-testid="button-new-project">
          <Plus className="w-4 h-4 mr-2" />
          Blank workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="bookplate rounded-sm">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground">Create Blank Editorial Workspace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-foreground/80">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Novel"
              className="bg-background"
              data-testid="input-project-title"
            />
          </div>
          <div>
            <Label className="text-foreground/80">Author Name</Label>
            <Input
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author name"
              className="bg-background"
              data-testid="input-project-author"
            />
          </div>
          <div>
            <Label className="text-foreground/80">Genre</Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="bg-background" data-testid="select-project-genre">
                <SelectValue placeholder="Select genre" />
              </SelectTrigger>
              <SelectContent>
                {GENRES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-foreground/80">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of your project..."
              className="bg-background"
              rows={3}
              data-testid="input-project-description"
            />
          </div>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || mutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            data-testid="button-create-project"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Workspace
          </Button>
          {mutation.isError && (
            <p className="text-destructive text-sm" data-testid="text-create-error">
              {(mutation.error as Error).message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
