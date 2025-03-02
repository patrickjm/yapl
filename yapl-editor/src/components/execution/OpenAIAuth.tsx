import { Input } from "@/components/ui/input";
import { Key, Lock } from "lucide-react";
import { useEffect, useState } from "react";

interface OpenAIAuthProps {
  onApiKeyChange: (apiKey: string) => void;
}

export function OpenAIAuth({ onApiKeyChange }: OpenAIAuthProps) {
  const [apiKey, setApiKey] = useState<string>("");

  // Load API key from session storage on mount
  useEffect(() => {
    const storedKey = sessionStorage.getItem("openaiApiKey");
    if (storedKey) {
      setApiKey(storedKey);
      onApiKeyChange(storedKey);
    }
  }, [onApiKeyChange]);

  // Handle API key changes
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setApiKey(key);
    sessionStorage.setItem("openaiApiKey", key);
    onApiKeyChange(key);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        OpenAI API Key
      </label>
      <div className="relative">
        <Input
          type="password"
          value={apiKey}
          onChange={handleApiKeyChange}
          placeholder="sk-..."
          className="pr-10"
        />
        <Key className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <p className="text-xs text-muted-foreground">
        <Lock className="inline h-3 w-3 mr-1" />
        Your API key never leaves your browser and is only stored in session
        storage.
      </p>
    </div>
  );
}
