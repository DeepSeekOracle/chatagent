"""Lattice Golf live lobby — stdlib asyncio WebSocket relay.

Rooms, ready-up, turn lock, shot/aim relay. No accounts.
Local:  python server.py          → ws://127.0.0.1:8768/ws
HF:     PORT/SPACE_ID set         → 0.0.0.0:7860
"""
from __future__ import annotations

import asyncio
import hashlib
import base64
import json
import os
import random
import struct
import time
from typing import Any

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
ALPH = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
MAX_PLAYERS = 4
MAX_ROOMS = 48
IDLE_S = 90 * 60
MAX_MSG = 48_000

COURSES = {
    "pine-haven": {"mode": "9", "name": "Pine Haven 9"},
    "coral-lattice": {"mode": "9", "name": "Coral Lattice 9"},
    "singularity-nine": {"mode": "9", "name": "Singularity Nine"},
    "haven-open": {"mode": "18", "name": "Haven Open 18"},
}

PORT = int(os.environ.get("PORT") or os.environ.get("SPACE_PORT") or (7860 if os.environ.get("SPACE_ID") else 8768))
HOST = "0.0.0.0"


def now() -> float:
    return time.time()


def new_code(used: set[str]) -> str:
    for _ in range(40):
        c = "".join(random.choice(ALPH) for _ in range(4))
        if c not in used:
            return c
    return "".join(random.choice(ALPH) for _ in range(5))


class Client:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        self.reader = reader
        self.writer = writer
        self.pid = ""
        self.room: Room | None = None
        self.name = "Operator"
        self.golfer = "mira"
        self.alive = True
        self.last = now()

    async def send(self, obj: dict[str, Any]) -> None:
        if not self.alive:
            return
        try:
            await ws_send(self.writer, json.dumps(obj, separators=(",", ":")))
        except Exception:
            self.alive = False


class Room:
    def __init__(self, code: str, host: Client) -> None:
        self.code = code
        self.host_id = host.pid
        self.course_id = "pine-haven"
        self.mode = "9"
        self.seed = random.randint(1, 0x7FFFFFFF)
        self.state = "lobby"  # lobby | play | done
        self.hi = 0
        self.turn = host.pid
        self.order: list[str] = [host.pid]
        self.players: dict[str, dict[str, Any]] = {}
        self.touch = now()
        self.add(host)

    def add(self, c: Client) -> None:
        self.players[c.pid] = {
            "pid": c.pid,
            "name": c.name[:24],
            "golfer": c.golfer,
            "ready": False,
            "host": c.pid == self.host_id,
            "strokes": 0,
            "holed": False,
            "card": [],
            "ball": None,
        }
        if c.pid not in self.order:
            self.order.append(c.pid)
        c.room = self
        self.touch = now()

    def drop(self, pid: str) -> None:
        self.players.pop(pid, None)
        if pid in self.order:
            self.order.remove(pid)
        if self.host_id == pid and self.order:
            self.host_id = self.order[0]
            if self.host_id in self.players:
                self.players[self.host_id]["host"] = True
        if self.turn == pid:
            self.turn = self.next_turn(pid)
        self.touch = now()

    def next_turn(self, cur: str | None = None) -> str:
        if not self.order:
            return ""
        start = 0
        if cur in self.order:
            start = (self.order.index(cur) + 1) % len(self.order)
        n = len(self.order)
        for i in range(n):
            pid = self.order[(start + i) % n]
            p = self.players.get(pid)
            if p and not p.get("holed"):
                return pid
        return self.order[0] if self.order else ""

    def snapshot(self, typ: str = "room") -> dict[str, Any]:
        return {
            "type": typ,
            "code": self.code,
            "courseId": self.course_id,
            "mode": self.mode,
            "state": self.state,
            "hi": self.hi,
            "turn": self.turn,
            "seed": self.seed,
            "host": self.host_id,
            "players": [self.players[p] for p in self.order if p in self.players],
        }


rooms: dict[str, Room] = {}
clients: set[Client] = set()
_pid_n = 0


def alloc_pid() -> str:
    global _pid_n
    _pid_n += 1
    return "p" + str(_pid_n)


async def broadcast(room: Room, obj: dict[str, Any], skip: Client | None = None) -> None:
    dead: list[Client] = []
    for c in list(clients):
        if c.room is not room or not c.alive:
            continue
        if skip is not None and c is skip:
            continue
        await c.send(obj)
        if not c.alive:
            dead.append(c)
    for c in dead:
        await drop_client(c)


async def drop_client(c: Client) -> None:
    c.alive = False
    clients.discard(c)
    room = c.room
    if room:
        room.drop(c.pid)
        c.room = None
        if not room.players:
            rooms.pop(room.code, None)
        else:
            await broadcast(room, room.snapshot())
    try:
        c.writer.close()
    except Exception:
        pass


