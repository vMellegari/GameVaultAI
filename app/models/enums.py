from enum import Enum


class GameStatus(str, Enum):
    BACKLOG = "BACKLOG"
    PLAYING = "PLAYING"
    COMPLETED = "COMPLETED"
    DROPPED = "DROPPED"
    WISHLIST = "WISHLIST"