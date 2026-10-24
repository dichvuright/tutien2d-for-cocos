import { ResourceManager, WorldMapData } from '../core/ResourceManager';

export const TILE_SIZE = 32;

interface HeapNode {
    i: number;
    f: number;
}

class MinHeap {
    private a: HeapNode[] = [];

    public push(item: HeapNode): void {
        const a = this.a;
        let i = a.length;
        a.push(item);
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (a[p].f <= a[i].f) break;
            const tmp = a[p];
            a[p] = a[i];
            a[i] = tmp;
            i = p;
        }
    }

    public pop(): HeapNode | undefined {
        const a = this.a;
        const top = a[0];
        const last = a.pop();
        if (a.length > 0 && last) {
            a[0] = last;
            let n = 0;
            const len = a.length;
            while (true) {
                const l = 2 * n + 1;
                const r = l + 1;
                let smallest = n;
                if (l < len && a[l].f < a[smallest].f) smallest = l;
                if (r < len && a[r].f < a[smallest].f) smallest = r;
                if (smallest === n) break;
                const tmp = a[smallest];
                a[smallest] = a[n];
                a[n] = tmp;
                n = smallest;
            }
        }
        return top;
    }

    public get size(): number {
        return this.a.length;
    }
}

const DIRS_8: Array<[number, number, number]> = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, 1.414],
    [1, -1, 1.414],
    [-1, 1, 1.414],
    [-1, -1, 1.414],
];

export class Pathfinder {
    public static isBlockedTile(map: WorldMapData, tx: number, ty: number, flying: boolean = false): boolean {
        if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return true;
        const rows = flying ? map.flyBlockedRows : map.blockedRows;
        const row = rows?.[ty];
        if (!row) return false;
        return row.charCodeAt(tx) === 49; // '1'
    }

    public static rectBlocked(
        map: WorldMapData,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        flying: boolean = false
    ): boolean {
        if (x0 < 2 || y0 < 2 || x1 >= map.pxWidth - 2 || y1 >= map.pxHeight - 2) return true;
        const tx0 = Math.floor(x0 / TILE_SIZE);
        const ty0 = Math.floor(y0 / TILE_SIZE);
        const tx1 = Math.floor(x1 / TILE_SIZE);
        const ty1 = Math.floor(y1 / TILE_SIZE);
        for (let ty = ty0; ty <= ty1; ty++) {
            for (let tx = tx0; tx <= tx1; tx++) {
                if (Pathfinder.isBlockedTile(map, tx, ty, flying)) return true;
            }
        }
        return false;
    }

