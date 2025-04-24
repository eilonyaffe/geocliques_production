// run only if #map exists (to avoid errors on non-map pages)
if (document.getElementById("map") && !window.disableUniversalMap) {
  var map = L.map('map').setView([31.0461, 34.8516], 8);

  const layerName = window.selectedMapLayer || "default";

  const providerUrls = {
      default: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      "OpenStreetMap.HOT": "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      "Esri.WorldImagery": "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "Thunderforest.Transport": `https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${MAP_KEYS?.thunderforest || ""}`,
      "Thunderforest.OpenCycleMap": `https://tile.thunderforest.com/cycle/{z}/{x}/{y}.png?apikey=${MAP_KEYS?.thunderforest || ""}`,
      "Thunderforest.Outdoors": `https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=${MAP_KEYS?.thunderforest || ""}`,
  };

  const providerAtt = {
    default: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Maps by <a href="https://leafletjs.com/">Leaflet</a>',
    "OpenStreetMap.HOT": '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
                'Tiles style by <a href="https://www.hotosm.org/">Humanitarian OpenStreetMap Team</a> | Maps by <a href="https://leafletjs.com/">Leaflet</a>',
    "Esri.WorldImagery": 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, i-cubed, USDA, USGS, AEX, ' +
               'GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community | Maps by <a href="https://leafletjs.com/">Leaflet</a>',
    "Thunderforest.Transport": '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, ' +
               'Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | Maps by <a href="https://leafletjs.com/">Leaflet</a>',
    "Thunderforest.OpenCycleMap": '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, ' +
               'Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | Maps by <a href="https://leafletjs.com/">Leaflet</a>',
    "Thunderforest.Outdoors": '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, ' +
               'Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> | Maps by <a href="https://leafletjs.com/">Leaflet</a>',
  };

  L.tileLayer(providerUrls[layerName], {
    attribution: providerAtt[layerName],
    maxZoom: 19,
  }).addTo(map);


  let allGeoJsonLayer = null;

  function getStarDisplay(avg) {
    let fullStars = Math.round(avg);
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span style="color:${i <= fullStars ? 'gold' : 'gray'};">&#9733;</span>`;
    }
    return starsHtml;
  }

  function initReviewStars(markerId) {
    const container = document.querySelector(`.rating-stars[data-marker="${markerId}"]`);
    if (!container) return;

    const stars = container.querySelectorAll(".review-star");

    container.addEventListener("mouseover", function (e) {
      if (e.target.classList.contains("review-star")) {
        const hoverVal = parseInt(e.target.dataset.value);
        stars.forEach(star => {
          const val = parseInt(star.dataset.value);
          star.classList.toggle("gold", val <= hoverVal);
        });
      }
    });

    container.addEventListener("mouseout", function () {
      const selected = parseInt(container.getAttribute("data-selected") || "0");
      stars.forEach(star => {
        const val = parseInt(star.dataset.value);
        star.classList.toggle("gold", val <= selected);
      });
    });

    stars.forEach(star => {
      star.addEventListener("click", function () {
        const value = parseInt(this.dataset.value);
        container.setAttribute("data-selected", value);
        stars.forEach(s => {
          const val = parseInt(s.dataset.value);
          s.classList.toggle("gold", val <= value);
        });
      });
    });
  }

  function loadMarkers() {
    fetch('/geojson-features')
      .then(response => response.json())
      .then(data => {
        if (allGeoJsonLayer && map.hasLayer(allGeoJsonLayer)) {
          map.removeLayer(allGeoJsonLayer);
        }

        const selectedCliqueIds = getSelectedCliqueIds();

        allGeoJsonLayer = L.geoJSON(data, {
          filter: feature => selectedCliqueIds.includes(feature.properties.clique_id),
          pointToLayer: function (feature, latlng) {
            const desc = feature.properties.description;
            const markerId = feature.properties.marker_id;
            const avg = feature.properties.average_review.toFixed(1);
            const total = feature.properties.total_reviews;
            const userReview = feature.properties.user_review;
            const otherReviews = feature.properties.reviews;
            const userEvents = feature.properties.user_events;
            const otherEvents = feature.properties.events;
            const stars = getStarDisplay(avg);
            const color = feature.properties.clique_color;
            const markerIcon = feature.properties.icon;
            const cliqueId = feature.properties.clique_id;

            let popupContent = `
              <div>
                <strong>${desc}</strong><br>
                <div style="margin: 5px 0;">Average Rating: ${stars} (${avg} / 5 from ${total} reviews)</div>
            `;

            if (userReview) {
              const userStars = getStarDisplay(userReview.stars);
              const userComment = userReview.commentary ? `"${userReview.commentary}"` : '';
              popupContent += `
                <hr>
                <div style="color: gray;">
                  <strong>Your Review:</strong><br>
                  Stars: ${userStars}<br>
                  ${userComment}
                </div>
                <a href="/edit-review/${markerId}">
                  <button class="btn btn-warning" style="margin-top:5px;">Edit Review</button>
                </a>
              `;
            } else {
              popupContent += `
                <label>Leave a review:</label><br>
                <div class="rating-stars" data-marker="${markerId}" data-selected="0">
                  ${[1, 2, 3, 4, 5].map(i => `<span class="review-star" data-value="${i}">&#9733;</span>`).join('')}
                </div><br>
                <textarea id="review-comment-${markerId}" rows="3" placeholder="Your review (optional)"></textarea><br>
                <button onclick="submitReview(${markerId})" class="btn btn-primary">Submit Review</button>
              `;
            }

            if (otherReviews.length > 0) {
              popupContent += `
                <hr>
                <div style="max-height: 120px; overflow-y: auto;">
                  <strong>Other Reviews:</strong><br>
                  <ul style="padding-left: 18px;">
              `;
              otherReviews.forEach(r => {
                popupContent += `
                  <li style="display: flex; align-items: flex-start; padding: 10px 0 0 0;">
                  ${
                    r.user_pic !== 'default.jpg'
                      ? `<img src="/static/uploads/${r.user_pic}"
                              alt="User"
                              style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; margin-right: 10px;">`
                      : `<i class="bi bi-person-circle"
                             style="font-size: 2.05rem; color: #888; margin-right: 10px; width: 32px; height: 32px;"></i>`
                  }
                    <div>
                      ${getStarDisplay(r.stars)}
                      ${r.commentary ? `"${r.commentary}"` : ''}
                      <em>(${r.user})</em>
                    </div>
                  </li>`;
              });

              popupContent += `
                  </ul>
                </div>
              `;
            }

            // check if any event is between today and 3 days from now (inclusive)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 3);
            const allEvents = userEvents.concat(otherEvents);

            // parser from "YYYY-MM-DD" to Date object
            function parseDate(dateStr) {
              const [year, month, day] = dateStr.split("-").map(Number);
              return new Date(year, month - 1, day); // month is 0-indexed
            }

            const hasEventInRange = allEvents.some(ev => {
              const eventDate = parseDate(ev.date);
              return eventDate >= today && eventDate <= endDate;
            });


            if (userEvents.length > 0) {
              popupContent += `
                <hr>
                <div style="color: blue; max-height: 120px; overflow-y: auto;">
                  <strong>Your Events:</strong><br>
              `;
              userEvents.forEach(e => {
                popupContent += `
                  <ul style="text-align: center;">
                    Your event is coming up on ${e.date} at ${e.time}.<br>
                    Description: ${e.description}.
                  </ul>`;
              });

              popupContent += `
                <div style="display: flex; justify-content: center; margin-top: 3px;">
                  <a class="btn btn-info" href="/edit-events/${markerId}/${cliqueId}">Edit events</a>
                </div>
                </div>
              `;
            }

            if (otherEvents.length > 0) {
              popupContent += `
                <hr>
                <div style="color: blue; max-height: 120px; overflow-y: auto;">
                  <strong>Events:</strong><br>
              `;
              otherEvents.forEach(e => {
                popupContent += `
                  <ul style="display: flex; justify-content: center; align-items: flex-start; list-style: none; padding: 5px 0 0 0;">
                    <li style="display: flex; align-items: flex-start; max-width: 600px;">
                      ${
                        e.user_pic !== 'default.jpg'
                          ? `<img src="/static/uploads/${e.user_pic}"
                                  alt="User"
                                  style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;">`
                          : `<i class="bi bi-person-circle"
                                style="font-size: 2.05rem; color: #888; margin-right: 12px; width: 32px; height: 32px;"></i>`
                      }
                      <div style="text-align: center;">
                        ${e.user}'s event is coming up on <strong>${e.date}</strong> at <strong>${e.time}</strong>.<br>
                        Description: ${e.description}.
                      </div>
                    </li>
                  </ul>`;
              });

              popupContent += `
                </div>
              `;
            }

            popupContent += `
                <a class="btn btn-info" href="/add-event/${markerId}/${cliqueId}">Add event</a>
                 `

            popupContent += `</div>`;

            const iconSize = 40; // default to 40px

            if (userEvents == 0 && otherEvents == 0) { //no events at all - icon color is black
              var customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div class='marker-pin' style='background:${color}; width:${iconSize}px; height:${iconSize}px;'>
                        <i class='bi ${markerIcon}' style='font-size:${iconSize * 0.6}px;'></i>
                      </div>`,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize]
              });
            } else if (hasEventInRange) { //for events happenning 3 days from now - blue icon and pulsing effect
              var customIcon = L.divIcon({
                className: 'custom-div-icon-event',
                html: `<div class='marker-pin' style='background:${color}; width:${iconSize}px; height:${iconSize}px;'>
                        <i class='bi ${markerIcon}' style='font-size:${iconSize * 0.6}px;'></i>
                      </div>`,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize]
              });
            } else {
              var customIcon = L.divIcon({ //other events in future - blue icon
                className: 'custom-div-icon',
                html: `<div class='marker-pin' style='color: #0a0ef8; background:${color}; width:${iconSize}px; height:${iconSize}px;'>
                        <i class='bi ${markerIcon}' style='font-size:${iconSize * 0.6}px;'></i>
                      </div>`,
                iconSize: [iconSize, iconSize],
                iconAnchor: [iconSize / 2, iconSize]
              });
            }

            const marker = L.marker(latlng, { icon: customIcon }).bindPopup(popupContent);
            marker.on("popupopen", () => initReviewStars(markerId));
            return marker;
          }
        }).addTo(map);
      });
  }

  function getSelectedCliqueIds() {
    const checkboxes = document.querySelectorAll(".clique-checkbox");
    return Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.value));
  }

  function submitReview(markerId) {
    const container = document.querySelector(`.rating-stars[data-marker="${markerId}"]`);
    const selected = parseInt(container.getAttribute("data-selected") || "0");
    const commentary = document.getElementById(`review-comment-${markerId}`).value.trim();

    if (selected === 0) {
      alert("Please provide a star rating.");
      return;
    }

    fetch(`/rate-marker/${markerId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: selected, commentary: commentary })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        if (data.success) {
          map.closePopup();
          map.eachLayer(layer => {
            if (layer instanceof L.Marker && layer.getPopup()) {
              layer.remove();
            }
          });
          loadMarkers();
        }
      });
  }

  function discardMarker() {
    if (window.tempMarker) {
      map.removeLayer(window.tempMarker);
      map.closePopup();
    }
  }

  function saveMarker(lat, lng, uniqueId) {
    const title = document.getElementById(`${uniqueId}-title`).value.trim();
    const rating = document.getElementById(`${uniqueId}-rating`).value;
    const cliqueId = document.getElementById(`${uniqueId}-clique`).value;
    const commentary = document.getElementById(`${uniqueId}-commentary`).value.trim();

    if (!title || !rating || !cliqueId) {
      alert("The fields title, rating, and clique are required.");
      return;
    }

    fetch('/add-marker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        title: title,
        rating: rating,
        clique_id: cliqueId,
        commentary: commentary
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          alert("Marker added successfully!");
          map.closePopup();
          map.eachLayer(layer => {
            if (layer instanceof L.Marker && layer.getPopup()) {
              layer.remove();
            }
          });
          loadMarkers();
        } else {
          alert("Error: " + data.message);
        }
      })
      .catch(error => console.error('Error saving marker:', error));
  }

  map.on('click', function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    const uniqueId = `popup-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const popupContent = `
      <div>
        <input type="text" id="${uniqueId}-title" class="form-control" placeholder="Title" required><br>

        <label>Rate this location:</label><br>
        <div id="${uniqueId}-rating-stars">
          ${[1, 2, 3, 4, 5].map(i => `<span class="star" data-value="${i}">&#9733;</span>`).join('')}
        </div>
        <input type="hidden" id="${uniqueId}-rating"><br>

        <label for="${uniqueId}-commentary">Your Review:</label><br>
        <textarea id="${uniqueId}-commentary" rows="3" placeholder="Your review (optional)"></textarea><br>

        <label for="${uniqueId}-clique">Select Clique:</label><br>
        <select id="${uniqueId}-clique" class="form-control" required>
          ${window.currentUserCliques.map(clique => `<option value="${clique.id}">${clique.name}</option>`).join('')}
        </select><br>

        <button onclick="saveMarker(${lat}, ${lng}, '${uniqueId}')" class="btn btn-success">Save</button>
        <button onclick="discardMarker()" class="btn btn-secondary">Discard</button>
        <a href="/create-clique" class="btn btn-info" style="margin-top: 5px;">Create New Clique</a>
      </div>
    `;

    const tempMarker = L.marker([lat, lng]).addTo(map).bindPopup(popupContent).openPopup();
    window.tempMarker = tempMarker;

    tempMarker.on('popupclose', function () {
      if (window.tempMarker) {
        map.removeLayer(window.tempMarker);
      }
    });

    setTimeout(() => {
      const stars = document.querySelectorAll(`#${uniqueId}-rating-stars .star`);
      stars.forEach(star => {
        star.addEventListener("mouseover", () => {
          const val = parseInt(star.dataset.value);
          stars.forEach(s => {
            s.classList.toggle("gold", parseInt(s.dataset.value) <= val);
          });
        });

        star.addEventListener("mouseout", () => {
          const selected = parseInt(document.getElementById(`${uniqueId}-rating`).value || "0");
          stars.forEach(s => {
            s.classList.toggle("gold", parseInt(s.dataset.value) <= selected);
          });
        });

        star.addEventListener("click", () => {
          const selected = parseInt(star.dataset.value);
          document.getElementById(`${uniqueId}-rating`).value = selected;
          stars.forEach(s => {
            s.classList.toggle("gold", parseInt(s.dataset.value) <= selected);
          });
        });
      });
    }, 0);
  });

  window.addEventListener('DOMContentLoaded', () => {
    const filterBox = document.getElementById('clique-filter-box');
    const filterButton = document.getElementById('filter-button');

    if (filterButton && filterBox) {
      filterButton.addEventListener('click', () => {
        filterBox.classList.toggle('show');
      });
    }

    document.querySelectorAll('.clique-checkbox').forEach(cb => {
      const saved = localStorage.getItem(`clique-${cb.value}`);
      if (saved !== null) {
        cb.checked = saved === 'true';
      }

      cb.addEventListener('change', () => {
        localStorage.setItem(`clique-${cb.value}`, cb.checked);
        loadMarkers();
      });
    });

    const selectAllBtn = document.getElementById('select-all');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.clique-checkbox').forEach(cb => {
          cb.checked = true;
          localStorage.setItem(`clique-${cb.value}`, 'true');
        });
        loadMarkers();
      });
    }

    const clearAllBtn = document.getElementById('clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.clique-checkbox').forEach(cb => {
          cb.checked = false;
          localStorage.setItem(`clique-${cb.value}`, 'false');
        });
        loadMarkers();
      });
    }

    // load map markers after DOM ready
    loadMarkers();
  });
}

