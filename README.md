# Carolina Data Challenge

## Team Member: Xiyun (Eric) Hu, Zhuoran (Thomas) You, Xinyue (Alice) Yang, Qi (Gloria) Yang

## Python and Tableau Data Analysis codes are live at the main branch; the webapp is live at website branch

## Data Sources
- [NASA Astronaut Yearbook (Kaggle)](https://www.kaggle.com/datasets/nasa/astronaut-yearbook/data) — demographic, educational, military, and mission details for astronauts selected since 1959 based on NASA's 2013 Astronaut Fact Book, illustrating the shift from military pilots toward scientists and specialists.
- [International Astronaut Database (CSIS Aerospace Security)](https://aerospace.csis.org/data/international-astronaut-database/) — records of 500+ astronauts from nearly 40 countries who have flown above 100 km since the 1960s, complementing U.S.-focused datasets.
- Social_Science.csv — combined biographical and mission-level records of astronauts worldwide (demographics, nationality, military background, selection year, mission roles, vehicles, durations), with one row per mission participation.

We outer-joined the three datasets on cleaned astronaut names (`Fn M. Ln` format) to avoid dropping observations absent from any single source, yielding roughly 1,700 mission-level records.
