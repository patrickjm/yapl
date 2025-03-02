import { useState } from "react";
import { z } from "zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CommonPropertiesForm } from "./YaplEditorCommon";
import { MessagesEditor } from "./YaplEditorMessages";
import { ChainsEditor } from "./YaplEditorChains";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

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
  chains: Record<string, {
    dependsOn?: string[];
    chain: {
      messages: Message[];
    };
  }>;
  messages?: undefined;
}

type YaplData = ChainData | ChainsData;

// Sample initial data
const initialData: ChainData = {
  provider: "openai",
  model: "openai/gpt4o-mini",
  messages: [
    { system: "You are a helpful assistant." },
    { user: "Hello, how are you?" },
    "output"
  ]
};

export function YaplEditor() {
  const [editorType, setEditorType] = useState<"chain" | "chains">("chain");
  const [editorData, setEditorData] = useState<YaplData>(initialData);
  const [yamlOutput, setYamlOutput] = useState("");

  const handleCommonPropertiesChange = (commonProps: CommonProps) => {
    setEditorData(prev => ({
      ...prev,
      ...commonProps
    }));
  };

  const handleMessagesChange = (messages: Message[]) => {
    if ('chains' in editorData) {
      // Should not happen in practice due to UI constraints
      return;
    }
    setEditorData({
      ...editorData,
      messages
    } as ChainData);
  };

  const handleChainsChange = (chains: Record<string, any>) => {
    if (!('chains' in editorData)) {
      // Should not happen in practice due to UI constraints
      return;
    }
    setEditorData({
      ...editorData,
      chains
    } as ChainsData);
  };

  const convertToYaml = () => {
    // Placeholder - use js-yaml in real implementation
    const yaml = JSON.stringify(editorData, null, 2);
    setYamlOutput(yaml);
    toast.success("Generated YAML representation");
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor">Editor</TabsTrigger>
          <TabsTrigger value="yaml">YAML Output</TabsTrigger>
        </TabsList>
        
        <TabsContent value="editor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editor Type</CardTitle>
              <CardDescription>Choose between a single chain or multiple chains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-4">
                <Button 
                  variant={editorType === "chain" ? "default" : "outline"}
                  onClick={() => {
                    setEditorType("chain");
                    // Remove chains if they exist when switching to chain mode
                    if ('chains' in editorData) {
                      const { provider, model, inputs, tools } = editorData;
                      // Create a default messages array if switching from chains
                      setEditorData({
                        provider,
                        model,
                        inputs,
                        tools,
                        messages: []
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
                    const { messages, provider, model, inputs, tools } = editorData as ChainData;
                    setEditorData({
                      provider,
                      model,
                      inputs,
                      tools,
                      chains: {
                        default: {
                          chain: {
                            messages: messages || []
                          }
                        }
                      }
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
              messages={('messages' in editorData) ? editorData.messages : []} 
              onChange={handleMessagesChange}
            />
          ) : (
            <ChainsEditor 
              chains={('chains' in editorData) ? editorData.chains : {}} 
              onChange={handleChainsChange}
            />
          )}

          <div className="flex justify-end">
            <Button onClick={convertToYaml}>Generate YAML</Button>
          </div>
        </TabsContent>

        <TabsContent value="yaml" className="space-y-4">
          <Alert>
            <AlertTitle>YAML Output</AlertTitle>
            <AlertDescription>
              The generated YAML representation of your YAPL file
            </AlertDescription>
          </Alert>
          <Card>
            <CardContent className="pt-6">
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[60vh]">
                {yamlOutput || "Click 'Generate YAML' to see the output"}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Toaster />
    </div>
  );
}