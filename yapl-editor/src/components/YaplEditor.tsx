import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";
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

export type YaplData = ChainData | ChainsData;

// Props for YaplEditor component
interface YaplEditorProps {
  editorType: "chain" | "chains";
  setEditorType: (type: "chain" | "chains") => void;
  editorData: YaplData;
  yamlOutput: string;
  onCommonPropertiesChange: (commonProps: CommonProps) => void;
  onMessagesChange: (messages: Message[]) => void;
  onChainsChange: (chains: Record<string, any>) => void;
}

export function YaplEditor({
  editorType,
  setEditorType,
  editorData,
  yamlOutput,
  onCommonPropertiesChange,
  onMessagesChange,
  onChainsChange,
}: YaplEditorProps) {
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

  const copyYamlToClipboard = () => {
    navigator.clipboard.writeText(yamlOutput);
    toast.success("YAML copied to clipboard");
  };

  return (
    <div className="space-y-6">
      {/* Main editor sections */}
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
                    All YAPL programs are a collection of one or more chains of
                    messages. If you have multiple chains of messages, you can
                    use the output of one chain as input for another.
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
                  onMessagesChange([]);
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
                if (!("chains" in editorData)) {
                  const { messages, provider, model, inputs, tools } =
                    editorData as ChainData;
                  onChainsChange({
                    default: {
                      chain: {
                        messages: messages || [],
                      },
                    },
                  });
                }
              }}
            >
              Multiple Chains
            </Button>
          </div>
        </CardContent>
      </Card>

      <CommonPropertiesForm
        data={editorData}
        onChange={onCommonPropertiesChange}
      />

      {editorType === "chain" ? (
        <MessagesEditor
          messages={"messages" in editorData ? editorData.messages : []}
          onChange={onMessagesChange}
        />
      ) : (
        <ChainsEditor
          chains={"chains" in editorData ? editorData.chains : {}}
          onChange={onChainsChange}
        />
      )}

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
