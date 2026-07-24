"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Star,
  Calendar,
  Play,
  TrendingUp,
  X,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Clock,
  ThumbsUp,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import ShinyText from "@/components/ShinyText"
import TiltedCard from "@/components/TiltedCard"

// Using local API url from env
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState("All")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Data states
  const [featuredMovies, setFeaturedMovies] = useState<any[]>([])
  const [trendingMovies, setTrendingMovies] = useState<any[]>([])
  const [popularGenres, setPopularGenres] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  
  // Carousel state
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(2)
  const [extendedFeaturedMovies, setExtendedFeaturedMovies] = useState<any[]>([])

  // Modal / Recommendation state
  const [selectedMovie, setSelectedMovie] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [isRecLoading, setIsRecLoading] = useState(false)

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch Featured (Top Rated)
        const featRes = await fetch(`${API_URL}/movies?sort=rating&limit=10`)
        if (featRes.ok) {
          const data = await featRes.json()
          setFeaturedMovies(data.results)
          // Create seamless loop by duplicating items
          if (data.results.length > 0) {
            setExtendedFeaturedMovies([
              ...data.results.slice(-2),
              ...data.results,
              ...data.results.slice(0, 2),
            ])
          }
        }

        // Fetch Trending (Popular)
        const trendRes = await fetch(`${API_URL}/movies?sort=popular&limit=8`)
        if (trendRes.ok) {
          const data = await trendRes.json()
          setTrendingMovies(data.results)
        }

        // Fetch Genres
        const genreRes = await fetch(`${API_URL}/genres`)
        if (genreRes.ok) {
          const data = await genreRes.json()
          // Pick a mix of popular genres for display
          const displayGenres = ["Action", "Comedy", "Drama", "Horror", "Science Fiction", "Romance", "Thriller", "Animation"]
          // Filter to only those that exist in our dataset
          const available = displayGenres.filter(g => data.genres.includes(g))
          setPopularGenres(available.length > 0 ? available : data.genres.slice(0, 8))
        }
      } catch (error) {
        console.error("Error fetching initial data:", error)
      }
    }

    fetchInitialData()

    // Load recent searches from local storage
    const savedSearches = localStorage.getItem("recentSearches")
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches))
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
  }, [])

  // Auto-advance carousel
  useEffect(() => {
    if (extendedFeaturedMovies.length === 0) return
    const interval = setInterval(() => {
      setCurrentFeaturedIndex((prevIndex) => prevIndex + 1)
    }, 5000)
    return () => clearInterval(interval)
  }, [extendedFeaturedMovies.length])

  // Handle seamless loop transitions
  useEffect(() => {
    if (extendedFeaturedMovies.length === 0) return
    if (currentFeaturedIndex === extendedFeaturedMovies.length - 2) {
      // When we reach the duplicated first item, jump to the real first item
      const timeout = setTimeout(() => {
        setCurrentFeaturedIndex(2)
      }, 500)
      return () => clearTimeout(timeout)
    } else if (currentFeaturedIndex === 1) {
      // When we reach the duplicated last item, jump to the real last item
      const timeout = setTimeout(() => {
        setCurrentFeaturedIndex(featuredMovies.length + 1)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [currentFeaturedIndex, extendedFeaturedMovies.length, featuredMovies.length])

  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return
    const updated = [query, ...recentSearches.filter(s => s.toLowerCase() !== query.toLowerCase())].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem("recentSearches", JSON.stringify(updated))
  }

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem("recentSearches")
  }

  const handleSearch = async (query?: string) => {
    const searchTerm = query !== undefined ? query : searchQuery
    if (!searchTerm.trim()) return

    setSearchQuery(searchTerm)
    setIsLoading(true)
    setHasSearched(true)
    
    saveRecentSearch(searchTerm)

    try {
      // If there's an active genre filter, apply it
      let url = `${API_URL}/movies/search?q=${encodeURIComponent(searchTerm)}&limit=20`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.results)
      } else {
        setSearchResults([])
      }
    } catch (error) {
      console.error("Search error:", error)
      setSearchResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query)
    handleSearch(query)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
  }

  const openMovieDetails = async (movie: any) => {
    setSelectedMovie(movie)
    setRecommendations([])
    setIsRecLoading(true)
    
    try {
      const res = await fetch(`${API_URL}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: movie.title, count: 5 })
      })
      if (res.ok) {
        const data = await res.json()
        setRecommendations(data.recommendations)
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error)
    } finally {
      setIsRecLoading(false)
    }
  }

  // Frontend filter for search results based on the 'activeFilter' (Movies vs TV)
  // Since TMDB 5000 is mostly movies, we'll fake the TV filter for demo purposes
  // or just show all if we don't have accurate type info.
  const filteredResults = searchResults.filter((movie) => {
    if (activeFilter === "All") return true
    // Our dataset only has movies, so "TV Shows" will be empty. 
    // This is correct behavior based on the dataset, though visually less exciting.
    if (activeFilter === "Movies") return true
    if (activeFilter === "TV Shows") return false 
    return true
  })

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-emerald-400"
    if (rating >= 7) return "text-amber-400"
    if (rating >= 6) return "text-orange-400"
    return "text-red-400"
  }

  const getRatingStars = (rating: number) => {
    const stars = Math.floor(rating / 2)
    const hasHalf = rating % 2 >= 1
    return { full: stars, half: hasHalf }
  }

  // Helper to get image, fallback to placeholder
  const getPoster = (url: string) => {
    return url && url !== "" ? url : "/placeholder.svg?height=400&width=300"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 relative overflow-hidden">
      {/* Enhanced Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: 1,
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-full blur-3xl"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>

      {/* Enhanced Header */}
      <header className="relative z-10 p-4 lg:p-6">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <motion.div
            className="flex items-center space-x-4 cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            onClick={clearSearch}
          >
            {/* Enhanced Logo */}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 20, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  >
                    <Zap className="w-7 h-7 text-white drop-shadow-lg" />
                  </motion.div>
                </div>
                <div className="absolute inset-0 w-12 h-12 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-500 rounded-2xl blur-xl opacity-60 animate-pulse" />
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl opacity-30 blur-lg"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Number.POSITIVE_INFINITY,
                    ease: "easeInOut",
                  }}
                />
              </div>
            </motion.div>
            <ShinyText
              text="CineGlow"
              speed={6}
              className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent"
            />
          </motion.div>

          <motion.div
            className="hidden md:flex items-center space-x-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.a
              href="#"
              onClick={(e) => { e.preventDefault(); clearSearch(); }}
              className="text-gray-300 hover:text-white transition-colors relative group"
              whileHover={{ scale: 1.05 }}
            >
              Home
              <motion.div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
            </motion.a>
            <motion.a
              href="#"
              onClick={(e) => { e.preventDefault(); document.getElementById('search-input')?.focus(); }}
              className="text-gray-300 hover:text-white transition-colors relative group"
              whileHover={{ scale: 1.05 }}
            >
              Search
              <motion.div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 group-hover:w-full transition-all duration-300" />
            </motion.a>
            <motion.a
              href="#"
              className="text-gray-300 hover:text-white transition-colors relative group opacity-50 cursor-not-allowed"
            >
              Favorites
            </motion.a>
          </motion.div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 lg:px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Enhanced Search Section */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="relative max-w-2xl mx-auto mb-6">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-2xl blur-xl" />
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="search-input"
                    type="text"
                    placeholder="Search for movies by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-12 pr-12 h-14 bg-slate-800/50 border-slate-700 text-white placeholder-gray-400 text-lg rounded-2xl focus:ring-2 focus:ring-violet-500 focus:border-transparent backdrop-blur-sm"
                  />
                  {searchQuery && (
                    <motion.button
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Enhanced Filter Tabs */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {["All", "Movies", "TV Shows"].map((filter) => (
                <motion.div key={filter} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={() => setActiveFilter(filter)}
                    variant={activeFilter === filter ? "default" : "ghost"}
                    className={`px-6 py-3 rounded-full transition-all duration-300 ${
                      activeFilter === filter
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25"
                        : "bg-slate-800/50 text-gray-300 hover:bg-slate-700/50 hover:text-white border border-slate-700/50"
                    }`}
                  >
                    {filter}
                  </Button>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Search Results */}
          <AnimatePresence>
            {hasSearched && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="mb-12"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      Results for <span className="text-fuchsia-400">"{searchQuery}"</span>
                    </h2>
                    <p className="text-gray-400">
                      {isLoading ? "Searching..." : `${filteredResults.length} results found`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className={`p-2 ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-gray-400"}`}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className={`p-2 ${viewMode === "list" ? "bg-slate-700 text-white" : "text-gray-400"}`}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="animate-pulse"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <div className="bg-slate-800/50 rounded-2xl h-96" />
                      </motion.div>
                    ))}
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-20 bg-slate-800/20 rounded-2xl border border-slate-700/50">
                    <Search className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-medium text-gray-300">No movies found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your search or filters.</p>
                  </div>
                ) : (
                  <div
                    className={`grid gap-6 ${
                      viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
                    }`}
                  >
                    {filteredResults.map((movie, index) => (
                      <motion.div
                        key={movie.movie_id || index}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                      >
                        <TiltedCard>
                          <Card 
                            onClick={() => openMovieDetails(movie)}
                            className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:bg-slate-700/50 transition-all duration-300 group cursor-pointer overflow-hidden rounded-2xl hover:shadow-xl hover:shadow-violet-500/10"
                          >
                            <CardContent className="p-0">
                              <div className={`${viewMode === "grid" ? "block" : "flex"}`}>
                                <div
                                  className={`${
                                    viewMode === "grid" ? "aspect-[2/3]" : "w-32 h-48 flex-shrink-0"
                                  } bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden`}
                                >
                                  {movie.poster_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                      src={getPoster(movie.poster_url)} 
                                      alt={movie.title} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                    />
                                  ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                       <span className="text-slate-500 font-medium px-4 text-center">{movie.title}</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                  <motion.div
                                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                                  >
                                    <Info className="w-12 h-12 text-white/80 drop-shadow-lg" />
                                  </motion.div>
                                  <div className="absolute top-3 left-3">
                                    <Badge className="bg-fuchsia-500/90 text-white backdrop-blur-sm shadow-lg">
                                      Movie
                                    </Badge>
                                  </div>
                                  <div className="absolute top-3 right-3">
                                    <div
                                      className={`flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm ${getRatingColor(movie.rating)} shadow-lg border border-slate-700/50`}
                                    >
                                      <Star className="w-3 h-3 fill-current" />
                                      <span className="text-xs font-medium ml-1">{movie.rating ? movie.rating.toFixed(1) : "N/A"}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`p-4 ${viewMode === "list" ? "flex-1 flex flex-col justify-center" : ""}`}>
                                  <h3 className="font-bold text-white text-lg mb-2 line-clamp-1 group-hover:text-fuchsia-300 transition-colors">{movie.title}</h3>
                                  <div className="flex items-center gap-2 mb-3 overflow-hidden">
                                    {movie.genres && movie.genres.length > 0 && (
                                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-300 whitespace-nowrap">
                                        {movie.genres[0]}
                                      </Badge>
                                    )}
                                    <span className="text-gray-400 text-sm flex items-center gap-1 whitespace-nowrap">
                                      <Calendar className="w-3 h-3" />
                                      {movie.year || "Unknown"}
                                    </span>
                                  </div>
                                  {viewMode === "list" && (
                                    <p className="text-gray-400 text-sm line-clamp-2">{movie.overview}</p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TiltedCard>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.section>
            )}
          </AnimatePresence>

          {/* Enhanced Featured Section with Auto-Scroll */}
          {!hasSearched && featuredMovies.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mb-12"
            >
              <div className="relative overflow-hidden rounded-3xl">
                <motion.div
                  className="flex transition-transform duration-1000 ease-in-out"
                  animate={{ x: `-${currentFeaturedIndex * 100}%` }}
                  style={{ width: `${extendedFeaturedMovies.length * 100}%` }}
                >
                  {extendedFeaturedMovies.map((movie, index) => (
                    <div key={`${movie.movie_id}-${index}`} className="w-full flex-shrink-0">
                      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 overflow-hidden shadow-2xl">
                        <CardContent className="p-0">
                          <div className="flex flex-col lg:flex-row h-96 relative">
                            {/* Background blur for the whole card */}
                            <div 
                              className="absolute inset-0 opacity-20 blur-3xl pointer-events-none"
                              style={{ 
                                backgroundImage: `url(${getPoster(movie.poster_url)})`,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                              }}
                            />
                            
                            <div className="w-full lg:w-1/3 h-full relative z-10 hidden lg:block p-4">
                               <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl relative border border-slate-700/50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={getPoster(movie.poster_url)} 
                                  alt={movie.title}
                                  className="w-full h-full object-cover"
                                />
                                <Badge className="absolute top-4 left-4 bg-fuchsia-500 text-white shadow-lg">
                                  Top Rated
                                </Badge>
                               </div>
                            </div>

                            <div className="w-full lg:w-2/3 h-full bg-slate-900/40 backdrop-blur-md p-6 lg:p-10 flex flex-col justify-center z-10">
                              <ShinyText
                                text={movie.title}
                                speed={6}
                                className="text-3xl lg:text-4xl font-bold text-white mb-3 line-clamp-1"
                              />
                              
                              <div className="flex flex-wrap items-center gap-3 mb-4">
                                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-sm">
                                  Movie
                                </Badge>
                                {movie.genres && movie.genres.slice(0, 2).map((g: string) => (
                                  <Badge key={g} variant="outline" className="border-slate-600 text-slate-300 text-sm">
                                    {g}
                                  </Badge>
                                ))}
                                <span className="text-gray-300 flex items-center gap-1 text-sm font-medium bg-black/30 px-3 py-1 rounded-full">
                                  <Star className="w-4 h-4 text-amber-400 fill-current" />
                                  {movie.rating ? movie.rating.toFixed(1) : "N/A"}
                                </span>
                                <span className="text-gray-400 flex items-center gap-1 text-sm">
                                  <Calendar className="w-4 h-4" />
                                  {movie.year || "Unknown"}
                                </span>
                              </div>

                              <p className="text-gray-300 text-base lg:text-lg mb-6 leading-relaxed line-clamp-3 md:line-clamp-4">
                                {movie.overview || "No overview available."}
                              </p>
                              
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-fit">
                                <Button 
                                  onClick={() => openMovieDetails(movie)}
                                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white px-8 py-6 rounded-xl text-lg font-medium shadow-lg shadow-violet-500/25 border-0"
                                >
                                  <Sparkles className="w-5 h-5 mr-2" />
                                  Find Similar
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </motion.div>

                {/* Carousel Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
                  {featuredMovies.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFeaturedIndex(index + 2)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        (currentFeaturedIndex - 2) % featuredMovies.length === index
                          ? "bg-fuchsia-500 w-8"
                          : "bg-white/30 hover:bg-white/50 w-2"
                      }`}
                    />
                  ))}
                </div>

                {/* Navigation Arrows */}
                <button
                  onClick={() => setCurrentFeaturedIndex(prev => prev - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all duration-300 backdrop-blur-md z-20 border border-white/10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setCurrentFeaturedIndex(prev => prev + 1)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-all duration-300 backdrop-blur-md z-20 border border-white/10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </motion.section>
          )}

          {/* Enhanced Popular Genres */}
          {!hasSearched && popularGenres.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mb-12"
            >
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-violet-400" />
                Popular Genres
              </h3>
              <div className="flex flex-wrap gap-3">
                {popularGenres.map((genre, index) => (
                  <motion.button
                    key={genre}
                    onClick={() => handleQuickSearch(genre)}
                    className="px-6 py-3 bg-slate-800/50 hover:bg-slate-700/50 backdrop-blur-sm rounded-full text-gray-300 hover:text-white transition-all duration-300 border border-slate-700 hover:border-violet-500/50 flex items-center gap-2 shadow-lg hover:shadow-violet-500/10"
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
                  >
                    <Star className="w-4 h-4 text-fuchsia-400" />
                    {genre}
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {/* Enhanced Trending Today */}
              {!hasSearched && trendingMovies.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                  className="mb-12"
                >
                  <div className="flex items-center justify-between mb-6">
                    <ShinyText text="Popular Movies" speed={8} className="text-2xl font-bold text-white" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {trendingMovies.map((movie, index) => (
                      <motion.div
                        key={movie.movie_id || index}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.9 + index * 0.05 }}
                      >
                        <TiltedCard>
                          <Card 
                            onClick={() => openMovieDetails(movie)}
                            className="bg-slate-800/50 backdrop-blur-sm border-slate-700 hover:bg-slate-700/50 transition-all duration-300 group cursor-pointer overflow-hidden rounded-xl shadow-lg hover:shadow-violet-500/10"
                          >
                            <CardContent className="p-0">
                              <div className="aspect-[2/3] bg-gradient-to-br from-slate-700 to-slate-800 relative overflow-hidden">
                                {movie.poster_url && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={getPoster(movie.poster_url)} 
                                    alt={movie.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                                  />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                                
                                <div className="absolute top-2 right-2">
                                  <Badge className="bg-black/60 backdrop-blur-md text-white text-xs border border-white/10 shadow-lg flex items-center gap-1">
                                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                                    {movie.rating ? movie.rating.toFixed(1) : "N/A"}
                                  </Badge>
                                </div>
                                <div className="absolute bottom-3 left-3 right-3">
                                  <h4 className="font-bold text-white text-sm mb-1 line-clamp-2 leading-tight drop-shadow-md">{movie.title}</h4>
                                  <p className="text-slate-300 text-xs flex items-center gap-1">
                                    {movie.year || "Unknown"}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </TiltedCard>
                      </motion.div>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>

            <div className="space-y-8">
              {/* Enhanced Recent Searches */}
              {!hasSearched && recentSearches.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.7 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      Recent Searches
                    </h3>
                    <Button variant="ghost" size="sm" onClick={clearRecentSearches} className="text-fuchsia-400 hover:text-fuchsia-300 h-8 px-2 text-xs">
                      Clear
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {recentSearches.map((search, index) => (
                      <motion.button
                        key={`${search}-${index}`}
                        onClick={() => handleQuickSearch(search)}
                        className="w-full flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-700/50 backdrop-blur-sm rounded-xl text-left transition-all duration-300 border border-slate-700/50 hover:border-slate-500 group shadow-sm"
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * index }}
                      >
                        <div className="flex items-center gap-3">
                          <Search className="w-4 h-4 text-gray-500 group-hover:text-fuchsia-400 transition-colors" />
                          <span className="text-gray-300 group-hover:text-white transition-colors text-sm">{search}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.section>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Movie Details & Recommendations Modal */}
      <Dialog open={!!selectedMovie} onOpenChange={(open) => !open && setSelectedMovie(null)}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-700 text-slate-100 p-0 overflow-hidden rounded-3xl">
          {selectedMovie && (
            <div className="flex flex-col md:flex-row max-h-[85vh] overflow-y-auto custom-scrollbar">
              {/* Left sidebar - Poster & Details */}
              <div className="w-full md:w-1/3 bg-slate-950 p-6 flex flex-col gap-4 shrink-0">
                <div className="rounded-xl overflow-hidden shadow-2xl border border-slate-800 relative aspect-[2/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={getPoster(selectedMovie.poster_url)} 
                    alt={selectedMovie.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                    <Star className="w-3 h-3 text-amber-400 fill-current" />
                    <span className="text-xs font-bold text-white">{selectedMovie.rating ? selectedMovie.rating.toFixed(1) : "N/A"}</span>
                  </div>
                </div>
                
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-2 leading-tight">
                    {selectedMovie.title}
                  </DialogTitle>
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>{selectedMovie.year}</span>
                    {selectedMovie.runtime > 0 && (
                      <>
                        <span>•</span>
                        <span>{selectedMovie.runtime} min</span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedMovie.genres && selectedMovie.genres.map((g: string) => (
                      <Badge key={g} variant="secondary" className="bg-slate-800 text-slate-300 hover:bg-slate-700">
                        {g}
                      </Badge>
                    ))}
                  </div>

                  {selectedMovie.director && (
                    <div className="mb-2 text-sm">
                      <span className="text-slate-500">Director: </span>
                      <span className="text-slate-200">{selectedMovie.director}</span>
                    </div>
                  )}
                  
                  {selectedMovie.cast && selectedMovie.cast.length > 0 && (
                    <div className="text-sm">
                      <span className="text-slate-500">Cast: </span>
                      <span className="text-slate-200">{selectedMovie.cast.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right area - Overview & Recommendations */}
              <div className="w-full md:w-2/3 p-6 lg:p-8 flex flex-col">
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Info className="w-5 h-5 text-fuchsia-400" />
                    Overview
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                    {selectedMovie.overview || "No overview available for this movie."}
                  </p>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                    <div className="p-2 bg-violet-500/20 rounded-lg">
                      <Sparkles className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Because you selected</h3>
                      <p className="text-slate-400 text-sm">AI-powered recommendations based on content similarity</p>
                    </div>
                  </div>

                  {isRecLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex gap-4 animate-pulse bg-slate-800/30 p-3 rounded-xl border border-slate-700/30">
                          <div className="w-16 h-24 bg-slate-700/50 rounded-lg shrink-0"></div>
                          <div className="flex-1 py-2 space-y-3">
                            <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
                            <div className="h-3 bg-slate-700/50 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : recommendations.length > 0 ? (
                    <div className="space-y-3">
                      {recommendations.map((rec, i) => (
                        <motion.div 
                          key={rec.movie_id || i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => openMovieDetails(rec)}
                          className="flex gap-4 p-3 rounded-xl bg-slate-800/20 hover:bg-slate-700/40 border border-transparent hover:border-slate-600 cursor-pointer transition-all group"
                        >
                          <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0 border border-slate-700 bg-slate-800">
                             {/* eslint-disable-next-line @next/next/no-img-element */}
                             <img 
                               src={getPoster(rec.poster_url)} 
                               alt={rec.title}
                               className="w-full h-full object-cover"
                             />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-white text-base truncate pr-2 group-hover:text-violet-400 transition-colors">{rec.title}</h4>
                              <div className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 shrink-0">
                                {Math.round(rec.similarity_score * 100)}% Match
                              </div>
                            </div>
                            <div className="text-xs text-slate-400 mb-2 truncate">
                              {rec.year} • {rec.genres?.slice(0, 2).join(", ")}
                            </div>
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {rec.overview}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-slate-400">No recommendations found for this movie.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
