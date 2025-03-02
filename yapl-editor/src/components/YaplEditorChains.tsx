import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { MessagesEditor } from "./YaplEditorMessages";

interface ChainsEditorProps {
  chains: Record<string, any>;
  onChange: (chains: Record<string, any>) => void;
}

export function ChainsEditor({ chains, onChange }: ChainsEditorProps) {
  const [newChainName, setNewChainName] = useState("");

  const handleAddChain = () => {
    if (!newChainName || chains[newChainName]) return;

    const updatedChains = {
      ...chains,
      [newChainName]: {
        chain: {
          messages: [],
        },
      },
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
          messages,
        },
      },
    };

    onChange(updatedChains);
  };

  const handleAddDependency = (chainName: string, dependencyChain: string) => {
    if (!dependencyChain || !chains[dependencyChain]) return;

    const dependencies = chains[chainName].dependsOn || [];
    if (dependencies.includes(dependencyChain)) return;

    const updatedChains = {
      ...chains,
      [chainName]: {
        ...chains[chainName],
        dependsOn: [...dependencies, dependencyChain],
      },
    };

    onChange(updatedChains);
  };

  const handleRemoveDependency = (chainName: string, depIndex: number) => {
    const dependencies = [...chains[chainName].dependsOn];
    dependencies.splice(depIndex, 1);

    const updatedChains = {
      ...chains,
      [chainName]: {
        ...chains[chainName],
        dependsOn: dependencies.length > 0 ? dependencies : undefined,
      },
    };

    onChange(updatedChains);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chains</CardTitle>
        <CardDescription>
          Configure multiple chains for your YAPL file
        </CardDescription>
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddChain();
                }
              }}
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
                      <div className="flex flex-col gap-2 mt-2 border p-3 rounded-md max-h-60 overflow-y-auto">
                        {Object.keys(chains).length <= 1 ? (
                          <div className="text-sm text-muted-foreground">
                            Add more chains to create dependencies
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">
                              Available chains:
                            </Label>
                            <div className="flex flex-wrap gap-2">
                              {Object.keys(chains)
                                .filter(
                                  (chain) =>
                                    chain !== chainName &&
                                    !(chainData.dependsOn || []).includes(chain)
                                )
                                .map((chain) => (
                                  <Button
                                    key={chain}
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleAddDependency(chainName, chain)
                                    }
                                    className="h-8 px-2 py-0 text-xs"
                                  >
                                    {chain}
                                  </Button>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(chainData.dependsOn || []).length > 0 && (
                          <div className="w-full">
                            <Label className="text-sm text-muted-foreground">
                              Selected Dependencies:
                            </Label>
                          </div>
                        )}
                        {(chainData.dependsOn || []).map(
                          (dep: string, index: number) => (
                            <Badge
                              key={index}
                              className="flex items-center gap-1"
                            >
                              {dep}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                                onClick={() =>
                                  handleRemoveDependency(chainName, index)
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </Badge>
                          )
                        )}
                      </div>
                    </div>

                    <MessagesEditor
                      messages={chainData.chain.messages || []}
                      onChange={(messages) =>
                        handleChainMessagesChange(chainName, messages)
                      }
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
