"use client"

import { useState } from "react"
import { X, Plus, Calendar, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CustomFilter {
  id: string
  type: "sender"
  value: string
}

interface EmailFilterPanelProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: any) => void
}

export default function EmailFilterPanel({ isOpen, onClose, onApplyFilters }: EmailFilterPanelProps) {
  const [subject, setSubject] = useState("")
  const [containsWords, setContainsWords] = useState("")
  const [singleDate, setSingleDate] = useState("")
  const [dateRangeStart, setDateRangeStart] = useState("")
  const [dateRangeEnd, setDateRangeEnd] = useState("")
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([])

  const addCustomFilter = () => {
    setCustomFilters([...customFilters, { id: Date.now().toString(), type: "sender", value: "" }])
  }

  const removeCustomFilter = (id: string) => {
    setCustomFilters(customFilters.filter((f) => f.id !== id))
  }

  const updateCustomFilter = (id: string, value: string) => {
    setCustomFilters(customFilters.map((f) => (f.id === id ? { ...f, value } : f)))
  }

  const handleApplyFilters = () => {
    const filters = {
      subject,
      containsWords,
      singleDate,
      dateRange: dateRangeStart && dateRangeEnd ? { start: dateRangeStart, end: dateRangeEnd } : null,
      customFilters,
    }
    onApplyFilters(filters)
    onClose()
  }

  const handleReset = () => {
    setSubject("")
    setContainsWords("")
    setSingleDate("")
    setDateRangeStart("")
    setDateRangeEnd("")
    setCustomFilters([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 px-4">
      <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
        <CardHeader className="border-b border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Filter className="w-5 h-5 text-primary-foreground" />
              </div>
              <span>Filtres avancés</span>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Subject Filter */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-semibold text-foreground">
              Objet
            </Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Filtrer par objet de l'email..."
              className="w-full"
            />
          </div>

          {/* Contains Words Filter */}
          <div className="space-y-2">
            <Label htmlFor="contains" className="text-sm font-semibold text-foreground">
              Contient les mots
            </Label>
            <Input
              id="contains"
              value={containsWords}
              onChange={(e) => setContainsWords(e.target.value)}
              placeholder="Rechercher des mots-clés spécifiques..."
              className="w-full"
            />
          </div>

          {/* Single Date Filter */}
          <div className="space-y-2">
            <Label htmlFor="single-date" className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              id="single-date"
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Plage de dates
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                  Date de début
                </Label>
                <Input
                  id="date-start"
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-end" className="text-xs text-muted-foreground">
                  Date de fin
                </Label>
                <Input
                  id="date-end"
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-foreground">Expéditeur</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={addCustomFilter}
                className="gap-2 text-primary border-primary hover:bg-primary/10 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                Ajouter un expéditeur
              </Button>
            </div>

            {customFilters.length > 0 && (
              <div className="space-y-3">
                {customFilters.map((filter) => (
                  <div key={filter.id} className="flex gap-2 items-center p-3 bg-secondary rounded-lg">
                    <Input
                      value={filter.value}
                      onChange={(e) => updateCustomFilter(filter.id, e.target.value)}
                      placeholder="Adresse email de l'expéditeur..."
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomFilter(filter.id)}
                      className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleReset} className="flex-1 bg-transparent">
              Réinitialiser
            </Button>
            <Button
              onClick={handleApplyFilters}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Appliquer les filtres
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
