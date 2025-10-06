"use client"
import { Mail, Inbox, User, LogOut, ChevronDown, Moon, Sun, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import { useSession, signOut } from "next-auth/react"

interface DashboardHeaderProps {
  selectedFilter: string
  onFilterChange: (filter: string) => void
  onFilterPanelToggle: () => void
}

export default function DashboardHeader({ selectedFilter, onFilterChange, onFilterPanelToggle }: DashboardHeaderProps) {
  const filters = [{ id: "all", label: "Tous", icon: Inbox }]
  const { data: session } = useSession();
  const userAccount = {
    name: (session as any)?.user?.name || "Utilisateur",
    email: (session as any)?.user?.email || "utilisateur@example.com",
    avatar: (session as any)?.user?.image || "",
    initials: ((session as any)?.user?.name || "U").split(" ").map((s: string) => s[0]).join("") || "U",
  }

  const { theme, toggleTheme } = useTheme()

  return (
    <header className="bg-background border-b border-border shadow-sm sticky top-0 z-10">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
            <Mail className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground truncate">Orange Email Assistant</h1>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">
              Votre assistant intelligent pour gérer vos emails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="flex items-center gap-2 hover:bg-accent rounded-lg px-3 py-2 transition-colors"
            title={theme === "light" ? "Passer en mode sombre" : "Passer en mode claire"}
          >
            {theme === "light" ? (
              <>
                <Moon className="w-5 h-5" />
                <span className="hidden md:inline text-sm">Sombre</span>
              </>
            ) : (
              <>
                <Sun className="w-5 h-5" />
                <span className="hidden md:inline text-sm">Claire</span>
              </>
            )}
          </Button>

          {/* User Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-accent rounded-lg px-3 py-2 transition-colors"
              >
                <Avatar className="w-8 h-8 border-2 border-primary/20">
                  <AvatarImage src={userAccount.avatar || "/placeholder.svg"} alt={userAccount.name} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {userAccount.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userAccount.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{userAccount.email}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 shadow-lg">
              <DropdownMenuLabel className="py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border-2 border-primary/20">
                    <AvatarImage src={userAccount.avatar || "/placeholder.svg"} alt={userAccount.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {userAccount.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{userAccount.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{userAccount.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer py-2.5">
                <User className="w-4 h-4 mr-3" />
                <span>Changer de compte</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive py-2.5" onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-3" />
                <span>Se déconnecter</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto bg-secondary/30 border-t border-border">
        {filters.map((filter) => {
          const Icon = filter.icon
          return (
            <Button
              key={filter.id}
              variant={selectedFilter === filter.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(filter.id)}
              className={`flex items-center gap-2 whitespace-nowrap transition-all ${
                selectedFilter === filter.id
                  ? "btn btn-primary shadow-sm"
                  : "hover:bg-accent hover:text-foreground text-muted-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{filter.label}</span>
            </Button>
          )
        })}

        <Button
          variant="ghost"
          size="sm"
          onClick={onFilterPanelToggle}
          className="flex items-center gap-2 whitespace-nowrap hover:bg-accent hover:text-foreground text-muted-foreground transition-all"
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtres avancés</span>
        </Button>
      </div>
    </header>
  )
}
