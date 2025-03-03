import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import yaml from "js-yaml";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Eye,
  Loader2,
  Play,
  X,
} from "lucide-react";
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
  const [expandedOutputs, setExpandedOutputs] = useState<Set<string>>(
    new Set()
  );
  const [selectedOutput, setSelectedOutput] = useState<{
    chainId: string;
    outputId: string;
    content: any;
  } | null>(null);

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

  const toggleOutputExpansion = (outputId: string) => {
    const newExpandedOutputs = new Set(expandedOutputs);
    if (expandedOutputs.has(outputId)) {
      newExpandedOutputs.delete(outputId);
    } else {
      newExpandedOutputs.add(outputId);
    }
    setExpandedOutputs(newExpandedOutputs);
  };

  const openOutputModal = (chainId: string, outputId: string, content: any) => {
    setSelectedOutput({ chainId, outputId, content });
  };

  const closeOutputModal = () => {
    setSelectedOutput(null);
  };

  const renderResult = () => {
    if (!executionResult) return null;

    // Debug the structure of results
    console.log("Full execution result:", executionResult);

    // Extract chain results
    const chainResults = executionResult.chains || {};
    const hasChains = Object.keys(chainResults).length > 0;

    console.log("Chain results:", chainResults);

    return (
      <div className="space-y-4">
        {/* Chain outputs browser */}
        {hasChains && (
          <Card className="p-4">
            <h4 className="text-md font-medium mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Chain Outputs
            </h4>

            <div className="space-y-3">
              {Object.entries(chainResults).map(([chainId, chainResult]) => {
                console.log(`Chain ${chainId} result:`, chainResult);

                // Type check and default for outputs
                const chainResultObj =
                  typeof chainResult === "object" && chainResult
                    ? chainResult
                    : {};

                // YAPL structure may have outputs directly or in result.outputs
                let outputs = {};
                if ("outputs" in chainResultObj) {
                  outputs = chainResultObj.outputs || {};
                } else if (
                  "result" in chainResultObj &&
                  typeof chainResultObj.result === "object" &&
                  chainResultObj.result
                ) {
                  // Try to get outputs from result property
                  const resultObj = chainResultObj.result as Record<
                    string,
                    unknown
                  >;
                  outputs =
                    "outputs" in resultObj
                      ? (resultObj.outputs as Record<string, unknown>)
                      : "output" in resultObj
                      ? (resultObj.output as Record<string, unknown>)
                      : resultObj || {};
                } else {
                  // Assume the chain result itself is the output
                  outputs = { default: chainResultObj };
                }

                console.log(`Chain ${chainId} processed outputs:`, outputs);

                const hasOutputs =
                  typeof outputs === "object" &&
                  outputs &&
                  Object.keys(outputs).length > 0;

                if (!hasOutputs) return null;

                return (
                  <div key={chainId} className="space-y-2">
                    <h5 className="text-sm font-medium text-primary">
                      {chainId}
                    </h5>

                    <div className="space-y-2 pl-2 border-l-2 border-border">
                      {Object.entries(outputs).map(([outputId, output]) => {
                        console.log(`Output ${chainId}.${outputId}:`, output);

                        // Use the output as-is without trying to extract nested properties
                        let outputValue = output;

                        // Generate preview content
                        const previewContent =
                          outputValue === undefined || outputValue === null
                            ? "No output available"
                            : typeof outputValue === "object"
                            ? JSON.stringify(outputValue).substring(0, 100) +
                              (JSON.stringify(outputValue).length > 100
                                ? "..."
                                : "")
                            : String(outputValue).substring(0, 100) +
                              (String(outputValue).length > 100 ? "..." : "");

                        return (
                          <div key={outputId} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">
                                {outputId}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() =>
                                  openOutputModal(
                                    chainId,
                                    outputId,
                                    outputValue
                                  )
                                }
                              >
                                View Full Output
                              </Button>
                            </div>
                            <div className="text-xs font-mono p-2 bg-muted/30 rounded border border-border overflow-x-auto">
                              {previewContent}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Raw execution result section */}
        <Card className="p-4">
          <h4 className="text-md font-medium mb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-500" />
            Raw Execution Result
          </h4>

          <p className="text-sm text-muted-foreground mb-2">
            Complete execution data including all chain outputs and metadata.
            Useful for debugging.
          </p>

          <div
            className="flex items-center gap-2 p-2 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors"
            onClick={() => toggleOutputExpansion("raw-result")}
          >
            <div
              className="transform transition-transform duration-200"
              style={{
                transform: expandedOutputs.has("raw-result")
                  ? "rotate(90deg)"
                  : "rotate(0)",
              }}
            >
              ▶
            </div>
            <div className="font-mono text-xs truncate flex-1">
              {JSON.stringify(executionResult).substring(0, 100)}...
            </div>
          </div>

          {expandedOutputs.has("raw-result") && (
            <div className="mt-2 bg-muted p-3 rounded text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              <SyntaxHighlighter
                language="json"
                style={theme === "dark" ? vscDarkPlus : oneLight}
                customStyle={{
                  margin: 0,
                  background: "transparent",
                  maxHeight: "300px",
                  overflowY: "auto",
                }}
              >
                {JSON.stringify(executionResult, null, 2)}
              </SyntaxHighlighter>
            </div>
          )}
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
              className="min-h-[100px] max-h-[300px] overflow-y-auto"
            />
          </div>
        ))}
      </div>
    );
  };

  // Helper function to format JSON with highlighting
  const formatJson = (json: string, isDark: boolean) => {
    // Colors for dark and light themes
    const colors = {
      punctuation: isDark ? "#bbb" : "#555",
      key: isDark ? "#7dd3fc" : "#0284c7", // light blue
      string: isDark ? "#a5d6a7" : "#16a34a", // green
      number: isDark ? "#ffab91" : "#dd6b20", // orange
      boolean: isDark ? "#ce93d8" : "#9333ea", // purple
      null: isDark ? "#ef9a9a" : "#dc2626", // red
    };

    // Replace with spans that have color styling
    return json
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let color = colors.string; // Default to string color
          let cls = "string";

          if (/^"/.test(match) && /:$/.test(match)) {
            color = colors.key; // Object key
            cls = "key";
          } else if (/true|false/.test(match)) {
            color = colors.boolean; // Boolean
            cls = "boolean";
          } else if (/null/.test(match)) {
            color = colors.null; // null
            cls = "null";
          } else if (/^-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?$/.test(match)) {
            color = colors.number; // Number
            cls = "number";
          }

          return `<span style="color:${color}" class="${cls}">${match}</span>`;
        }
      )
      .replace(/[{}[\],]/g, (match) => {
        return `<span style="color:${colors.punctuation}" class="punctuation">${match}</span>`;
      });
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

      {/* Add the output modal */}
      <Dialog open={selectedOutput !== null} onOpenChange={closeOutputModal}>
        <DialogContent className="max-w-[95vw] md:max-w-[90vw] w-[800px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-lg">
              {selectedOutput && (
                <>
                  <span className="font-medium">{selectedOutput.chainId}</span>.
                  <span className="text-muted-foreground">
                    {selectedOutput.outputId}
                  </span>
                </>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={closeOutputModal}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto mt-4 p-4 bg-muted/30 rounded border border-border">
            {selectedOutput && (
              <div className="text-sm w-full">
                {typeof selectedOutput.content === "object" ? (
                  <div className="max-h-[70vh] overflow-y-auto">
                    <pre
                      className={`whitespace-pre-wrap break-all json-output ${
                        theme === "dark" ? "text-gray-200" : "text-gray-800"
                      }`}
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                        fontSize: "0.875rem",
                        padding: "0.5rem",
                        width: "100%",
                      }}
                      dangerouslySetInnerHTML={{
                        __html: formatJson(
                          JSON.stringify(selectedOutput.content, null, 2),
                          theme === "dark"
                        ),
                      }}
                    />
                  </div>
                ) : (
                  <pre
                    className="whitespace-pre-wrap break-all max-h-[70vh] overflow-y-auto w-full"
                    style={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      padding: "0.5rem",
                    }}
                  >
                    {String(selectedOutput.content || "No content available")}
                  </pre>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