def prune() -> None:
    stale = [code for code, r in rooms.items() if now() - r.touch > IDLE_S]
    for code in stale:
        rooms.pop(code, None)


async def handle_msg(c: Client, msg: dict[str, Any]) -> None:
    typ = str(msg.get("type") or "")
    c.last = now()
    if typ == "hello":
        c.name = str(msg.get("name") or "Operator")[:24]
        c.golfer = str(msg.get("golfer") or "mira")[:16]
        await c.send({"type": "hello", "pid": c.pid, "ok": True})
        return
    if typ == "create":
        if len(rooms) >= MAX_ROOMS:
            await c.send({"type": "error", "msg": "Lobbies are full. Try again in a minute."})
            return
        if c.room:
            c.room.drop(c.pid)
        prune()
        code = new_code(set(rooms))
        c.name = str(msg.get("name") or c.name)[:24]
        c.golfer = str(msg.get("golfer") or c.golfer)[:16]
        room = Room(code, c)
        cid = str(msg.get("courseId") or "pine-haven")
        if cid in COURSES:
            room.course_id = cid
            room.mode = COURSES[cid]["mode"]
        rooms[code] = room
        await c.send(room.snapshot())
        return
    if typ == "join":
        code = str(msg.get("code") or "").upper().strip()
        room = rooms.get(code)
        if not room:
            await c.send({"type": "error", "msg": "No lobby with that code."})
            return
        if room.state != "lobby":
            await c.send({"type": "error", "msg": "That match already started."})
            return
        if len(room.players) >= MAX_PLAYERS:
            await c.send({"type": "error", "msg": "Lobby is full (4)."})
            return
        if c.room and c.room is not room:
            c.room.drop(c.pid)
        c.name = str(msg.get("name") or c.name)[:24]
        c.golfer = str(msg.get("golfer") or c.golfer)[:16]
        room.add(c)
        await broadcast(room, room.snapshot())
        return
    if typ == "leave":
        room = c.room
        if room:
            room.drop(c.pid)
            c.room = None
            if not room.players:
                rooms.pop(room.code, None)
            else:
                await broadcast(room, room.snapshot())
        await c.send({"type": "left", "pid": c.pid})
        return
    room = c.room
    if not room:
        await c.send({"type": "error", "msg": "Join or create a lobby first."})
        return
    room.touch = now()
    me = room.players.get(c.pid)
    if not me:
        await c.send({"type": "error", "msg": "You are not in this lobby."})
        return
    if typ == "course" and c.pid == room.host_id and room.state == "lobby":
        cid = str(msg.get("courseId") or "")
        if cid in COURSES:
            room.course_id = cid
            room.mode = COURSES[cid]["mode"]
            await broadcast(room, room.snapshot())
        return
    if typ == "ready" and room.state == "lobby":
        me["ready"] = bool(msg.get("ready", True))
        me["name"] = c.name
        me["golfer"] = c.golfer
        await broadcast(room, room.snapshot())
        return
    if typ == "start" and c.pid == room.host_id and room.state == "lobby":
        if len(room.order) < 2:
            await c.send({"type": "error", "msg": "Need at least two golfers."})
            return
        room.state = "play"
        room.hi = 0
        room.seed = int(msg.get("seed") or random.randint(1, 0x7FFFFFFF)) & 0x7FFFFFFF
        room.turn = room.order[0]
        for p in room.players.values():
            p["strokes"] = 0
            p["holed"] = False
            p["card"] = []
            p["ball"] = None
        await broadcast(room, room.snapshot("start"))
        return
    if typ == "aim" and room.state == "play" and c.pid == room.turn:
        await broadcast(room, {
            "type": "aim",
            "pid": c.pid,
            "marker": msg.get("marker"),
            "club": msg.get("club"),
            "power": msg.get("power"),
        }, skip=c)
        return
    if typ == "chat":
        text = str(msg.get("text") or "")[:160].strip()
        if not text:
            return
        await broadcast(room, {"type": "chat", "pid": c.pid, "name": me["name"], "text": text})
        return
    if typ == "shot" and room.state == "play":
        if c.pid != room.turn:
            await c.send({"type": "error", "msg": "Wait your turn."})
            return
        if me.get("holed"):
            await c.send({"type": "error", "msg": "You already holed out."})
            return
        dest = msg.get("dest") or {}
        me["ball"] = dest
        me["strokes"] = int(msg.get("strokes") or me["strokes"])
        holed = bool(msg.get("holed"))
        if holed:
            me["holed"] = True
            me["card"] = list(msg.get("card") or me["card"])
        payload = {
            "type": "shot",
            "pid": c.pid,
            "from": msg.get("from"),
            "dest": dest,
            "carry": msg.get("carry"),
            "rollPath": msg.get("rollPath") or [],
            "club": msg.get("club"),
            "power": msg.get("power"),
            "marker": msg.get("marker"),
            "blocked": msg.get("blocked"),
            "holed": holed,
            "strokes": me["strokes"],
            "landLie": msg.get("landLie"),
            "actual": msg.get("actual"),
            "roll": msg.get("roll"),
        }
        if holed:
            still = [p for p in room.order if p in room.players and not room.players[p].get("holed")]
            if not still:
                room.hi += 1
                holes = 18 if room.mode == "18" else 9
                if room.hi >= holes:
                    room.state = "done"
                    room.turn = ""
                    await broadcast(room, payload)
                    await broadcast(room, room.snapshot("round_over"))
                    return
                for p in room.players.values():
                    p["holed"] = False
                    p["strokes"] = 0
                    p["ball"] = None
                room.turn = room.order[0]
                await broadcast(room, payload)
                await broadcast(room, room.snapshot("next_hole"))
                return
            room.turn = room.next_turn(c.pid)
        else:
            room.turn = room.next_turn(c.pid)
        payload["turn"] = room.turn
        await broadcast(room, payload)
        await broadcast(room, {"type": "turn", "turn": room.turn, "hi": room.hi})
        return


