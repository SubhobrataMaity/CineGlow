"""
CineGlow ML Model Training Script
===================================
Downloads the TMDB 5000 dataset and trains a content-based
movie recommendation model using cosine similarity on bag-of-words tags.

Produces:
  - movie_list.pkl   : DataFrame(movie_id, title, tags) — used by recommender
  - similarity.pkl   : cosine similarity matrix (4806 x 4806)
  - movie_data.pkl   : DataFrame with rich movie metadata for API responses

Usage:
  cd backend
  python train_model.py
"""

import os
import sys
import ast
import pickle
import requests
import zipfile
import io

import numpy as np
import pandas as pd
import nltk
from nltk.stem import PorterStemmer
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MOVIES_CSV = os.path.join(DATA_DIR, "tmdb_5000_movies.csv")
CREDITS_CSV = os.path.join(DATA_DIR, "tmdb_5000_credits.csv")

# Output pickle paths
MOVIE_LIST_PATH = os.path.join(BASE_DIR, "movie_list.pkl")
SIMILARITY_PATH = os.path.join(BASE_DIR, "similarity.pkl")
MOVIE_DATA_PATH = os.path.join(BASE_DIR, "movie_data.pkl")

# TMDB 5000 dataset URLs (public mirrors)
DATASET_URLS = [
    # Primary: direct CSV links from common public mirrors
    {
        "movies": "https://raw.githubusercontent.com/YBI-Foundation/Dataset/main/TMDB%205000%20Movies.csv",
        "credits": None,  # This source has only movies
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def download_file(url: str, dest: str) -> bool:
    """Download a file from URL to destination path."""
    try:
        print(f"  Downloading from {url[:80]}...")
        resp = requests.get(url, timeout=60, stream=True)
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"  ✓ Saved to {dest}")
        return True
    except Exception as e:
        print(f"  ✗ Failed: {e}")
        return False


def ensure_dataset():
    """Make sure the TMDB CSVs exist, download if needed."""
    os.makedirs(DATA_DIR, exist_ok=True)

    if os.path.exists(MOVIES_CSV) and os.path.exists(CREDITS_CSV):
        print("✓ Dataset files already exist.")
        return True

    print("\n⬇ Dataset files not found. Attempting download...")
    print("=" * 60)
    print("The TMDB 5000 dataset is required for training.")
    print("Please download it from Kaggle:")
    print("  https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata")
    print(f"\nPlace the following files in: {DATA_DIR}")
    print("  - tmdb_5000_movies.csv")
    print("  - tmdb_5000_credits.csv")
    print("=" * 60)

    # Try auto-download from GitHub mirrors
    movies_url = "https://raw.githubusercontent.com/danielgrijalva/movie-stats/master/tmdb_5000_movies.csv"
    credits_url = "https://raw.githubusercontent.com/danielgrijalva/movie-stats/master/tmdb_5000_credits.csv"

    if not os.path.exists(MOVIES_CSV):
        if not download_file(movies_url, MOVIES_CSV):
            print("\n✗ Could not auto-download movies CSV.")
            print(f"  Please manually place tmdb_5000_movies.csv in {DATA_DIR}")
            return False

    if not os.path.exists(CREDITS_CSV):
        if not download_file(credits_url, CREDITS_CSV):
            print("\n✗ Could not auto-download credits CSV.")
            print(f"  Please manually place tmdb_5000_credits.csv in {DATA_DIR}")
            return False

    return True


def convert(text):
    """Extract 'name' fields from JSON-like string."""
    result = []
    for item in ast.literal_eval(text):
        result.append(item["name"])
    return result


def convert_cast(text, limit=5):
    """Extract top N cast member names."""
    result = []
    for i, item in enumerate(ast.literal_eval(text)):
        if i >= limit:
            break
        result.append(item["name"])
    return result


def fetch_director(text):
    """Extract the director's name from crew JSON."""
    for item in ast.literal_eval(text):
        if item.get("job") == "Director":
            return [item["name"]]
    return []


def remove_space(words):
    """Remove spaces within multi-word names so they're treated as single tokens."""
    return [w.replace(" ", "") for w in words]


def extract_poster_path(text):
    """Safely extract poster_path, return empty string if not available."""
    if pd.isna(text) or text == "":
        return ""
    return str(text)


# ---------------------------------------------------------------------------
# Main Training Pipeline
# ---------------------------------------------------------------------------

def train():
    print("=" * 60)
    print("CineGlow - ML Model Training")
    print("=" * 60)

    # 1. Ensure data exists
    if not ensure_dataset():
        sys.exit(1)

    # 2. Load CSVs
    print("\nLoading datasets...")
    movies = pd.read_csv(MOVIES_CSV)
    credits = pd.read_csv(CREDITS_CSV)
    print(f"  Movies: {movies.shape}, Credits: {credits.shape}")

    # 3. Merge on title and movie_id (if both exist in both dataframes)
    if 'movie_id' in movies.columns and 'movie_id' in credits.columns:
        movies = movies.merge(credits, on=["title", "movie_id"])
    else:
        movies = movies.merge(credits, on="title")
    print(f"  Merged: {movies.shape}")

    # 4. Keep relevant columns for recommendation model
    model_cols = ["movie_id", "title", "genres", "keywords", "overview", "cast", "crew"]
    movies_model = movies[model_cols].copy()

    # 5. Also keep rich data for API responses
    rich_cols = [
        "movie_id", "title", "genres", "keywords", "overview", "cast", "crew",
        "vote_average", "vote_count", "release_date", "runtime", "popularity",
        "original_language",
    ]
    # Only keep columns that exist
    available_rich = [c for c in rich_cols if c in movies.columns]
    # Check for poster_path
    if "poster_path" in movies.columns:
        available_rich.append("poster_path")
    movies_rich = movies[available_rich].copy()

    # 6. Clean nulls
    movies_model.dropna(inplace=True)
    movies_model.drop_duplicates(subset="title", inplace=True)
    movies_model.reset_index(drop=True, inplace=True)
    print(f"  After cleaning: {movies_model.shape}")

    # 7. Process JSON columns
    print("\nProcessing features...")
    movies_model["genres"] = movies_model["genres"].apply(convert)
    movies_model["keywords"] = movies_model["keywords"].apply(convert)
    movies_model["cast"] = movies_model["cast"].apply(lambda x: convert_cast(x, limit=5))
    movies_model["crew"] = movies_model["crew"].apply(fetch_director)
    movies_model["overview"] = movies_model["overview"].apply(lambda x: x.split())

    # Remove spaces in multi-word names
    movies_model["genres"] = movies_model["genres"].apply(remove_space)
    movies_model["keywords"] = movies_model["keywords"].apply(remove_space)
    movies_model["cast"] = movies_model["cast"].apply(remove_space)
    movies_model["crew"] = movies_model["crew"].apply(remove_space)

    # 8. Combine into tags
    movies_model["tags"] = (
        movies_model["overview"]
        + movies_model["genres"]
        + movies_model["keywords"]
        + movies_model["cast"]
        + movies_model["crew"]
    )

    # 9. Create the final model DataFrame
    new_df = movies_model[["movie_id", "title", "tags"]].copy()
    new_df["tags"] = new_df["tags"].apply(lambda x: " ".join(x))
    new_df["tags"] = new_df["tags"].apply(lambda x: x.lower())

    # 10. Stemming
    print("  Applying Porter stemming...")
    nltk.download("punkt", quiet=True)
    ps = PorterStemmer()

    def stems(text):
        return " ".join([ps.stem(word) for word in text.split()])

    new_df["tags"] = new_df["tags"].apply(stems)

    # 11. Vectorize
    print("  Vectorizing (CountVectorizer, max_features=5000)...")
    cv = CountVectorizer(max_features=5000, stop_words="english")
    vectors = cv.fit_transform(new_df["tags"]).toarray()
    print(f"  Vector shape: {vectors.shape}")

    # 12. Cosine similarity
    print("  Computing cosine similarity matrix...")
    similarity = cosine_similarity(vectors)
    print(f"  Similarity matrix shape: {similarity.shape}")

    # 13. Process rich data for API
    print("\nPreparing rich movie data for API...")
    # Process genres for the rich data too (for display)
    movies_rich = movies_rich.copy()
    movies_rich.dropna(subset=["title", "overview"], inplace=True)
    movies_rich.drop_duplicates(subset="title", inplace=True)
    movies_rich.reset_index(drop=True, inplace=True)

    # Parse genres into lists of strings for the rich data
    def safe_convert_genres(text):
        try:
            return [item["name"] for item in ast.literal_eval(text)]
        except (ValueError, SyntaxError):
            return []

    def safe_convert_cast(text):
        try:
            return [item["name"] for i, item in enumerate(ast.literal_eval(text)) if i < 5]
        except (ValueError, SyntaxError):
            return []

    def safe_convert_director(text):
        try:
            for item in ast.literal_eval(text):
                if item.get("job") == "Director":
                    return item["name"]
        except (ValueError, SyntaxError):
            pass
        return ""

    movies_rich["genres_list"] = movies_rich["genres"].apply(safe_convert_genres)
    movies_rich["cast_list"] = movies_rich["cast"].apply(safe_convert_cast)
    movies_rich["director"] = movies_rich["crew"].apply(safe_convert_director)

    # Extract year from release_date
    if "release_date" in movies_rich.columns:
        movies_rich["year"] = pd.to_datetime(
            movies_rich["release_date"], errors="coerce"
        ).dt.year.fillna(0).astype(int)

    # Clean poster_path
    if "poster_path" in movies_rich.columns:
        movies_rich["poster_path"] = movies_rich["poster_path"].fillna("")
    else:
        movies_rich["poster_path"] = ""

    print(f"  Rich data shape: {movies_rich.shape}")

    # 14. Save pickle files
    print("\nSaving model files...")
    with open(MOVIE_LIST_PATH, "wb") as f:
        pickle.dump(new_df, f)
    print(f"  ✓ {MOVIE_LIST_PATH} ({os.path.getsize(MOVIE_LIST_PATH) / 1024:.0f} KB)")

    with open(SIMILARITY_PATH, "wb") as f:
        pickle.dump(similarity, f)
    print(f"  ✓ {SIMILARITY_PATH} ({os.path.getsize(SIMILARITY_PATH) / 1024 / 1024:.1f} MB)")

    with open(MOVIE_DATA_PATH, "wb") as f:
        pickle.dump(movies_rich, f)
    print(f"  ✓ {MOVIE_DATA_PATH} ({os.path.getsize(MOVIE_DATA_PATH) / 1024:.0f} KB)")

    # 15. Quick test
    print("\nQuick test - recommendations for 'Avatar':")
    test_title = "Avatar"
    if test_title in new_df["title"].values:
        idx = new_df[new_df["title"] == test_title].index[0]
        distances = sorted(
            list(enumerate(similarity[idx])), reverse=True, key=lambda x: x[1]
        )
        for i in distances[1:6]:
            print(f"  → {new_df.iloc[i[0]].title}")
    else:
        print("  (Avatar not found in dataset)")

    print("\nTraining complete! Model files saved to backend/")
    print("   Run 'python main.py' to start the API server.")


if __name__ == "__main__":
    train()
