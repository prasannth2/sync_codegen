"use client"


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
  Eye,
  FileJson,
  FileType,
  PlayCircle,
  RotateCcw,
  Settings,
  FlaskConical,
  XCircle,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { APP_NAME, INPUT_SAMPLE_NAME, OUTPUT_SAMPLE_NAME } from "@/config/app"
import { Dynamic } from "@/lib/types/mapper"
import { useRouter } from "next/navigation"
import { ArtifactCodeViewer, ArtifactResponse, inferArtifactType } from "./artifacts/artifact-code-viewer"
import InstructionEditor from "./instructions-editor"
import FilesViewerDialog from "./file-viewer-dialog"
import { Mention } from "@/lib/types/editor"
import { TestFunctionPro } from "./models/test-function"
import { LogLine } from "./terminal-log"
import { CodeRunnerDialog } from "./code-runner/code-runner-dialog"

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

function toFormatterKey(formatterName: string): string {
  return formatterName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL as string) ?? ""

interface EditFunctionsProps {
  initialFormatter?: Dynamic;
}

type ArtifactsIds = {
  schema?: string | null
  mapper_code?: string | null
  mongoose_model?: string | null
}

function normalizeApiLogs(apiLogs: any[]): LogLine[] {
  // api logs shape: { ts, level, args: [...] }
  return (apiLogs ?? []).map((l) => ({
    ts: l?.ts,
    level: (l?.level || "info").toLowerCase(),
    message: Array.isArray(l?.args) ? l.args.join(" ") : String(l?.args ?? ""),
  }));
}

