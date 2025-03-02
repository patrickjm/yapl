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
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

interface MessagesEditorProps {
  messages: any[];
  onChange: (messages: any[]) => void;
}

const messageTypes = [
  { value: "user", label: "User" },
  { value: "assistant", label: "Assistant" },
  { value: "system", label: "System" },
  { value: "output", label: "Output" },
  { value: "clear", label: "Clear" },
];

export function MessagesEditor({ messages, onChange }: MessagesEditorProps) {
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
  const [selectedMessageType, setSelectedMessageType] = useState("user");
  const [messageContent, setMessageContent] = useState("");
  const [outputId, setOutputId] = useState("");
  const [outputModel, setOutputModel] = useState("");

  const addMessage = (atIndex: number) => {
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

    const newMessages = [...messages];
    newMessages.splice(atIndex, 0, newMessage);
    onChange(newMessages);

    // Reset form
    setMessageContent("");
    setOutputId("");
    setOutputModel("");
    setInsertAtIndex(null);
    setSelectedMessageType("user");
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

  const renderInsertForm = (index: number) => {
    return (
      <div className="border border-dashed rounded-md p-3 bg-muted/30 space-y-3 my-2">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 items-center">
              <Label className="inline pr-4">Insert Message</Label>
              {messageTypes.map((type) => (
                <Button
                  key={type.value}
                  size="sm"
                  variant={
                    selectedMessageType === type.value ? "default" : "outline"
                  }
                  onClick={() => setSelectedMessageType(type.value)}
                  className="px-2 py-0 h-7 text-xs"
                >
                  {type.label}
                </Button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setInsertAtIndex(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {selectedMessageType === "output" ? (
            <div className="grid grid-cols-2 gap-2">
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.shiftKey) {
                  e.preventDefault();
                  addMessage(index);
                }
              }}
            />
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={() => addMessage(index)}>
              Add Message
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderAddButton = (index: number) => {
    return (
      <div className="relative py-1">
        <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-gray-300" />
        <div className="flex justify-center relative">
          <button
            onClick={() => setInsertAtIndex(index)}
            className="rounded-full bg-background border shadow-sm p-1 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`Add message at position ${index}`}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
        <CardDescription>
          Configure the messages in your YAPL chain
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Message List</Label>
          <div className="space-y-1 overflow-y-auto p-2 border rounded-md">
            {/* Add button at the beginning */}
            {insertAtIndex === 0 ? renderInsertForm(0) : renderAddButton(0)}

            {messages.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No messages added yet
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index}>
                  <div className="border rounded-md p-3 bg-card space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{getMessageType(message)}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMessage(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Inline editable content based on message type */}
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
                        className="w-full resize-y min-h-[80px]"
                      />
                    )}

                    {getMessageType(message) === "output" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Output ID
                          </Label>
                          <Input
                            placeholder="Output ID (optional)"
                            value={
                              typeof message === "string"
                                ? ""
                                : message.output?.id || ""
                            }
                            onChange={(e) => {
                              const updatedOutput =
                                typeof message === "string"
                                  ? {}
                                  : {
                                      ...(typeof message.output === "object"
                                        ? message.output
                                        : {}),
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
                            size={1}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">
                            Model Override
                          </Label>
                          <Input
                            placeholder="Model override (optional)"
                            value={
                              typeof message === "string"
                                ? ""
                                : message.output?.model || ""
                            }
                            onChange={(e) => {
                              const updatedOutput =
                                typeof message === "string"
                                  ? {}
                                  : {
                                      ...(typeof message.output === "object"
                                        ? message.output
                                        : {}),
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
                            size={1}
                          />
                        </div>
                      </div>
                    )}

                    {getMessageType(message) === "clear" && (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        Clears the message history and starts a new conversation
                      </div>
                    )}
                  </div>

                  {/* Add button after each message */}
                  {insertAtIndex === index + 1
                    ? renderInsertForm(index + 1)
                    : renderAddButton(index + 1)}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
