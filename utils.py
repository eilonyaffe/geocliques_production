import os
import random
import re
from flask import current_app as app
from databases import db, User, Review, Marker, Event, Clique, CliqueUser, UserMarker, BannedUser, Notification

# Loading different colors for the markers belonging to different cliques
USED_COLORS_FILE = os.path.join('static', 'files', 'used_colors.txt')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

PALETTE = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
    "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
    "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
    "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080"
]


def load_used_colors():
    if os.path.exists(USED_COLORS_FILE):
        with open(USED_COLORS_FILE, 'r') as f:
            return set(f.read().splitlines())
    return set()


def save_used_colors(used_colors):
    with open(USED_COLORS_FILE, 'w') as f:
        f.write("\n".join(used_colors))


def reset_used_colors():
    if os.path.exists(USED_COLORS_FILE):
        os.remove(USED_COLORS_FILE)


def generate_random_color():
    return "#{:02x}{:02x}{:02x}".format(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))


def get_unique_color():
    used_colors = load_used_colors()
    available = [c for c in PALETTE if c not in used_colors]

    if available:
        color = random.choice(available)
    else:
        color = generate_random_color()

    used_colors.add(color)
    save_used_colors(used_colors)
    return color


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# Auxiliary functions related to the registration process in the app
def is_valid_password(password):
    return (
        len(password) >= 8 and
        any(c.isupper() for c in password) and  # At least one uppercase letter
        any(c.isdigit() for c in password) and  # At least one number
        any(c in "!@#$%^&*()-_=+[]{}|;:'\",.<>?/" for c in password)  # At least one special character
    )


def is_valid_email(email):
    email_regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z.]+$"
    return re.match(email_regex, email)


def delete_review(review_id, deleted_user_id):
    review = db.session.get(Review, review_id)
    if not review:
        return

    marker = review.marker
    db.session.delete(review)

    remaining_reviews = [r for r in marker.reviews if r.id != review.id]
    marker.total_reviews = len(remaining_reviews)

    if remaining_reviews:
        marker.average_review = round(sum(r.stars for r in remaining_reviews) / len(remaining_reviews), 2)
    else:
        marker_creator = UserMarker.query.filter_by(marker_id=marker.id, user_id=deleted_user_id).first()
        if marker_creator:
            Event.query.filter_by(marker_id=marker.id).delete()
            UserMarker.query.filter_by(marker_id=marker.id).delete()
            db.session.delete(marker)


def delete_clique(clique_id):
    marker_ids = [um.marker_id for um in UserMarker.query.filter_by(clique_id=clique_id).all()]

    for mid in marker_ids:
        Review.query.filter_by(marker_id=mid).delete()
        Event.query.filter_by(marker_id=mid).delete()

    Event.query.filter_by(clique_id=clique_id).delete()
    Notification.query.filter_by(clique_id=clique_id).delete()
    UserMarker.query.filter_by(clique_id=clique_id).delete()
    CliqueUser.query.filter_by(clique_id=clique_id).delete()
    BannedUser.query.filter_by(clique_id=clique_id).delete()

    db.session.delete(Clique.query.get(clique_id))

    for mid in marker_ids:
        if not UserMarker.query.filter_by(marker_id=mid).first():
            orphan_marker = db.session.get(Marker, mid)
            if orphan_marker:
                db.session.delete(orphan_marker)


def delete_user(user_id):
    user = db.session.get(User, user_id)
    if not user:
        return

    for review in list(user.reviews):
        delete_review(review.id, user.id)

    created_marker_ids = [um.marker_id for um in UserMarker.query.filter_by(user_id=user.id).all()]
    for mid in created_marker_ids:
        Review.query.filter_by(marker_id=mid).delete()
        Event.query.filter_by(marker_id=mid).delete()
        UserMarker.query.filter_by(marker_id=mid).delete()

        marker = db.session.get(Marker, mid)
        if marker:
            db.session.delete(marker)

    admin_cliques = Clique.query.filter_by(admin_id=user.id).all()
    for clique in admin_cliques:
        other_members = CliqueUser.query.filter(
            CliqueUser.clique_id == clique.id,
            CliqueUser.user_id != user.id
        ).order_by(CliqueUser.joined_date).all()
        if other_members:
            clique.admin_id = other_members[0].user_id
        else:
            delete_clique(clique.id)

    non_admin_cliques = CliqueUser.query.filter_by(user_id=user.id).all()
    for link in non_admin_cliques:
        Event.query.filter_by(clique_id=link.clique_id, user_id=user.id).delete()
        CliqueUser.query.filter_by(user_id=user.id, clique_id=link.clique_id).delete()

    Event.query.filter_by(user_id=user.id).delete()

    if user.picture != "default.jpg":
        path = os.path.join(app.root_path, 'static', 'uploads', user.picture)
        if os.path.exists(path):
            os.remove(path)

    UserMarker.query.filter_by(user_id=user.id).delete()

    db.session.delete(user)


def delete_marker(marker_id):
    Review.query.filter_by(marker_id=marker_id).delete()
    Event.query.filter_by(marker_id=marker_id).delete()
    UserMarker.query.filter_by(marker_id=marker_id).delete()
    marker = db.session.get(Marker, marker_id)
    if marker:
        db.session.delete(marker)


def delete_user_from_clique(clique_id, user_id):
    CliqueUser.query.filter_by(user_id=user_id, clique_id=clique_id).delete()

    marker_ids = [um.marker_id for um in UserMarker.query.filter_by(clique_id=clique_id).all()]
    reviews = Review.query.filter(Review.user_id == user_id, Review.marker_id.in_(marker_ids)).all()

    for review in reviews:
        marker = review.marker
        db.session.delete(review)
        remaining_reviews = [r for r in marker.reviews if r.user_id != user_id]
        if not remaining_reviews:
            delete_marker(marker.id)
        else:
            marker.total_reviews = len(remaining_reviews)
            marker.average_review = round(sum(r.stars for r in remaining_reviews) / len(remaining_reviews), 2)

    Event.query.filter_by(user_id=user_id, clique_id=clique_id).delete()


def delete_clique_and_contents(clique_id):
    marker_ids = [um.marker_id for um in UserMarker.query.filter_by(clique_id=clique_id).all()]
    for mid in marker_ids:
        delete_marker(mid)

    Event.query.filter_by(clique_id=clique_id).delete()
    Notification.query.filter_by(clique_id=clique_id).delete()
    UserMarker.query.filter_by(clique_id=clique_id).delete()
    CliqueUser.query.filter_by(clique_id=clique_id).delete()
    BannedUser.query.filter_by(clique_id=clique_id).delete()

    clique = db.session.get(Clique, clique_id)
    if clique:
        db.session.delete(clique)