export function AddEditFunctions({ initialFormatter }: EditFunctionsProps) {
  const router = useRouter()
  const previewCtrlRef = useRef<AbortController | null>(null);
  useEffect(() => () => previewCtrlRef.current?.abort(), []);

  const [transformName, setTransformName] = useState("")
  // description removed from UI; keep state for API compatibility but unused
  const [transformDescription] = useState("")

  const [selectedAPI, setSelectedAPI] = useState<string>("")
  const [selectedAPIData, setSelectedAPIData] = useState<APIEndpoint | null>(null)
  const [showAPIChangeWarning, setShowAPIChangeWarning] = useState(false)
  const [pendingAPIChange, setPendingAPIChange] = useState<string>("")

  const [sampleResponse, setSampleResponse] = useState("")
  const [mappingInstructions, setMappingInstructions] = useState("")
  const [selectedMentions, setSelectedMentions] = useState<Mention[]>([])
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
  const [logs, setLogs] = useState<LogLine[]>([]);

  const [sampleResponseValid, setSampleResponseValid] = useState<boolean | null>(null)
  const [mappedOutputValid, setMappedOutputValid] = useState<boolean | null>(null)

  const [showConfiguration, setShowConfiguration] = useState(true)
  const [showMainInterface, setShowMainInterface] = useState(false)

  const [availableAPIs, setAvailableAPIs] = useState<APIEndpoint[]>([])
  const [isSchemaGenerateLoading, setIsSchemaGenerateLoading] = useState(false)

  const [artifactFiles, setArtifactFiles] = useState<
    { name: string; artifact_id: string; content: string }[]
  >([])

  const [artifactIds, setArtifactIds] = useState<ArtifactsIds | null>(null);

  // Silent nav (no toast). Keeps your existing proceedToMainInterface for manual use elsewhere.
  const goMainSilently = () => {
    setShowConfiguration(false);
    setShowMainInterface(true);
  };

  // Auto-fill name from API (if empty) and go main as soon as API is chosen.
  useEffect(() => {
    if (!showConfiguration) return;

    // If API selected and transformName is empty, derive from selected API
    if (selectedAPI && !transformName.trim() && selectedAPIData?.name) {
      setTransformName(selectedAPIData.name);
    }

    // If API chosen and we now have (a) a name or (b) can derive one, go main
    if (selectedAPI && (transformName.trim() || selectedAPIData?.name)) {
      goMainSilently();
    }
  }, [selectedAPI, selectedAPIData, transformName, showConfiguration]);


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
      setArtifactIds(null)
    }
  }

  const backToConfiguration = () => {
    // In edit mode, go back to list instead of config screen
    if (initialFormatter) {
      router.back();
      return
    }
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

  const beautifyJSON = (jsonString: string): string => {
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch { return jsonString }
  }
  const validateJSON = (jsonString: string): boolean => {
    if (!jsonString.trim()) return false
    try { JSON.parse(jsonString); return true } catch { return false }
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

  const handleSampleOutputBlur = () => {
    if (mappedOutput && validateJSON(mappedOutput)) {
      setMappedOutput(beautifyJSON(mappedOutput))
    }
  }

  // ---- Preview (explicit button) ----
  const previewMappedOutput = async () => {
    if (!sampleResponse || !mappingInstructions || !sampleResponseValid) {
      toast({
        title: "Missing data",
        description: "Provide valid JSON response and instructions, then click Preview.",
        variant: "destructive",
      })
      return
    }

    const formatter_key = toFormatterKey(transformName)
    setIsSchemaGenerateLoading(true)
    try {
      const response = await fetch(api(`/api/gen/preview-output`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_id: selectedAPIData?.id || transformName,
          formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id || undefined,
          formatter_name: transformName,
          formatter_key,
          description: "", // description removed from UI
          sample_response: safeParse(sampleResponse),
          instructions: mappingInstructions,
          preferences: { strict_schema: true },
        }),
      })

      if (!response.ok) {
        setIsSchemaGenerateLoading(false)
        throw new Error(`API error: ${response.status}`)
      }

      const { data } = await response.json()

      if (data && data.mapped_output) {
        setSchemaGenerateResponse(data)
        // collect artifact ids from multiple shapes
        const ids =
          data?.formatter?.artifacts ??
          data?.artifacts ??
          null
        if (ids) {
          setArtifactIds({
            schema: ids.schema ?? null,
            mapper_code: ids.mapper_code ?? null,
            mongoose_model: ids.mongoose_model ?? null,
          })
        }
        setMappedOutput(JSON.stringify(data.mapped_output, null, 2))
      } else {
        setMappedOutput("")
        toast({ title: "Invalid Response", description: "API did not return a mapped_output field.", variant: "destructive" })
      }
    } catch (error) {
      console.error("Schema generation failed:", error)
      setMappedOutput("")
      toast({ title: "Error", description: "Failed to generate mapped output from API.", variant: "destructive" })
    } finally {
      setIsSchemaGenerateLoading(false)
    }
  }

  const validateInputs = () => {
    return transformName.trim() && selectedAPI && sampleResponse.trim() && mappingInstructions.trim() && sampleResponseValid
  }

  // ---- Generate code & artifacts ----
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
      toast({ title: "Invalid JSON", description: "Fix JSON before continuing.", variant: "destructive" })
      return
    }

    setIsGeneratingFunction(true)

    try {
      const response = await fetch(api(`/api/gen/code`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAPIData?.id || "",
          formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id,
          model_name: transformName,
          inputsample: inputSample,
          outputsample: outputSample,
          instructions: mappingInstructions,
          preferences: selectedMentions.map(m => {
            return {
              mention_type: m.mention_type,
              ...m.data
            }
          }),
        }),
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const { data } = await response.json()

      // collect artifact ids from any shape available
      let ids: any =
        data?.formatter?.artifacts ??
        data?.artifacts ??
        null

      // infer from created file names if necessary
      if (!ids && Array.isArray(data?.created)) {
        const guess: ArtifactsIds = { schema: null, mapper_code: null, mongoose_model: null }
        for (const f of data.created) {
          const n = String(f?.name || "").toLowerCase()
          if (n.includes("schema") || n.endsWith(".json")) guess.schema = f.artifact_id
          else if (n.includes("mongoose") || n.includes("model")) guess.mongoose_model = f.artifact_id
          else if (n.includes("mapper")) guess.mapper_code = f.artifact_id
        }
        ids = guess
      }
      if (ids) {
        setArtifactIds({
          schema: ids.schema ?? null,
          mapper_code: ids.mapper_code ?? null,
          mongoose_model: ids.mongoose_model ?? null,
        })
      }

      // If "created" present, fetch contents for viewer
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
            } catch { /* keep raw */ }
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

      toast({ title: "🚀 Function generated", description: "Review the generated function code." })
    } catch (error) {
      console.error("Code generation failed:", error)
      toast({ title: "Error", description: "Failed to generate function code from API.", variant: "destructive" })
    } finally {
      setIsGeneratingFunction(false)
    }
  }

  // ---- Test ----
  const handleTestFunction = async () => {
    if (!(artifactIds?.mapper_code /* && artifactIds?.mongoose_model */)) {
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

  const clearLogs = () => setLogs([]);

  const appendLogs = (newLogs: LogLine[] | LogLine) =>
    setLogs((prev) => prev.concat(Array.isArray(newLogs) ? newLogs : [newLogs]));

  const executeTest = async () => {
    if (!testInput) return;

    // (your safeParse)
    const parsed = safeParse(testInput);
    if (!parsed) {
      toast({ title: "Invalid JSON", description: "Please provide valid JSON for test input.", variant: "destructive" });
      return;
    }

    setIsTesting(true);
    setTestOutput("");
    clearLogs();

    try {
      appendLogs({ level: "info", message: "Starting test run…" });

      const response = await fetch(api(`/api/test/run`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAPIData?.id || "",
          sample_request: parsed,
          formatter_id: schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id,
          options: { validate_schema: true, run_model_shape_check: false },
          artifact_id: artifactIds?.mapper_code,
        }),
      });

      appendLogs({ level: "debug", message: `HTTP ${response.status} received from /api/test/run` });

      if (!response.ok) {
        appendLogs({ level: "error", message: `API error: ${response.status}` });
        throw new Error(`API error: ${response.status}`);
      }

      const body = await response.json();
      const mapped = body?.data?.mapped_output ?? null;

      // show logs from API
      const apiLogs = normalizeApiLogs(body?.logs);
      if (apiLogs.length) appendLogs(apiLogs);

      // output
      setTestOutput(mapped ? JSON.stringify(mapped, null, 2) : "");
      appendLogs({ level: "info", message: "Test completed successfully." });

      toast({ title: "✅ Test successful", description: "Function executed successfully with sample data." });
    } catch (error: any) {
      console.error("Function test failed:", error);
      setTestOutput(`Error: ${error?.message ?? "Failed to execute function"}`);
      appendLogs({ level: "error", message: `Test failed: ${error?.message ?? String(error)}` });

      toast({
        title: "❌ Test failed",
        description: "Function execution failed. Check your sample data.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setTransformName("")
    setSelectedAPI("")
    setSelectedAPIData(null)
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
    toast({ title: "Copied to clipboard", description: "Content has been copied to your clipboard." })
  }

  // open single artifact
  const openArtifact = async (id?: string | null, label?: string) => {
    if (!id) {
      toast({ title: "Artifact not available", description: "No artifact id found.", variant: "destructive" })
      return
    }
    try {
      const res = await fetch(api(`/api/artifacts/${id}`))
      if (!res.ok) throw new Error(`Artifact fetch failed: ${res.status}`)
      const raw = await res.text()
      let content = raw
      let name = label || "artifact.txt"
      try {
        const json = JSON.parse(raw)
        content = typeof json.content === "string" ? json.content : raw
        name = json?.meta?.files?.[0]?.name || label || name
      } catch { /* raw as-is */ }
      setArtifactFiles([{ name, artifact_id: id, content }])
      setShowFunctionPopup(true)
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "Failed to load artifact content.", variant: "destructive" })
    }
  }

  // Fetch APIs
  useEffect(() => {
    const fetchAPIs = async () => {
      try {
        const response = await fetch(api(`/api/apis`))
        if (!response.ok) throw new Error(`API error: ${response.status}`)
        const data = await response.json()
        setAvailableAPIs(data?.data)
      } catch (error) {
        console.error("Failed to fetch APIs:", error)
        toast({ title: "Error", description: "Could not load available APIs.", variant: "destructive" })
      }
    }
    fetchAPIs()
  }, []) // eslint-disable-line

  // Sync selected API object
  useEffect(() => {
    if (selectedAPI && availableAPIs.length) {
      const apiData = availableAPIs.find(a => a.id === selectedAPI) ?? null
      setSelectedAPIData(apiData)
    }
  }, [selectedAPI, availableAPIs])

  // Prefill edit mode
  useEffect(() => {
    if (!initialFormatter) return
    setTransformName(initialFormatter.name || "")
    setSelectedAPI(initialFormatter.api_id)

    const mappedInput = initialFormatter.metadata?.input_sample
    const mappedOut = initialFormatter.metadata?.output_sample
    const instructions = initialFormatter.metadata?.instructions
    if (mappedInput) setSampleResponse(JSON.stringify(mappedInput, null, 2))
    if (instructions) setMappingInstructions(instructions)
    if (mappedOut) setMappedOutput(JSON.stringify(mappedOut, null, 2))

    const fmtArtifacts = (initialFormatter as any)?.artifacts || (initialFormatter as any)?.metadata?.artifacts
    if (fmtArtifacts) {
      setArtifactIds({
        schema: fmtArtifacts.schema ?? null,
        mapper_code: fmtArtifacts.mapper_code ?? null,
        mongoose_model: fmtArtifacts.mongoose_model ?? null,
      })
    }

    setShowConfiguration(false)
    setShowMainInterface(true)
  }, [initialFormatter])

  const canShowTest = Boolean(artifactIds?.mapper_code /* && artifactIds?.mongoose_model */)

  return (
    <div className="w-full h-screen flex flex-col">
      <div className="border-b border-border">
        <div className="p-6 space-y-1">
          <div className="text-start space-y-1">
            <h1 className="text-3xl font-bold text-balance text-foreground">{initialFormatter ? "Edit" : "Add"} Function</h1>
            {/* <p className="text-muted-foreground">Clean your response data with intelligent transformations</p> */}
          </div>

          {showConfiguration && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transform-name">Function Name *</Label>
                  <Input
                    id="transform-name"
                    placeholder="e.g., Sales Data Transform"
                    value={transformName}
                    onChange={(e) => setTransformName(e.target.value)}
                  />
                </div>

                {/* Description removed */}

                <div className="space-y-2">
                  <Label htmlFor="api-select">API Endpoint *</Label>
                  <Select value={selectedAPI} onValueChange={handleAPIChange}>
                    <SelectTrigger id="api-select">
                      <SelectValue placeholder="Select an API endpoint" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAPIs.map((api) => (
                        <SelectItem key={api.id} value={api.id} className="cursor-pointer">
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

            </>
          )}

          {showMainInterface && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={backToConfiguration} className="h-auto p-1 cursor-pointer">
                  ← Back to Configuration
                </Button>
                <span>•</span>
                <span className="font-medium">{transformName}</span>
                <span>•</span>
                <span>{selectedAPIData?.name}</span>
              </div>
              <div className="flex gap-2">
                {/* Row 2 — actions toolbar */}
                <div className="flex flex-wrap items-center gap-2">
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

                  {isSchemaGenerateLoading && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => previewCtrlRef.current?.abort()}
                    >
                      Cancel Preview
                    </Button>
                  )}

                  <Button
                    onClick={handleGenerateFunction}
                    disabled={!validateInputs() || isGeneratingFunction || isSchemaGenerateLoading}
                    className="bg-accent hover:bg-accent/90 text-accent-foreground cursor-pointer"
                    size="sm"
                  >
                    <Code className="w-4 h-4 mr-2" />
                    {isGeneratingFunction ? "Generating..." : "Generate Function"}
                  </Button>

                  {canShowTest && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestFunction}
                      className="cursor-pointer"
                      title="Test Function"
                    >
                      <FlaskConical className="w-4 h-4 mr-2" />
                      Test
                    </Button>
                  )}
                </div>
                {!initialFormatter && <Button variant="outline" size="sm" onClick={handleReset} className="cursor-pointer">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset All
                </Button>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showMainInterface && (
        <section className="flex-1 min-h-0">
          {/* Unified headers */}
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
                <h2 className="text-lg font-semibold">{INPUT_SAMPLE_NAME}</h2>
              </div>
            </div>

            {/* H2 */}
            {/* H2: Transform Instructions (title row + actions row) */}
            <div className="px-6 py-5 min-h-[72px]">
              <div className="grid grid-rows-[auto_auto] gap-2">
                {/* Row 1 — title */}
                <div className="flex items-center gap-2 min-w-0">
                  <Settings className="w-5 h-5 text-primary shrink-0" />
                  <h2 className="text-lg font-semibold truncate">Transform Instructions</h2>
                </div>
              </div>
            </div>


            {/* H3 */}
            <div className="px-6 py-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {mappedOutputValid === null ? (
                      <div className="w-5 h-5 bg-muted" />
                    ) : mappedOutputValid ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <h2 className="text-lg font-semibold">{OUTPUT_SAMPLE_NAME}</h2>
                  </div>
                  {/* {mappedOutput && (
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(mappedOutput)} className="cursor-pointer">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                  )} */}
                  <Button
                    variant="outline"
                    className="cursor-pointer"
                    title="View Mapper Code"
                    onClick={() => openArtifact(artifactIds?.mapper_code, "mapper_code.ts")}
                    disabled={!artifactIds?.mapper_code}
                  >
                    View <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Body row */}
          <div className="grid grid-cols-3 divide-x divide-border min-h-0 h-full">
            {/* Col 1 */}
            <div className="min-h-0 flex flex-col">
              <div className="p-6 space-y-4 flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="sample-response" className="text-base font-semibold">
                    JSON Response *
                  </Label>
                  <Textarea
                    id="sample-response"
                    placeholder={
                      selectedAPIData ? "Sample response loaded from API" : "Select an API first or paste JSON response"
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
                      className="p-0 h-auto font-normal text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <ChevronDown className={`w-4 h-4 mr-2 transition-transform ${showPreferences ? "rotate-180" : ""}`} />
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
                          <SelectItem value="snake_case" className="cursor-pointer">snake_case</SelectItem>
                          <SelectItem value="camelCase" className="cursor-pointer">camelCase</SelectItem>
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
                        className="cursor-pointer"
                      />
                      <Label htmlFor="disallow-additional" className="text-sm">Disallow additional properties</Label>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>

            {/* Col 2 */}
            <div className="min-h-0 flex flex-col">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto relative">
                <div className="space-y-2">
                  <Label htmlFor="mapping-instructions" className="text-base font-semibold">
                    Step-by-step Instructions *
                  </Label>
                  <InstructionEditor
                    mappingInstructions={mappingInstructions}
                    setMappingInstructions={(inst) => {
                      setMappingInstructions(inst);
                    }}
                    inputSampleData={safeParse(sampleResponse) || undefined}
                    outputSampleData={safeParse(mappedOutput) || undefined}
                    onMentionsChange={(mentions) => {
                      setSelectedMentions(mentions);
                    }}
                  />
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
                      <Button onClick={handleTestFunction} disabled={!sampleResponse} size="sm" variant="outline" className="cursor-pointer">
                        <FlaskConical className="w-4 h-4 mr-2" />
                        Test Function
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Col 3 */}
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
                      {/* <Textarea
                        value={mappedOutput}
                        readOnly
                        className="font-mono text-sm resize-none overflow-auto w-full flex-1 min-h-0"
                      /> */}
                      <Textarea
                        id="sample-response"
                        placeholder={
                          "Sample output"
                        }
                        value={mappedOutput}
                        onChange={(e) => setMappedOutput(e.target.value)}
                        onBlur={handleSampleOutputBlur}
                        spellCheck={false}
                        className={`font-mono text-sm resize-none overflow-auto w-full
                      min-h-[300px] max-h-[calc(100vh-320px)]
                      ${mappedOutputValid === false
                            ? "border-red-500 focus:border-red-500"
                            : mappedOutputValid === true
                              ? "border-green-500"
                              : ""}`}
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
                          Add sample response and instructions, then click Preview to see transformation
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
            <AlertDialogCancel onClick={cancelAPIChange} className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAPIChange} className="bg-red-600 hover:bg-red-700 cursor-pointer">
              Change API & Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CodeRunnerDialog
        open={showFunctionPopup}
        onOpenChange={setShowFunctionPopup}
        files={artifactFiles}
        formatterId={schemaGenerateResponse?.formatter?.id || initialFormatter?.formatter_id || ""}
        apiId={selectedAPIData?.id || ""}
        sampleRequest={sampleResponse}
        inferArtifactType={inferArtifactType}
        onSave={async ({ artifactId, fileName, content, formatterId, apiId }: any) => {
          const res = await fetch(api(`/api/artifacts/${artifactId}/content`), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artifactId, fileName, content, formatterId, apiId }),
          });
          if (!res.ok) throw new Error(`Save failed (${res.status})`);
          return { ok: true, message: "Saved successfully" };
        }}
      />

      {/* Test modal */}
      <TestFunctionPro
        open={showTestPopup}
        onOpenChange={setShowTestPopup}
        testInput={testInput}
        onChangeTestInput={setTestInput}
        testOutput={testOutput}
        isTesting={isTesting}
        onExecute={executeTest}
        logs={logs}
      />

    </div>
  )
}