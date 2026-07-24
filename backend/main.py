"""
CineGlow FastAPI Backend
=========================
Serves movie recommendations, search, and movie data.

Endpoints:
  GET  /                   → health check
  GET  /movies             → paginated list of movies (with filters)
  GET  /movies/search      → fuzzy search by title
  GET  /movies/{movie_id}  → single movie details
  POST /recommend          → get recommendations for a movie title
  GET  /movies/titles      → list of all movie titles (for autocomplete)

Usage:
  python main.py
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pickle
import os
import difflib
from typing import List, Optional

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CineGlow API",
    description="Movie recommendation engine powered by content-based filtering",
    version="1.0.0",
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Load model data
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIE_LIST_PATH = os.path.join(BASE_DIR, "movie_list.pkl")
SIMILARITY_PATH = os.path.join(BASE_DIR, "similarity.pkl")
MOVIE_DATA_PATH = os.path.join(BASE_DIR, "movie_data.pkl")

TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"


def load_data():
    """Load pickle files. Returns (movie_list_df, similarity_matrix, movie_data_df)."""
    if not os.path.exists(MOVIE_LIST_PATH):
        raise FileNotFoundError(
            f"Model file not found: {MOVIE_LIST_PATH}\n"
            "Run 'python train_model.py' first to generate the model."
        )

    with open(MOVIE_LIST_PATH, "rb") as f:
        movie_list = pickle.load(f)
    with open(SIMILARITY_PATH, "rb") as f:
        similarity = pickle.load(f)

    movie_data = None
    if os.path.exists(MOVIE_DATA_PATH):
        with open(MOVIE_DATA_PATH, "rb") as f:
            movie_data = pickle.load(f)

    return movie_list, similarity, movie_data


try:
    movies_model, similarity, movies_rich = load_data()
    print(f"✓ Loaded model: {len(movies_model)} movies, similarity matrix {similarity.shape}")
    if movies_rich is not None:
        print(f"✓ Loaded rich data: {len(movies_rich)} movies with metadata")
except FileNotFoundError as e:
    print(f"⚠ {e}")
    print("The server will start but recommendation endpoints won't work.")
    movies_model = None
    similarity = None
    movies_rich = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def get_movie_info(title: str) -> dict:
    """Get rich movie info by title. Falls back to basic info if rich data unavailable."""
    result = {
        "title": title,
        "movie_id": 0,
        "overview": "",
        "genres": [],
        "cast": [],
        "director": "",
        "year": 0,
        "rating": 0.0,
        "vote_count": 0,
        "runtime": 0,
        "popularity": 0.0,
        "poster_url": "",
    }

    if movies_rich is not None:
        match = movies_rich[movies_rich["title"] == title]
        if not match.empty:
            row = match.iloc[0]
            result["movie_id"] = int(row.get("movie_id", 0))
            result["overview"] = str(row.get("overview", ""))
            result["genres"] = row.get("genres_list", []) if "genres_list" in row.index else []
            result["cast"] = row.get("cast_list", []) if "cast_list" in row.index else []
            result["director"] = str(row.get("director", ""))
            result["year"] = int(row.get("year", 0))
            result["rating"] = float(row.get("vote_average", 0))
            result["vote_count"] = int(row.get("vote_count", 0))
            result["runtime"] = int(row.get("runtime", 0)) if "runtime" in row.index else 0
            result["popularity"] = float(row.get("popularity", 0))

            poster_path = row.get("poster_path", "")
            if poster_path and str(poster_path) != "" and str(poster_path) != "nan":
                result["poster_url"] = f"{TMDB_IMAGE_BASE}{poster_path}"

    # Get movie_id from model data if not found in rich data
    if result["movie_id"] == 0 and movies_model is not None:
        match = movies_model[movies_model["title"] == title]
        if not match.empty:
            result["movie_id"] = int(match.iloc[0]["movie_id"])

    return result


def get_recommendations(title: str, n: int = 5) -> List[dict]:
    """Get N movie recommendations for a given title."""
    if movies_model is None or similarity is None:
        return []

    match = movies_model[movies_model["title"] == title]
    if match.empty:
        return []

    index = match.index[0]
    distances = sorted(
        list(enumerate(similarity[index])), reverse=True, key=lambda x: x[1]
    )

    recommendations = []
    for i in distances[1 : n + 1]:
        rec_title = movies_model.iloc[i[0]].title
        rec_info = get_movie_info(rec_title)
        rec_info["similarity_score"] = round(float(i[1]), 4)
        recommendations.append(rec_info)

    return recommendations


# ---------------------------------------------------------------------------
# Request/Response models
# ---------------------------------------------------------------------------

class RecommendRequest(BaseModel):
    title: str
    count: Optional[int] = 5


class MovieResponse(BaseModel):
    movie_id: int
    title: str
    overview: str
    genres: List[str]
    cast: List[str]
    director: str
    year: int
    rating: float
    vote_count: int
    runtime: int
    popularity: float
    poster_url: str


class RecommendResponse(BaseModel):
    query: str
    recommendations: List[dict]


class SearchResponse(BaseModel):
    query: str
    results: List[dict]
    total: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
def root():
    """Health check."""
    return {
        "status": "ok",
        "app": "CineGlow API",
        "movies_loaded": movies_model is not None,
        "total_movies": len(movies_model) if movies_model is not None else 0,
    }


@app.get("/movies")
def list_movies(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    sort: str = Query("popular", regex="^(popular|rating|title|year)$"),
    genre: Optional[str] = Query(None),
):
    """Get a paginated list of movies, optionally filtered by genre."""
    if movies_rich is None:
        raise HTTPException(status_code=503, detail="Movie data not loaded. Run train_model.py first.")

    df = movies_rich.copy()

    # Filter by genre
    if genre:
        genre_lower = genre.lower()
        df = df[df["genres_list"].apply(
            lambda genres: any(g.lower() == genre_lower for g in genres)
        )]

    # Sort
    if sort == "popular":
        df = df.sort_values("popularity", ascending=False)
    elif sort == "rating":
        df = df.sort_values("vote_average", ascending=False)
    elif sort == "title":
        df = df.sort_values("title", ascending=True)
    elif sort == "year":
        df = df.sort_values("year", ascending=False)

    total = len(df)
    df = df.iloc[offset : offset + limit]

    results = []
    for _, row in df.iterrows():
        results.append(get_movie_info(row["title"]))

    return {"results": results, "total": total, "limit": limit, "offset": offset}


@app.get("/movies/search")
def search_movies(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Search movies by title with fuzzy matching."""
    if movies_model is None:
        raise HTTPException(status_code=503, detail="Movie data not loaded.")

    query_lower = q.lower().strip()
    all_titles = movies_model["title"].tolist()
    titles_lower = [t.lower() for t in all_titles]

    # 1. Exact substring match first
    substring_matches = []
    for i, t in enumerate(titles_lower):
        if query_lower in t:
            substring_matches.append(all_titles[i])

    # 2. Fuzzy match as fallback
    fuzzy_matches = difflib.get_close_matches(query_lower, titles_lower, n=limit, cutoff=0.4)
    fuzzy_titles = []
    for match in fuzzy_matches:
        idx = titles_lower.index(match)
        fuzzy_titles.append(all_titles[idx])

    # Combine: substring matches first, then fuzzy (deduped)
    seen = set()
    combined = []
    for title in substring_matches + fuzzy_titles:
        if title not in seen:
            seen.add(title)
            combined.append(title)

    # Limit results
    combined = combined[:limit]

    results = [get_movie_info(title) for title in combined]

    return SearchResponse(query=q, results=results, total=len(results))


