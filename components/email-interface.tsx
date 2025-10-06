"use client";

import { useState } from "react";
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
  Loader,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Attachment {
    filename: string;
    mimeType: string;
    size: number;
    data: string;
}

interface Email {
  id: string;
  sender: string;
  subject: string;
  preview: string;
  content: string; // This can be HTML or plain text
  timestamp: string;
  hasAttachment: boolean;
  isStarred: boolean;
  isUnread: boolean;
  category: string;
  attachments?: Attachment[];
}

interface EmailInterfaceProps {
  emails: Email[];
  isLoading: boolean;
  selectedEmails: string[];
  onEmailsSelect: (emailIds: string[]) => void;
  onSummaryRequest: (emails: Email[]) => void;
  onReplyRequest: (emails: Email[]) => void;
  onPlanifierRequest?: (emails: Email[]) => void;
  onArchiverRequest?: (emails: Email[]) => void;
  onEmailClick?: (email: Email) => void;
}

export default function EmailInterface({
  emails,
  isLoading,
  selectedEmails,
  onEmailsSelect,
  onSummaryRequest,
  onReplyRequest,
  onPlanifierRequest,
  onArchiverRequest,
  onEmailClick,
}: EmailInterfaceProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 4;

  const filteredEmails = emails.filter((email) => {
    const matchesSearch =
      (email.sender && email.sender.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (email.subject && email.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Pagination logic
  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = filteredEmails.slice(indexOfFirstEmail, indexOfLastEmail);
  const pageCount = Math.ceil(filteredEmails.length / emailsPerPage);

  const handleSelectEmail = (emailId: string) => {
    if (selectedEmails.includes(emailId)) {
      onEmailsSelect(selectedEmails.filter((id) => id !== emailId));
    } else {
      onEmailsSelect([...selectedEmails, emailId]);
    }
  };

  const handleSelectAll = () => {
    const currentEmailIds = currentEmails.map((e) => e.id);
    const allSelectedOnPage = currentEmailIds.every(id => selectedEmails.includes(id));

    if (allSelectedOnPage) {
      onEmailsSelect(selectedEmails.filter(id => !currentEmailIds.includes(id)));
    } else {
      const newSelection = [...new Set([...selectedEmails, ...currentEmailIds])];
      onEmailsSelect(newSelection);
    }
  };

  const handleBatchAction = (action: (emails: Email[]) => void) => {
    const selected = emails.filter((e) => selectedEmails.includes(e.id));
    action(selected);
  };

  const handleViewEmail = async (email: Email) => {
    setIsDetailLoading(true);
    setViewingEmail(email); // Show email structure immediately
    if (onEmailClick) {
      onEmailClick(email);
    }
    try {
      const response = await fetch(`/api/emails/${email.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch email details");
      }
      const fullEmailData = await response.json();
      setViewingEmail(fullEmailData); // Update with full content and attachments
    } catch (error) {
      console.error("Error fetching email details:", error);
      // Optionally show an error to the user
    } finally {
      setIsDetailLoading(false);
    }
  };
  
  const handlePageChange = (page: number) => {
    if (page > 0 && page <= pageCount) {
        setCurrentPage(page);
    }
  }


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
                <Button onClick={() => onSummaryRequest([viewingEmail])} className="btn btn-primary gap-2 flex-1 sm:flex-none">
                    <FileText className="w-4 h-4" /> Résumer
                </Button>
                <Button onClick={() => onReplyRequest([viewingEmail])} className="btn btn-secondary gap-2 flex-1 sm:flex-none">
                    <Reply className="w-4 h-4" /> Répondre
                </Button>
                {onPlanifierRequest && <Button onClick={() => onPlanifierRequest([viewingEmail])} className="btn btn-secondary gap-2 flex-1 sm:flex-none">
                    <Calendar className="w-4 h-4" /> Planifier
                </Button>}
                {onArchiverRequest && <Button onClick={() => onArchiverRequest([viewingEmail])} className="btn btn-secondary gap-2 flex-1 sm:flex-none">
                    <Archive className="w-4 h-4" /> Archiver
                </Button>}
            </div>
          </div>
          
          <ScrollArea className="flex-1">
             {isDetailLoading ? (
                <div className="space-y-4 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
             ) : (
                <>
                    <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: viewingEmail.content || "" }} />
                    {viewingEmail.attachments && viewingEmail.attachments.length > 0 && (
                        <div className="mt-6">
                            <h4 className="font-semibold mb-3">Pièces jointes</h4>
                            <div className="space-y-2">
                                {viewingEmail.attachments.map((att, index) => (
                                    <a
                                        key={index}
                                        href={`data:${att.mimeType};base64,${att.data}`}
                                        download={att.filename}
                                        className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border hover:bg-accent transition-colors"
                                    >
                                        <Paperclip className="w-5 h-5 text-primary" />
                                        <div>
                                            <p className="text-sm font-semibold text-primary hover:underline">{att.filename}</p>
                                            <p className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}
                </>
             )}
          </ScrollArea>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col shadow-lg">
      <CardHeader className="border-b border-border bg-primary/5">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-primary-foreground" />
          </div>
          <span>Boîte de réception</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
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
              <Button size="sm" onClick={() => handleBatchAction(onSummaryRequest)} className="btn btn-primary gap-2">
                <FileText className="w-4 h-4" /> <span className="hidden sm:inline">Résumer</span>
              </Button>
              <Button size="sm" onClick={() => handleBatchAction(onReplyRequest)} className="btn btn-secondary gap-2">
                <Reply className="w-4 h-4" /> <span className="hidden sm:inline">Répondre</span>
              </Button>
              {onPlanifierRequest && <Button size="sm" onClick={() => handleBatchAction(onPlanifierRequest)} className="btn btn-secondary gap-2">
                <Calendar className="w-4 h-4" /> <span className="hidden sm:inline">Planifier</span>
              </Button>}
              {onArchiverRequest && <Button size="sm" onClick={() => handleBatchAction(onArchiverRequest)} className="btn btn-secondary gap-2">
                <Archive className="w-4 h-4" /> <span className="hidden sm:inline">Archiver</span>
              </Button>}
              <Button size="sm" variant="ghost" onClick={() => onEmailsSelect([])} className="hover:bg-destructive/10 text-destructive">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {filteredEmails.length > 0 && !isLoading && (
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Checkbox
              checked={currentEmails.length > 0 && currentEmails.every(e => selectedEmails.includes(e.id))}
              onCheckedChange={handleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
              Sélectionner la page
            </label>
          </div>
        )}

        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg border">
                    <Skeleton className="h-5 w-5 rounded-sm mt-1" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-6 w-1/4" />
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
            <div className="space-y-2">
              {currentEmails.map((email) => (
                <div
                  key={email.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                    selectedEmails.includes(email.id)
                      ? "bg-primary/10 border-primary"
                      : email.isUnread
                        ? "bg-background border-border hover:bg-accent"
                        : "bg-secondary/50 border-border hover:bg-accent"
                  }`}
                >
                  <Checkbox
                    checked={selectedEmails.includes(email.id)}
                    onCheckedChange={() => handleSelectEmail(email.id)}
                    className="mt-1 flex-shrink-0"
                  />
                  <button onClick={() => handleViewEmail(email)} className="flex-1 min-w-0 text-left">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`font-semibold text-sm truncate ${email.isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                                    {email.sender}
                                </span>
                                {email.isUnread && <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></span>}
                            </div>
                            <h3 className={`text-sm mb-1 truncate ${email.isUnread ? "font-semibold text-foreground" : "text-foreground"}`}>
                                {email.subject}
                            </h3>
                        </div>
                         <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                            {email.hasAttachment && <Paperclip className="w-4 h-4 text-muted-foreground" />}
                            {email.isStarred && <Star className="w-4 h-4 text-primary fill-primary" />}
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {email.timestamp}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{email.preview}</p>
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {pageCount > 1 && (
            <div className="pt-4 border-t">
                <Pagination>
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} />
                        </PaginationItem>
                        {[...Array(pageCount)].map((_, i) => (
                             <PaginationItem key={i}>
                                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }} isActive={currentPage === i + 1}>
                                    {i + 1}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }}/>
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

