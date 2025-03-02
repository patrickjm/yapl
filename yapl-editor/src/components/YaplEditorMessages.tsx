import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

interface MessagesEditorProps {
  messages: any[];
  onChange: (messages: any[]) => void;
}

export function MessagesEditor({ messages, onChange }: MessagesEditorProps) {
  const [selectedMessageType, setSelectedMessageType] = useState("user");
  const [messageContent, setMessageContent] = useState("");
  const [openMessageIndex, setOpenMessageIndex] = useState<number | null>(null);
  const [outputId, setOutputId] = useState("");
  const [outputModel, setOutputModel] = useState("");
  const [formatJson, setFormatJson] = useState("");

  const addMessage = () => {
    let newMessage;
    
    if (selectedMessageType === "output") {
      newMessage = outputId 
        ? { output: { id: outputId, model: outputModel || undefined } }
        : "output";
    } else if (selectedMessageType === "clear") {
      newMessage = "clear";
    } else {
      newMessage = { [selectedMessageType]: messageContent };
    }
    
    onChange([...messages, newMessage]);
    setMessageContent("");
    setOutputId("");
    setOutputModel("");
  };

  const removeMessage = (index: number) => {
    const newMessages = [...messages];
    newMessages.splice(index, 1);
    onChange(newMessages);
  };

  const updateMessage = (index: number, updatedMessage: any) => {
    const newMessages = [...messages];
    newMessages[index] = updatedMessage;
    onChange(newMessages);
  };

  const getMessageLabel = (message: any) => {
    if (typeof message === "string") {
      return message;
    }
    
    const role = Object.keys(message)[0];
    let content = message[role];
    
    if (typeof content === "string") {
      // Truncate long content
      return `${role}: ${content.length > 30 ? content.substring(0, 30) + "..." : content}`;
    } else {
      return `${role}${content.id ? ` (${content.id})` : ""}`;
    }
  };

  const getMessageType = (message: any) => {
    if (typeof message === "string") {
      return message;
    }
    return Object.keys(message)[0];
  };

  const getMessageContent = (message: any) => {
    const type = getMessageType(message);
    if (typeof message === "string") {
      return "";
    }
    const content = message[type];
    return typeof content === "string" ? content : "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>Configure the messages in your YAPL chain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 mb-6">
          <Label>Add New Message</Label>
          <div className="grid grid-cols-4 gap-4">
            <Select 
              value={selectedMessageType} 
              onValueChange={setSelectedMessageType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Message Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="output">Output</SelectItem>
                <SelectItem value="clear">Clear</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="col-span-3">
              {selectedMessageType === "output" ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Output ID (optional)"
                    value={outputId}
                    onChange={(e) => setOutputId(e.target.value)}
                  />
                  <Input
                    placeholder="Model override (optional)"
                    value={outputModel}
                    onChange={(e) => setOutputModel(e.target.value)}
                  />
                </div>
              ) : selectedMessageType === "clear" ? (
                <div className="p-2 text-sm text-muted-foreground">
                  Clears the message history and starts a new conversation
                </div>
              ) : (
                <Textarea
                  placeholder={`Enter ${selectedMessageType} message content`}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  rows={3}
                />
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={addMessage}>Add Message</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Message List</Label>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto p-2 border rounded-md">
            {messages.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No messages added yet
              </div>
            ) : (
              messages.map((message, index) => (
                <Collapsible
                  key={index}
                  open={openMessageIndex === index}
                  onOpenChange={(open) => 
                    setOpenMessageIndex(open ? index : null)
                  }
                  className="border rounded-md p-2 bg-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Badge variant="outline" className="mr-2">
                        {getMessageType(message)}
                      </Badge>
                      <span className="text-sm truncate">
                        {getMessageLabel(message)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMessage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {openMessageIndex === index ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  <CollapsibleContent className="mt-2">
                    {(getMessageType(message) === "user" || 
                      getMessageType(message) === "assistant" || 
                      getMessageType(message) === "system") && (
                      <Textarea
                        value={getMessageContent(message)}
                        onChange={(e) => {
                          const type = getMessageType(message);
                          updateMessage(index, { [type]: e.target.value });
                        }}
                        rows={3}
                      />
                    )}
                    {getMessageType(message) === "output" && typeof message !== "string" && (
                      <div className="space-y-2">
                        <Input
                          placeholder="Output ID (optional)"
                          value={message.output?.id || ""}
                          onChange={(e) => {
                            const updatedOutput = { 
                              ...(typeof message.output === 'object' ? message.output : {}) 
                            };
                            if (e.target.value) {
                              updatedOutput.id = e.target.value;
                            } else {
                              delete updatedOutput.id;
                            }
                            updateMessage(
                              index, 
                              Object.keys(updatedOutput).length > 0 
                                ? { output: updatedOutput } 
                                : "output"
                            );
                          }}
                        />
                        <Input
                          placeholder="Model override (optional)"
                          value={message.output?.model || ""}
                          onChange={(e) => {
                            const updatedOutput = { 
                              ...(typeof message.output === 'object' ? message.output : {}) 
                            };
                            if (e.target.value) {
                              updatedOutput.model = e.target.value;
                            } else {
                              delete updatedOutput.model;
                            }
                            updateMessage(
                              index, 
                              Object.keys(updatedOutput).length > 0 
                                ? { output: updatedOutput } 
                                : "output"
                            );
                          }}
                        />
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}