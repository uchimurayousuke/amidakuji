(function () {
  "use strict";

  var STAGE_W = 1280;
  var TOP_Y = 126;
  var BOTTOM_Y = 594;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, min, max) {
    return v < min ? min : v > max ? max : v;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function sharesEndpointLane(a, b) {
    return a.laneA === b.laneA || a.laneA === b.laneB || a.laneB === b.laneA || a.laneB === b.laneB;
  }

  function canPlaceRung(rungs, candidate) {
    var cMin = Math.min(candidate.yA, candidate.yB);
    var cMax = Math.max(candidate.yA, candidate.yB);
    var cLeft = Math.min(candidate.laneA, candidate.laneB);
    var cRight = Math.max(candidate.laneA, candidate.laneB);

    for (var k = 0; k < rungs.length; k++) {
      var ex = rungs[k];
      var eMin = Math.min(ex.yA, ex.yB);
      var eMax = Math.max(ex.yA, ex.yB);

      if (sharesEndpointLane(ex, candidate)) {
        if (Math.max(eMin, cMin) <= Math.min(eMax, cMax) + 11) {
          return false;
        }
      }

      if ((ex.type !== "normal" || candidate.type !== "normal") && Math.max(eMin, cMin) <= Math.min(eMax, cMax) + 8) {
        var eLeft = Math.min(ex.laneA, ex.laneB);
        var eRight = Math.max(ex.laneA, ex.laneB);
        if (Math.max(eLeft, cLeft) <= Math.min(eRight, cRight)) {
          return false;
        }
      }
    }
    return true;
  }

  function computeLayout(laneCount) {
    var n = Math.max(2, laneCount);
    var left = n <= 10 ? Math.max(110, STAGE_W / 2 - ((n - 1) * 92) / 2) : 90;
    var right = STAGE_W - left;
    var lanes = [];
    for (var i = 0; i < n; i++) {
      lanes.push(left + ((right - left) * i) / (n - 1));
    }
    var spacing = (right - left) / (n - 1);
    var tagW = Math.min(72, Math.max(38, spacing - 6));
    var boxW = Math.min(74, Math.max(40, spacing - 5));

    return {
      left: left,
      right: right,
      width: right - left,
      topY: TOP_Y,
      bottomY: BOTTOM_Y,
      height: BOTTOM_Y - TOP_Y,
      laneSpacing: spacing,
      tagW: tagW,
      boxW: boxW,
      lanes: lanes
    };
  }

  function tracePath(lanes, rungs, startLane, topY, bottomY) {
    var lane = startLane;
    var curY = topY;
    var lastRungId = -1;
    var points = [{ x: lanes[lane], y: topY, isTurn: false }];
    var turnCount = 0;
    var diagDownCount = 0;

    for (var step = 0; step < rungs.length + 5; step++) {
      var bestRung = null;
      var bestEnterY = Infinity;
      var bestExitLane = -1;
      var bestExitY = Infinity;

      for (var j = 0; j < rungs.length; j++) {
        var rung = rungs[j];
        if (rung.id === lastRungId) continue;

        if (rung.type === "xcross") {
          if (rung.laneA === lane && rung.yA >= curY - 0.001 && rung.yA < bestEnterY) {
            bestEnterY = rung.yA;
            bestExitLane = rung.laneB;
            bestExitY = rung.yB;
            bestRung = rung;
          } else if (rung.laneB === lane && rung.yA >= curY - 0.001 && rung.yA < bestEnterY) {
            bestEnterY = rung.yA;
            bestExitLane = rung.laneA;
            bestExitY = rung.yB;
            bestRung = rung;
          }
        } else if (rung.laneA === lane && rung.yA >= curY - 0.001 && rung.yA < bestEnterY) {
          bestEnterY = rung.yA;
          bestExitLane = rung.laneB;
          bestExitY = rung.yB;
          bestRung = rung;
        } else if (rung.laneB === lane && rung.yB >= curY - 0.001 && rung.yB < bestEnterY) {
          bestEnterY = rung.yB;
          bestExitLane = rung.laneA;
          bestExitY = rung.yA;
          bestRung = rung;
        }
      }

      if (!bestRung) break;

      points.push({
        x: lanes[lane],
        y: bestEnterY,
        isTurn: true,
        isEntry: true,
        rungType: bestRung.type
      });

      points.push({
        x: lanes[bestExitLane],
        y: bestExitY,
        isTurn: true,
        isEntry: false,
        rungType: bestRung.type
      });

      turnCount += 1;
      if (bestRung.type === "xcross") diagDownCount += 1;

      lane = bestExitLane;
      curY = bestExitY;
      lastRungId = bestRung.id;
    }

    points.push({ x: lanes[lane], y: bottomY, isTurn: false });

    var cumDist = [0];
    var totalDist = 0;
    var turnDists = [];

    for (var p = 1; p < points.length; p++) {
      var dx = points[p].x - points[p - 1].x;
      var dy = points[p].y - points[p - 1].y;
      var segLen = Math.hypot(dx, dy);
      totalDist += segLen;
      cumDist.push(totalDist);
      if (points[p].isTurn) {
        turnDists.push({
          dist: totalDist,
          x: points[p].x,
          y: points[p].y,
          isEntry: !!points[p].isEntry,
          rungType: points[p].rungType || "normal"
        });
      }
    }

    return {
      startLane: startLane,
      endLane: lane,
      points: points,
      cumDist: cumDist,
      totalDist: totalDist,
      turnDists: turnDists,
      turnCount: turnCount,
      diagDownCount: diagDownCount
    };
  }

  function traceAllPaths(layout, rungs) {
    var paths = [];
    for (var i = 0; i < layout.lanes.length; i++) {
      paths.push(tracePath(layout.lanes, rungs, i, layout.topY, layout.bottomY));
    }
    return paths;
  }

  function verifyBijection(paths) {
    var seen = {};
    for (var i = 0; i < paths.length; i++) {
      var endLane = paths[i].endLane;
      if (seen[endLane]) return false;
      seen[endLane] = true;
      var pts = paths[i].points;
      for (var p = 1; p < pts.length; p++) {
        if (pts[p].y < pts[p - 1].y - 1e-6) return false;
      }
    }
    return Object.keys(seen).length === paths.length;
  }

  function buildSingleAttempt(names, prizes, options, seed) {
    var count = names.length;
    var layout = computeLayout(count);
    var rng = mulberry32(seed);
    var rungs = [];
    var nextId = 0;
    var rowStart = layout.topY + 18;
    var rowEnd = layout.bottomY - 22;

    var complexity = (options && options.complexity) || "complex";
    var useXCross = options ? options.useXCross !== false : true;

    var xcrossCount = !useXCross ? 0 : complexity === "normal" ? 14 : complexity === "ultra" ? 40 : 32;
    var rows = complexity === "normal" ? 30 : complexity === "ultra" ? 64 : 52;
    var maxPerRowEven = complexity === "normal" ? 2 : complexity === "ultra" ? 4 : 3;
    var maxPerRowOdd = complexity === "normal" ? 1 : complexity === "ultra" ? 3 : 2;

    if (xcrossCount > 0 && count >= 2) {
      for (var x = 0; x < xcrossCount; x++) {
        var baseXy = rowStart + 10 + ((rowEnd - rowStart - 48) * x) / Math.max(1, xcrossCount - 1);
        var xLaneA = Math.floor(rng() * (count - 1));
        var xTop = clamp(baseXy + (rng() - 0.5) * 6, rowStart, rowEnd - 34);
        var drop = 26 + rng() * 8;
        var crossCand = {
          id: nextId,
          type: "xcross",
          laneA: xLaneA,
          yA: xTop,
          laneB: xLaneA + 1,
          yB: xTop + drop
        };
        if (canPlaceRung(rungs, crossCand)) {
          rungs.push(crossCand);
          nextId++;
        }
      }
    }

    for (var r = 0; r < rows; r++) {
      var baseY = rowStart + ((rowEnd - rowStart) * r) / Math.max(1, rows - 1);
      var targetPerRow = r % 2 === 0 ? maxPerRowEven : maxPerRowOdd;
      var candidateLanes = [];
      for (var l = 0; l < count - 1; l++) {
        candidateLanes.push(l);
      }
      for (var c = candidateLanes.length - 1; c > 0; c--) {
        var swapIdx = Math.floor(rng() * (c + 1));
        var tmp = candidateLanes[c];
        candidateLanes[c] = candidateLanes[swapIdx];
        candidateLanes[swapIdx] = tmp;
      }

      var placed = 0;
      for (var idx = 0; idx < candidateLanes.length && placed < targetPerRow; idx++) {
        var laneIdx = candidateLanes[idx];
        var y = clamp(baseY + (rng() - 0.5) * 3, rowStart, rowEnd);
        var normCand = {
          id: nextId,
          type: "normal",
          laneA: laneIdx,
          yA: y,
          laneB: laneIdx + 1,
          yB: y
        };
        if (canPlaceRung(rungs, normCand)) {
          rungs.push(normCand);
          nextId++;
          placed++;
        }
      }
    }

    rungs.sort(function (a, b) {
      return Math.min(a.yA, a.yB) - Math.min(b.yA, b.yB);
    });

    layout.rungs = rungs;
    var paths = traceAllPaths(layout, rungs);
    var bijectionOk = verifyBijection(paths);

    return {
      seed: seed,
      names: names.slice(),
      prizes: prizes.slice(),
      layout: layout,
      paths: paths,
      bijectionOk: bijectionOk,
      nextRungId: nextId
    };
  }

  function generateLadder(names, prizes, options) {
    var baseSeed = (options && options.seed != null)
      ? options.seed
      : ((Date.now() ^ Math.floor(Math.random() * 0xffffff)) >>> 0);

    for (var attempt = 0; attempt < 25; attempt++) {
      var ladder = buildSingleAttempt(names, prizes, options, baseSeed + attempt);
      if (ladder.bijectionOk) {
        return ladder;
      }
    }
    return buildSingleAttempt(names, prizes, { complexity: "normal", useXCross: false }, baseSeed);
  }

  function tryAddManualRung(ladder, laneA, y) {
    if (!ladder || !ladder.layout) return { ok: false, reason: "invalid" };
    var count = ladder.layout.lanes.length;
    if (laneA < 0 || laneA >= count - 1) return { ok: false, reason: "out_of_range" };
    var clampedY = clamp(y, ladder.layout.topY + 14, ladder.layout.bottomY - 14);
    var nextId = ladder.nextRungId != null ? ladder.nextRungId : (ladder.layout.rungs.length + 1);
    var candidate = {
      id: nextId,
      type: "normal",
      laneA: laneA,
      yA: clampedY,
      laneB: laneA + 1,
      yB: clampedY,
      isManual: true
    };
    if (!canPlaceRung(ladder.layout.rungs, candidate)) {
      return { ok: false, reason: "conflict" };
    }
    var updatedRungs = ladder.layout.rungs.concat([candidate]);
    updatedRungs.sort(function (a, b) {
      return Math.min(a.yA, a.yB) - Math.min(b.yA, b.yB);
    });
    var updatedPaths = traceAllPaths(ladder.layout, updatedRungs);
    if (!verifyBijection(updatedPaths)) {
      return { ok: false, reason: "bijection_failed" };
    }
    ladder.layout.rungs = updatedRungs;
    ladder.paths = updatedPaths;
    ladder.nextRungId = nextId + 1;
    return { ok: true, rung: candidate };
  }

  function getPointAtDistance(pathData, targetDist) {
    var pts = pathData.points;
    var cum = pathData.cumDist;
    var d = clamp(targetDist, 0, pathData.totalDist);
    var traveled = [{ x: pts[0].x, y: pts[0].y }];

    for (var i = 1; i < pts.length; i++) {
      if (d >= cum[i]) {
        traveled.push({ x: pts[i].x, y: pts[i].y });
      } else {
        var segStart = cum[i - 1];
        var segLen = cum[i] - segStart;
        var ratio = segLen > 0 ? (d - segStart) / segLen : 0;
        var dx = pts[i].x - pts[i - 1].x;
        var dy = pts[i].y - pts[i - 1].y;
        var cx = lerp(pts[i - 1].x, pts[i].x, ratio);
        var cy = lerp(pts[i - 1].y, pts[i].y, ratio);
        traveled.push({ x: cx, y: cy });
        return {
          x: cx,
          y: cy,
          dirX: segLen > 0 ? dx / segLen : 0,
          dirY: segLen > 0 ? dy / segLen : 1,
          onSlide: Boolean(pts[i].rungType === "xcross" && !pts[i].isEntry),
          traveled: traveled
        };
      }
    }
    var last = pts[pts.length - 1];
    return { x: last.x, y: last.y, dirX: 0, dirY: 1, onSlide: false, traveled: traveled };
  }

  window.AmidakujiLadder = {
    STAGE_W: STAGE_W,
    STAGE_H: 720,
    generateLadder: generateLadder,
    traceAllPaths: traceAllPaths,
    verifyBijection: verifyBijection,
    tryAddManualRung: tryAddManualRung,
    getPointAtDistance: getPointAtDistance,
    canPlaceRung: canPlaceRung
  };
})();
