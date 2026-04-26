import { useState, useMemo, useRef, useEffect } from "react";
import { Pagination } from "@mui/material";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
// @ts-ignore
import {
  HiArrowNarrowDown,
  HiArrowNarrowUp,
  HiChevronDown,
  HiChevronUp,
  HiX,
} from "react-icons/hi";
import { OneShotCard } from "../components/StoryCard";
import { useStories } from "../../../hooks/useStories"; // ✅ replaces apiClient + useState + useEffect

type SortField = "title" | "recently-updated";
type SortOrder = "asc" | "desc";
type GenreFilterMode = "AND" | "OR";
type TagFilterMode = "AND" | "OR";

const ITEMS_PER_PAGE = 5;

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Psychological",
  "Romance",
  "Seinen",
  "Shoujo",
  "Shoujo Ai",
  "Shounen",
  "Shounen Ai",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Tragedy",
];

// --- Styles ---
const styles = {
  page: {
    backgroundColor: "#111111",
    minHeight: "100vh",
    color: "#ffffff",
  } as React.CSSProperties,
  inner: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "40px 40px",
  } as React.CSSProperties,
  section: { marginBottom: "48px" } as React.CSSProperties,
  sectionTitle: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#ffffff",
    margin: 0,
  } as React.CSSProperties,
  cardContainer: {
    backgroundColor: "#161616",
    border: "1px solid #222222",
    borderRadius: "12px",
    overflow: "hidden",
  } as React.CSSProperties,
  emptyState: {
    textAlign: "center" as const,
    padding: "32px",
    color: "#6b7280",
    fontSize: "14px",
  } as React.CSSProperties,
  paginationContainer: {
    borderTop: "1px solid #222222",
    padding: "24px",
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
    alignItems: "center",
  } as React.CSSProperties,
  headerControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "24px",
    gap: "16px",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  controlsRight: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  headerButton: {
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #333333",
    backgroundColor: "#1a1a1a",
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap" as const,
  } as React.CSSProperties,
  headerButtonActive: {
    backgroundColor: "#2d2d2d",
    borderColor: "#3071c1",
    color: "#60a5fa",
  } as React.CSSProperties,
  filterSection: {
    backgroundColor: "#161616",
    border: "1px solid #222222",
    borderRadius: "12px",
    marginBottom: "24px",
  } as React.CSSProperties,
  filterHeaderTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#d1d5db",
    margin: 0,
  } as React.CSSProperties,
  filterContent: { padding: "20px" } as React.CSSProperties,
  filterGroup: { marginBottom: "24px" } as React.CSSProperties,
  filterGroupTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    fontSize: "13px",
    fontWeight: "600",
    color: "#d1d5db",
  } as React.CSSProperties,
  genreGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
  } as React.CSSProperties,
  genreCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
  } as React.CSSProperties,
  checkbox: {
    width: "16px",
    height: "16px",
    cursor: "pointer",
    accentColor: "#60a5fa",
  } as React.CSSProperties,
  genreLabel: {
    fontSize: "13px",
    color: "#60a5fa",
    cursor: "pointer",
  } as React.CSSProperties,
  tagInputLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#9ca3af",
    marginBottom: "8px",
    display: "block",
  } as React.CSSProperties,
  filterButtonsContainer: {
    display: "flex",
    gap: "12px",
    marginTop: "24px",
    paddingTop: "24px",
    borderTop: "1px solid #222222",
    flexWrap: "wrap" as const,
  } as React.CSSProperties,
  applyButton: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#60a5fa",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "120px",
  } as React.CSSProperties,
  resetButton: {
    flex: 1,
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #333333",
    backgroundColor: "#1a1a1a",
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.15s ease",
    minWidth: "120px",
  } as React.CSSProperties,
  tagBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    borderRadius: "8px",
    border: "1px solid #3071c1",
    backgroundColor: "#1a2a3a",
    color: "#60a5fa",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "default",
  } as React.CSSProperties,
  tagBadgeRemove: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "none",
    border: "none",
    color: "#60a5fa",
    cursor: "pointer",
    padding: "0",
    lineHeight: 1,
    opacity: 0.7,
    transition: "opacity 0.15s ease",
  } as React.CSSProperties,
  tagBadgesRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
    marginBottom: "10px",
  } as React.CSSProperties,
  searchInput: {
    width: "100%",
    padding: "8px 12px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #333333",
    borderRadius: "8px",
    color: "#e5e7eb",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
    transition: "border-color 0.15s ease",
  } as React.CSSProperties,
  autocompleteWrapper: {
    position: "relative" as const,
    marginBottom: "12px",
  } as React.CSSProperties,
  dropdown: {
    position: "absolute" as const,
    top: "calc(100% + 4px)",
    left: 0,
    right: 0,
    backgroundColor: "#1e1e1e",
    border: "1px solid #333333",
    borderRadius: "8px",
    maxHeight: "200px",
    overflowY: "auto" as const,
    zIndex: 50,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  } as React.CSSProperties,
  dropdownItem: {
    width: "100%",
    padding: "10px 14px",
    textAlign: "left" as const,
    backgroundColor: "transparent",
    border: "none",
    color: "#60a5fa",
    fontSize: "13px",
    cursor: "pointer",
    transition: "background-color 0.1s ease",
    display: "block",
  } as React.CSSProperties,
  tagInputGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  } as React.CSSProperties,
};

