import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CommonPropertiesFormProps {
  data: any;
  onChange: (data: any) => void;
}

export function CommonPropertiesForm({ data, onChange }: CommonPropertiesFormProps) {
  const [newInput, setNewInput] = useState("");
  const [newTool, setNewTool] = useState("");

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
        <CardDescription>Configure the basic properties for your YAPL file</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Input
              id="provider"
              value={data.provider || ""}
              onChange={(e) => handleChange("provider", e.target.value)}
              placeholder="openai"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={data.model || ""}
              onChange={(e) => handleChange("model", e.target.value)}
              placeholder="openai/gpt4o-mini"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Inputs</Label>
          <div className="flex gap-2">
            <Input
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="Add a new input name"
            />
            <Button onClick={addInput} type="button">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(data.inputs || []).map((input: string, index: number) => (
              <Badge key={index} className="flex items-center gap-1">
                {input}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeInput(index)}
                />
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tools</Label>
          <div className="flex gap-2">
            <Input
              value={newTool}
              onChange={(e) => setNewTool(e.target.value)}
              placeholder="Add a new tool name"
            />
            <Button onClick={addTool} type="button">Add</Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(data.tools || []).map((tool: string, index: number) => (
              <Badge key={index} className="flex items-center gap-1">
                {tool}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => removeTool(index)}
                />
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}