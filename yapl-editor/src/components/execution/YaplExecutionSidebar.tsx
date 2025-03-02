import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import yaml from "js-yaml";
import { AlertCircle, CheckCircle2, Eye, Loader2, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Provider, YaplLogger } from "yapl-js";
import { OpenAIProvider, OpenRouterProvider, Yapl } from "yapl-js";
import { YaplData } from "../YaplEditor";
import { OpenAIAuth } from "./OpenAIAuth";
import { OpenRouterAuth } from "./OpenRouterAuth";

interface YaplExecutionSidebarProps {
  data: YaplData;
  onAuthInfoUpdate?: (info: { apiKey: string; provider: string }) => void;
}

// Custom type for execution log entries
type LogEntry = {
  id: string;
  type: "info" | "error" | "system" | "llm-request" | "llm-response" | "result";
  timestamp: Date;
  message: string;
  details?: any;
};

// Custom logger implementation for YAPL
class UILogger implements YaplLogger {
  logs: LogEntry[] = [];
  onNewLog: (entry: LogEntry) => void;

  constructor(onNewLog: (entry: LogEntry) => void) {
    this.onNewLog = onNewLog;
  }

  addLog(type: LogEntry["type"], message: string, details?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(2, 11),
      type,
      timestamp: new Date(),
      message,
      details,
    };
    this.logs.push(entry);
    this.onNewLog(entry);
  }

  debug(message: string, meta?: Record<string, any>) {
    this.addLog("info", message, meta);
  }

  info(message: string, meta?: Record<string, any>) {
    this.addLog("info", message, meta);
  }

  warn(message: string, meta?: Record<string, any>) {
    this.addLog("info", `WARNING: ${message}`, meta);
  }

  error(message: string, meta?: Record<string, any>) {
    this.addLog("error", message, meta);
  }

  verbose(message: string, meta?: Record<string, any>) {
    this.addLog("info", `VERBOSE: ${message}`, meta);
  }

  // Custom methods for specific log types
  llmRequest(model: string, messages: any[]) {
    this.addLog("llm-request", `Request to ${model}`, { messages });
  }

  llmResponse(model: string, response: any) {
    this.addLog("llm-response", `Response from ${model}`, response);
  }

  result(output: any) {
    this.addLog("result", "Final result", output);
  }
}