@app.get("/movies/titles")
def get_titles():
    """Get all movie titles (for autocomplete)."""
    if movies_model is None:
        raise HTTPException(status_code=503, detail="Movie data not loaded.")

    titles = sorted(movies_model["title"].tolist())
    return {"titles": titles, "total": len(titles)}


@app.get("/movies/{movie_id}")
def get_movie(movie_id: int):
    """Get a single movie by its TMDB ID."""
    if movies_rich is None:
        raise HTTPException(status_code=503, detail="Movie data not loaded.")

    match = movies_rich[movies_rich["movie_id"] == movie_id]
    if match.empty:
        raise HTTPException(status_code=404, detail="Movie not found")

    title = match.iloc[0]["title"]
    info = get_movie_info(title)
    return info


@app.post("/recommend")
def recommend(request: RecommendRequest):
    """Get movie recommendations based on content similarity."""
    if movies_model is None or similarity is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Run train_model.py first.")

    title = request.title
    count = min(request.count or 5, 20)

    # Check if exact title exists
    if title not in movies_model["title"].values:
        # Try fuzzy match
        all_titles = movies_model["title"].tolist()
        titles_lower = [t.lower() for t in all_titles]
        close = difflib.get_close_matches(title.lower(), titles_lower, n=1, cutoff=0.6)
        if close:
            idx = titles_lower.index(close[0])
            title = all_titles[idx]
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Movie '{request.title}' not found. Try searching first."
            )

    recommendations = get_recommendations(title, n=count)
    query_info = get_movie_info(title)

    return {
        "query": title,
        "query_info": query_info,
        "recommendations": recommendations,
    }


@app.get("/genres")
def list_genres():
    """Get all available genres."""
    if movies_rich is None:
        raise HTTPException(status_code=503, detail="Movie data not loaded.")

    all_genres = set()
    for genres_list in movies_rich["genres_list"]:
        if isinstance(genres_list, list):
            all_genres.update(genres_list)

    return {"genres": sorted(list(all_genres))}


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)