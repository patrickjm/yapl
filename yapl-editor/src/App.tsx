import { YaplEditor } from "@/components/YaplEditor";
import { YaplExecutionSidebar } from "@/components/execution";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import YAML from "js-yaml";
import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { YaplCopilot } from "./components/copilot/YaplCopilot";
import "./index.css";

// Define YaplData type
type MessageContent = string | { [key: string]: any };
type Message = MessageContent | { [key: string]: MessageContent };

interface CommonProps {
  provider?: string;
  model?: string;
  inputs?: string[];
  tools?: string[];
}

interface ChainData extends CommonProps {
  messages: Message[];
  chains?: undefined;
}

interface ChainsData extends CommonProps {
  chains: Record<
    string,
    {
      dependsOn?: string[];
      chain: {
        messages: Message[];
      };
    }
  >;
  messages?: undefined;
}

export type YaplData = ChainData | ChainsData;

// Initial data for YAPL editor
const initialData: ChainData = {
  provider: "openrouter",
  model: "openai/gpt-4o-mini",
  messages: [
    { system: "You are a helpful assistant." },
    { user: "Hello, how are you?" },
    "output",
  ],
};

// Storage keys for session persistence
const STORAGE_KEYS = {
  EDITOR_TYPE: "yapl_editor_type",
  EDITOR_DATA: "yapl_editor_data",
  YAML_OUTPUT: "yapl_editor_yaml",
  WELCOME_MODAL_SEEN: "yapl_welcome_modal_seen",
};

