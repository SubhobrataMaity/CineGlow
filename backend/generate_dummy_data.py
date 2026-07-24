import os
import pandas as pd
import json

data_dir = 'data'
os.makedirs(data_dir, exist_ok=True)

# Fake Movies
movies_data = [
    {
        "movie_id": 19995,
        "title": "Avatar",
        "genres": json.dumps([{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}, {"id": 14, "name": "Fantasy"}, {"id": 878, "name": "Science Fiction"}]),
        "keywords": json.dumps([{"id": 1463, "name": "culture clash"}, {"id": 2964, "name": "future"}, {"id": 3386, "name": "space war"}]),
        "overview": "In the 22nd century, a paraplegic Marine is dispatched to the moon Pandora on a unique mission, but becomes torn between following orders and protecting an alien civilization.",
        "vote_average": 7.2,
        "vote_count": 11800,
        "release_date": "2009-12-10",
        "runtime": 162,
        "popularity": 150.437577,
        "original_language": "en",
        "poster_path": "/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg"
    },
    {
        "movie_id": 285,
        "title": "Pirates of the Caribbean: At World's End",
        "genres": json.dumps([{"id": 12, "name": "Adventure"}, {"id": 14, "name": "Fantasy"}, {"id": 28, "name": "Action"}]),
        "keywords": json.dumps([{"id": 270, "name": "ocean"}, {"id": 726, "name": "drug abuse"}, {"id": 911, "name": "exotic island"}]),
        "overview": "Captain Barbossa, long believed to be dead, has come back to life and is headed to the edge of the Earth with Will Turner and Elizabeth Swann. But nothing is quite as it seems.",
        "vote_average": 6.9,
        "vote_count": 4500,
        "release_date": "2007-05-19",
        "runtime": 169,
        "popularity": 139.082615,
        "original_language": "en",
        "poster_path": "/jGWpG4YhpQwVmjyHEGkxEkeRf0S.jpg"
    },
    {
        "movie_id": 206647,
        "title": "Spectre",
        "genres": json.dumps([{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}, {"id": 80, "name": "Crime"}]),
        "keywords": json.dumps([{"id": 470, "name": "spy"}, {"id": 818, "name": "based on novel"}, {"id": 4289, "name": "secret agent"}]),
        "overview": "A cryptic message from Bond’s past sends him on a trail to uncover a sinister organization. While M battles political forces to keep the secret service alive, Bond peels back the layers of deceit to reveal the terrible truth behind SPECTRE.",
        "vote_average": 6.3,
        "vote_count": 4466,
        "release_date": "2015-10-26",
        "runtime": 148,
        "popularity": 107.376788,
        "original_language": "en",
        "poster_path": "/rTj1G0sDqKzM2O0yBifC5K3h2sQ.jpg"
    },
    {
        "movie_id": 49026,
        "title": "The Dark Knight Rises",
        "genres": json.dumps([{"id": 28, "name": "Action"}, {"id": 80, "name": "Crime"}, {"id": 18, "name": "Drama"}, {"id": 53, "name": "Thriller"}]),
        "keywords": json.dumps([{"id": 849, "name": "dc comics"}, {"id": 853, "name": "crime fighter"}, {"id": 949, "name": "terrorist"}]),
        "overview": "Following the death of District Attorney Harvey Dent, Batman assumes responsibility for Dent's crimes to protect the late attorney's reputation and is subsequently hunted by the Gotham City Police Department. Eight years later, Batman encounters the mysterious Selina Kyle and the villainous Bane, a new terrorist leader who overwhelms Gotham's finest. The Dark Knight resurfaces to protect a city that has branded him an enemy.",
        "vote_average": 7.6,
        "vote_count": 9106,
        "release_date": "2012-07-16",
        "runtime": 165,
        "popularity": 112.31295,
        "original_language": "en",
        "poster_path": "/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg"
    },
    {
        "movie_id": 559,
        "title": "Spider-Man 3",
        "genres": json.dumps([{"id": 14, "name": "Fantasy"}, {"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}]),
        "keywords": json.dumps([{"id": 851, "name": "dual identity"}, {"id": 1453, "name": "amnesia"}, {"id": 1965, "name": "sandstorm"}]),
        "overview": "The seemingly invincible Spider-Man goes up against an all-new crop of villains - including the shape-shifting Sandman. While Spider-Man's superpowers are altered by an alien organism, his alter ego, Peter Parker, deals with nemesis Eddie Brock and also gets caught up in a love triangle.",
        "vote_average": 5.9,
        "vote_count": 3576,
        "release_date": "2007-05-01",
        "runtime": 139,
        "popularity": 115.699814,
        "original_language": "en",
        "poster_path": "/qFmwhVUoUSXjkKRmca5yGEXVYPA.jpg"
    }
]

# Fake Credits
credits_data = [
    {
        "movie_id": 19995,
        "title": "Avatar",
        "cast": json.dumps([{"name": "Sam Worthington"}, {"name": "Zoe Saldana"}, {"name": "Sigourney Weaver"}]),
        "crew": json.dumps([{"job": "Director", "name": "James Cameron"}])
    },
    {
        "movie_id": 285,
        "title": "Pirates of the Caribbean: At World's End",
        "cast": json.dumps([{"name": "Johnny Depp"}, {"name": "Orlando Bloom"}, {"name": "Keira Knightley"}]),
        "crew": json.dumps([{"job": "Director", "name": "Gore Verbinski"}])
    },
    {
        "movie_id": 206647,
        "title": "Spectre",
        "cast": json.dumps([{"name": "Daniel Craig"}, {"name": "Christoph Waltz"}, {"name": "Léa Seydoux"}]),
        "crew": json.dumps([{"job": "Director", "name": "Sam Mendes"}])
    },
    {
        "movie_id": 49026,
        "title": "The Dark Knight Rises",
        "cast": json.dumps([{"name": "Christian Bale"}, {"name": "Michael Caine"}, {"name": "Gary Oldman"}]),
        "crew": json.dumps([{"job": "Director", "name": "Christopher Nolan"}])
    },
    {
        "movie_id": 559,
        "title": "Spider-Man 3",
        "cast": json.dumps([{"name": "Tobey Maguire"}, {"name": "Kirsten Dunst"}, {"name": "James Franco"}]),
        "crew": json.dumps([{"job": "Director", "name": "Sam Raimi"}])
    }
]

pd.DataFrame(movies_data).to_csv(os.path.join(data_dir, 'tmdb_5000_movies.csv'), index=False)
pd.DataFrame(credits_data).to_csv(os.path.join(data_dir, 'tmdb_5000_credits.csv'), index=False)
print("Dummy data created successfully!")