async def ws_send(writer: asyncio.StreamWriter, text: str) -> None:
    data = text.encode("utf-8")
    n = len(data)
    hdr = bytearray()
    hdr.append(0x81)
    if n < 126:
        hdr.append(n)
    elif n < 65536:
        hdr.append(126)
        hdr.extend(struct.pack("!H", n))
    else:
        hdr.append(127)
        hdr.extend(struct.pack("!Q", n))
    writer.write(hdr + data)
    await writer.drain()


async def ws_read(reader: asyncio.StreamReader) -> str | None:
    hdr = await reader.readexactly(2)
    opcode = hdr[0] & 0x0F
    masked = (hdr[1] & 0x80) != 0
    n = hdr[1] & 0x7F
    if n == 126:
        n = struct.unpack("!H", await reader.readexactly(2))[0]
    elif n == 127:
        n = struct.unpack("!Q", await reader.readexactly(8))[0]
    if n > MAX_MSG:
        return None
    mask = await reader.readexactly(4) if masked else b""
    raw = bytearray(await reader.readexactly(n))
    if masked:
        for i in range(n):
            raw[i] ^= mask[i % 4]
    if opcode == 0x8:
        return None
    if opcode == 0x9:
        return ""
    if opcode != 0x1:
        return ""
    return raw.decode("utf-8")


async def handshake(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> bool:
    chunks: list[bytes] = []
    while True:
        line = await asyncio.wait_for(reader.readline(), timeout=8)
        if not line:
            return False
        chunks.append(line)
        if line in (b"\r\n", b"\n"):
            break
        if sum(len(x) for x in chunks) > 8192:
            return False
    head = b"".join(chunks).decode("iso-8859-1", "replace")
    lines = head.split("\r\n")
    req = lines[0] if lines else ""
    headers = {}
    for ln in lines[1:]:
        if ":" in ln:
            k, v = ln.split(":", 1)
            headers[k.strip().lower()] = v.strip()
    path = req.split(" ")[1] if " " in req else "/"
    if path.startswith("/health") or (path == "/" and headers.get("upgrade", "").lower() != "websocket"):
        body = b'{"ok":true,"service":"lattice-golf-lobby"}'
        writer.write(
            b"HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: "
            + str(len(body)).encode()
            + b"\r\nConnection: close\r\n\r\n"
            + body
        )
        await writer.drain()
        return False
    key = headers.get("sec-websocket-key", "")
    if headers.get("upgrade", "").lower() != "websocket" or not key:
        writer.write(b"HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n")
        await writer.drain()
        return False
    accept = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
    writer.write(
        (
            "HTTP/1.1 101 Switching Protocols\r\n"
            "Upgrade: websocket\r\n"
            "Connection: Upgrade\r\n"
            "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
        ).encode()
    )
    await writer.drain()
    return True


async def session(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    try:
        ok = await handshake(reader, writer)
        if not ok:
            writer.close()
            return
        c = Client(reader, writer)
        c.pid = alloc_pid()
        clients.add(c)
        await c.send({"type": "welcome", "pid": c.pid})
        while c.alive:
            try:
                raw = await asyncio.wait_for(ws_read(reader), timeout=120)
            except asyncio.TimeoutError:
                await c.send({"type": "ping"})
                continue
            except Exception:
                break
            if raw is None:
                break
            if raw == "":
                continue
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await c.send({"type": "error", "msg": "Bad JSON."})
                continue
            if not isinstance(msg, dict):
                continue
            await handle_msg(c, msg)
    finally:
        # find client by writer
        gone = [x for x in list(clients) if x.writer is writer]
        for x in gone:
            await drop_client(x)
        try:
            writer.close()
        except Exception:
            pass


async def main() -> None:
    srv = await asyncio.start_server(session, HOST, PORT)
    print("lattice-golf lobby ws://" + HOST + ":" + str(PORT) + "/ws", flush=True)
    async with srv:
        await srv.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())
