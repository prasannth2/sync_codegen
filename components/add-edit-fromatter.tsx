"use client"

import type React from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  Code,
  Copy,
  RotateCcw,
  Settings,
  TestTube,
  XCircle,
  FileCode2,
  FileJson,
  FileType,
  PlayCircle,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { useRouter } from "next/navigation"
import { Dynamic } from "@/lib/types/mapper"
import { ArtifactCodeViewer, ArtifactResponse, inferArtifactType } from "./artifacts/artifact-code-viewer"

interface GeneratedFunction {
  code: string
  functionName: string
  testResults?: {
    success: boolean
    output?: object
    error?: string
  }
}

interface APIEndpoint {
  id: string
  name: string
  method: string
  url: string
  description: string
  sampleResponse: string | Record<string, any>
  fields: Array<{
    name: string
    type: string
    required: boolean
    description: string
  }>
}

const availableFunctions = [
  { name: "parseDate", description: "Parse date string to ISO format" },
  { name: "formatCurrency", description: "Format number as currency" },
  { name: "slugify", description: "Convert string to URL-friendly slug" },
  { name: "extractDomain", description: "Extract domain from URL" },
  { name: "calculateAge", description: "Calculate age from birthdate" },
  { name: "generateId", description: "Generate unique identifier" },
  { name: "validateEmail", description: "Validate email format" },
  { name: "truncateText", description: "Truncate text to specified length" },
]

const availableVariables = [
  { name: "currentDate", description: "Current date in ISO format" },
  { name: "timestamp", description: "Current Unix timestamp" },
  { name: "userId", description: "Current user ID" },
  { name: "apiVersion", description: "API version number" },
]

function toFormatterKey(formatterName: string): string {
  return formatterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL as string) ?? ""

interface EditFormatterProps {
  initialFormatter?: Dynamic;
}

type ArtifactsIds = {
  schema?: string | null
  mapper_code?: string | null
  mongoose_model?: string | null
}