// ===================
// GLOBAL (ALL-PAGES) LOGIC
// ===================
function attachNotificationHandlers() {
  // JOIN or REQUEST to join based on invite type
  document.querySelectorAll(".join-btn").forEach(button => {
    button.addEventListener("click", () => {
      const notifId = button.getAttribute("data-id");

      fetch("/get_notifications")
        .then(res => res.json())
        .then(data => {
          const notif = data.notifications.find(n => n.id == notifId);
          if (!notif) throw new Error("Notification not found");

          const cliqueId = notif.clique_id;
          const type = notif.type;

          if (type === "invitation" || type === "invitation admin") {
            // direct join
            return fetch(`/join_clique/${cliqueId}`, { method: "POST" })
              .then(res => res.json())
              .then(data => {
                alert(data.message || "Joined!");
                return fetch(`/delete_notification/${notifId}`, { method: "POST" });
              });
          }

          if (type === "invitation protected") {
            // convert to protected join request
            return fetch(`/request_join_protected/${cliqueId}`, { method: "POST" })
              .then(res => res.json())
              .then(data => {
                alert(data.message || "Request sent to admin.");
                return fetch(`/delete_notification/${notifId}`, { method: "POST" });
              });
          }

          throw new Error("Unsupported notification type.");
        })
        .then(() => refreshNotificationList())
        .catch(err => {
          console.error("Join error:", err);
          alert("Something went wrong while processing the invitation.");
        });
    });
  });

  // decline (for request to join protected)
  document.querySelectorAll(".decline-request").forEach(button => {
    button.addEventListener("click", () => {
      const notifId = button.getAttribute("data-id");

      const confirmed = confirm("Are you sure you want to decline this request?");
      if (!confirmed) return;

      fetch(`/delete_notification/${notifId}`, { method: "POST" })
        .then(() => {
          button.closest(".notification-item").remove();
        });
    });
  });

  // accept request to join protected
  document.querySelectorAll(".accept-request").forEach(button => {
    button.addEventListener("click", () => {
      const notifId = button.getAttribute("data-id");
      const cliqueId = button.getAttribute("data-clique");

      fetch(`/accept_request/${notifId}/${cliqueId}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "Request accepted.");
          button.closest(".notification-item").remove();
        });
    });
  });

  // ignore for other notification types
  document.querySelectorAll(".ignore-btn").forEach(button => {
    button.addEventListener("click", () => {
      const notifId = button.getAttribute("data-id");

      fetch(`/delete_notification/${notifId}`, { method: "POST" })
        .then(() => {
          button.closest(".notification-item").remove();
        });
    });
  });

  // request to join from a protected invitation
  document.querySelectorAll(".request-btn").forEach(button => {
    button.addEventListener("click", () => {
      const cliqueId = button.getAttribute("data-clique");
      const notifId = button.getAttribute("data-id");

      fetch(`/request_join_protected/${cliqueId}`, { method: "POST" })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "Request sent.");
          return fetch(`/delete_notification/${notifId}`, { method: "POST" });
        })
        .then(() => {
          button.closest(".notification-item").remove();
        });
    });
  });
}

function refreshNotificationList() {
  const list = document.getElementById("notifications-list");
  fetch("/get_notifications")
    .then(res => res.json())
    .then(data => {
      list.innerHTML = "";

    const bell = document.getElementById("notificationBell");
    if (bell) {
      const hasNotifications = data.notifications.length > 0;
      const currentColor = getComputedStyle(bell).color;
      const targetColor = hasNotifications ? "gold" : "gray";
      bell.style.color = targetColor;
    }
    if (data.notifications.length === 0) {
      list.innerHTML = "<div class='notification-item'>No notifications</div>";
      return;
    }

      data.notifications.forEach(notif => {
        const item = document.createElement("div");
        item.className = "notification-item";
        const type = notif.type;
        const cliqueName = notif.clique_name;
        const cliqueId = notif.clique_id;
        let text = "";

        if (type === "invitation") {
          text = `Invited to join public clique <strong>${cliqueName}</strong>`;
          item.innerHTML = `
            ${text}
            <div class="notification-actions">
              <button class="btn btn-sm btn-success join-btn" data-id="${notif.id}" data-clique="${cliqueId}">Join</button>
              <button class="btn btn-sm btn-secondary ignore-btn" data-id="${notif.id}">Ignore</button>
            </div>`;
        } else if (type === "invitation admin") {
          text = `Invited to join protected clique <strong>${cliqueName}</strong> (by admin)`;
          item.innerHTML = `
            ${text}
            <div class="notification-actions">
              <button class="btn btn-sm btn-success join-btn" data-id="${notif.id}" data-clique="${cliqueId}">Join</button>
              <button class="btn btn-sm btn-secondary ignore-btn" data-id="${notif.id}">Ignore</button>
            </div>`;
        } else if (type === "invitation protected") {
          text = `Invited to join protected clique <strong>${cliqueName}</strong>`;
          item.innerHTML = `
            ${text}
            <div class="notification-actions">
              <button class="btn btn-sm btn-warning request-btn" data-id="${notif.id}" data-clique="${cliqueId}">Request to Join</button>
              <button class="btn btn-sm btn-secondary ignore-btn" data-id="${notif.id}">Ignore</button>
            </div>`;
        }
        else if (type === "request to join protected") {
          const requester = notif.requester_name || "A user";
          text = `<strong>${requester}</strong> requested to join protected clique <strong>${cliqueName}</strong>`;
          item.innerHTML = `
            ${text}
            <div class="notification-actions">
              <button class="btn btn-sm btn-success accept-request" data-id="${notif.id}" data-clique="${cliqueId}">Accept</button>
              <button class="btn btn-sm btn-danger decline-request" data-id="${notif.id}">Decline</button>
            </div>`;
        }
        else if (type === "ban") {
          item.innerHTML = `
            <div>You were banned from <strong>${cliqueName}</strong>.</div>
            <div class="notification-actions">
              <button class="btn btn-sm btn-secondary ignore-btn" data-id="${notif.id}">Okay</button>
            </div>
          `;
        } else if (type === "unban") {
          item.innerHTML = `
            <div>You were unbanned from <strong>${cliqueName}</strong>. You may now rejoin.</div>
            <div class="notification-actions">
              <button class="btn btn-sm btn-secondary ignore-btn" data-id="${notif.id}">Okay</button>
            </div>
          `;
        }
        else if (type === "kick") {
          item.innerHTML = `
            <div>You were removed from <strong>${cliqueName}</strong>.</div>
            <div class="notification-actions">
              <button class="btn btn-sm btn-secondary ignore-btn" data-id="${notif.id}">Okay</button>
            </div>
          `;
        }
        else if (type === "invitation to become admin") {
          text = `You've been invited to become the admin of <strong>${cliqueName}</strong>`;
          item.innerHTML = `
            ${text}
            <div class="notification-actions">
              <form method="POST" action="/accept_admin_invite/${notif.id}/${cliqueId}" style="display: inline;">
                <button class="btn btn-sm btn-success">Accept</button>
              </form>
              <form method="POST" action="/decline_admin_invite/${notif.id}" style="display: inline;">
                <button class="btn btn-sm btn-secondary">Decline</button>
              </form>
            </div>
          `;
        }
        list.appendChild(item);
      });

      attachNotificationHandlers();  // rebind buttons
    });
}