// --- TagBadge component ---
const TagBadge = ({ tag, onRemove }: { tag: string; onRemove: () => void }) => (
  <span style={styles.tagBadge}>
    {tag}
    <button
      style={styles.tagBadgeRemove}
      onClick={onRemove}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.opacity = "1")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.opacity = "0.7")
      }
      title={`Remove ${tag}`}
    >
      <HiX size={12} />
    </button>
  </span>
);

// --- TagAutocompleteInput ---
const TagAutocompleteInput = ({
  label,
  tags,
  allTags,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  tags: string[];
  allTags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    return allTags
      .filter(
        (t) =>
          t.toLowerCase().includes(query.toLowerCase()) && !tags.includes(t),
      )
      .slice(0, 10);
  }, [query, allTags, tags]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (tag: string) => {
    onAdd(tag);
    setQuery("");
    setOpen(false);
  };

  return (
    <div>
      <label style={styles.tagInputLabel}>{label}</label>
      {tags.length > 0 && (
        <div style={styles.tagBadgesRow}>
          {tags.map((tag) => (
            <TagBadge key={tag} tag={tag} onRemove={() => onRemove(tag)} />
          ))}
        </div>
      )}
      <div style={styles.autocompleteWrapper} ref={wrapperRef}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => query && setOpen(true)}
          placeholder={placeholder ?? "Search tags..."}
          style={styles.searchInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && suggestions.length > 0)
              handleSelect(suggestions[0]);
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {open && suggestions.length > 0 && (
          <div style={styles.dropdown}>
            {suggestions.map((tag) => (
              <button
                key={tag}
                style={styles.dropdownItem}
                onMouseDown={() => handleSelect(tag)}
                onMouseEnter={(e) =>
                  ((
                    e.currentTarget as HTMLButtonElement
                  ).style.backgroundColor = "#252525")
                }
                onMouseLeave={(e) =>
                  ((
                    e.currentTarget as HTMLButtonElement
                  ).style.backgroundColor = "transparent")
                }
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const BroswingPage = () => {
  // ✅ 3 lines replace ~20 lines of useState + useEffect + apiClient boilerplate
  const { data, loading, error } = useStories();
  const allWorks = data ?? [];

  const [sortField, setSortField] = useState<SortField>("recently-updated");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [genreFilterMode, setGenreFilterMode] =
    useState<GenreFilterMode>("AND");
  const [tagFilterMode, setTagFilterMode] = useState<TagFilterMode>("OR");
  const [includeTags, setIncludeTags] = useState<string[]>([]);
  const [excludeTags, setExcludeTags] = useState<string[]>([]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allWorks.forEach((work) => work.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [allWorks]);

  const handleGenreChange = (genre: string) => {
    const newGenres = new Set(selectedGenres);
    newGenres.has(genre) ? newGenres.delete(genre) : newGenres.add(genre);
    setSelectedGenres(newGenres);
  };

  const handleResetFilters = () => {
    setSelectedGenres(new Set());
    setGenreFilterMode("AND");
    setTagFilterMode("OR");
    setIncludeTags([]);
    setExcludeTags([]);
    setCurrentPage(1);
  };

  const sortedStories = useMemo(() => {
    let sorted = [...allWorks];

    if (selectedGenres.size > 0) {
      sorted = sorted.filter((story) => {
        const storyGenres = new Set(story.genres.map((g) => g.toLowerCase()));
        const sel = Array.from(selectedGenres).map((g) => g.toLowerCase());
        return genreFilterMode === "AND"
          ? sel.every((g) => storyGenres.has(g))
          : sel.some((g) => storyGenres.has(g));
      });
    }

    if (includeTags.length > 0 || excludeTags.length > 0) {
      sorted = sorted.filter((story) => {
        const storyTags = new Set(story.tags.map((t) => t.toLowerCase()));
        if (excludeTags.some((t) => storyTags.has(t.toLowerCase())))
          return false;
        if (includeTags.length > 0) {
          return tagFilterMode === "AND"
            ? includeTags.every((t) => storyTags.has(t.toLowerCase()))
            : includeTags.some((t) => storyTags.has(t.toLowerCase()));
        }
        return true;
      });
    }

    sorted.sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;
      if (sortField === "title") {
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
      } else {
        aVal = new Date(a.lastUpdated).getTime();
        bVal = new Date(b.lastUpdated).getTime();
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortOrder === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      return sortOrder === "asc"
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return sorted;
  }, [
    allWorks,
    sortField,
    sortOrder,
    selectedGenres,
    genreFilterMode,
    includeTags,
    excludeTags,
    tagFilterMode,
  ]);

  const totalPages = Math.ceil(sortedStories.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const displayedStories = sortedStories.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  return (
    <div style={styles.page}>
      <style>{`
        @media (max-width: 768px) {
          .browse-inner { padding: 16px 16px !important; }
          .genre-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .tag-input-grid { grid-template-columns: 1fr !important; }
          .header-controls { flex-direction: column; align-items: flex-start; }
          .section-title { font-size: 16px !important; }
        }
        @media (max-width: 480px) {
          .genre-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={styles.inner} className="browse-inner">
        {loading && (
          <div style={{ ...styles.emptyState, padding: "60px 20px" }}>
            <p style={{ color: "#6b7280" }}>Loading stories...</p>
          </div>
        )}

        {error && (
          <div style={{ ...styles.emptyState, padding: "60px 20px" }}>
            <p style={{ color: "#ef5350" }}>{error.message}</p>
          </div>
        )}

        {!loading && !error && allWorks.length === 0 && (
          <div style={{ ...styles.emptyState, padding: "60px 20px" }}>
            <p style={{ color: "#6b7280" }}>No stories found.</p>
          </div>
        )}

        {!loading && !error && allWorks.length > 0 && (
          <>
            {/* Header */}
            <div style={styles.headerControls}>
              <h1 style={styles.sectionTitle}>Browse All Works</h1>
              <div style={styles.controlsRight}>
                <select
                  value={sortField}
                  onChange={(e) => {
                    setSortField(e.target.value as SortField);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...styles.headerButton,
                    appearance: "none",
                    paddingRight: "24px",
                  }}
                >
                  <option value="recently-updated">Recently Updated</option>
                  <option value="title">Title</option>
                </select>
                <button
                  onClick={() => {
                    setSortOrder("asc");
                    setCurrentPage(1);
                  }}
                  style={{
                    ...styles.headerButton,
                    ...(sortOrder === "asc" ? styles.headerButtonActive : {}),
                  }}
                >
                  <HiArrowNarrowUp />
                </button>
                <button
                  onClick={() => {
                    setSortOrder("desc");
                    setCurrentPage(1);
                  }}
                  style={{
                    ...styles.headerButton,
                    ...(sortOrder === "desc" ? styles.headerButtonActive : {}),
                  }}
                >
                  <HiArrowNarrowDown />
                </button>
              </div>
            </div>

            {/* Filter Accordion */}
            <Accordion
              expanded={isFiltersExpanded}
              onChange={() => setIsFiltersExpanded(!isFiltersExpanded)}
              style={styles.filterSection}
            >
              <AccordionSummary
                expandIcon={
                  isFiltersExpanded ? (
                    <HiChevronUp style={{ color: "#9ca3af" }} />
                  ) : (
                    <HiChevronDown style={{ color: "#9ca3af" }} />
                  )
                }
              >
                <h2 style={styles.filterHeaderTitle}>Filters</h2>
              </AccordionSummary>
              <AccordionDetails style={styles.filterContent}>
                {/* Genre Filter */}
                <div style={styles.filterGroup}>
                  <div style={styles.filterGroupTitle}>
                    Genre [
                    <select
                      value={genreFilterMode}
                      onChange={(e) =>
                        setGenreFilterMode(e.target.value as GenreFilterMode)
                      }
                      style={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333333",
                        borderRadius: "4px",
                        color: "#e5e7eb",
                        padding: "2px 4px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                    ]
                  </div>
                  <div style={styles.genreGrid} className="genre-grid">
                    {GENRES.map((genre) => (
                      <label key={genre} style={styles.genreCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedGenres.has(genre)}
                          onChange={() => handleGenreChange(genre)}
                          style={styles.checkbox}
                        />
                        <span style={styles.genreLabel}>{genre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Tag Filter */}
                <div style={styles.filterGroup}>
                  <div style={styles.filterGroupTitle}>
                    Tags [
                    <select
                      value={tagFilterMode}
                      onChange={(e) =>
                        setTagFilterMode(e.target.value as TagFilterMode)
                      }
                      style={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #333333",
                        borderRadius: "4px",
                        color: "#e5e7eb",
                        padding: "2px 4px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                    </select>
                    ]
                  </div>
                  <div
                    style={styles.tagInputGrid}
                    className="tag-input-grid"
                  >
                    <TagAutocompleteInput
                      label="Include..."
                      tags={includeTags}
                      allTags={allTags}
                      onAdd={(tag) => {
                        setIncludeTags((prev) => [...prev, tag]);
                        setCurrentPage(1);
                      }}
                      onRemove={(tag) => {
                        setIncludeTags((prev) => prev.filter((t) => t !== tag));
                      }}
                      placeholder="Search tags to include..."
                    />
                    <TagAutocompleteInput
                      label="Exclude..."
                      tags={excludeTags}
                      allTags={allTags}
                      onAdd={(tag) => {
                        setExcludeTags((prev) => [...prev, tag]);
                        setCurrentPage(1);
                      }}
                      onRemove={(tag) => {
                        setExcludeTags((prev) => prev.filter((t) => t !== tag));
                      }}
                      placeholder="Search tags to exclude..."
                    />
                  </div>
                </div>

                {/* Filter Buttons */}
                <div style={styles.filterButtonsContainer}>
                  <button
                    onClick={() => setCurrentPage(1)}
                    style={styles.applyButton}
                    onMouseEnter={(e) =>
                      ((
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "#3b82f6")
                    }
                    onMouseLeave={(e) =>
                      ((
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "#60a5fa")
                    }
                  >
                    Search
                  </button>
                  <button
                    onClick={handleResetFilters}
                    style={styles.resetButton}
                    onMouseEnter={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "#252525";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#444444";
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "#1a1a1a";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#333333";
                    }}
                  >
                    Reset
                  </button>
                </div>
              </AccordionDetails>
            </Accordion>

            {/* Stories */}
            <section style={styles.section}>
              <div style={styles.cardContainer}>
                {displayedStories.length === 0 ? (
                  <div style={styles.emptyState}>No stories found</div>
                ) : (
                  displayedStories.map((oneshot: any, i) => (
                    <OneShotCard
                      key={oneshot._id || `oneshot-${i}`}
                      oneshot={oneshot}
                      isLast={i === displayedStories.length - 1}
                    />
                  ))
                )}
              </div>
            </section>

            {/* Pagination */}
            {totalPages > 1 && (
              <section style={{ ...styles.section, marginBottom: "0" }}>
                <div
                  style={{
                    ...styles.cardContainer,
                    ...styles.paginationContainer,
                  }}
                >
                  <Pagination
                    count={totalPages}
                    page={currentPage}
                    onChange={(_e, page) => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    variant="outlined"
                    shape="rounded"
                    sx={{
                      "& .MuiPaginationItem-root": {
                        color: "#ffffff",
                        borderColor: "#444444",
                        "&:hover": {
                          backgroundColor: "#333333",
                        },
                      },
                      "& .Mui-selected": {
                        backgroundColor: "#60a5fa !important",
                        color: "#ffffff !important",
                      },
                    }}
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};
