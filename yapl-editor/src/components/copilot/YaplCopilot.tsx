import yaml from "js-yaml";
import {
  BarChart4,
  Code,
  FileSearch,
  FileText,
  MessageSquare,
  Scale,
  SendHorizonal,
  Sparkles,
  X,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { YaplData } from "../../App";
import { systemPrompt } from "../../prompt";

// Add an array of suggestion templates
const SUGGESTIONS = [
  {
    icon: <FileText size={16} />,
    title: "Content Generation",
    prompt:
      "Create a YAPL chain for a content generation pipeline that researches a topic, creates an outline, and writes a draft based on topic, tone, and length inputs.",
  },
  {
    icon: <MessageSquare size={16} />,
    title: "Customer Support",
    prompt:
      "Create a YAPL chain for a customer support assistant that categorizes queries, extracts context from history, and generates a response.",
  },
  {
    icon: <Code size={16} />,
    title: "Code Generator",
    prompt:
      "Create a YAPL chain for a code generation assistant that designs architecture, implements code, and writes tests based on requirements.",
  },
  {
    icon: <BarChart4 size={16} />,
    title: "Market Research",
    prompt:
      "Create a YAPL chain for a market research analyzer that performs competitor analysis, SWOT analysis, and generates recommendations.",
  },
  {
    icon: <Scale size={16} />,
    title: "Legal Document",
    prompt:
      "Create a YAPL chain for a legal document analyzer that summarizes documents, extracts key terms, and answers user questions.",
  },
  {
    icon: <FileSearch size={16} />,
    title: "Data Analysis",
    prompt:
      "Create a YAPL chain for a data analysis pipeline that cleans data, performs exploratory analysis, and generates insights based on data and goals.",
  },
];

interface YaplCopilotProps {
  apiKey: string | null;
  provider: string | null;
  currentYapl: YaplData;
  onClose: () => void;
  onYaplUpdate: (yapl: YaplData) => void;
  conversationHistory: Array<{ role: string; content: string }>;
  onHistoryUpdate: (history: Array<{ role: string; content: string }>) => void;
}

export function YaplCopilot({
  apiKey,
  provider,
  currentYapl,
  onClose,
  onYaplUpdate,
  conversationHistory,
  onHistoryUpdate,
}: YaplCopilotProps) {
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>("");
  const [streamedResponse, setStreamedResponse] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [history, setHistory] =
    useState<Array<{ role: string; content: string }>>(conversationHistory);

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [history]);

  // Update parent's history when local history changes
  useEffect(() => {
    onHistoryUpdate(history);
  }, [history, onHistoryUpdate]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close on Escape
      if (e.key === "Escape") {
        onClose();
      }

      // Submit on Cmd/Ctrl+Enter
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [userInput, onClose]);

  const handleSubmit = async () => {
    if (!userInput.trim() || isLoading || !apiKey) return;

    try {
      setIsLoading(true);

      // Add user message to history
      const updatedHistory = [...history, { role: "user", content: userInput }];
      setHistory(updatedHistory);
      setUserInput("");

      // Prepare context for the LLM
      const currentYamlString = yaml.dump(currentYapl);

      // Set the current model being used
      const model =
        provider === "openrouter" ? "anthropic/claude-3.7-sonnet" : "gpt-4o";
      setCurrentModel(model);

      // Prepare messages for API call
      let messages = [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Here is my current YAPL file:\n\`\`\`yaml\n${currentYamlString}\n\`\`\``,
        },
      ];

      // Add conversation history
      updatedHistory.forEach((message) => {
        messages.push({ role: message.role, content: message.content });
      });

      // Clear any previous streamed response
      setStreamedResponse("");

      // Call OpenAI or OpenRouter API with streaming
      const apiUrl =
        provider === "openrouter"
          ? "https://openrouter.ai/api/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(provider === "openrouter"
            ? { "HTTP-Referer": window.location.href }
            : {}),
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.7,
          max_tokens: 4000,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      // Process streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to get response reader");

      // Add a placeholder message for the streaming response
      setHistory([...updatedHistory, { role: "assistant", content: "" }]);

      let fullContent = "";
      const decoder = new TextDecoder();

      // Read the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || "";

              fullContent += delta;

              // Update the streaming response
              setStreamedResponse(fullContent);

              // Update the last assistant message with the accumulated content
              setHistory((prev) => {
                const updated = [...prev];
                updated[updated.length - 1].content = fullContent;
                return updated;
              });
            } catch (e) {
              console.error("Error parsing SSE data:", e);
            }
          }
        }
      }

      // Once streaming is complete, process the final content
      const assistantMessage = fullContent;

      // Try to extract YAML from the response
      const yamlMatch = assistantMessage.match(/```yaml\n([\s\S]*?)```/);
      if (yamlMatch && yamlMatch[1]) {
        try {
          const yamlText = yamlMatch[1];
          console.log("Extracted YAML text:", yamlText);

          // Parse the YAML
          const extractedYaml = yaml.load(yamlText);
          console.log("Parsed YAML data:", extractedYaml);

          // Validate that it has the correct structure for YaplData
          let isValidYapl = false;

          if (typeof extractedYaml === "object" && extractedYaml !== null) {
            if (
              "messages" in extractedYaml &&
              Array.isArray(extractedYaml.messages)
            ) {
              // It's a ChainData type
              isValidYapl = true;
              console.log("Valid ChainData structure detected");
            } else if (
              "chains" in extractedYaml &&
              typeof extractedYaml.chains === "object" &&
              extractedYaml.chains !== null
            ) {
              // It's a ChainsData type
              isValidYapl = true;
              console.log("Valid ChainsData structure detected");
            }
          }

          if (isValidYapl) {
            // Cast to YaplData after validation
            const validYapl = extractedYaml as YaplData;

            // Add a button to apply the extracted YAML
            setHistory((prev) => [
              ...prev,
              {
                role: "system",
                content:
                  "I found YAML code in the response. You can apply these changes to your editor.",
              },
            ]);

            // Store the extracted YAML in an attribute for the Apply button
            setExtractedYapl(validYapl);
          } else {
            console.error(
              "Extracted YAML doesn't have valid YAPL structure:",
              extractedYaml
            );
            setHistory((prev) => [
              ...prev,
              {
                role: "system",
                content:
                  "I found YAML code but it doesn't have the correct YAPL structure. Please try again.",
              },
            ]);
          }
        } catch (e) {
          console.error("Failed to parse YAML:", e);
          setHistory((prev) => [
            ...prev,
            {
              role: "system",
              content:
                "I found YAML code but failed to parse it. Error: " +
                (e instanceof Error ? e.message : String(e)),
            },
          ]);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setHistory((prev) => [
        ...prev,
        {
          role: "system",
          content: `Error: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const [extractedYapl, setExtractedYapl] = useState<YaplData | null>(null);

  const handleApplyYapl = () => {
    if (extractedYapl) {
      console.log("Applying YAPL changes:", extractedYapl);

      try {
        // Create a deep clone of the YAPL data to avoid any reference issues
        const clonedYapl = JSON.parse(JSON.stringify(extractedYapl));

        // Ensure required fields exist for the specific YAPL type
        if ("messages" in clonedYapl) {
          // It's a ChainData type
          if (!Array.isArray(clonedYapl.messages)) {
            clonedYapl.messages = [];
          }

          // Remove any 'chains' property that might be present
          delete clonedYapl.chains;

          console.log("Applying ChainData:", clonedYapl);
        } else if ("chains" in clonedYapl) {
          // It's a ChainsData type
          if (
            typeof clonedYapl.chains !== "object" ||
            clonedYapl.chains === null
          ) {
            clonedYapl.chains = {};
          }

          // Remove any 'messages' property that might be present
          delete clonedYapl.messages;

          console.log("Applying ChainsData:", clonedYapl);
        } else {
          // Neither messages nor chains found, add an empty messages array to make it ChainData
          clonedYapl.messages = [];
          console.log(
            "No messages or chains found, defaulting to empty ChainData:",
            clonedYapl
          );
        }

        // Pass the validated YAPL to the parent component
        onYaplUpdate(clonedYapl);

        // Clear the extracted YAPL
        setExtractedYapl(null);

        // Add a system message to confirm changes were applied
        setHistory((prev) => [
          ...prev,
          {
            role: "system",
            content: "Changes applied to the editor.",
          },
        ]);
      } catch (error) {
        console.error("Error applying YAPL changes:", error);
        setHistory((prev) => [
          ...prev,
          {
            role: "system",
            content:
              "Failed to apply changes: " +
              (error instanceof Error ? error.message : String(error)),
          },
        ]);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInput(e.target.value);

    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setUserInput(suggestion);
    if (inputRef.current) {
      inputRef.current.focus();
      // Auto-resize textarea for the new content
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-lg w-3/4 max-w-3xl h-3/4 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-medium">YAPL Copilot</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome message if no history */}
          {history.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="mx-auto mb-4" size={32} />
              <h3 className="font-medium text-lg mb-2">YAPL Copilot</h3>
              <p className="text-muted-foreground mb-6">
                Ask me to help you create or modify your YAPL file. I can
                generate new templates, explain code, or suggest improvements
                based on your requirements.
              </p>

              {/* Suggestion buttons */}
              <div className="grid grid-cols-2 gap-3 mt-6 max-w-lg mx-auto">
                {SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion.prompt)}
                    className="flex items-center px-3 py-2 text-sm text-left rounded-md border border-border hover:bg-muted transition-colors"
                  >
                    <span className="mr-2 text-primary">{suggestion.icon}</span>
                    <span>{suggestion.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message history */}
          {history.map((message, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-12"
                  : message.role === "system"
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-secondary-foreground mr-12"
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>

              {/* Apply YAPL button */}
              {message.role === "system" &&
                message.content.includes("I found YAML code") &&
                extractedYapl && (
                  <button
                    onClick={handleApplyYapl}
                    className="mt-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium"
                  >
                    Apply Changes
                  </button>
                )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="ml-2 text-sm text-muted-foreground">
                {currentModel
                  ? `Using ${currentModel.split("/").pop()}...`
                  : "Thinking..."}
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={userInput}
              onChange={handleInputChange}
              placeholder="Ask about your YAPL file or request changes..."
              className="w-full p-3 pr-12 rounded-lg border border-border bg-background resize-none min-h-[80px] max-h-[200px] overflow-y-auto"
              rows={3}
              disabled={isLoading || !apiKey}
            />

            <button
              onClick={handleSubmit}
              disabled={!userInput.trim() || isLoading || !apiKey}
              className="absolute right-3 bottom-3 p-2 text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              <SendHorizonal size={20} />
            </button>
          </div>

          {!apiKey && (
            <p className="mt-2 text-sm text-red-500">
              Please enter your API key in the execution sidebar to use the
              copilot.
            </p>
          )}

          <div className="mt-2 text-xs text-muted-foreground flex justify-between">
            <span>Cmd+Enter to send</span>
            <span>Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
