"use client"

import { useState, useRef, useEffect } from "react"
import {
  Mail,
  Star,
  Paperclip,
  Clock,
  Search,
  X,
  FileText,
  Reply,
  ArrowLeft,
  CheckSquare,
  Calendar,
  Archive,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

// Define the structure for an attachment
interface Attachment {
  filename: string;
  mimeType: string;
  data: string; // Base64 encoded string
}

// Update the Email interface to include attachments
interface Email {
  id: string
  sender: string
  subject: string
  preview: string
  content: string // This will now be populated on-demand
  timestamp: string
  hasAttachment: boolean
  isStarred: boolean
  isUnread: boolean
  category: string
  attachments?: Attachment[]; // Optional array of attachments
}

interface EmailInterfaceProps {
  emails: Email[];
  isLoading: boolean;
  filter: string
  selectedEmails: string[]
  onEmailsSelect: (emailIds: string[]) => void
  onSummaryRequest: (emails: Email[]) => void
  onReplyRequest: (emails: Email[]) => void
  onPlanifierRequest?: (emails: Email[]) => void
  onDeleteRequest?: (emails: Email[]) => void
  onArchiverRequest?: (emails: Email[]) => void
  onEmailClick?: (email: Email) => void
  onNextPage?: () => void
  onPrevPage?: () => void
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export default function EmailInterface({
  emails,
  isLoading,
  filter,
  selectedEmails,
  onEmailsSelect,
  onSummaryRequest,
  onReplyRequest,
  onPlanifierRequest,
  onDeleteRequest,
  onArchiverRequest,
  onEmailClick,
  onNextPage,
  onPrevPage,
  hasNextPage,
  hasPrevPage,
}: EmailInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null)
  const [isViewingEmailLoading, setIsViewingEmailLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Email[]>([])
  const listRef = useRef<HTMLDivElement | null>(null)
  const sliderRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const itemSampleRef = useRef<HTMLDivElement | null>(null)
  const [listHeightStyle, setListHeightStyle] = useState<string | undefined>(undefined)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current || !listRef.current || !sliderRef.current) return
      const sliderRect = sliderRef.current.getBoundingClientRect()
      const containerRect = listRef.current.getBoundingClientRect()
      const y = e.clientY - containerRect.top
      const maxScroll = listRef.current.scrollHeight - listRef.current.clientHeight
      const ratio = Math.max(0, Math.min(1, y / containerRect.height))
      listRef.current.scrollTop = Math.round(maxScroll * ratio)
      // move slider thumb
      const thumb = sliderRef.current.querySelector('.slider-thumb') as HTMLElement | null
      if (thumb) thumb.style.top = `${ratio * 100}%`
    }
    const onUp = () => { draggingRef.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      email.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // recompute heights and thumb size (placed after filteredEmails so we can read its length)
  const recomputeLayout = () => {
    const listEl = listRef.current
    const sliderEl = sliderRef.current
    if (!listEl || !sliderEl) return

    // If we have a sample item, compute its height
    const sample = itemSampleRef.current
    let itemH = 72 // fallback estimate
    if (sample) {
      const r = sample.getBoundingClientRect()
      itemH = Math.max(40, Math.round(r.height))
    } else {
      // try to find first child
      const first = listEl.querySelector('[data-email-item]') as HTMLElement | null
      if (first) itemH = Math.max(40, Math.round(first.getBoundingClientRect().height))
    }

    if (filteredEmails.length > 4) {
      const desired = itemH * 4
      setListHeightStyle(`${desired}px`)
    } else {
      setListHeightStyle(undefined)
    }

    // compute thumb size proportionally
    const visible = listEl.clientHeight
    const total = listEl.scrollHeight || Math.max(listEl.scrollHeight, visible)
    const thumb = sliderEl.querySelector('.slider-thumb') as HTMLElement | null
    if (thumb) {
      const ratio = total > 0 ? Math.max(0.05, Math.min(1, visible / total)) : 1
      const thumbH = Math.max(28, Math.round(ratio * sliderEl.getBoundingClientRect().height))
      thumb.style.height = `${thumbH}px`
    }
  }

  useEffect(() => {
    recomputeLayout()
    const ro = new ResizeObserver(() => recomputeLayout())
    if (listRef.current) ro.observe(listRef.current)
    if (sliderRef.current) ro.observe(sliderRef.current)
    window.addEventListener('resize', recomputeLayout)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recomputeLayout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEmails.length, isLoading])

  const handleSelectEmail = (emailId: string) => {
    if (selectedEmails.includes(emailId)) {
      onEmailsSelect(selectedEmails.filter((id) => id !== emailId))
    } else {
      onEmailsSelect([...selectedEmails, emailId])
    }
  }

  const handleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length) {
      onEmailsSelect([])
    } else {
      onEmailsSelect(filteredEmails.map((e) => e.id))
    }
  }

  const handleBatchSummary = () => {
    const selected = emails.filter((e) => selectedEmails.includes(e.id))
    onSummaryRequest(selected)
  }

  const handleBatchReply = () => {
    const selected = emails.filter((e) => selectedEmails.includes(e.id))
    onReplyRequest(selected)
  }

  const handleBatchDelete = () => {
    const selected = emails.filter((e) => selectedEmails.includes(e.id))
    if (onDeleteRequest) {
      setPendingDelete(selected)
      setDeleteDialogOpen(true)
    }
  }

  const handleBatchArchiver = () => {
    const selected = emails.filter((e) => selectedEmails.includes(e.id))
    if (onArchiverRequest) {
      onArchiverRequest(selected)
    }
  }

  // This now fetches the full email content when a user clicks
  const handleViewEmail = async (email: Email) => {
    // Set the basic email details immediately for a fast UI response
    setViewingEmail(email);
    setIsViewingEmailLoading(true);

    if (onEmailClick) {
      onEmailClick(email);
    }

    try {
      const response = await fetch(`/api/emails/${email.id}`);
      if (!response.ok) {
        let details: any = null;
        try { details = await response.json(); } catch (e) { details = await response.text(); }
        console.error("Failed to fetch email details:", response.status, details);
        throw new Error("Failed to fetch email details");
      }
      const fullEmailData = await response.json();

      // Update the viewingEmail state with the full content and attachments and sender info
      setViewingEmail(prevEmail => prevEmail ? {
        ...prevEmail,
        content: fullEmailData.body || prevEmail.content,
        attachments: fullEmailData.attachments || prevEmail.attachments,
        sender: fullEmailData.from || prevEmail.sender,
      } : {
        ...email,
        content: fullEmailData.body || email.content,
        attachments: fullEmailData.attachments || email.attachments,
        sender: fullEmailData.from || email.sender,
      });

    } catch (error) {
      console.error("Error in handleViewEmail:", error);
    } finally {
      setIsViewingEmailLoading(false);
    }
  }

  // --- VIEW FOR A SINGLE EMAIL ---
  if (viewingEmail) {
    return (
      <Card className="h-full flex flex-col shadow-lg">
        <CardHeader className="border-b border-border bg-primary/5">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Button variant="ghost" size="icon" onClick={() => setViewingEmail(null)} className="mr-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <span>Détails de l'email</span>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setViewingEmail(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
          {/* Email Header */}
          <div className="space-y-3 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-foreground mb-2">{viewingEmail.subject}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{viewingEmail.sender}</span>
                  <span>•</span>
                  <span>{viewingEmail.timestamp}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {viewingEmail.isStarred && <Star className="w-5 h-5 text-primary fill-primary" />}
                <Badge variant="secondary">{viewingEmail.category}</Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
               <Button
                onClick={() => onSummaryRequest([viewingEmail])}
                className="btn btn-primary gap-2 flex-1 sm:flex-none"
              >
                <FileText className="w-4 h-4" />
                Résumer
              </Button>
              <Button
                onClick={() => onReplyRequest([viewingEmail])}
                className="btn btn-secondary gap-2 flex-1 sm:flex-none"
              >
                <Reply className="w-4 h-4" />
                Répondre
              </Button>
              <Button
                onClick={() => {
                  if (onDeleteRequest) {
                    setPendingDelete([viewingEmail])
                    setDeleteDialogOpen(true)
                  }
                }}
                className="btn btn-secondary gap-2 flex-1 sm:flex-none"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </Button>
              <Button
                onClick={() => onArchiverRequest && onArchiverRequest([viewingEmail])}
                className="btn btn-secondary gap-2 flex-1 sm:flex-none"
              >
                <Archive className="w-4 h-4" />
                Archiver
              </Button>
            </div>
          </div>

          {/* Email Content and Attachments */}
          <div className="flex-1 overflow-y-auto">
             {isViewingEmailLoading ? (
                 <div className="space-y-4 pt-2">
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-full" />
                     <Skeleton className="h-4 w-3/4" />
                 </div>
             ) : (
                <>
                    <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: viewingEmail.content || "Aucun contenu textuel trouvé." }}></div>
                    </div>

                    {viewingEmail.attachments && viewingEmail.attachments.length > 0 && (
                      <div className="mt-6 space-y-2">
                        <h4 className="font-semibold text-sm">Pièces jointes</h4>
                        {viewingEmail.attachments.map((att, index) => (
                           <a
                              key={index}
                              href={`data:${att.mimeType};base64,${att.data}`}
                              download={att.filename}
                              className="flex items-center gap-3 p-3 bg-secondary hover:bg-accent rounded-lg border border-border transition-colors"
                           >
                              <Paperclip className="w-5 h-5 text-primary" />
                              <div>
                                 <p className="text-sm font-semibold text-foreground">{att.filename}</p>
                              </div>
                           </a>
                        ))}
                      </div>
                    )}
                </>
             )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Confirmation dialog for delete actions
  const handleConfirmDelete = async () => {
    if (!onDeleteRequest) return
    try {
      setDeleteDialogOpen(false)
      onDeleteRequest(pendingDelete)
      setPendingDelete([])
    } catch (err) {
      console.error('Error during delete confirmation', err)
    }
  }

  const DeleteConfirmDialog = (
    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => setDeleteDialogOpen(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
          <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer {pendingDelete.length} email{pendingDelete.length > 1 ? 's' : ''} ? Cette action enverra les messages à la corbeille.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmDelete}>Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  // --- MAIN EMAIL LIST VIEW ---
  return (
    <>
      {DeleteConfirmDialog}
      <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="border-b border-border bg-primary/5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <span>Boîte de réception</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans les emails..."
            className="pl-10"
          />
        </div>

        {selectedEmails.length > 0 && (
          <div className="bg-primary/10 border border-primary rounded-lg p-3 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {selectedEmails.length} email{selectedEmails.length > 1 ? "s" : ""} sélectionné
                {selectedEmails.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
               <Button size="sm" onClick={handleBatchSummary} className="btn btn-primary gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Résumer</span>
              </Button>
              <Button size="sm" onClick={handleBatchReply} className="btn btn-secondary gap-2">
                <Reply className="w-4 h-4" />
                <span className="hidden sm:inline">Répondre</span>
              </Button>
              <Button size="sm" onClick={handleBatchDelete} className="btn btn-secondary gap-2">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Supprimer</span>
              </Button>
              <Button size="sm" onClick={handleBatchArchiver} className="btn btn-secondary gap-2">
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Archiver</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEmailsSelect([])}
                className="hover:bg-destructive/10 text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {filteredEmails.length > 0 && !isLoading && (
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Checkbox
              checked={selectedEmails.length === filteredEmails.length && filteredEmails.length > 0}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
              Tout sélectionner
            </label>
          </div>
        )}

        {/* Email List */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={listRef}
            className="email-list overflow-y-scroll h-full space-y-2"
            style={listHeightStyle ? { height: listHeightStyle } : {}}
            onScroll={(e: any) => {
              if (draggingRef.current || !sliderRef.current) return
              const el = e.target
              const maxScroll = el.scrollHeight - el.clientHeight
              const ratio = maxScroll > 0 ? el.scrollTop / maxScroll : 0
              const thumb = sliderRef.current.querySelector('.slider-thumb') as HTMLElement | null
              if (thumb) thumb.style.top = `${ratio * 100}%`
            }}
          >
            {/* Hidden sample used to measure item height */}
            <div ref={itemSampleRef} className="invisible h-0 overflow-hidden" aria-hidden>
              <div className="flex items-start gap-3 p-4 rounded-lg border">&nbsp;</div>
            </div>

            {isLoading ? (
              <div className="space-y-3 pt-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
                    <Skeleton className="h-5 w-5 rounded mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-4/5" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                       <Skeleton className="h-3 w-10" />
                       <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <Mail className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Aucun email trouvé</p>
              </div>
            ) : (
              filteredEmails.map((email) => (
                <div
                  key={email.id}
                  data-email-item
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                    selectedEmails.includes(email.id)
                      ? "bg-primary/10 border-primary"
                      : email.isUnread
                        ? "bg-background border-border hover:bg-accent"
                        : "bg-secondary border-border hover:bg-accent"
                  }`}
                >
                  <Checkbox
                    checked={selectedEmails.includes(email.id)}
                    onCheckedChange={() => handleSelectEmail(email.id)}
                    className="mt-1"
                  />
                  <button onClick={() => handleViewEmail(email)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`font-semibold text-sm truncate ${
                          email.isUnread ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {email.sender}
                      </span>
                      {email.isUnread && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>}
                    </div>
                    <h3
                      className={`text-sm mb-1 truncate ${
                        email.isUnread ? "font-semibold text-foreground" : "text-foreground"
                      }`}
                    >
                      {email.subject}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{email.preview}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {email.category}
                      </Badge>
                    </div>
                  </button>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {email.timestamp}
                    </span>
                    <div className="flex items-center gap-1">
                      {email.hasAttachment && <Paperclip className="w-4 h-4 text-muted-foreground" />}
                      {email.isStarred && <Star className="w-4 h-4 text-primary fill-primary" />}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vertical slider on the right of the list */}
          <div
            ref={sliderRef}
            className="email-slider absolute right-1 top-0 bottom-0 w-4 flex items-start"
            onMouseDown={(e) => {
              if (!listRef.current || !sliderRef.current) return
              const containerRect = listRef.current.getBoundingClientRect()
              const y = e.clientY - containerRect.top
              const maxScroll = listRef.current.scrollHeight - listRef.current.clientHeight
              const ratio = Math.max(0, Math.min(1, y / containerRect.height))
              listRef.current.scrollTop = Math.round(maxScroll * ratio)
              const thumb = sliderRef.current.querySelector('.slider-thumb') as HTMLElement | null
              if (thumb) thumb.style.top = `${ratio * 100}%`
            }}
          >
            <div
              className="slider-thumb bg-slate-400 dark:bg-slate-600 rounded w-2 absolute"
              style={{ height: '48px', top: '0%' }}
              onMouseDown={(e) => {
                e.stopPropagation()
                draggingRef.current = true
              }}
            />
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t">
          <Button size="sm" variant="ghost" onClick={() => onPrevPage && onPrevPage()} disabled={!onPrevPage || !hasPrevPage}>
            Précédent
          </Button>
          <div className="text-sm text-muted-foreground">Page size: 20</div>
          <Button size="sm" variant="ghost" onClick={() => onNextPage && onNextPage()} disabled={!hasNextPage}>
            Suivant
          </Button>
        </div>
      </CardContent>
    </Card>
    </>
  )
}