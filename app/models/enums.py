from enum import Enum


class GameStatus(str, Enum):
    BACKLOG = "BACKLOG"
    PLAYING = "PLAYING"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"
    WISHLIST = "WISHLIST"

class SortField(str, Enum):
    TITLE = "title"
    CREATED_AT = "created_at"
    RELEASE_DATE = "release_date"
    PLATFORM = "platform"
    STATUS = "status"