"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import DashboardHeader from "@/components/dashboard-header"
import ChatbotInterface from "@/components/chatbot-interface"
import { useRef } from 'react'
import EmailInterface from "@/components/email-interface"
import EmailFilterPanel from "@/components/email-filter-panel"
import SplashScreen from "@/components/splash-screen";

// Keep the same Email interface
interface Email {
  id: string
  sender: string
  subject: string
  preview: string
  content: string
  timestamp: string
  hasAttachment: boolean
  isStarred: boolean
  isUnread: boolean
  category: string
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State for real email data
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [prevPageTokens, setPrevPageTokens] = useState<string[]>([]);
  const [pageSize] = useState(20);
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null);
  const [filtersState, setFiltersState] = useState<any>(null);

  const [selectedFilter, setSelectedFilter] = useState("all")
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [chatbotAction, setChatbotAction] = useState<{
    type: "summary" | "reply" | "planifier" | "archiver" | null
    emails: Email[]
  }>({ type: null, emails: [] })
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null)
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  // Fetch real emails when the component mounts and session is ready
  // Unified fetch function that accepts filters and pageToken
  const fetchEmails = async (opts?: { pageToken?: string | null; filters?: any }) => {
    if (status !== "authenticated") return;
    setIsLoadingEmails(true);
    try {
      const params = new URLSearchParams();
      const f = opts?.filters ?? filtersState;
      if (f) {
        if (f.subject) params.append("subject", f.subject);
        if (f.containsWords) params.append("contains", f.containsWords);
        if (f.singleDate) params.append("singleDate", f.singleDate);
        if (f.dateRange?.start) params.append("dateStart", f.dateRange.start);
        if (f.dateRange?.end) params.append("dateEnd", f.dateRange.end);
        if (f.customFilters && f.customFilters.length > 0) {
          const senders = f.customFilters.map((c: any) => c.value).filter(Boolean).join(",");
          if (senders) params.append("senders", senders);
        }
      }
      if (opts?.pageToken) params.append("pageToken", opts.pageToken);

      const response = await fetch(`/api/emails?${params.toString()}`);
      if (!response.ok) {
        let details: any = null;
        try { details = await response.json(); } catch (e) { details = await response.text(); }
        console.error("/api/emails returned error:", response.status, details);
        if (response.status === 401) {
          console.warn("Authentication issue detected, redirecting to sign in...");
          signIn("google");
          return;
        }
        throw new Error("Failed to fetch emails");
      }
      const data = await response.json();
      setEmails(data.emails || []);
      setNextPageToken(data.nextPageToken || null);
      setCurrentPageToken(opts?.pageToken ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  useEffect(() => {
    // initial load
    if (status === "authenticated") {
      fetchEmails({ pageToken: null, filters: null });
    }
  }, [status]);

  // Resizable splitter state
  const containerRef = useRef<HTMLDivElement | null>(null)
  const resizingRef = useRef(false)
  const [leftWidth, setLeftWidth] = useState<number>(50) // percent

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left
      let pct = Math.round((x / rect.width) * 100)
      pct = Math.max(25, Math.min(75, pct))
      setLeftWidth(pct)
    }
    const handleMouseUp = () => { resizingRef.current = false }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const loadNextPage = async () => {
    if (!nextPageToken) return;
    // push current page token to prev stack (could be null)
    setPrevPageTokens((p) => [...p, currentPageToken || ""]);
    await fetchEmails({ pageToken: nextPageToken });
  }

  const loadPrevPage = async () => {
    const copy = [...prevPageTokens];
    if (copy.length === 0) return;
    const prev = copy.pop();
    setPrevPageTokens(copy);
    await fetchEmails({ pageToken: prev || null });
  }

  const applyFilters = async (filters: any) => {
    setFiltersState(filters);
    // reset paging
    setPrevPageTokens([]);
    setCurrentPageToken(null);
    setNextPageToken(null);
    await fetchEmails({ pageToken: null, filters });
  }


  const handleEmailsSelect = (emailIds: string[]) => {
    setSelectedEmails(emailIds)
  }

  const handleSummaryRequest = (selectedEmailsForAction: Email[]) => {
    // Ensure we have full email content and attachments before handing off to the chatbot
    ;(async () => {
      const fullEmails = await fetchFullEmails(selectedEmailsForAction)
      setChatbotAction({ type: "summary", emails: fullEmails })
    })()
  }

  const handleReplyRequest = (selectedEmailsForAction: Email[]) => {
    ;(async () => {
      const fullEmails = await fetchFullEmails(selectedEmailsForAction)
      setChatbotAction({ type: "reply", emails: fullEmails })
    })()
  }

  const handlePlanifierRequest = (selectedEmailsForAction: Email[]) => {
    ;(async () => {
      const fullEmails = await fetchFullEmails(selectedEmailsForAction)
      setChatbotAction({ type: "planifier", emails: fullEmails })
    })()
  }

  const handleArchiverRequest = (selectedEmailsForAction: Email[]) => {
    ;(async () => {
      const fullEmails = await fetchFullEmails(selectedEmailsForAction)
      setChatbotAction({ type: "archiver", emails: fullEmails })
    })()
  }

  const handleDeleteRequest = (selectedEmailsForAction: Email[]) => {
    ;(async () => {
      try {
        const ids = selectedEmailsForAction.map((e) => e.id)
        console.debug('[delete] sending ids:', ids)
        const res = await fetch('/api/emails', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) })
        if (!res.ok) {
          let details: any = null;
          const text = await res.text();
          try { details = JSON.parse(text); } catch (e) { details = text }
          console.error('Failed to delete emails', res.status, details);
          console.debug('[delete] raw response text:', text)
          if (res.status === 401) {
            signIn('google');
            return;
          }
          return;
        }

        // On success, clear selection and refresh list
        setSelectedEmails([])
        setCurrentEmail(null)
        await fetchEmails({ pageToken: currentPageToken })
      } catch (err) {
        console.error('Error deleting emails', err)
      }
    })()
  }

  // Helper: For each email that lacks full content or attachments, fetch details from the server
  const fetchFullEmails = async (emailsToFetch: Email[]) => {
    const promises = emailsToFetch.map(async (e) => {
      try {
        if (e.content && e.content.trim().length > 0) return e
        const res = await fetch(`/api/emails/${e.id}`)
        if (!res.ok) {
          console.warn(`Failed to fetch full email ${e.id}:`, res.status)
          return e
        }
        const data = await res.json()
        return {
          ...e,
          content: data.body || e.content,
          attachments: data.attachments || (e as any).attachments || [],
          sender: data.from || e.sender,
        }
      } catch (err) {
        console.error('Error fetching email details for', e.id, err)
        return e
      }
    })
    return Promise.all(promises)
  }

  const handleEmailClick = (email: Email) => {
    setCurrentEmail(email)
  }

  // Show a loading screen while session is loading or emails are fetching
  if (status === "loading" || (status === "authenticated" && isLoadingEmails && emails.length === 0)) {
      return <SplashScreen />;
  }
  
  if (!session) {
      return null; // Or a redirect component
  }

  
  return (
    <div className="min-h-screen bg-secondary flex flex-col">
      {/* Header */}
      <DashboardHeader
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
        onFilterPanelToggle={() => setIsFilterPanelOpen(true)}
      />

      {/* EmailFilterPanel */}
      <EmailFilterPanel
        isOpen={isFilterPanelOpen}
        onClose={() => setIsFilterPanelOpen(false)}
        onApplyFilters={applyFilters}
      />

  <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden min-h-0">
    {/* Left Section - Email Interface (resizable) */}
  <div style={{ flexBasis: `${leftWidth}%` }} className="w-full flex flex-col h-full min-w-0">
          <EmailInterface
            emails={emails} // Pass real emails
            isLoading={isLoadingEmails} // Pass loading state
            filter={selectedFilter}
            selectedEmails={selectedEmails}
            onEmailsSelect={handleEmailsSelect}
            onSummaryRequest={handleSummaryRequest}
            onReplyRequest={handleReplyRequest}
            onPlanifierRequest={handlePlanifierRequest}
            onDeleteRequest={handleDeleteRequest}
            onArchiverRequest={handleArchiverRequest}
            onEmailClick={handleEmailClick}
            onNextPage={loadNextPage}
            onPrevPage={loadPrevPage}
            hasNextPage={!!nextPageToken}
            hasPrevPage={prevPageTokens.length > 0}
          />
        </div>
        {/* Splitter (visible on large screens) */}
        <div
          className="hidden lg:block w-2 cursor-col-resize select-none"
          onMouseDown={() => { resizingRef.current = true }}
          style={{ background: 'transparent' }}
        />

        {/* Right Section - Chatbot */}
        <div style={{ flexBasis: `${100 - leftWidth}%` }} className="w-full flex flex-col h-full min-w-0">
            <ChatbotInterface
              chatbotAction={chatbotAction}
              onActionComplete={() => setChatbotAction({ type: null, emails: [] })}
              currentEmail={currentEmail}
            />
        </div>
      </div>
    </div>
  )
}