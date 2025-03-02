import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessagesEditor } from "./YaplEditorMessages";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";

interface ChainsEditorProps {
  chains: Record<string, any>;
  onChange: (chains: Record<string, any>) => void;
}

export function ChainsEditor({ chains, onChange }: ChainsEditorProps) {
  const [newChainName, setNewChainName] = useState("");
  const [dependencyInput, setDependencyInput] = useState("");

  const handleAddChain = () => {
    if (!newChainName || chains[newChainName]) return;
    
    const updatedChains = {
      ...chains,
      [newChainName]: {
        chain: {
          messages: []
        }
      }
    };
    
    onChange(updatedChains);
    setNewChainName("");
  };

  const handleRemoveChain = (chainName: string) => {
    const { [chainName]: removed, ...rest } = chains;
    onChange(rest);
  };

  const handleChainMessagesChange = (chainName: string, messages: any[]) => {
    const updatedChains = {
      ...chains,
      [chainName]: {
        ...chains[chainName],
        chain: {
          ...chains[chainName].chain,
          messages
        }
      }
    };
    
    onChange(updatedChains);
  };

  const handleAddDependency = (chainName: string) => {
    if (!dependencyInput.trim() || !chains[dependencyInput]) return;
    
    const dependencies = chains[chainName].dependsOn || [];
    if (dependencies.includes(dependencyInput)) return;
    
    const updatedChains = {
      ...chains,
      [chainName]: {
        ...chains[chainName],
        dependsOn: [...dependencies, dependencyInput]
      }
    };
    
    onChange(updatedChains);
    setDependencyInput("");
  };

  const handleRemoveDependency = (chainName: string, depIndex: number) => {
    const dependencies = [...chains[chainName].dependsOn];
    dependencies.splice(depIndex, 1);
    
    const updatedChains = {
      ...chains,
      [chainName]: {
        ...chains[chainName],
        dependsOn: dependencies.length > 0 ? dependencies : undefined
      }
    };
    
    onChange(updatedChains);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chains</CardTitle>
        <CardDescription>Configure multiple chains for your YAPL file</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 mb-4">
          <Label htmlFor="new-chain">Add New Chain</Label>
          <div className="flex gap-2">
            <Input
              id="new-chain"
              value={newChainName}
              onChange={(e) => setNewChainName(e.target.value)}
              placeholder="Chain name"
            />
            <Button onClick={handleAddChain} type="button">
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {Object.keys(chains).length === 0 ? (
          <div className="text-center py-4 text-muted-foreground border rounded-md">
            No chains added yet
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(chains).map(([chainName, chainData]) => (
              <AccordionItem key={chainName} value={chainName}>
                <div className="flex items-center justify-between">
                  <AccordionTrigger className="text-lg font-medium">
                    {chainName}
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveChain(chainName);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <AccordionContent>
                  <div className="space-y-4 p-2">
                    <div className="space-y-2">
                      <Label>Dependencies</Label>
                      <div className="flex gap-2">
                        <Input
                          value={dependencyInput}
                          onChange={(e) => setDependencyInput(e.target.value)}
                          placeholder="Add dependency chain name"
                        />
                        <Button onClick={() => handleAddDependency(chainName)} type="button">
                          Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(chainData.dependsOn || []).map((dep: string, index: number) => (
                          <Badge key={index} className="flex items-center gap-1">
                            {dep}
                            <Trash2 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => handleRemoveDependency(chainName, index)}
                            />
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <MessagesEditor 
                      messages={chainData.chain.messages || []}
                      onChange={(messages) => handleChainMessagesChange(chainName, messages)}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}