    public static nearestWalkable(
        map: WorldMapData,
        tx: number,
        ty: number,
        maxRadius: number = 7,
        flying: boolean = false
    ): { tx: number; ty: number } | null {
        const cx = Math.max(0, Math.min(map.width - 1, tx));
        const cy = Math.max(0, Math.min(map.height - 1, ty));
        if (!Pathfinder.isBlockedTile(map, cx, cy, flying)) return { tx: cx, ty: cy };
        for (let r = 1; r <= maxRadius; r++) {
            let best: { tx: number; ty: number } | null = null;
            let bestD2 = Infinity;
            for (let dy = -r; dy <= r; dy++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
                    const nx = cx + dx;
                    const ny = cy + dy;
                    if (!Pathfinder.isBlockedTile(map, nx, ny, flying)) {
                        const d2 = dx * dx + dy * dy;
                        if (d2 < bestD2) {
                            bestD2 = d2;
                            best = { tx: nx, ty: ny };
                        }
                    }
                }
            }
            if (best) return best;
        }
        return null;
    }

    public static lineClear(
        map: WorldMapData,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
        halfW: number = 7,
        hitH: number = 10,
        flying: boolean = false
    ): boolean {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dist = Math.hypot(dx, dy);
        const steps = Math.max(1, Math.ceil(dist / 10));
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            const px = x0 + dx * t;
            const py = y0 + dy * t;
            if (Pathfinder.rectBlocked(map, px - halfW, py - hitH, px + halfW, py, flying)) {
                return false;
            }
        }
        return true;
    }

    public static findPathWaypoints(
        map: WorldMapData,
        startX: number,
        startY: number,
        goalX: number,
        goalY: number,
        flying: boolean = false
    ): Array<{ x: number; y: number }> {
        const stx = Math.floor(startX / TILE_SIZE);
        const sty = Math.floor(startY / TILE_SIZE);
        const gtxRaw = Math.floor(goalX / TILE_SIZE);
        const gtyRaw = Math.floor(goalY / TILE_SIZE);

        const goalTile = Pathfinder.nearestWalkable(map, gtxRaw, gtyRaw, 7, flying);
        if (!goalTile) return [];

        const gx = goalTile.tx === gtxRaw && goalTile.ty === gtyRaw
            ? goalX
            : goalTile.tx * TILE_SIZE + TILE_SIZE * 0.5;
        const gy = goalTile.tx === gtxRaw && goalTile.ty === gtyRaw
            ? goalY
            : goalTile.ty * TILE_SIZE + TILE_SIZE - 4;

        if (Pathfinder.lineClear(map, startX, startY, gx, gy, 7, 10, flying)) {
            return [{ x: gx, y: gy }];
        }

        const startTile = Pathfinder.nearestWalkable(map, stx, sty, 4, flying);
        if (!startTile) return [{ x: gx, y: gy }];

        const w = map.width;
        const h = map.height;
        const total = w * h;
        const gScore = new Float32Array(total).fill(Infinity);
        const parent = new Int32Array(total).fill(-1);
        const closed = new Uint8Array(total);

        const startIdx = startTile.ty * w + startTile.tx;
        const goalIdx = goalTile.ty * w + goalTile.tx;
        if (startIdx === goalIdx) return [{ x: gx, y: gy }];

        const heuristic = (ax: number, ay: number, bx: number, by: number) => {
            const dx = Math.abs(bx - ax);
            const dy = Math.abs(by - ay);
            return dx + dy + (1.414 - 2) * Math.min(dx, dy);
        };

        gScore[startIdx] = 0;
        const open = new MinHeap();
        open.push({ i: startIdx, f: heuristic(startTile.tx, startTile.ty, goalTile.tx, goalTile.ty) });

        let budget = 3500;
        let found = false;
        while (open.size > 0 && budget-- > 0) {
            const cur = open.pop()!;
            if (closed[cur.i]) continue;
            closed[cur.i] = 1;
            if (cur.i === goalIdx) {
                found = true;
                break;
            }
            const cx = cur.i % w;
            const cy = (cur.i / w) | 0;
            for (let d = 0; d < DIRS_8.length; d++) {
                const [ox, oy, cost] = DIRS_8[d];
                const nx = cx + ox;
                const ny = cy + oy;
                if (Pathfinder.isBlockedTile(map, nx, ny, flying)) continue;
                if (ox !== 0 && oy !== 0) {
                    if (Pathfinder.isBlockedTile(map, cx + ox, cy, flying)) continue;
                    if (Pathfinder.isBlockedTile(map, cx, cy + oy, flying)) continue;
                }
                const nIdx = ny * w + nx;
                if (closed[nIdx]) continue;
                const tentative = gScore[cur.i] + cost;
                if (tentative < gScore[nIdx]) {
                    gScore[nIdx] = tentative;
                    parent[nIdx] = cur.i;
                    open.push({ i: nIdx, f: tentative + heuristic(nx, ny, goalTile.tx, goalTile.ty) });
                }
            }
        }

        if (!found) return [];

        const rawTiles: Array<{ x: number; y: number }> = [];
        let trace = goalIdx;
        while (trace !== -1 && trace !== startIdx) {
            const tx = trace % w;
            const ty = (trace / w) | 0;
            rawTiles.push({ x: tx * TILE_SIZE + TILE_SIZE * 0.5, y: ty * TILE_SIZE + TILE_SIZE * 0.5 });
            trace = parent[trace];
        }
        rawTiles.reverse();
        if (rawTiles.length > 0) {
            rawTiles[rawTiles.length - 1] = { x: gx, y: gy };
        }

        // String-pull smoothing
        const smoothed: Array<{ x: number; y: number }> = [];
        let ax = startX;
        let ay = startY;
        let idx = 0;
        while (idx < rawTiles.length) {
            let farthest = idx;
            for (let probe = rawTiles.length - 1; probe > idx; probe--) {
                if (Pathfinder.lineClear(map, ax, ay, rawTiles[probe].x, rawTiles[probe].y, 7, 10, flying)) {
                    farthest = probe;
                    break;
                }
            }
            smoothed.push(rawTiles[farthest]);
            ax = rawTiles[farthest].x;
            ay = rawTiles[farthest].y;
            idx = farthest + 1;
        }
        return smoothed;
    }

    /**
     * Tìm cổng truyền tống kế tiếp (BFS qua đồ thị 34 bản đồ) để tự dẫn đường liên map
     */
    public static findNextPortalHop(fromMapId: string, toMapId: string): { tx: number; ty: number; toMap: string } | null {
        if (!fromMapId || !toMapId || fromMapId === toMapId) return null;
        const maps = ResourceManager.worldMaps;
        if (!maps[fromMapId] || !maps[toMapId]) return null;

        const visited = new Set<string>([fromMapId]);
        const queue: Array<{ mapId: string; firstPortal: { tx: number; ty: number; toMap: string } | null }> = [
            { mapId: fromMapId, firstPortal: null },
        ];

        while (queue.length > 0) {
            const cur = queue.shift()!;
            const m = maps[cur.mapId];
            if (!m || !m.portals) continue;
            for (const pt of m.portals) {
                if (!pt.toMap || visited.has(pt.toMap) || !maps[pt.toMap]) continue;
                const first = cur.firstPortal || { tx: pt.tx, ty: pt.ty, toMap: pt.toMap };
                if (pt.toMap === toMapId) return first;
                visited.add(pt.toMap);
                queue.push({ mapId: pt.toMap, firstPortal: first });
            }
        }
        return null;
    }
}
