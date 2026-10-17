"""Public reaction totals and one private choice per signed-in account."""
from .records import get_record
from .security import APIError

REACTIONS = ("like", "love", "haha", "clap", "inspire")


def reaction_summary(db, post_id, user_id=None):
    counts = dict.fromkeys(REACTIONS, 0)
    for row in db.execute(
        "SELECT reaction,count(*) AS total FROM forum_reactions WHERE post_id=? GROUP BY reaction", (post_id,)
    ):
        counts[row["reaction"]] = row["total"]
    own = db.execute("SELECT reaction FROM forum_reactions WHERE post_id=? AND user_id=?", (post_id, user_id)).fetchone()
    return {"reactions": counts, "reaction_total": sum(counts.values()), "my_reaction": own["reaction"] if own else ""}


def set_reaction(db, user, post_id, choice):
    post = get_record(db, post_id, "forum_posts")
    if not db.execute("SELECT 1 FROM users WHERE id=? AND active=1", (post["owner"],)).fetchone():
        raise APIError(404, "Không tìm thấy bài viết.")
    if not isinstance(choice, str) or choice not in (*REACTIONS, ""):
        raise APIError(400, "Cảm xúc không hợp lệ.")
    if choice:
        db.execute(
            "INSERT INTO forum_reactions(post_id,user_id,reaction) VALUES(?,?,?) "
            "ON CONFLICT(post_id,user_id) DO UPDATE SET reaction=excluded.reaction", (post_id, user["id"], choice)
        )
    else:
        db.execute("DELETE FROM forum_reactions WHERE post_id=? AND user_id=?", (post_id, user["id"]))
    return reaction_summary(db, post_id, user["id"])
