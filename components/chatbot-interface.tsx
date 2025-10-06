"use client"

import { useState, useEffect, useRef } from "react"
import {
  Send,
  Bot,
  Calendar,
  Archive,
  Languages,
  CheckSquare,
  Sparkles,
  FileText,
  Reply,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  id: string
  type: "user" | "bot"
  content: string
  timestamp: Date
}

interface Email {
  id: string
  sender: string
  subject: string
  content: string
}

interface ChatbotInterfaceProps {
  chatbotAction: {
    type: "summary" | "reply" | "planifier" | "archiver" | null
    emails: Email[]
  }
  onActionComplete: () => void
  currentEmail: Email | null
}

interface EmailConversation {
  [emailId: string]: Message[]
}

export default function ChatbotInterface({ chatbotAction, onActionComplete, currentEmail }: ChatbotInterfaceProps) {
  const [emailConversations, setEmailConversations] = useState<EmailConversation>({})
  const [currentEmailId, setCurrentEmailId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content: "Bonjour! Je suis votre assistant intelligent Orange. Comment puis-je vous aider aujourd'hui?",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [showMeetingPermission, setShowMeetingPermission] = useState(false)
  const [pendingMeetingAction, setPendingMeetingAction] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const suggestions = [
    {
      icon: FileText,
      title: "Résumer un email",
      description: "Générer un résumé concis de l'email sélectionné",
    },
    {
      icon: Reply,
      title: "Rédiger une réponse",
      description: "Créer un brouillon de réponse intelligent",
    },
    {
      icon: Calendar,
      title: "Planifier une réunion",
      description: "Proposer et planifier des réunions en fonction des disponibilités",
    },
    {
      icon: Archive,
      title: "Archiver intelligemment",
      description: "Classer les pièces jointes par thématique",
    },
    {
      icon: Languages,
      title: "Traduction instantanée",
      description: "Traduire et résumer les emails en français",
    },
    {
      icon: CheckSquare,
      title: "Détection de tâches",
      description: "Ajouter automatiquement les actions dans une to-do list",
    },
  ]

  useEffect(() => {
    if (currentEmail && currentEmail.id !== currentEmailId) {
      setCurrentEmailId(currentEmail.id)

      // Load existing conversation or create new one
      if (emailConversations[currentEmail.id]) {
        setMessages(emailConversations[currentEmail.id])
      } else {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: "bot",
          content: `Vous consultez l'email de ${currentEmail.sender} concernant "${currentEmail.subject}". Comment puis-je vous aider avec cet email?`,
          timestamp: new Date(),
        }
        setMessages([welcomeMessage])
        setEmailConversations((prev) => ({
          ...prev,
          [currentEmail.id]: [welcomeMessage],
        }))
      }
    }
  }, [currentEmail, currentEmailId, emailConversations])

  useEffect(() => {
    if (currentEmailId && messages.length > 0) {
      setEmailConversations((prev) => ({
        ...prev,
        [currentEmailId]: messages,
      }))
    }
  }, [messages, currentEmailId])

  useEffect(() => {
    // When an external chatbotAction is triggered (summary, reply, planifier, archiver), call the AI backend
    const runAction = async () => {
      if (!chatbotAction.type || chatbotAction.emails.length === 0) return

      // Prepare a prompt depending on the action
      const emails = chatbotAction.emails
      let prompt = ''

      if (chatbotAction.type === 'summary') {
        prompt = emails.length === 1
          ? `Please provide a concise summary (in French) of the following email:\n\nSubject: ${emails[0].subject}\nFrom: ${emails[0].sender}\n\n${emails[0].content}`
          : `Please provide a concise summary (in French) of these ${emails.length} emails. For each, give one-line summary and recommended action.`
      } else if (chatbotAction.type === 'reply') {
        prompt = emails.length === 1
          ? `Draft a polite reply in French to this email from ${emails[0].sender} about "${emails[0].subject}". Keep it short and professional.\n\n${emails[0].content}`
          : `Draft a short group reply in French addressing these ${emails.length} emails.`
      } else if (chatbotAction.type === 'planifier') {
        prompt = `Analyze this email and propose a meeting time and brief agenda in French.\n\n${emails[0].content}`
      } else if (chatbotAction.type === 'archiver') {
        prompt = `Suggest an archive folder name and short tags (in French) for this email based on its content.\n\n${emails[0].content}`
      }

      // Start a bot message with empty content and stream into it
      const botMessage: Message = {
        id: Date.now().toString(),
        type: 'bot',
        content: '',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])

      try {
        // Collect attachments and combined email content
        const attachments = [] as Array<{ filename?: string; data?: string }>
        let combinedContent = ''
        if (emails.length === 1) {
          combinedContent = emails[0].content || ''
          if ((emails[0] as any).attachments && Array.isArray((emails[0] as any).attachments)) {
            for (const a of (emails[0] as any).attachments) {
              attachments.push({ filename: a.filename, data: a.data })
            }
          }
        } else {
          combinedContent = emails.map((e, i) => `--- Email ${i + 1} - From: ${e.sender} Subject: ${e.subject}\n\n${e.content || ''}`).join('\n\n')
          for (const e of emails) {
            if ((e as any).attachments && Array.isArray((e as any).attachments)) {
              for (const a of (e as any).attachments) attachments.push({ filename: a.filename, data: a.data })
            }
          }
        }

        const res = await fetch('/api/ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, emailContent: combinedContent, attachments }),
        })

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => 'No details')
          setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: `Erreur: ${text}` } : m)))
          onActionComplete()
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let done = false

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            // Append chunk to last bot message
            setMessages((prev) => {
              if (prev.length === 0) return prev
              const last = prev[prev.length - 1]
              if (last.type !== 'bot') return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
              return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
            })
          }
        }

        onActionComplete()
      } catch (err: any) {
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: `Erreur: ${err?.message || String(err)}` } : m)))
        onActionComplete()
      }
    }

    runAction()
  }, [chatbotAction, onActionComplete])
  
  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: inputValue,
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])
    setInputValue("")

    // Send the user's input to the AI endpoint and stream response
    ;(async () => {
      // Add a placeholder bot message to stream into
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: '',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, botMessage])

      try {
        const res = await fetch('/api/ai/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: inputValue, emailContent: currentEmail?.content, attachments: [] }),
        })

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => 'No details')
          setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: `Erreur: ${text}` } : m)))
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let done = false

        while (!done) {
          const { value, done: doneReading } = await reader.read()
          done = doneReading
          if (value) {
            const chunk = decoder.decode(value, { stream: true })
            // Append chunk to last bot message
            setMessages((prev) => {
              if (prev.length === 0) return prev
              const last = prev[prev.length - 1]
              return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
            })
          }
        }
      } catch (err: any) {
        setMessages((prev) => prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: `Erreur: ${err?.message || String(err)}` } : m)))
      }
    })()
  }

  const handleMeetingPermissionAccept = () => {
    const botResponse: Message = {
      id: Date.now().toString(),
      type: "bot",
      content: `Parfait! J'ai ajouté la réunion à votre calendrier.\n\nDétails:\n${pendingMeetingAction}\n\nVous recevrez une notification de confirmation par email.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, botResponse])
    setShowMeetingPermission(false)
    setPendingMeetingAction("")
  }

  const handleMeetingPermissionRefuse = () => {
    const botResponse: Message = {
      id: Date.now().toString(),
      type: "bot",
      content: "D'accord, je n'ai pas modifié votre calendrier. Souhaitez-vous que je vous propose d'autres créneaux?",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, botResponse])
    setShowMeetingPermission(false)
    setPendingMeetingAction("")
  }

  return (
    <Card className="h-full flex flex-col shadow-lg min-h-0">
      <CardHeader className="border-b border-border bg-primary/5 flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <span>Assistant Intelligent</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 gap-4 overflow-hidden min-h-0">
        {/* Scrollable Area for Messages and Suggestions */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
          {/* Suggestions */}
          {messages.length === 1 && !currentEmail && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fade-in">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="p-4 bg-secondary hover:bg-accent border border-border rounded-lg text-left transition-colors group"
                  onClick={() => setInputValue(suggestion.title)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                      <suggestion.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground mb-1">{suggestion.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Meeting Permission Dialog */}
          {showMeetingPermission && (
            <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-primary rounded-lg p-4 animate-fade-in">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-2">Autorisation requise</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Souhaitez-vous que j'ajoute cet événement à votre calendrier ?
                  </p>
                  <div className="bg-background/50 rounded-lg p-3 mb-4 text-sm">
                    <pre className="whitespace-pre-wrap text-foreground">{pendingMeetingAction}</pre>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleMeetingPermissionAccept} className="flex-1 btn btn-primary">
                      <Calendar className="w-4 h-4 mr-2" />
                      Accepter
                    </Button>
                    <Button onClick={handleMeetingPermissionRefuse} className="flex-1 btn btn-secondary">
                      Refuser
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 animate-fade-in ${message.type === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === "bot" ? "bg-primary text-primary-foreground" : "bg-accent text-foreground"
                }`}
              >
                {message.type === "bot" ? (
                  <Sparkles className="w-4 h-4" />
                ) : (
                  <span className="text-sm font-semibold">U</span>
                )}
              </div>
              <div className={`max-w-[80%] ${message.type === "bot" ? "chat-bubble-bot" : "chat-bubble-user"}`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs opacity-70 mt-1 block">
                  {message.timestamp.toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex gap-2 flex-shrink-0">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Posez votre question..."
            className="flex-1"
          />
          <Button onClick={handleSendMessage} disabled={!inputValue.trim()} className="btn btn-primary" size="icon">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}