export function YaplExecutionSidebar({
  data,
  onAuthInfoUpdate,
}: YaplExecutionSidebarProps) {
  const [apiKey, setApiKey] = useState<string>("");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("execute");
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Initialize input values based on data.inputs
  useEffect(() => {
    if (data?.inputs && Array.isArray(data.inputs)) {
      const initialInputs = data.inputs.reduce((acc, input) => {
        acc[input] = acc[input] || `Example value for ${input}`;
        return acc;
      }, {} as Record<string, string>);

      setInputValues(initialInputs);
    }
  }, [data?.inputs]);

  // Update theme when system preference changes
  useEffect(() => {
    const updateTheme = () => {
      setTheme(
        document.documentElement.classList.contains("dark") ? "dark" : "light"
      );
    };

    // Set initial theme
    updateTheme();

    // Create observer to detect theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.attributeName === "class" &&
          mutation.target === document.documentElement
        ) {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const handleApiKeyChange = (newApiKey: string) => {
    setApiKey(newApiKey);
    localStorage.setItem("openai-key", newApiKey);

    // Notify parent component about auth info update
    if (onAuthInfoUpdate) {
      onAuthInfoUpdate({
        apiKey: newApiKey,
        provider: data.provider || "openai", // Use the provider from data instead of hardcoding "openai"
      });
    }
    // Clear previous execution results when API key changes
    setExecutionLogs([]);
    setExecutionResult(null);
    setError(null);
  };

  const handleInputChange = (input: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [input]: value,
    }));
  };

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addLog = (log: LogEntry) => {
    setExecutionLogs((prevLogs) => [...prevLogs, log]);
    setTimeout(scrollToBottom, 100);
  };

  // Execute YAPL with the provided data
  const executeYapl = async () => {
    if (!apiKey) {
      setError("Please provide an API key before executing YAPL");
      return;
    }

    setIsExecuting(true);
    setExecutionLogs([]);
    setExecutionResult(null);
    setError(null);
    setActiveTab("logs");

    try {
      // Create a logger instance
      const logger = new UILogger(addLog);

      logger.info("Starting YAPL execution...");

      try {
        // Create the provider based on data.provider
        let provider: Provider;

        if (data.provider === "openai") {
          logger.info("Using OpenAI provider");

          provider = new OpenAIProvider(
            "openai",
            apiKey,
            "https://api.openai.com/v1",
            { dangerouslyAllowBrowser: true }
          );
        } else if (data.provider === "openrouter") {
          logger.info("Using OpenRouter provider");

          provider = new OpenRouterProvider(
            "openrouter",
            apiKey,
            "https://openrouter.ai/api/v1",
            { dangerouslyAllowBrowser: true }
          );
        } else {
          throw new Error(`Unsupported provider: ${data.provider}`);
        }

        // Create the YAPL engine
        const engine = new Yapl({
          providers: [provider],
          // Use in-memory cache
          cache: { get: async () => null, set: async () => {} },
          logger,
        });

        logger.info("YAPL engine created");

        // Convert YAML data to string for loading
        logger.info("Preparing YAPL program data");
        const yamlData = yaml.dump(data);

        logger.info("Loading YAPL program");
        // Load the YAPL program from the yaml string
        const program = engine.loadString(yamlData);

        logger.info("Executing YAPL program with inputs", inputValues);
        // Execute the program with the inputs
        const result = await program(inputValues);

        logger.result(result);
        setExecutionResult(result);
        setActiveTab("result");

        logger.info("Execution completed successfully");
      } catch (error) {
        logger.error(`YAPL execution error: ${error}`);
        throw error;
      }
    } catch (error) {
      console.error("YAPL execution error:", error);
      if (error instanceof Error) {
        setError(error.message);
        addLog({
          id: Math.random().toString(36).substring(2, 11),
          type: "error",
          timestamp: new Date(),
          message: `Execution failed: ${error.message}`,
          details: error.stack,
        });
      } else {
        setError("An unknown error occurred");
        addLog({
          id: Math.random().toString(36).substring(2, 11),
          type: "error",
          timestamp: new Date(),
          message: "Execution failed with an unknown error",
          details: error,
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const renderLogEntry = (log: LogEntry) => {
    const timeString = log.timestamp.toLocaleTimeString();

    let badgeVariant: "default" | "secondary" | "destructive" | "outline" =
      "default";
    let badgeText: string = log.type;

    switch (log.type) {
      case "info":
      case "system":
        badgeVariant = "secondary";
        break;
      case "error":
        badgeVariant = "destructive";
        break;
      case "llm-request":
        badgeText = "Request";
        badgeVariant = "outline";
        break;
      case "llm-response":
        badgeText = "Response";
        break;
      case "result":
        badgeText = "Result";
        badgeVariant = "default";
        break;
    }

    return (
      <div key={log.id} className="py-2 border-b border-border last:border-0">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={badgeVariant}>{badgeText}</Badge>
          <span className="text-xs text-muted-foreground">{timeString}</span>
        </div>
        <div className="text-sm">{log.message}</div>
        {log.details && (
          <div className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
            {typeof log.details === "object" ? (
              <SyntaxHighlighter
                language="json"
                style={theme === "dark" ? vscDarkPlus : oneLight}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  background: "transparent",
                  fontSize: "0.75rem",
                }}
              >
                {JSON.stringify(log.details, null, 2)}
              </SyntaxHighlighter>
            ) : (
              String(log.details)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderResult = () => {
    if (!executionResult) return null;

    // Extract the output property if it exists
    const output = executionResult.output || null;

    return (
      <div className="space-y-4">
        {/* Display the output property if it exists */}
        {output && (
          <Card className="p-4">
            <h4 className="text-md font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              result.output
            </h4>
            <p className="text-sm text-muted-foreground">
              Output comes from the output with id <code>default</code>, or the
              last output in the program.
            </p>
            <div className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[200px] overflow-y-auto">
              {typeof output === "object" ? (
                <SyntaxHighlighter
                  language="json"
                  style={theme === "dark" ? vscDarkPlus : oneLight}
                  customStyle={{
                    margin: 0,
                    padding: 0,
                    background: "transparent",
                    fontSize: "0.875rem",
                  }}
                >
                  {JSON.stringify(output, null, 2)}
                </SyntaxHighlighter>
              ) : (
                String(output)
              )}
            </div>
          </Card>
        )}

        {/* Display the full result */}
        <Card className="p-4">
          <h4 className="text-md font-medium mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Full Execution Result
          </h4>
          <div className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-[400px] overflow-y-auto">
            {typeof executionResult === "object" ? (
              <SyntaxHighlighter
                language="json"
                style={theme === "dark" ? vscDarkPlus : oneLight}
                customStyle={{
                  margin: 0,
                  padding: 0,
                  background: "transparent",
                  fontSize: "0.875rem",
                }}
              >
                {JSON.stringify(executionResult, null, 2)}
              </SyntaxHighlighter>
            ) : (
              String(executionResult)
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderInputs = () => {
    if (
      !data?.inputs ||
      !Array.isArray(data.inputs) ||
      data.inputs.length === 0
    ) {
      return (
        <p className="text-sm text-muted-foreground">
          No inputs defined in your YAPL configuration.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {data.inputs.map((input) => (
          <div key={input} className="space-y-2">
            <Label htmlFor={`input-${input}`}>{input}</Label>
            <Textarea
              id={`input-${input}`}
              placeholder={`Enter value for ${input}`}
              value={inputValues[input] || ""}
              onChange={(e) => handleInputChange(input, e.target.value)}
              className="min-h-[100px]"
            />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-hidden">
      <div className="pb-4">
        <h2 className="text-xl font-bold">Execute YAPL</h2>
        <p className="text-sm text-muted-foreground">
          Configure and run your YAPL program
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

        {/* Tabs for inputs, logs, and results */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="execute" disabled={isExecuting}>
              <div className="flex items-center">
                <Play className="mr-2 h-4 w-4" />
                Execute
              </div>
            </TabsTrigger>
            <TabsTrigger value="logs" disabled={!executionLogs.length}>
              <div className="flex items-center">
                {isExecuting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                Logs {executionLogs.length > 0 && `(${executionLogs.length})`}
              </div>
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!executionResult}>
              <div className="flex items-center">
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Result
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="execute" className="space-y-4 mt-4">
            {renderInputs()}

            <Button
              onClick={executeYapl}
              disabled={!apiKey || isExecuting}
              className="w-full mt-4"
            >
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute YAPL
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="logs" className="space-y-2 mt-4">
            {error && (
              <div className="p-3 bg-red-500/10 text-red-500 rounded-md text-sm flex items-start gap-2 mb-4">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <div className="h-[400px] rounded-md border p-4 overflow-y-auto">
              <div className="space-y-2">
                {executionLogs.map(renderLogEntry)}
                <div ref={logsEndRef} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="result" className="mt-4">
            {executionResult && renderResult()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