export function App() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // Editor state lifted from YaplEditor
  const [editorType, setEditorType] = useState<"chain" | "chains">("chain");
  const [editorData, setEditorData] = useState<YaplData>(initialData);
  const [yamlOutput, setYamlOutput] = useState("");

  // Import from YAML dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importYamlContent, setImportYamlContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copilot state
  const [showCopilot, setShowCopilot] = useState<boolean>(false);
  const [copilotHistory, setCopilotHistory] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  // Welcome modal state
  const [showWelcomeModal, setShowWelcomeModal] = useState<boolean>(false);

  // Load state from local storage on initial mount
  useEffect(() => {
    try {
      // Load editor type
      const storedEditorType = localStorage.getItem(STORAGE_KEYS.EDITOR_TYPE);
      if (storedEditorType === "chain" || storedEditorType === "chains") {
        setEditorType(storedEditorType);
      }

      // Load editor data
      const storedEditorData = localStorage.getItem(STORAGE_KEYS.EDITOR_DATA);
      if (storedEditorData) {
        const parsedData = JSON.parse(storedEditorData) as YaplData;
        setEditorData(parsedData);
      }

      // Load YAML output
      const storedYamlOutput = localStorage.getItem(STORAGE_KEYS.YAML_OUTPUT);
      if (storedYamlOutput) {
        setYamlOutput(storedYamlOutput);
      }

      // Check if welcome modal has been seen
      const hasSeenWelcomeModal = localStorage.getItem(
        STORAGE_KEYS.WELCOME_MODAL_SEEN
      );
      if (!hasSeenWelcomeModal) {
        setShowWelcomeModal(true);
      }
    } catch (error) {
      console.error("Error loading state from local storage:", error);
      // Fall back to initial data if there's an error
      setEditorData(initialData);
      // Show welcome modal for new users even if there's an error
      setShowWelcomeModal(true);
    }
  }, []);

  useEffect(() => {
    // Check for stored theme preference
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Update YAML whenever editorData changes
  useEffect(() => {
    const yaml = YAML.dump(editorData);
    setYamlOutput(yaml);

    // Save to local storage
    localStorage.setItem(STORAGE_KEYS.EDITOR_DATA, JSON.stringify(editorData));
    localStorage.setItem(STORAGE_KEYS.YAML_OUTPUT, yaml);
  }, [editorData]);

  // Save editor type to local storage when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EDITOR_TYPE, editorType);
  }, [editorType]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", newTheme);
  };

  const handleCommonPropertiesChange = (commonProps: CommonProps) => {
    setEditorData((prev) => ({
      ...prev,
      ...commonProps,
    }));
  };

  const handleMessagesChange = (messages: Message[]) => {
    if (editorType === "chain") {
      setEditorData((prev) => ({
        ...(prev as ChainData),
        messages,
      }));
    }
  };

  const handleChainsChange = (chains: Record<string, any>) => {
    if (editorType === "chains") {
      setEditorData((prev) => ({
        ...(prev as ChainsData),
        chains,
      }));
    }
  };

  // Function to handle file uploads
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportYamlContent(content);
    };
    reader.readAsText(file);
  };

  // Function to import YAML content
  const importYaml = () => {
    try {
      if (!importYamlContent.trim()) {
        toast.error("Please provide YAML content to import");
        return;
      }

      // Parse YAML content
      const parsedData = YAML.load(importYamlContent) as YaplData;

      // Basic validation
      if (!parsedData) {
        toast.error("Invalid YAML content");
        return;
      }

      // Detect if it's a chain or chains type
      const isChains =
        "chains" in parsedData && parsedData.chains !== undefined;
      const isChain =
        "messages" in parsedData && Array.isArray(parsedData.messages);

      if (!isChain && !isChains) {
        toast.error("Invalid YAPL structure. Missing required fields");
        return;
      }

      // Update editor type and data
      const newType = isChains ? "chains" : "chain";
      setEditorType(newType);
      setEditorData(parsedData);

      // Close dialog and show success message
      setImportDialogOpen(false);
      setImportYamlContent("");
      toast.success("YAML content imported successfully");
    } catch (error) {
      console.error("Error importing YAML:", error);
      toast.error(
        "Failed to import YAML: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  // Get API key and provider from the execution sidebar
  const handleAuthInfoUpdate = (info: { apiKey: string; provider: string }) => {
    setApiKey(info.apiKey);
    setProvider(info.provider);
  };

  // Toggle copilot visibility with keyboard shortcut (Cmd+P or Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        setShowCopilot((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Apply YAPL changes from copilot
  const handleCopilotYaplUpdate = (updatedYapl: YaplData) => {
    console.log("Received YAPL update from copilot:", updatedYapl);

    try {
      // Deep clone the updated YAPL to avoid reference issues
      const processedYapl = JSON.parse(JSON.stringify(updatedYapl));

      // Determine the type and set editor type accordingly
      let yaplType: "chain" | "chains" = "chain"; // Default

      if (
        "messages" in processedYapl &&
        Array.isArray(processedYapl.messages)
      ) {
        // It's a chain type YAPL
        yaplType = "chain";
        console.log("Processing ChainData YAPL");
      } else if (
        "chains" in processedYapl &&
        typeof processedYapl.chains === "object" &&
        processedYapl.chains !== null
      ) {
        // It's a chains type YAPL
        yaplType = "chains";
        console.log("Processing ChainsData YAPL");
      } else {
        console.warn(
          "YAPL doesn't match expected structure, defaulting to chain type"
        );
        // Initialize with empty messages array if not present
        if (!("messages" in processedYapl)) {
          processedYapl.messages = [];
        }
      }

      // Update editor type if needed
      if (editorType !== yaplType) {
        console.log(`Changing editor type from ${editorType} to ${yaplType}`);
        setEditorType(yaplType);
      }

      // Extract common properties
      const commonProps: CommonProps = {};
      if (processedYapl.provider) commonProps.provider = processedYapl.provider;
      if (processedYapl.model) commonProps.model = processedYapl.model;
      if (processedYapl.inputs) commonProps.inputs = processedYapl.inputs;
      if (processedYapl.tools) commonProps.tools = processedYapl.tools;

      console.log("Updating common properties:", commonProps);

      // Directly set the full editor data to ensure complete replacement
      if (yaplType === "chain") {
        const chainData: ChainData = {
          ...commonProps,
          messages:
            "messages" in processedYapl && Array.isArray(processedYapl.messages)
              ? processedYapl.messages
              : [],
        };
        console.log("Setting editor data with ChainData:", chainData);
        setEditorData(chainData);
      } else {
        const chainsData: ChainsData = {
          ...commonProps,
          chains:
            "chains" in processedYapl &&
            typeof processedYapl.chains === "object" &&
            processedYapl.chains !== null
              ? processedYapl.chains
              : {},
        };
        console.log("Setting editor data with ChainsData:", chainsData);
        setEditorData(chainsData);
      }

      // Generate YAML from the updated editor data
      const yaml = YAML.dump(processedYapl);
      setYamlOutput(yaml);

      // Save to localStorage
      localStorage.setItem(
        STORAGE_KEYS.EDITOR_DATA,
        JSON.stringify(processedYapl)
      );
      localStorage.setItem(STORAGE_KEYS.YAML_OUTPUT, yaml);

      console.log("YAPL update complete.");
    } catch (error) {
      console.error("Error updating YAPL data:", error);
    }
  };

  // Update copilot conversation history
  const handleCopilotHistoryUpdate = (
    history: Array<{ role: string; content: string }>
  ) => {
    setCopilotHistory(history);
  };

  const handleCloseWelcomeModal = () => {
    setShowWelcomeModal(false);
    localStorage.setItem(STORAGE_KEYS.WELCOME_MODAL_SEEN, "true");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="border-b border-border p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2 pl-10">
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0 1.5C0 1.22386 0.223858 1 0.5 1H2.5C2.77614 1 3 1.22386 3 1.5C3 1.77614 2.77614 2 2.5 2H0.5C0.223858 2 0 1.77614 0 1.5ZM4 1.5C4 1.22386 4.22386 1 4.5 1H14.5C14.7761 1 15 1.22386 15 1.5C15 1.77614 14.7761 2 14.5 2H4.5C4.22386 2 4 1.77614 4 1.5ZM4 4.5C4 4.22386 4.22386 4 4.5 4H11.5C11.7761 4 12 4.22386 12 4.5C12 4.77614 11.7761 5 11.5 5H4.5C4.22386 5 4 4.77614 4 4.5ZM0 7.5C0 7.22386 0.223858 7 0.5 7H2.5C2.77614 7 3 7.22386 3 7.5C3 7.77614 2.77614 8 2.5 8H0.5C0.223858 8 0 7.77614 0 7.5ZM4 7.5C4 7.22386 4.22386 7 4.5 7H14.5C14.7761 7 15 7.22386 15 7.5C15 7.77614 14.7761 8 14.5 8H4.5C4.22386 8 4 7.77614 4 7.5ZM4 10.5C4 10.2239 4.22386 10 4.5 10H11.5C11.7761 10 12 10.2239 12 10.5C12 10.7761 11.7761 11 11.5 11H4.5C4.22386 11 4 10.7761 4 10.5ZM0 13.5C0 13.2239 0.223858 13 0.5 13H2.5C2.77614 13 3 13.2239 3 13.5C3 13.7761 2.77614 14 2.5 14H0.5C0.223858 14 0 13.7761 0 13.5ZM4 13.5C4 13.2239 4.22386 13 4.5 13H14.5C14.7761 13 15 13.2239 15 13.5C15 13.7761 14.7761 14 14.5 14H4.5C4.22386 14 4 13.7761 4 13.5Z"
              fill="currentColor"
              fill-rule="evenodd"
              clip-rule="evenodd"
            ></path>
          </svg>
          <h1 className="text-xl font-bold">YAPL Editor</h1>
          <a
            href="https://github.com/patrickjm/yapl"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center hover:text-primary ml-2"
            title="GitHub Repository"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 128 128"
            >
              <g fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M64 5.103c-33.347 0-60.388 27.035-60.388 60.388c0 26.682 17.303 49.317 41.297 57.303c3.017.56 4.125-1.31 4.125-2.905c0-1.44-.056-6.197-.082-11.243c-16.8 3.653-20.345-7.125-20.345-7.125c-2.747-6.98-6.705-8.836-6.705-8.836c-5.48-3.748.413-3.67.413-3.67c6.063.425 9.257 6.223 9.257 6.223c5.386 9.23 14.127 6.562 17.573 5.02c.542-3.903 2.107-6.568 3.834-8.076c-13.413-1.525-27.514-6.704-27.514-29.843c0-6.593 2.36-11.98 6.223-16.21c-.628-1.52-2.695-7.662.584-15.98c0 0 5.07-1.623 16.61 6.19C53.7 35 58.867 34.327 64 34.304c5.13.023 10.3.694 15.127 2.033c11.526-7.813 16.59-6.19 16.59-6.19c3.287 8.317 1.22 14.46.593 15.98c3.872 4.23 6.215 9.617 6.215 16.21c0 23.194-14.127 28.3-27.574 29.796c2.167 1.874 4.097 5.55 4.097 11.183c0 8.08-.07 14.583-.07 16.572c0 1.607 1.088 3.49 4.148 2.897c23.98-7.994 41.263-30.622 41.263-57.294C124.388 32.14 97.35 5.104 64 5.104z"
                  clipRule="evenodd"
                />
                <path d="M26.484 91.806c-.133.3-.605.39-1.035.185c-.44-.196-.685-.605-.543-.906c.13-.31.603-.395 1.04-.188c.44.197.69.61.537.91zm2.446 2.729c-.287.267-.85.143-1.232-.28c-.396-.42-.47-.983-.177-1.254c.298-.266.844-.14 1.24.28c.394.426.472.984.17 1.255zm2.382 3.477c-.37.258-.976.017-1.35-.52c-.37-.538-.37-1.183.01-1.44c.373-.258.97-.025 1.35.507c.368.545.368 1.19-.01 1.452zm3.261 3.361c-.33.365-1.036.267-1.552-.23c-.527-.487-.674-1.18-.343-1.544c.336-.366 1.045-.264 1.564.23c.527.486.686 1.18.333 1.543zm4.5 1.951c-.147.473-.825.688-1.51.486c-.683-.207-1.13-.76-.99-1.238c.14-.477.823-.7 1.512-.485c.683.206 1.13.756.988 1.237m4.943.361c.017.498-.563.91-1.28.92c-.723.017-1.308-.387-1.315-.877c0-.503.568-.91 1.29-.924c.717-.013 1.306.387 1.306.88zm4.598-.782c.086.485-.413.984-1.126 1.117c-.7.13-1.35-.172-1.44-.653c-.086-.498.422-.997 1.122-1.126c.714-.123 1.354.17 1.444.663zm0 0" />
              </g>
            </svg>
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-1"
          >
            <UploadCloud className="h-4 w-4" />
            Import YAML
          </Button>

          {/* YAPL Generator button moved to top bar */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCopilot(true)}
            className="flex items-center gap-1"
            title="Open YAPL Copilot (Cmd+P / Ctrl+P)"
          >
            <span role="img" aria-label="copilot" className="text-sm">
              🤖
            </span>
            YAPL Generator
          </Button>

          <button
            onClick={toggleTheme}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            {theme === "light" ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                <path d="M12 8a2.83 2.83 0 0 1 4 4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {/* Help text for first-time users */}
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6 p-4 bg-card text-card-foreground rounded-lg border border-border shadow-sm transition-all duration-300 ease-in-out transform hover:shadow-md">
              <div className="flex items-center mb-2">
                <h2 className="text-lg font-semibold text-primary">
                  Welcome to YAPL Editor
                </h2>
                <div
                  className={`ml-2 w-2 h-2 rounded-full ${
                    theme === "dark"
                      ? "bg-primary animate-pulse"
                      : "bg-primary opacity-80"
                  }`}
                ></div>
              </div>
              <p className="text-muted-foreground text-sm">
                YAPL (YAML Prompt Language) is like a simpler, declarative
                version of LangChain for working with LLMs. No Python or
                JavaScript code needed!
              </p>
              <p className="text-muted-foreground text-sm mt-2">
                It lets you prompt LLMs using YAML files with{" "}
                <a
                  href="https://liquidjs.com/tutorials/intro-to-liquid-template-language.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors duration-200"
                >
                  Liquid Template
                </a>{" "}
                support, giving you variables, conditionals, and loops.
              </p>
            </div>

            <YaplEditor
              editorType={editorType}
              setEditorType={setEditorType}
              editorData={editorData}
              yamlOutput={yamlOutput}
              onCommonPropertiesChange={handleCommonPropertiesChange}
              onMessagesChange={handleMessagesChange}
              onChainsChange={handleChainsChange}
            />
          </div>
        </div>

        <div className="w-96 h-full border-l border-border overflow-hidden flex-shrink-0">
          <YaplExecutionSidebar
            data={editorData}
            onAuthInfoUpdate={handleAuthInfoUpdate}
          />
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        accept=".yaml,.yml"
        onChange={handleFileUpload}
        ref={fileInputRef}
        style={{ display: "none" }}
      />

      {/* Import YAML Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import YAML</DialogTitle>
            <DialogDescription>
              Paste your YAML content below or upload a YAML file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Paste your YAML content here..."
              className="min-h-[200px]"
              value={importYamlContent}
              onChange={(e) => setImportYamlContent(e.target.value)}
            />
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload YAML File
              </Button>
              <Button type="button" onClick={importYaml}>
                Import
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copilot Popover */}
      {showCopilot && (
        <YaplCopilot
          apiKey={apiKey}
          provider={provider}
          currentYapl={editorData}
          onClose={() => setShowCopilot(false)}
          onYaplUpdate={handleCopilotYaplUpdate}
          conversationHistory={copilotHistory}
          onHistoryUpdate={handleCopilotHistoryUpdate}
        />
      )}

      {/* Welcome Modal */}
      <Dialog
        open={showWelcomeModal}
        onOpenChange={(open) => {
          setShowWelcomeModal(open);
          if (!open) {
            localStorage.setItem(STORAGE_KEYS.WELCOME_MODAL_SEEN, "true");
          }
        }}
      >
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Welcome to YAPL Editor
            </DialogTitle>
            <DialogDescription className="text-lg">
              Your first time? Let's get you oriented.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 max-h-[60vh] overflow-y-auto pr-2">
            <h3 className="font-semibold text-xl">What is YAPL?</h3>

            <div className="space-y-3 text-base leading-relaxed">
              <p>
                YAPL is YAML Prompting Language - a declarative way to work with
                AI models without writing code.
              </p>
              <p>
                It's designed for engineers and prompt engineers who need
                reliable, structured AI responses.
              </p>
              <p>
                You define conversations with AI models using simple YAML
                syntax.
              </p>
              <p>
                You can chain multiple AI calls together to build complex
                workflows.
              </p>
              <p>
                It enforces JSON outputs with schemas so you get consistent,
                parseable responses.
              </p>
              <p>
                Think of it as LangChain but with 90% less code and complexity.
              </p>
            </div>

            <h3 className="font-semibold text-xl mt-5">What's it good for?</h3>

            <div className="space-y-3 text-base leading-relaxed">
              <p>
                Building AI agents that follow a specific conversation flow.
              </p>
              <p>
                Creating structured data extraction tools from unstructured
                text.
              </p>
              <p>
                Setting up multi-step reasoning chains with dependencies between
                steps.
              </p>
              <p>Prototyping AI workflows before implementing them in code.</p>
              <p>
                Sharing prompts with your team in a version-controllable format.
              </p>
            </div>

            <h3 className="font-semibold text-xl mt-5">Using this editor</h3>

            <div className="space-y-3 text-base leading-relaxed">
              <p>
                The left panel is where you build your YAML prompt structure.
              </p>
              <p>
                The right panel lets you execute your prompts with real API keys
                and see responses.
              </p>
              <p>
                Start with "Chain" mode for simple conversations or "Chains" for
                complex multi-step flows.
              </p>
              <p>
                Set your provider (OpenAI/OpenRouter) and model (GPT-4/Claude)
                at the top.
              </p>
              <p>
                Add system and user messages to design your conversation flow.
              </p>
              <p>
                Use the "YAPL Generator" button at the top to get AI help
                building your YAPL files.
              </p>
              <p>
                Check the README tab in the right panel for code examples to
                integrate YAPL into your apps.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseWelcomeModal}>Got it, let's go</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
