import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
import YAML from "js-yaml";
import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneLight,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { toast } from "sonner";
import { ChainsEditor } from "./YaplEditorChains";
import { CommonPropertiesForm } from "./YaplEditorCommon";
import { MessagesEditor } from "./YaplEditorMessages";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";

// Define types based on schema.ts
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

type YaplData = ChainData | ChainsData;

// Sample initial data
const initialData: ChainData = {
  provider: "openrouter",
  model: "openai/gpt4o-mini",
  messages: [
    { system: "You are a helpful assistant." },
    { user: "Hello, how are you?" },
    "output",
  ],
};

export function YaplEditor() {
  const [editorType, setEditorType] = useState<"chain" | "chains">("chain");
  const [editorData, setEditorData] = useState<YaplData>(initialData);
  const [yamlOutput, setYamlOutput] = useState("");
  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light");

  // Detect theme changes
  useEffect(() => {
    const updateTheme = () => {
      const isDarkMode = document.documentElement.classList.contains("dark");
      setCurrentTheme(isDarkMode ? "dark" : "light");
    };

    // Set initial theme
    updateTheme();

    // Create a MutationObserver to watch for class changes on documentElement
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          updateTheme();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Update YAML whenever editorData changes
  useEffect(() => {
    const yaml = YAML.dump(editorData);
    setYamlOutput(yaml);
  }, [editorData]);

  const handleCommonPropertiesChange = (commonProps: CommonProps) => {
    setEditorData((prev) => ({
      ...prev,
      ...commonProps,
    }));
  };

  const handleMessagesChange = (messages: Message[]) => {
    if ("chains" in editorData) {
      // Should not happen in practice due to UI constraints
      return;
    }
    setEditorData({
      ...editorData,
      messages,
    } as ChainData);
  };

  const handleChainsChange = (chains: Record<string, any>) => {
    if (!("chains" in editorData)) {
      // Should not happen in practice due to UI constraints
      return;
    }
    setEditorData({
      ...editorData,
      chains,
    } as ChainsData);
  };

  const copyYamlToClipboard = () => {
    navigator.clipboard.writeText(yamlOutput);
    toast.success("YAML copied to clipboard");
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Main editor sections */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Editor Type</CardTitle>
            <CardDescription>
              Choose between a single chain or multiple chains.
              <br />
              <Accordion type="single" collapsible>
                <AccordionItem value="help">
                  <AccordionTrigger>
                    <span className="text-sm text-muted-foreground">
                      What's the difference?
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="text-sm text-muted-foreground">
                      All YAPL programs are a collection of one or more chains
                      of messages. If you have multiple chains of messages, you
                      can use the output of one chain as input for another.
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-4">
              <Button
                variant={editorType === "chain" ? "default" : "outline"}
                onClick={() => {
                  setEditorType("chain");
                  // Remove chains if they exist when switching to chain mode
                  if ("chains" in editorData) {
                    const { provider, model, inputs, tools } = editorData;
                    // Create a default messages array if switching from chains
                    setEditorData({
                      provider,
                      model,
                      inputs,
                      tools,
                      messages: [],
                    } as ChainData);
                  }
                }}
              >
                Single Chain
              </Button>
              <Button
                variant={editorType === "chains" ? "default" : "outline"}
                onClick={() => {
                  setEditorType("chains");
                  // Initialize chains when switching to chains mode
                  const { messages, provider, model, inputs, tools } =
                    editorData as ChainData;
                  setEditorData({
                    provider,
                    model,
                    inputs,
                    tools,
                    chains: {
                      default: {
                        chain: {
                          messages: messages || [],
                        },
                      },
                    },
                  } as ChainsData);
                }}
              >
                Multiple Chains
              </Button>
            </div>
          </CardContent>
        </Card>

        <CommonPropertiesForm
          data={editorData}
          onChange={handleCommonPropertiesChange}
        />

        {editorType === "chain" ? (
          <MessagesEditor
            messages={"messages" in editorData ? editorData.messages : []}
            onChange={handleMessagesChange}
          />
        ) : (
          <ChainsEditor
            chains={"chains" in editorData ? editorData.chains : {}}
            onChange={handleChainsChange}
          />
        )}
      </div>

      <div className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>YAML Output</CardTitle>
            <CardDescription>
              The generated YAML representation of your YAPL file
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 relative">
            <div className="absolute right-6 top-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={copyYamlToClipboard}
                disabled={!yamlOutput}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <SyntaxHighlighter
                language="yaml"
                style={currentTheme === "dark" ? vscDarkPlus : oneLight}
                customStyle={{
                  borderRadius: "0.375rem",
                  margin: 0,
                  backgroundColor: "var(--muted)",
                }}
              >
                {yamlOutput || "# YAML output will appear here"}
              </SyntaxHighlighter>
            </div>
          </CardContent>
        </Card>
      </div>

      <Toaster />
    </div>
  );
}
