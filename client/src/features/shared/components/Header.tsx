import { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useStories } from "../../../hooks/useStories";
import { theme } from "../../../styles/theme";

type Suggestion = {
  _id: string;
  label: string;
  sublabel: string;
  type: "title" | "author";
};

export const Header = () => {
  const [showMenu, setShowMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const { data } = useStories();
  const allStories = data ?? [];

  const navLinks = [
    { label: "Home", path: "/" },
    { label: "Browse", path: "/browse" },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions: Suggestion[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: Suggestion[] = [];

    allStories.forEach((story) => {
      if (story.title.toLowerCase().includes(q)) {
        results.push({
          _id: story._id,
          label: story.title,
          sublabel: story.author,
          type: "title",
        });
      }
    });

    const seenAuthors = new Set<string>();
    allStories.forEach((story) => {
      if (
        story.author.toLowerCase().includes(q) &&
        !seenAuthors.has(story.author)
      ) {
        seenAuthors.add(story.author);
        results.push({
          _id: "",
          label: story.author,
          sublabel: "Author",
          type: "author",
        });
      }
    });

    return results.slice(0, 8);
  }, [searchQuery, allStories]);

  const handleSelect = (item: Suggestion) => {
    setShowDropdown(false);
    setSearchQuery("");
    if (item.type === "title" && item._id) {
      navigate(`/reading/${item._id}`);
    } else if (item.type === "author") {
      navigate(`/browse?q=${encodeURIComponent(item.label)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (suggestions.length > 0) {
        handleSelect(suggestions[0]);
      } else if (searchQuery.trim()) {
        navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
        setSearchQuery("");
        setShowDropdown(false);
      }
    }
    if (e.key === "Escape") setShowDropdown(false);
  };

  const handleLogout = () => {
    logout();
    setShowMenu(false);
    navigate("/");
  };

  const headerStyles: React.CSSProperties = {
    maxWidth: theme.layout.maxWidth,
    margin: "0 auto",
    padding: `${theme.spacing.md} ${theme.layout.padding}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing.lg,
  };

  return (
    <header
      style={{
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadows.sm,
      }}
    >
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .header-search { max-width: 100% !important; }
        }
        @media (min-width: 769px) {
          .desktop-nav { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-menu { display: none !important; }
        }
        @media (max-width: 640px) {
          .header-auth-btns { display: none !important; }
        }
      `}</style>

      <div style={headerStyles}>
        <Link
          to="/"
          style={{
            fontSize: theme.fontSize.xl,
            fontWeight: theme.fontWeight.extrabold,
            color: theme.colors.text.primary,
            textDecoration: "none",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = theme.colors.accent.primary)
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLAnchorElement).style.color = theme.colors.text.primary)
          }
        >
          AO3dupe
        </Link>

        <div className="desktop-nav" style={{ display: "flex", gap: theme.spacing.xl, alignItems: "center" }}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              style={{
                fontSize: theme.fontSize.sm,
                fontWeight: theme.fontWeight.normal,
                color: theme.colors.text.primary,
                textDecoration: "none",
                letterSpacing: "0.15em",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = theme.colors.accent.primary)
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLAnchorElement).style.color = theme.colors.text.primary)
              }
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="header-search" style={{ flex: 1, maxWidth: "520px" }} ref={searchRef}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => {
                if (searchQuery) setShowDropdown(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search titles, authors..."
              style={{
                width: "100%",
                backgroundColor: "#1e1e1e",
                border: `1px solid ${theme.colors.borderLight}`,
                borderRadius: theme.borderRadius.lg,
                padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                fontSize: theme.fontSize.md,
                color: theme.colors.text.secondary,
                outline: "none",
                transition: `border-color ${theme.transitions.fast}, box-shadow ${theme.transitions.fast}`,
                boxSizing: "border-box",
              }}
              onFocusCapture={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor =
                  theme.colors.text.primary;
                (e.currentTarget as HTMLInputElement).style.boxShadow =
                  "0 0 0 2px rgba(0,68,255,0.15)";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLInputElement).style.borderColor =
                  theme.colors.borderLight;
                (e.currentTarget as HTMLInputElement).style.boxShadow = "none";
              }}
            />

            {showDropdown && suggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: `calc(100% + ${theme.spacing.xs})`,
                  left: 0,
                  right: 0,
                  backgroundColor: "#1a1a1a",
                  border: `1px solid ${theme.colors.borderAccent}`,
                  borderRadius: theme.borderRadius.lg,
                  boxShadow: theme.shadows.lg,
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                {suggestions.map((item, i) => (
                  <div
                    key={`${item.type}-${item._id || item.label}-${i}`}
                    onMouseDown={() => handleSelect(item)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: theme.spacing.md,
                      borderBottom:
                        i < suggestions.length - 1
                          ? `1px solid ${theme.colors.border}`
                          : "none",
                      transition: `background-color ${theme.transitions.fast}`,
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.backgroundColor = theme.colors.genre.background)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent")
                    }
                  >
                    <span
                      style={{
                        fontSize: theme.fontSize.base,
                        color: item.type === "title" ? theme.colors.accent.primary : theme.colors.text.secondary,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontSize: theme.fontSize.xs,
                        color: theme.colors.text.muted,
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.sublabel}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="header-auth-btns desktop-nav" style={{ display: "flex", gap: theme.spacing.md, alignItems: "center" }}>
          {isAuthenticated ? (
            <div style={{ position: "relative" }} ref={menuRef}>
              <span
                className="material-symbols-outlined"
                style={{
                  color: theme.colors.text.dim,
                  fontSize: "28px",
                  cursor: "pointer",
                  transition: `color ${theme.transitions.normal}`,
                  flexShrink: 0,
                }}
                onClick={() => setShowMenu(!showMenu)}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLSpanElement).style.color = theme.colors.accent.primary)
                }
                onMouseLeave={(e) => {
                  if (!showMenu)
                    (e.currentTarget as HTMLSpanElement).style.color = theme.colors.text.dim;
                }}
              >
                account_circle
              </span>

              {showMenu && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: "0",
                    backgroundColor: "#1a1a1a",
                    borderRadius: theme.borderRadius.lg,
                    border: `1px solid ${theme.colors.borderAccent}`,
                    boxShadow: theme.shadows.md,
                    minWidth: "200px",
                    marginTop: theme.spacing.sm,
                    zIndex: 1000,
                  }}
                >
                  <div style={{ padding: `${theme.spacing.md} ${theme.spacing.lg}`, borderBottom: `1px solid ${theme.colors.borderAccent}` }}>
                    <div style={{ fontSize: theme.fontSize.md, fontWeight: theme.fontWeight.semibold, color: theme.colors.text.secondary }}>
                      {user?.username}
                    </div>
                    <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.muted, marginTop: "2px" }}>
                      {user?.email}
                    </div>
                  </div>
                  <div style={{ padding: `${theme.spacing.sm} 0` }}>
                    {[
                      { label: "Written Works", path: "/dashboard/written-works" },
                      { label: "Library", path: "/dashboard/library" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        onClick={() => {
                          navigate(item.path);
                          setShowMenu(false);
                        }}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                          color: theme.colors.text.secondary,
                          cursor: "pointer",
                          transition: `background-color ${theme.transitions.normal}`,
                          fontSize: theme.fontSize.md,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = "#2a2a2a";
                          (e.currentTarget as HTMLDivElement).style.color =
                            theme.colors.accent.primary;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                          (e.currentTarget as HTMLDivElement).style.color =
                            theme.colors.text.secondary;
                        }}
                      >
                        {item.label}
                      </div>
                    ))}
                    <div
                      onClick={handleLogout}
                      style={{
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                        color: theme.colors.danger.primary,
                        cursor: "pointer",
                        transition: `background-color ${theme.transitions.normal}`,
                        fontSize: theme.fontSize.md,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = "#2a2a2a";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                      }}
                    >
                      Sign Out
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: theme.spacing.md, alignItems: "center" }}>
              <Link
                to="/login"
                style={{
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.secondary,
                  textDecoration: "none",
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.borderAccent}`,
                  transition: `all ${theme.transitions.normal}`,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = theme.colors.accent.primary;
                  (e.currentTarget as HTMLAnchorElement).style.color = theme.colors.accent.primary;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = theme.colors.borderAccent;
                  (e.currentTarget as HTMLAnchorElement).style.color = theme.colors.text.secondary;
                }}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={{
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                  textDecoration: "none",
                  padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                  borderRadius: theme.borderRadius.md,
                  backgroundColor: theme.colors.accent.dark,
                  transition: `background-color ${theme.transitions.normal}`,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = theme.colors.accent.primary)
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = theme.colors.accent.dark)
                }
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            background: "none",
            border: "none",
            color: theme.colors.text.primary,
            cursor: "pointer",
            padding: theme.spacing.xs,
            display: "none",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {mobileMenuOpen ? (
            <span style={{ fontSize: "24px" }}>✕</span>
          ) : (
            <span style={{ fontSize: "24px" }}>☰</span>
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            backgroundColor: theme.colors.surface,
            borderTop: `1px solid ${theme.colors.border}`,
            padding: theme.spacing.md,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.md }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  fontSize: theme.fontSize.base,
                  fontWeight: theme.fontWeight.medium,
                  color: theme.colors.text.primary,
                  textDecoration: "none",
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.borderRadius.md,
                }}
              >
                {link.label}
              </Link>
            ))}
            <hr style={{ borderColor: theme.colors.border, margin: `${theme.spacing.sm} 0` }} />
            {isAuthenticated ? (
              <>
                <div style={{ fontSize: theme.fontSize.sm, color: theme.colors.text.secondary, padding: `${theme.spacing.xs} ${theme.spacing.md}` }}>
                  {user?.username}
                </div>
                {[
                  { label: "Written Works", path: "/dashboard/written-works" },
                  { label: "Library", path: "/dashboard/library" },
                ].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      fontSize: theme.fontSize.base,
                      color: theme.colors.text.secondary,
                      textDecoration: "none",
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    fontSize: theme.fontSize.base,
                    color: theme.colors.danger.primary,
                    background: "none",
                    border: "none",
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing.sm }}>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.secondary,
                    textDecoration: "none",
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.md,
                    border: `1px solid ${theme.colors.borderAccent}`,
                    textAlign: "center",
                  }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: theme.fontSize.base,
                    fontWeight: theme.fontWeight.medium,
                    color: theme.colors.text.primary,
                    textDecoration: "none",
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.borderRadius.md,
                    backgroundColor: theme.colors.accent.dark,
                    textAlign: "center",
                  }}
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
