import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { YaplData } from "../YaplEditor";
import { OpenAIAuth } from "./OpenAIAuth";
import { OpenRouterAuth } from "./OpenRouterAuth";

interface YaplExecutionSidebarProps {
  data: YaplData;
}

export function YaplExecutionSidebar({ data }: YaplExecutionSidebarProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionResults, setExecutionResults] = useState<string | null>(null);

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  // Handle YAPL execution
  const executeYapl = () => {
    if (!apiKey) {
      alert("Please provide an API key before executing YAPL");
      return;
    }

    setIsExecuting(true);
    setExecutionResults(null);

    // TODO: Implement actual YAPL execution logic
    // For now, just simulate execution with a timeout
    setTimeout(() => {
      setIsExecuting(false);
      setExecutionResults(
        "Execution completed successfully. Results would appear here."
      );
    }, 2000);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="pb-4">
        <h2 className="text-xl font-bold">Execute YAPL</h2>
        <p className="text-sm text-muted-foreground">
          Configure your execution settings
        </p>
      </div>

      <div className="flex-grow overflow-auto space-y-6 pr-2">
        {/* API Key Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Authentication</h3>

          {data?.provider === "openai" ? (
            <OpenAIAuth onApiKeyChange={handleApiKeyChange} />
          ) : data?.provider === "openrouter" ? (
            <OpenRouterAuth onApiKeyChange={handleApiKeyChange} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Please select a provider in the editor.
            </p>
          )}
        </div>

        <Separator />

        {/* Run Section */}
        <div className="space-y-4">
          <Button
            onClick={executeYapl}
            disabled={!apiKey || isExecuting}
            className="w-full"
          >
            {isExecuting ? "Executing..." : "Execute YAPL"}
          </Button>
        </div>

        {/* Results Section */}
        {executionResults && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Results</h3>
              <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {executionResults}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