function setupSearchResultsJoinButtons() {
  document.querySelectorAll(".search-join-btn").forEach(button => {
    button.addEventListener("click", () => {
      const cliqueId = button.getAttribute("data-clique-id");
      fetch(`/join_clique/${cliqueId}`, {
        method: "POST"
      })
      .then(res => res.json())
      .then(data => {
        alert(data.message || "Joined!");
        button.textContent = "Joined";
        button.classList.remove("btn-success");
        button.classList.add("btn-secondary", "text-dark");
        button.disabled = true;
      })
      .catch(err => {
        console.error(err);
        alert("Error joining clique.");
      });
    });
  });

    document.querySelectorAll(".search-request-btn").forEach(button => {
      button.addEventListener("click", () => {
        const cliqueId = button.getAttribute("data-clique-id");

        fetch(`/request_join_protected/${cliqueId}`, {
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest"
          }
        })
        .then(res => res.json())
        .then(data => {
          alert(data.message || "Request sent to admin.");
          button.textContent = "Requested";
          button.classList.remove("btn-warning");
          button.classList.add("btn-secondary", "text-dark");
          button.disabled = true;
        })
        .catch(err => {
          console.error(err);
          alert("An error occurred while sending the request.");
        });
      });
    });
}


function setupNotificationDropdown() {
  const notifIcon = document.getElementById("notificationsDropdown");
  const notifMenu = document.querySelector(".notifications-menu");

  if (notifIcon && notifMenu) {
    notifIcon.addEventListener("click", () => {
      notifMenu.style.display = notifMenu.style.display === "block" ? "none" : "block";

      if (notifMenu.style.display === "block") {
        refreshNotificationList();
      }
    });
  }
}


function setupReviewDeleteButtons() {
  document.querySelectorAll(".delete-review-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const row = btn.closest("tr");
      const reviewId = row.getAttribute("data-review-id");

      // check with backend if this is the only review for the marker
      fetch(`/check_review_solo/${reviewId}`)
        .then(res => res.json())
        .then(data => {
          let confirmMsg = "Are you sure you want to delete this review?";
          if (data.is_only) {
            confirmMsg = "Deleting the only review for this marker will delete the location. Are you sure?";
          }

          if (confirm(confirmMsg)) {
            fetch(`/delete-review/${reviewId}`, {
              method: "POST"
            })
            .then(() => {
              window.location.reload(); // refresh page to update table
            })
            .catch(err => {
              alert("Failed to delete review.");
              console.error(err);
            });
          }
        });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setupNotificationDropdown();
    setupSearchResultsJoinButtons();
    setupReviewDeleteButtons();
    refreshNotificationList();
  });
} else {
  setupNotificationDropdown();
  setupSearchResultsJoinButtons();
  setupReviewDeleteButtons();
  refreshNotificationList();
}