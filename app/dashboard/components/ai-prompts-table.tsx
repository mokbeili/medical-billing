"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";

interface AIPrompt {
  id: number;
  jurisdiction: string;
  provider: string;
  promptTemplate: string;
}

export function AIPromptsTable() {
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    jurisdiction: "",
    provider: "",
  });
  const [newPrompt, setNewPrompt] = useState({
    jurisdiction: "",
    provider: "",
    promptTemplate: "",
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewPromptChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewPrompt((prev) => ({ ...prev, [name]: value }));
  };

  const fetchPrompts = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.jurisdiction)
        params.append("jurisdiction", filter.jurisdiction);
      if (filter.provider) params.append("provider", filter.provider);

      const response = await fetch(`/api/ai-prompts?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch AI prompts");
      const data = await response.json();
      setPrompts(data);
    } catch (error) {
      console.error("Error fetching AI prompts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async () => {
    try {
      const response = await fetch("/api/ai-prompts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPrompt),
      });

      if (!response.ok) throw new Error("Failed to create AI prompt");
      await fetchPrompts();
      setNewPrompt({
        jurisdiction: "",
        provider: "",
        promptTemplate: "",
      });
    } catch (error) {
      console.error("Error creating AI prompt:", error);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Input
            placeholder="Filter by jurisdiction..."
            name="jurisdiction"
            value={filter.jurisdiction}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by provider..."
            name="provider"
            value={filter.provider}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add AI Prompt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New AI Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="jurisdiction">Jurisdiction</Label>
                <Input
                  id="jurisdiction"
                  name="jurisdiction"
                  value={newPrompt.jurisdiction}
                  onChange={handleNewPromptChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Input
                  id="provider"
                  name="provider"
                  value={newPrompt.provider}
                  onChange={handleNewPromptChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="promptTemplate">Prompt Template</Label>
                <Textarea
                  id="promptTemplate"
                  name="promptTemplate"
                  value={newPrompt.promptTemplate}
                  onChange={handleNewPromptChange}
                  rows={5}
                />
              </div>
              <Button onClick={handleCreatePrompt}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Prompt Template</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : prompts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No AI prompts found
                </TableCell>
              </TableRow>
            ) : (
              prompts.map((prompt) => (
                <TableRow key={prompt.id}>
                  <TableCell>{prompt.jurisdiction}</TableCell>
                  <TableCell>{prompt.provider}</TableCell>
                  <TableCell className="max-w-md truncate">
                    {prompt.promptTemplate}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
