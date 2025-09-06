// components/gpx-import.tsx
"use client"

import type React from "react"
import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { ImportOptions, Route } from "@/lib/types"
import { gpxStorage } from "@/lib/storage/db"

interface ImportFile {
  id: string
  file: File
  status: "pending" | "processing" | "success" | "error"
  progress: number
  error?: string
  routes?: Route[]
}

interface GPXImportProps {
  onImportComplete?: (routes: Route[]) => void
}

export function GPXImport({ onImportComplete }: GPXImportProps) {
  const [files, setFiles] = useState<ImportFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [options, setOptions] = useState<ImportOptions>({
    colorMode: "auto",
    defaultColor: "#15803d",
      periodGrouping: "month",
      mergeIdenticalTracks: false,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<Worker | null>(null)

  const handleWorkerMessage = useCallback((event: MessageEvent) => {
    const { id, type, data } = event.data
    setFiles(prev =>
    prev.map(file => {
      if (file.id !== id) return file
        if (type === "parse-success") return { ...file, status: "success", progress: 100, routes: data.routes }
        if (type === "parse-error")   return { ...file, status: "error",   progress: 0,   error: data.error }
        return file
    }),
    )
  }, [])

  const initWorker = useCallback((): Worker | null => {
    if (workerRef.current) return workerRef.current
      try {
        // gebündelter Worker aus /public
        const w = new Worker("/parse.worker.js", { type: "module" })
        w.onmessage = handleWorkerMessage
        workerRef.current = w
        return w
      } catch (error) {
        console.error("[GPX Import] Worker init failed:", error)
        alert("Fehler beim Initialisieren des GPX-Parsers. Bitte Seite neu laden.")
        return null
      }
  }, [handleWorkerMessage])

  useEffect(() => {
    return () => {
      try { workerRef.current?.terminate() } finally { workerRef.current = null }
    }
  }, [])

  const processFile = useCallback(
    async (importFile: ImportFile) => {
      const worker = initWorker()
      setFiles(prev => prev.map(f => (f.id === importFile.id ? { ...f, status: "processing", progress: 10 } : f)))

      if (!worker) {
        setFiles(prev => prev.map(f => (f.id === importFile.id ? {
          ...f, status: "error", progress: 0, error: "Worker nicht verfügbar"
        } : f)))
        return
      }

      try {
        const content = await importFile.file.text()
        setFiles(prev => prev.map(f => (f.id === importFile.id ? { ...f, progress: 50 } : f)))

        worker.postMessage({
          id: importFile.id,
          type: "parse-gpx",
          data: { content, filename: importFile.file.name, options },
        })
      } catch (error) {
        setFiles(prev => prev.map(f => (f.id === importFile.id ? {
          ...f,
          status: "error",
          progress: 0,
          error: error instanceof Error ? error.message : "Failed to read file",
        } : f)))
      }
    },
    [options, initWorker],
  )

  const handleFiles = useCallback((fileList: FileList) => {
    const gpxFiles = Array.from(fileList).filter(
      file => file.name.toLowerCase().endsWith(".gpx") || file.type === "application/gpx+xml",
    )
    if (gpxFiles.length === 0) {
      alert("Bitte wählen Sie GPX-Dateien aus.")
      return
    }
    const now = Date.now()
    const newFiles: ImportFile[] = gpxFiles.map((file, idx) => ({
      id: `${now}-${idx}-${Math.random().toString(36).slice(2, 9)}`,
                                                                file,
                                                                status: "pending",
                                                                progress: 0,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files)
  }, [handleFiles])

  const startProcessing = useCallback(async () => {
    setIsProcessing(true)
    const pendingFiles = files.filter(f => f.status === "pending")
    for (const file of pendingFiles) {
      await processFile(file)
      await new Promise(r => setTimeout(r, 100))
    }
    setIsProcessing(false)
  }, [files, processFile])

  const saveToDatabase = useCallback(async () => {
    const successfulFiles = files.filter(f => f.status === "success" && f.routes)
    const allRoutes = successfulFiles.flatMap(f => f.routes || [])
    if (allRoutes.length === 0) return
      try {
        await gpxStorage.addRoutes(allRoutes)
        onImportComplete?.(allRoutes)
        setFiles(prev => prev.filter(f => f.status !== "success"))
      } catch (error) {
        console.error("Failed to save routes:", error)
        alert("Fehler beim Speichern der Routen.")
      }
  }, [files, onImportComplete])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }, [])

  const clearAll = useCallback(() => setFiles([]), [])

  const pendingCount = files.filter(f => f.status === "pending").length
  const processingCount = files.filter(f => f.status === "processing").length
  const successCount = files.filter(f => f.status === "success").length
  const errorCount = files.filter(f => f.status === "error").length

  return (
    <div className="space-y-6">
    <Card>
    <CardHeader>
    <CardTitle className="font-heading">Import-Einstellungen</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
    <Label>Zeitraum-Gruppierung</Label>
    <Select
    value={options.periodGrouping}
    onValueChange={(value: "week" | "month" | "year") =>
      setOptions(prev => ({ ...prev, periodGrouping: value }))
    }
    >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
    <SelectItem value="week">Woche</SelectItem>
    <SelectItem value="month">Monat</SelectItem>
    <SelectItem value="year">Jahr</SelectItem>
    </SelectContent>
    </Select>
    </div>

    <div className="space-y-2">
    <Label>Farbmodus</Label>
    <Select
    value={options.colorMode}
    onValueChange={(value: "auto" | "manual") =>
      setOptions(prev => ({ ...prev, colorMode: value }))
    }
    >
    <SelectTrigger><SelectValue /></SelectTrigger>
    <SelectContent>
    <SelectItem value="auto">Automatisch</SelectItem>
    <SelectItem value="manual">Manuell</SelectItem>
    </SelectContent>
    </Select>
    </div>
    </div>

    {options.colorMode === "manual" && (
      <div className="space-y-2">
      <Label>Standard-Farbe</Label>
      <Input
      type="color"
      value={options.defaultColor}
      onChange={e => setOptions(prev => ({ ...prev, defaultColor: e.target.value }))}
      className="w-20 h-10"
      />
      </div>
    )}

    <div className="flex items-center space-x-2">
    <Switch
    id="merge-tracks"
    checked={options.mergeIdenticalTracks}
    onCheckedChange={checked =>
      setOptions(prev => ({ ...prev, mergeIdenticalTracks: checked }))
    }
    />
    <Label htmlFor="merge-tracks">Identische Tracks zusammenführen</Label>
    </div>
    </CardContent>
    </Card>

    <Card>
    <CardContent className="p-6">
    <div
    className={cn(
      "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
      isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
    )}
    onDrop={handleDrop}
    onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
    onDragLeave={() => setIsDragOver(false)}
    >
    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
    <h3 className="text-lg font-semibold mb-2 font-heading">GPX-Dateien importieren</h3>
    <p className="text-muted-foreground mb-4">Dateien hier ablegen oder klicken zum Auswählen</p>
    <Button onClick={() => fileInputRef.current?.click()}>Dateien auswählen</Button>
    <input
    ref={fileInputRef}
    type="file"
    multiple
    accept=".gpx,application/gpx+xml"
    onChange={handleFileSelect}
    className="hidden"
    />
    </div>
    </CardContent>
    </Card>

    {files.length > 0 && (
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="font-heading">Dateien ({files.length})</CardTitle>
      <div className="flex gap-2">
      {pendingCount > 0 && (
        <Button onClick={startProcessing} disabled={isProcessing} size="sm">
        {isProcessing ? "Verarbeitung..." : "Verarbeiten"}
        </Button>
      )}
      {successCount > 0 && (
        <Button onClick={saveToDatabase} variant="default" size="sm">
        Speichern ({successCount})
        </Button>
      )}
      <Button onClick={clearAll} variant="outline" size="sm">
      Alle entfernen
      </Button>
      </div>
      </CardHeader>
      <CardContent className="space-y-3">
      {files.map(file => (
        <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
        <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
        <span className="font-medium truncate">{file.file.name}</span>
        <Badge
        variant={
          file.status === "success" ? "default"
          : file.status === "error" ? "destructive"
          : file.status === "processing" ? "secondary"
          : "outline"
        }
        >
        {file.status === "pending" && "Wartend"}
        {file.status === "processing" && "Verarbeitung"}
        {file.status === "success" && "Erfolgreich"}
        {file.status === "error" && "Fehler"}
        </Badge>
        </div>

        <div className="text-sm text-muted-foreground">
        {(file.file.size / 1024 / 1024).toFixed(1)} MB
        {file.routes && ` • ${file.routes.length} Route(n)`}
        </div>

        {file.status === "processing" && <Progress value={file.progress} className="mt-2" />}

        {file.error && <div className="text-sm text-destructive mt-1">{file.error}</div>}
        </div>

        <div className="flex items-center gap-2">
        {file.status === "success" && <CheckCircle className="h-5 w-5 text-green-600" />}
        {file.status === "error" && <AlertCircle className="h-5 w-5 text-destructive" />}
        <Button variant="ghost" size="sm" onClick={() => removeFile(file.id)}>
        <X className="h-4 w-4" />
        </Button>
        </div>
        </div>
      ))}
      </CardContent>
      </Card>
    )}

    {files.length > 0 && (
      <div className="flex gap-4 text-sm text-muted-foreground">
      {pendingCount > 0 && <span>{pendingCount} wartend</span>}
      {processingCount > 0 && <span>{processingCount} in Verarbeitung</span>}
      {successCount > 0 && <span className="text-green-600">{successCount} erfolgreich</span>}
      {errorCount > 0 && <span className="text-destructive">{errorCount} Fehler</span>}
      </div>
    )}
    </div>
  )
}
