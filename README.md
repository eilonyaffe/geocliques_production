# GeoCliques

**GeoCliques** is a social, map-based web application where users can create and join "cliques" (groups), place markers on a map, leave reviews and events, and collaborate in a dynamic geospatial environment. The app features user authentication, interactive mapping with custom icons, notifications, multi-layer map support, and full admin control over user content.

## Features

- **Interactive Map**: Add markers, view reviews, and schedule events directly on a Leaflet.js map.
- **Cliques System**: Create, join, or manage public, protected, or private cliques.
- **Review System**: Leave star ratings and optional commentary for each marker.
- **Event Scheduling**: Plan and view events tied to specific locations.
- **Notifications**: Receive and manage invitations, join requests, bans, and kicks.
- **Admin Panel**: Manage clique membership, review content, and moderate user activities.
- **Custom Styling**: Dynamic marker icons, color-coded cliques, modern UI/UX styling.
- **Map Layers**: Switch between multiple map providers (OpenStreetMap, Esri Satellite, Thunderforest).

## Tech Stack

- **Backend**: Python, Flask, Flask-Login, Flask-SQLAlchemy
- **Frontend**: HTML5, Jinja2 Templates, JavaScript (vanilla), CSS
- **Database**: SQLite (local development)
- **Mapping**: Leaflet.js
- **Libraries**: RapidFuzz for search, Bootstrap Icons


## Folder Structure

```
geocliques/
├── static/
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript (universal.js)
│   └── uploads/     # Uploaded user profile pictures
├── templates/
│   ├── user/        # User-facing pages
│   ├── master/      # Master/admin pages
├── main.py          # Main Flask app
├── databases.py     # SQLAlchemy models
├── utils.py         # Helper functions (colors, validation)
├── requirements.txt
├── README.md
```

**GeoCliques** – Proprietary License (Personal and Educational Use Only)

Copyright © 2025

All rights reserved.

This software and associated documentation files (the "Software") are the exclusive property of the copyright holder.

You are **permitted** to:

- View and use the Software for **personal**, **non-commercial**, or **educational** purposes only.

You are **NOT permitted** to:

- Copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
- Use the Software for any **commercial**, **organizational**, or **public deployment** purposes.
- Reverse engineer, decompile, or disassemble any part of the Software.

Any use of the Software beyond these permissions requires prior, explicit, and written consent from the copyright holder.

---

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.  
IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
