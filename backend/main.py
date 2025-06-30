from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle
import os
from typing import List

app = FastAPI()

# Paths to the pickle files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MOVIE_LIST_PATH = os.path.join(BASE_DIR, 'movie_list.pkl')
SIMILARITY_PATH = os.path.join(BASE_DIR, 'similarity.pkl')

# Load the pickled data
with open(MOVIE_LIST_PATH, 'rb') as f:
    movies = pickle.load(f)
with open(SIMILARITY_PATH, 'rb') as f:
    similarity = pickle.load(f)

class RecommendRequest(BaseModel):
    title: str

class RecommendResponse(BaseModel):
    recommendations: List[str]

@app.post('/recommend', response_model=RecommendResponse)
def recommend(request: RecommendRequest):
    title = request.title
    if title not in movies['title'].values:
        raise HTTPException(status_code=404, detail='Movie not found')
    index = movies[movies['title'] == title].index[0]
    distances = list(enumerate(similarity[index]))
    distances = sorted(distances, reverse=True, key=lambda x: x[1])
    recommended_titles = [movies.iloc[i[0]].title for i in distances[1:6]]
    return RecommendResponse(recommendations=recommended_titles)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 