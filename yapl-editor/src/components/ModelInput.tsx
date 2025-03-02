import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";

interface ModelInputProps {
  provider: string;
  value: string;
  onChange: (value: string) => void;
}

interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
}

export function ModelInput({ provider, value, onChange }: ModelInputProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (provider === "openrouter") {
      setLoading(true);
      fetch("https://openrouter.ai/api/v1/models")
        .then((res) => res.json())
        .then((data) => {
          setModels(data.data);
        })
        .catch((error) => {
          console.error("Error fetching models:", error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [provider]);

  if (provider === "openai") {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter OpenAI model name"
          className="flex-1"
        />
        <a
          href="https://platform.openai.com/docs/models"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  if (provider === "openrouter") {
    return (
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between w-full"
            >
              {loading
                ? "Loading models..."
                : value
                ? models.find((model) => model.id === value)?.name || value
                : "Select model..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0">
            <Command>
              <CommandInput placeholder="Search models..." />
              <CommandEmpty>No model found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-y-auto">
                {models.map((model) => (
                  <CommandItem
                    key={model.id}
                    onSelect={() => {
                      onChange(model.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === model.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span>{model.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        <a
          href="https://openrouter.ai/models"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    );
  }

  return null;
}