export function AddEditFormatter({ initialFormatter }: EditFormatterProps) {
  const router = useRouter()
  const [transformName, setTransformName] = useState("")
  const [transformDescription, setTransformDescription] = useState("")
  const [selectedAPI, setSelectedAPI] = useState<string>("")
  const [selectedAPIData, setSelectedAPIData] = useState<APIEndpoint | null>(null)
  const [showAPIChangeWarning, setShowAPIChangeWarning] = useState(false)
  const [pendingAPIChange, setPendingAPIChange] = useState<string>("")
  const [apiFields, setApiFields] = useState<
    Array<{
      name: string
      type: string
      required: boolean
      description: string
    }>
  >([])

  const [sampleResponse, setSampleResponse] = useState("")
  const [mappingInstructions, setMappingInstructions] = useState("")
  const [mappedOutput, setMappedOutput] = useState("")
  const [namingStyle, setNamingStyle] = useState("snake_case")
  const [requiredFields, setRequiredFields] = useState("")
  const [disallowAdditional, setDisallowAdditional] = useState(true)
  const [showPreferences, setShowPreferences] = useState(false)
  const [generatedFunction, setGeneratedFunction] = useState<GeneratedFunction | null>(null)
  const [isGeneratingFunction, setIsGeneratingFunction] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  const [schemaGenerateResponse, setSchemaGenerateResponse] = useState<any>({})

  const [showFunctionPopup, setShowFunctionPopup] = useState(false)
  const [showTestPopup, setShowTestPopup] = useState(false)
  const [testInput, setTestInput] = useState("")
  const [testOutput, setTestOutput] = useState("")

  const [sampleResponseValid, setSampleResponseValid] = useState<boolean | null>(null)
  const [mappedOutputValid, setMappedOutputValid] = useState<boolean | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Array<{ name: string; description: string }>>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const instructionsRef = useRef<HTMLTextAreaElement>(null)

  const [showConfiguration, setShowConfiguration] = useState(true)
  const [showMainInterface, setShowMainInterface] = useState(false)

  const [availableAPIs, setAvailableAPIs] = useState<APIEndpoint[]>([])
  const [isSchemaGenerateLoading, setIsSchemaGenerateLoading] = useState(false)

  const [artifactFiles, setArtifactFiles] = useState<
    { name: string; artifact_id: string; content: string }[]
  >([])

  // NEW: Track artifact ids (schema, mapper_code, mongoose_model)
  const [artifactIds, setArtifactIds] = useState<ArtifactsIds | null>(null)

  // Helpers
  const api = (path: string) => `${API_BASE_URL}${path}`
  const safeParse = <T = any>(s: string): T | null => {
    if (!s?.trim()) return null
    try { return JSON.parse(s) } catch { return null }
  }

  const handleAPIChange = (apiId: string) => {
    if (sampleResponse || mappingInstructions || mappedOutput) {
      setPendingAPIChange(apiId)
      setShowAPIChangeWarning(true)
    } else {
      applyAPIChange(apiId)
    }
  }

  const applyAPIChange = (apiId: string) => {
    const apiData = availableAPIs.find((api) => api.id === apiId)

    if (apiData) {
      setSelectedAPI(apiId)
      setSelectedAPIData(apiData)
      setApiFields(apiData.fields ?? [])

      let formattedResponse = ""
      if (apiData.sampleResponse) {
        if (typeof apiData.sampleResponse === "string") {
          try {
            const parsed = JSON.parse(apiData.sampleResponse)
            formattedResponse = JSON.stringify(parsed, null, 2)
          } catch {
            formattedResponse = String(apiData.sampleResponse)
          }
        } else if (typeof apiData.sampleResponse === "object") {
          formattedResponse = JSON.stringify(apiData.sampleResponse, null, 2)
        }
      }

      setSampleResponse(formattedResponse)
      setMappingInstructions("")
      setMappedOutput("")
      setGeneratedFunction(null)
      // reset artifacts when switching API
      setArtifactIds(null)
    }
  }

  const proceedToMainInterface = () => {
    if (!transformName.trim() || !transformDescription.trim() || !selectedAPI) {
      toast({
        title: "Missing Information",
        description: "Please fill in name, description, and select an API before proceeding.",
        variant: "destructive",
      })
      return
    }

    setShowConfiguration(false)
    setShowMainInterface(true)
  }

  const skipAPIFields = () => {
    proceedToMainInterface()
  }

  const backToConfiguration = () => {
    setShowConfiguration(true)
    setShowMainInterface(false)
  }

  const confirmAPIChange = () => {
    applyAPIChange(pendingAPIChange)
    setShowAPIChangeWarning(false)
    setPendingAPIChange("")
  }

  const cancelAPIChange = () => {
    setShowAPIChangeWarning(false)
    setPendingAPIChange("")
  }

  const updateAPIField = (index: number, field: string, value: any) => {
    const updatedFields = [...apiFields]
    updatedFields[index] = { ...updatedFields[index], [field]: value }
    setApiFields(updatedFields)
  }

  const beautifyJSON = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }

  const validateJSON = (jsonString: string): boolean => {
    if (!jsonString.trim()) return false
    try {
      JSON.parse(jsonString)
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    setSampleResponseValid(sampleResponse ? validateJSON(sampleResponse) : null)
  }, [sampleResponse])

  useEffect(() => {
    setMappedOutputValid(mappedOutput ? validateJSON(mappedOutput) : null)
  }, [mappedOutput])

  const handleSampleResponseBlur = () => {
    if (sampleResponse && validateJSON(sampleResponse)) {
      setSampleResponse(beautifyJSON(sampleResponse))
    }
  }

  const handleInstructionsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setMappingInstructions(value)
    setCursorPosition(cursorPos)

    // Check for @ mention
    const textBeforeCursor = value.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
      if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
        const query = textAfterAt.toLowerCase()
        const filteredFunctions = availableFunctions.filter(
          (f) => f.name.toLowerCase().includes(query) || f.description.toLowerCase().includes(query),
        )
        const filteredVariables = availableVariables.filter(
          (v) => v.name.toLowerCase().includes(query) || v.description.toLowerCase().includes(query),
        )
        setSuggestions([...filteredFunctions, ...filteredVariables])
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
  }

  const insertSuggestion = (suggestion: { name: string; description: string }) => {
    const textBeforeCursor = mappingInstructions.substring(0, cursorPosition)
    const textAfterCursor = mappingInstructions.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")

    const newText = textBeforeCursor.substring(0, lastAtIndex + 1) + suggestion.name + textAfterCursor
    setMappingInstructions(newText)
    setShowSuggestions(false)

    setTimeout(() => {
      if (instructionsRef.current) {
        instructionsRef.current.focus()
        const newCursorPos = lastAtIndex + 1 + suggestion.name.length
        instructionsRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    }, 0)
  }

  const handleInstructionsBlur = async () => {
    if (sampleResponse && mappingInstructions && sampleResponseValid) {
      const formatter_key = toFormatterKey(transformName);
      setIsSchemaGenerateLoading(true);
      try {
        const response = await fetch(api(`/api/gen/preview-output`), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_id: selectedAPIData?.id || transformName,
            formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id || undefined,
            formatter_name: transformName,
            formatter_key: formatter_key,
            description: transformDescription,
            sample_response: safeParse(sampleResponse),
            instructions: mappingInstructions,
            preferences: { strict_schema: true },
          }),
        });

        if (!response.ok) {
          setIsSchemaGenerateLoading(false);
          throw new Error(`API error: ${response.status}`);
        }

        const { data } = await response.json();

        if (data && data.mapped_output) {
          setSchemaGenerateResponse(data)

          // NEW: capture artifacts if backend returned formatter with artifacts
          const fromPreviewArtifacts: ArtifactsIds | null =
            data?.formatter?.artifacts
              ? {
                schema: data.formatter.artifacts.schema ?? null,
                mapper_code: data.formatter.artifacts.mapper_code ?? null,
                mongoose_model: data.formatter.artifacts.mongoose_model ?? null,
              }
              : null
          if (fromPreviewArtifacts) setArtifactIds(fromPreviewArtifacts)

          setIsSchemaGenerateLoading(false);
          setMappedOutput(JSON.stringify(data.mapped_output, null, 2));
        } else {
          setMappedOutput("");
          setIsSchemaGenerateLoading(false);

          toast({
            title: "Invalid Response",
            description: "API did not return a mapped_output field.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setIsSchemaGenerateLoading(false);
        console.error("Schema generation failed:", error);
        setMappedOutput("");
        toast({
          title: "Error",
          description: "Failed to generate mapped output from API.",
          variant: "destructive",
        });
      }
    }
  };

  const previewMappedOutput = async () => {
    // basic validation
    if (!sampleResponse || !mappingInstructions || !sampleResponseValid) {
      toast({
        title: "Missing data",
        description: "Provide valid JSON response and instructions, then click Preview.",
        variant: "destructive",
      })
      return
    }

    const formatter_key = toFormatterKey(transformName);
    setIsSchemaGenerateLoading(true);
    try {
      const response = await fetch(api(`/api/gen/preview-output`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_id: selectedAPIData?.id || transformName,
          formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id || undefined,
          formatter_name: transformName,
          formatter_key,
          description: transformDescription,
          sample_response: safeParse(sampleResponse),
          instructions: mappingInstructions,
          preferences: { strict_schema: true },
        }),
      });

      if (!response.ok) {
        setIsSchemaGenerateLoading(false);
        throw new Error(`API error: ${response.status}`);
      }

      const { data } = await response.json();

      if (data && data.mapped_output) {
        setSchemaGenerateResponse(data);

        // keep artifact ids if backend returned them
        const fromPreviewArtifacts =
          data?.formatter?.artifacts
            ? {
              schema: data.formatter.artifacts.schema ?? null,
              mapper_code: data.formatter.artifacts.mapper_code ?? null,
              mongoose_model: data.formatter.artifacts.mongoose_model ?? null,
            }
            : null;
        if (fromPreviewArtifacts) setArtifactIds(fromPreviewArtifacts);

        setMappedOutput(JSON.stringify(data.mapped_output, null, 2));
      } else {
        setMappedOutput("");
        toast({
          title: "Invalid Response",
          description: "API did not return a mapped_output field.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Schema generation failed:", error);
      setMappedOutput("");
      toast({
        title: "Error",
        description: "Failed to generate mapped output from API.",
        variant: "destructive",
      });
    } finally {
      setIsSchemaGenerateLoading(false);
    }
  };

  const validateInputs = () => {
    return (
      transformName.trim() && selectedAPI && sampleResponse.trim() && mappingInstructions.trim() && sampleResponseValid
    )
  }

  const handleGenerateFunction = async () => {
    if (!validateInputs()) {
      toast({
        title: "Validation Error",
        description: "Please ensure name, API, sample response, and instructions are provided.",
        variant: "destructive",
      })
      return
    }

    const inputSample = safeParse(sampleResponse)
    const outputSample = safeParse(mappedOutput)
    if (!inputSample || !outputSample) {
      toast({
        title: "Invalid JSON",
        description: "Fix JSON before continuing.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingFunction(true)

    try {
      const response = await fetch(api(`/api/gen/code`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedAPIData?.id || "",
          formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id,
          model_name: transformName,
          inputsample: inputSample,     // ✅ input should be raw sample
          outputsample: outputSample,   // ✅ output should be mapped
          instructions: mappingInstructions,
          preferences: { naming: namingStyle, strict_schema: true }
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const { data } = await response.json()

      // NEW: If backend returns artifacts ids here, capture them
      if (data?.artifacts) {
        setArtifactIds({
          schema: data.artifacts.schema ?? null,
          mapper_code: data.artifacts.mapper_code ?? null,
          mongoose_model: data.artifacts.mongoose_model ?? null,
        })
      }

      // Existing behavior: if "created" array is present, fetch their contents and show dialog
      if (data.created && Array.isArray(data.created)) {
        const files = await Promise.all(
          data.created.map(async (file: any) => {
            const res = await fetch(api(`/api/artifacts/${file.artifact_id}`))
            if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
            const raw = await res.text()

            let content = raw
            let name = file.name || "artifact.txt"
            try {
              const json = JSON.parse(raw)
              content = typeof json.content === "string" ? json.content : raw
              name = json?.meta?.files?.[0]?.name || name
            } catch {
              // keep raw
            }

            return { ...file, name, content }
          })
        )
        setArtifactFiles(files)
      }

      setGeneratedFunction({
        code: data.code || JSON.stringify(data, null, 2),
        functionName: `${transformName.replace(/\s+/g, "")}Transform`,
      })
      setShowFunctionPopup(true)

      toast({
        title: "🚀 Function generated",
        description: "Review the generated function code.",
      })
    } catch (error) {
      console.error("Code generation failed:", error)
      toast({
        title: "Error",
        description: "Failed to generate function code from API.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingFunction(false)
    }
  }

  const handleTestFunction = async () => {
    // Only allow test when both mapper_code and mongoose_model exist
    if (!(artifactIds?.mapper_code && artifactIds?.mongoose_model)) {
      toast({
        title: "Artifacts not ready",
        description: "Test is enabled only after mapper_code and mongoose_model are generated.",
        variant: "destructive",
      })
      return
    }

    setTestInput(sampleResponse)
    setTestOutput("")
    setShowTestPopup(true)
  }

  const executeTest = async () => {
    if (!testInput) return

    const parsed = safeParse(testInput)
    if (!parsed) {
      toast({
        title: "Invalid JSON",
        description: "Please provide valid JSON for test input.",
        variant: "destructive",
      })
      return
    }

    setIsTesting(true)
    setTestOutput("")

    try {
      const response = await fetch(api(`/api/test/test`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedAPIData?.id || "",
          sample_request: parsed,
          formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id,
          options: {
            validate_schema: true,
            run_model_shape_check: false,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setTestOutput(JSON.stringify(data?.mapped_output, null, 2))

      toast({
        title: "✅ Test successful",
        description: "Function executed successfully with sample data.",
      })
    } catch (error) {
      console.error("Function test failed:", error)
      setTestOutput(`Error: ${error instanceof Error ? error.message : "Failed to execute function"}`)

      toast({
        title: "❌ Test failed",
        description: "Function execution failed. Check your sample data.",
        variant: "destructive",
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleReset = () => {
    setTransformName("")
    setTransformDescription("")
    setSelectedAPI("")
    setSelectedAPIData(null)
    setApiFields([])
    setSampleResponse("")
    setMappingInstructions("")
    setMappedOutput("")
    setNamingStyle("snake_case")
    setRequiredFields("")
    setDisallowAdditional(true)
    setGeneratedFunction(null)
    setSchemaGenerateResponse({})
    setArtifactIds(null)
    setShowConfiguration(true)
    setShowMainInterface(false)
  }

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    })
  }

  // NEW: fetch & show a single artifact by id
  // Replace your openArtifact with this:
  const openArtifact = async (id?: string | null, label?: string) => {
    if (!id) {
      toast({ title: "Artifact not available", description: "No artifact id found.", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(api(`/api/artifacts/${id}`))
      if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)

      const raw = await res.text()
      // Try JSON first; if not JSON, treat as raw file content
      let content = raw
      let name = label || "artifact.txt"

      try {
        const json = JSON.parse(raw)
        content = typeof json.content === "string" ? json.content : raw
        name = json?.meta?.files?.[0]?.name || label || name
      } catch {
        // raw stays as-is
      }

      setArtifactFiles([{ name, artifact_id: id, content }])
      setShowFunctionPopup(true)
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Failed to load artifact content.", variant: "destructive" })
    }
  }

  useEffect(() => {
    const fetchAPIs = async () => {
      try {
        const response = await fetch(api(`/api/apis`))
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json()
        setAvailableAPIs(data?.data)
      } catch (error) {
        console.error("Failed to fetch APIs:", error)
        toast({
          title: "Error",
          description: "Could not load available APIs.",
          variant: "destructive",
        })
      }
    }
    fetchAPIs()
  }, [])

  // Sync selectedAPIData after APIs load or when selectedAPI changes
  useEffect(() => {
    if (selectedAPI && availableAPIs.length) {
      const apiData = availableAPIs.find(a => a.id === selectedAPI) ?? null
      setSelectedAPIData(apiData)
    }
  }, [selectedAPI, availableAPIs])

  // Edit mode prefill
  useEffect(() => {
    if (!initialFormatter) return

    // Prefill transform details
    setTransformName(initialFormatter.name || "")
    setTransformDescription(initialFormatter.description || "")

    setSelectedAPI(initialFormatter.api_id)

    const mappedInput = initialFormatter.metadata?.input_sample
    const mappedOutput = initialFormatter.metadata?.output_sample
    const instructions = initialFormatter.metadata?.instructions

    if (mappedInput) setSampleResponse(JSON.stringify(mappedInput, null, 2))
    if (instructions) setMappingInstructions(instructions)
    if (mappedOutput) setMappedOutput(JSON.stringify(mappedOutput, null, 2))

    // NEW: pick artifacts if present on initial formatter
    const fmtArtifacts = (initialFormatter as any)?.artifacts || (initialFormatter as any)?.metadata?.artifacts
    if (fmtArtifacts) {
      setArtifactIds({
        schema: fmtArtifacts.schema ?? null,
        mapper_code: fmtArtifacts.mapper_code ?? null,
        mongoose_model: fmtArtifacts.mongoose_model ?? null,
      })
    }

    // Skip config screen automatically in edit mode
    setShowConfiguration(false)
    setShowMainInterface(true)
  }, [initialFormatter])

  // UI helpers
  const canShowTest = Boolean(artifactIds?.mapper_code && artifactIds?.mongoose_model)

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="border-b border-border">
        <div className="p-6 space-y-4">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-balance text-foreground">Response Formatter</h1>
            <p className="text-muted-foreground">Clean your response data with intelligent transformations</p>
          </div>

          {showConfiguration && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transform-name">Transform Name *</Label>
                  <Input
                    id="transform-name"
                    placeholder="e.g., Sales Data Transform"
                    value={transformName}
                    onChange={(e) => setTransformName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transform-description">Description *</Label>
                  <Input
                    id="transform-description"
                    placeholder="Brief description of the transformation"
                    value={transformDescription}
                    onChange={(e) => setTransformDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-select">API Endpoint *</Label>
                  <Select value={selectedAPI} onValueChange={handleAPIChange}>
                    <SelectTrigger id="api-select">
                      <SelectValue placeholder="Select an API endpoint" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAPIs.map((api) => (
                        <SelectItem key={api.id} value={api.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{api.name}</span>
                            <span className="font-medium">{api.id}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedAPIData && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">API Fields Configuration</Label>
                      <span className="text-sm text-muted-foreground">{selectedAPIData.description}</span>
                    </div>
                    <div className="border border-border">
                      <div className="grid grid-cols-4 gap-4 p-3 bg-muted/50 border-b border-border text-sm font-medium">
                        <div>Field Name</div>
                        <div>Type</div>
                        <div>Required</div>
                        <div>Description</div>
                      </div>
                      {apiFields.map((field, index) => (
                        <div key={index} className="grid grid-cols-4 gap-4 p-3 border-b border-border last:border-b-0">
                          <Input
                            value={field.name}
                            onChange={(e) => updateAPIField(index, "name", e.target.value)}
                            className="h-8"
                          />
                          <Select value={field.type} onValueChange={(value) => updateAPIField(index, "type", value)}>
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="string">string</SelectItem>
                              <SelectItem value="number">number</SelectItem>
                              <SelectItem value="boolean">boolean</SelectItem>
                              <SelectItem value="object">object</SelectItem>
                              <SelectItem value="array">array</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className="flex items-center">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) => updateAPIField(index, "required", checked === true)}
                            />
                          </div>
                          <Input
                            value={field.description}
                            onChange={(e) => updateAPIField(index, "description", e.target.value)}
                            className="h-8"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={skipAPIFields}>
                      Skip Configuration
                    </Button>
                    <Button onClick={proceedToMainInterface} className="bg-primary hover:bg-primary/90">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Proceed to Transform
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {showMainInterface && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={backToConfiguration} className="h-auto p-1">
                  ← Back to Configuration
                </Button>
                <span>•</span>
                <span className="font-medium">{transformName}</span>
                <span>•</span>
                <span>{selectedAPIData?.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/formatters")}
                >
                  Go to List
                </Button>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMainInterface && (
        <section className="flex-1 min-h-0">
          {/* Unified column headers (one straight bottom line) */}
          <div className="grid grid-cols-3 divide-x divide-border border-b border-border">
            {/* H1 */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2">
                {sampleResponseValid === null ? (
                  <div className="w-5 h-5 bg-muted" />
                ) : sampleResponseValid ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <h2 className="text-lg font-semibold">Sample Response</h2>
              </div>
            </div>

            {/* H2 */}
            <div className="px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Transform Instructions</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleGenerateFunction}
                  disabled={!validateInputs() || isGeneratingFunction || isSchemaGenerateLoading}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                  size="sm"
                >
                  <Code className="w-4 h-4 mr-2" />
                  {isGeneratingFunction ? "Generating..." : "Generate Function"}
                </Button>
              </div>
            </div>

            {/* H3 */}
            <div className="px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {mappedOutputValid === null ? (
                    <div className="w-5 h-5 bg-muted" />
                  ) : mappedOutputValid ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <h2 className="text-lg font-semibold">Mapped Output</h2>
                </div>
                {mappedOutput && (
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(mappedOutput)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Body row (scrollable), lines stay aligned with the header */}
          <div className="grid grid-cols-3 divide-x divide-border min-h-0 h-full">
            {/* Col 1: Sample Response */}
            <div className="min-h-0 flex flex-col">
              <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="sample-response" className="text-base font-semibold">
                    JSON Response *
                  </Label>
                  <Textarea
                  id="sample-response"
                  placeholder={
                    selectedAPIData
                      ? "Sample response loaded from API"
                      : "Select an API first or paste JSON response"
                  }
                  value={sampleResponse}
                  onChange={(e) => setSampleResponse(e.target.value)}
                  onBlur={handleSampleResponseBlur}
                  spellCheck={false}
                  className={`font-mono text-sm resize-none overflow-auto w-full
              min-h-[300px] max-h-[calc(100vh-320px)]
              ${sampleResponseValid === false
                      ? "border-red-500 focus:border-red-500"
                      : sampleResponseValid === true
                        ? "border-green-500"
                        : ""}`}
                />
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-muted-foreground">
                      {selectedAPIData ? `Sample from ${selectedAPIData.name}` : "Paste your API response to analyze structure"}
                    </p>
                    {sampleResponseValid === false && <span className="text-red-500 font-medium">Invalid JSON</span>}
                    {sampleResponseValid === true && <span className="text-green-500 font-medium">Valid JSON</span>}
                  </div>
                </div>

                {/* Preferences */}
                <Collapsible open={showPreferences} onOpenChange={setShowPreferences}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="p-0 h-auto font-normal text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown
                        className={`w-4 h-4 mr-2 transition-transform ${showPreferences ? "rotate-180" : ""}`}
                      />
                      Schema Preferences
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-4 mt-4 p-4 bg-muted/30 rounded">
                    <div className="space-y-2">
                      <Label htmlFor="naming-style">Naming Style</Label>
                      <Select value={namingStyle} onValueChange={setNamingStyle}>
                        <SelectTrigger id="naming-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="snake_case">snake_case</SelectItem>
                          <SelectItem value="camelCase">camelCase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="required-fields">Required Fields (comma-separated)</Label>
                      <Input
                        id="required-fields"
                        placeholder="field1, field2, field3"
                        value={requiredFields}
                        onChange={(e) => setRequiredFields(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="disallow-additional"
                        checked={disallowAdditional}
                        onCheckedChange={(checked) => setDisallowAdditional(!!checked)}
                      />
                      <Label htmlFor="disallow-additional" className="text-sm">
                        Disallow additional properties
                      </Label>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

          {/* Column 2 */}
          <div className="flex-1 border-r border-border flex flex-col">
            <div className="p-6 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Transform Instructions</h2>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-2">
                    <Button
                      onClick={previewMappedOutput}
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer"
                      disabled={isSchemaGenerateLoading || !sampleResponseValid || !mappingInstructions.trim()}
                    >
                      <PlayCircle className="w-4 h-4 mr-2" />
                      {isSchemaGenerateLoading ? "Previewing..." : "Preview Output"}
                    </Button>

                    <Button
                      onClick={handleGenerateFunction}
                      disabled={!validateInputs() || isGeneratingFunction || isSchemaGenerateLoading}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground"
                      size="sm"
                    >
                      <Code className="w-4 h-4 mr-2" />
                      {isGeneratingFunction ? "Generating..." : "Generate Function"}
                    </Button>
                  </div>

                  {/* NEW: Artifact quick actions (three icons) */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Schema Artifact"
                      onClick={() => openArtifact(artifactIds?.schema, "schema.json")}
                      disabled={!artifactIds?.schema}
                    >
                      <FileJson className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Mapper Code"
                      onClick={() => openArtifact(artifactIds?.mapper_code, "mapper_code.ts")}
                      disabled={!artifactIds?.mapper_code}
                    >
                      <FileCode2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Mongoose Model"
                      onClick={() => openArtifact(artifactIds?.mongoose_model, "mongoose_model.ts")}
                      disabled={!artifactIds?.mongoose_model}
                    >
                      <FileType className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto relative">
              <div className="space-y-2">
                <Label htmlFor="mapping-instructions" className="text-base font-semibold">
                  Step-by-step Instructions *
                </Label>
                <div className="relative">
                  <textarea
                    ref={instructionsRef}
                    value={mappingInstructions}
                    onChange={handleInstructionsChange}
                    className="min-h=[300px] min-h-[300px] resize-none font-mono text-sm w-full border border-input rounded px-3 py-2"
                    placeholder={`1) remove fields: sales_meta_data, origin
2) rename: SalesPrice → salesPrice, MakingCost → makingCost  
3) cast to number: salesPrice, makingCost
4) compute profit = @calculateProfit(salesPrice, makingCost)
5) add timestamp = @currentDate
6) output ${namingStyle} keys

Type @ to see available functions and variables`}
                    />

                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 bg-background border border-border shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            className="w-full px-3 py-2 text-left hover:bg-muted flex flex-col"
                            onClick={() => insertSuggestion(suggestion)}
                          >
                            <span className="font-medium">@{suggestion.name}</span>
                            <span className="text-sm text-muted-foreground">{suggestion.description}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Describe transformations step-by-step. Use @ to reference functions and variables.
                  </p>
                </div>

                {generatedFunction && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code className="w-5 h-5 text-blue-500" />
                        <span className="font-medium text-blue-700 dark:text-blue-300">Function Ready</span>
                      </div>
                      <Button onClick={handleTestFunction} disabled={!sampleResponse} size="sm" variant="outline">
                        <TestTube className="w-4 h-4 mr-2" />
                        Test Function
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Col 3: Mapped Output */}
            <div className="min-h-0 flex flex-col">
              <div className="p-6 flex-1 min-h-0 overflow-y-auto">
                {isSchemaGenerateLoading ? (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="space-y-4">
                      <div className="animate-spin text-6xl">⏳</div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-muted-foreground">Generating Schema...</p>
                        <p className="text-sm text-muted-foreground">
                          Please wait while we process your response and instructions.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : mappedOutput ? (
                  <div className="h-full">
                    <div className="space-y-2 h-full flex flex-col">
                      <Label className="text-base font-semibold">Transformed JSON</Label>
                      <Textarea
                        value={mappedOutput}
                        readOnly
                        className="font-mono text-sm resize-none overflow-auto w-full flex-1 min-h-0"
                      />
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">Transformation preview</p>
                        {mappedOutputValid === false && <span className="text-red-500 font-medium">Invalid JSON</span>}
                        {mappedOutputValid === true && <span className="text-green-500 font-medium">Valid JSON</span>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div className="space-y-4">
                      <div className="text-6xl">⚡</div>
                      <div className="space-y-2">
                        <p className="text-lg font-medium text-muted-foreground">Preview Output</p>
                        <p className="text-sm text-muted-foreground">
                          Add sample response and instructions, then click outside to see transformation
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}


      {/* Change API warning */}
      <AlertDialog open={showAPIChangeWarning} onOpenChange={setShowAPIChangeWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Change API Endpoint?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Changing the API endpoint will reset all current work including sample response, instructions, and mapped
              output. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAPIChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAPIChange} className="bg-red-600 hover:bg-red-700">
              Change API & Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated artifacts / files viewer */}
      <Dialog open={showFunctionPopup} onOpenChange={setShowFunctionPopup}>
        <DialogContent
          className="
          w-[95vw]
          sm:max-w-[95vw]
          md:max-w-[92vw]
          lg:max-w-[1200px]
          xl:max-w-[1400px]
          2xl:max-w-[1600px]
          max-h-[88vh]
          overflow-y-auto
        ">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Generated Artifacts
            </DialogTitle>
          </DialogHeader>

          {artifactFiles.length > 0 ? (
            <div className="grid gap-6 grid-cols-1"> {/* force single column */}
              {artifactFiles.map((file) => {
                const artifact: ArtifactResponse = {
                  artifact_id: file.artifact_id,
                  formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id || "",
                  api_id: selectedAPIData?.id || "",
                  type: inferArtifactType(file.name),
                  version: "1.0.0",
                  content: file.content,            // ✅ only the code content
                  meta: { files: [{ path: file.name, name: file.name }] },
                }
                return (
                  <div key={file.artifact_id} className="flex flex-col min-h-[520px]">
                    <ArtifactCodeViewer artifact={artifact} />
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No artifacts generated.</p>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setShowFunctionPopup(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Test modal */}
      <Dialog open={showTestPopup} onOpenChange={setShowTestPopup}>
        <DialogContent className="w-[90vw] max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              Test Function
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sample Input</Label>
                <Textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="font-mono text-sm min-h-[300px] resize-none"
                  placeholder="Enter test JSON input..."
                />
              </div>
              <div className="space-y-2">
                <Label>Generated Output</Label>
                <Textarea
                  value={testOutput}
                  readOnly
                  className="font-mono text-sm min-h-[300px] resize-none bg-muted"
                  placeholder="Output will appear here after test execution..."
                />
              </div>
            </div>
            <div className="flex justify-between">
              <Button onClick={executeTest} disabled={isTesting || !testInput}>
                <TestTube className="w-4 h-4 mr-2" />
                {isTesting ? "Testing..." : "Execute Test"}
              </Button>
              <Button variant="outline" onClick={() => setShowTestPopup(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}