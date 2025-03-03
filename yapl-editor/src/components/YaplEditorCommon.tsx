import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { HelpTooltip } from "./ui/help-tooltip";

interface CommonPropertiesFormProps {
  data: any;
  onChange: (data: any) => void;
}

export function CommonPropertiesForm({
  data,
  onChange,
}: CommonPropertiesFormProps) {
  const [newInput, setNewInput] = useState("");
  const [newTool, setNewTool] = useState("");
  const form = useForm({
    defaultValues: {
      provider: data.provider || "",
      model: data.model || "",
    },
  });

  const provider = useWatch({
    control: form.control,
    name: "provider",
  });

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const addInput = () => {
    if (!newInput.trim()) return;

    const inputs = [...(data.inputs || []), newInput];
    handleChange("inputs", inputs);
    setNewInput("");
  };

  const removeInput = (index: number) => {
    const inputs = [...(data.inputs || [])];
    inputs.splice(index, 1);
    handleChange("inputs", inputs);
  };

  const addTool = () => {
    if (!newTool.trim()) return;

    const tools = [...(data.tools || []), newTool];
    handleChange("tools", tools);
    setNewTool("");
  };

  const removeTool = (index: number) => {
    const tools = [...(data.tools || [])];
    tools.splice(index, 1);
    handleChange("tools", tools);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Common Properties</CardTitle>
        <CardDescription>
          Configure the default settings for your YAPL file. These can be
          overridden by different chains.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form
            onChange={form.handleSubmit((values) => {
              onChange({ ...data, ...values });
            })}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">
                  Provider
                  <HelpTooltip explanation="The LLM provider. You can create your own providers, but these two are the ones you can use in the editor." />
                </Label>
                <Select
                  value={provider || ""}
                  onValueChange={(value) => {
                    form.setValue("provider", value);
                    form.setValue("model", "");
                    onChange({
                      ...data,
                      provider: value,
                      model: "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="openrouter">OpenRouter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">
                  Model
                  <HelpTooltip explanation="The LLM model to use. This can be overridden in chains or their outputs." />
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={form.watch("model") || ""}
                    onChange={(e) => {
                      form.setValue("model", e.target.value);
                      onChange({
                        ...data,
                        provider,
                        model: e.target.value,
                      });
                    }}
                    placeholder="Enter model name"
                    className="flex-1"
                  />
                  {provider === "openai" && (
                    <a
                      href="https://platform.openai.com/docs/models"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {provider === "openrouter" && (
                    <a
                      href="https://openrouter.ai/models"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </form>
        </Form>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>
              Inputs
              <HelpTooltip explanation="List of input variable names that will be passed from the execution environment into the YAPL program." />
            </Label>
            <div className="flex gap-2">
              <Input
                value={newInput}
                onChange={(e) => setNewInput(e.target.value)}
                placeholder="Add a new input name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addInput();
                  }
                }}
              />
              <Button onClick={addInput} type="button">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(data.inputs || []).map((input: string, index: number) => (
                <Badge key={index} className="flex items-center gap-1">
                  {input}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => removeInput(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Tools
              <HelpTooltip explanation="List of tool names that will be available to the LLM." />
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                placeholder="Add a new tool name"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTool();
                  }
                }}
              />
              <Button onClick={addTool} type="button">
                Add
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Note: Tools aren't supported by editor's executor yet. But you can
              still add them to your YAPL file.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(data.tools || []).map((tool: string, index: number) => (
                <Badge key={index} className="flex items-center gap-1">
                  {tool}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
                    onClick={() => removeTool(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
