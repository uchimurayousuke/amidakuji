(function () {
  "use strict";

  // Procedural Nobilkun character renderer (preserved verbatim from concepts/themes.js)
  var NOBIL_V = [
    [30.03, 18.21], [56.03, 19.07], [74.60, 75.11], [117.67, 2.00], [159.91, 15.52],
    [98.30, 120.83], [56.29, 113.91], [48.78, 80.50], [38.61, 110.32], [8.30, 101.30]
  ];
  var NOBIL_PIVOT_X = 82.0;
  var NOBIL_PIVOT_Y = 68.0;

  function drawNobilOval(ctx, cx, cy, rx, ry, rotDeg, fill, stroke, sw) {
    ctx.save();
    ctx.translate(cx, cy);
    if (rotDeg) ctx.rotate((rotDeg * Math.PI) / 180);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke && sw > 0) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = sw;
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawNobilEye(ctx, cx, cy, rx, ry, rotDeg, sw, eyeMode, px, py, pr, lidAngDeg, lidOff, glint) {
    var radE = (rotDeg * Math.PI) / 180;
    if (eyeMode === "happy") {
      ctx.save();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.7;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx - 7.5, cy + 2.5);
      ctx.quadraticCurveTo(cx, cy - 7.5, cx + 7.5, cy + 2.5);
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (eyeMode === "nervous") {
      drawNobilOval(ctx, cx, cy, rx, ry, rotDeg, "#ffffff", "#000000", sw);
      ctx.save();
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      if (cx < 80) {
        ctx.moveTo(cx - 4.8, cy - 4.2);
        ctx.lineTo(cx + 3.2, cy);
        ctx.lineTo(cx - 4.8, cy + 4.2);
      } else {
        ctx.moveTo(cx + 4.8, cy - 4.2);
        ctx.lineTo(cx - 3.2, cy);
        ctx.lineTo(cx + 4.8, cy + 4.2);
      }
      ctx.stroke();
      ctx.restore();
      return;
    }

    // White sclera
    drawNobilOval(ctx, cx, cy, rx, ry, rotDeg, "#ffffff", null, 0);

    // Clipped pupil + eyelid
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, radE, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    if (glint) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px - pr * 0.36, py - pr * 0.36, Math.max(1.2, pr * 0.26), 0, Math.PI * 2);
      ctx.fill();
    }

    // Rotated upper eyelid + bottom crease
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((lidAngDeg * Math.PI) / 180);
    ctx.fillStyle = "#f9c185";
    ctx.fillRect(-40, -40, 80, 40 + lidOff);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.35;
    ctx.beginPath();
    ctx.moveTo(-40, lidOff);
    ctx.lineTo(40, lidOff);
    ctx.stroke();
    ctx.restore();

    ctx.restore();

    // Outer eye ring drawn on top
    drawNobilOval(ctx, cx, cy, rx, ry, rotDeg, null, "#000000", sw);
  }

  function drawNobilStar4(ctx, cx, cy, rOuter, rInner) {
    ctx.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / 4;
      var r = i % 2 === 0 ? rOuter : rInner;
      var sx = cx + Math.cos(a) * r;
      var sy = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function lerpNum(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpArr(a, b, t) {
    var out = [];
    for (var i = 0; i < a.length; i++) {
      out.push(a[i] + (b[i] - a[i]) * t);
    }
    return out;
  }

  function lerpPoints(a, b, t) {
    var out = [];
    for (var i = 0; i < a.length; i++) {
      out.push([lerpNum(a[i][0], b[i][0], t), lerpNum(a[i][1], b[i][1], t)]);
    }
    return out;
  }

  function computeNobilkunPose(pattern, t, dirX, dirY) {
    var dx = 0, dy = 0, rot = 0, sx = 1, sy = 1;
    var larm = [[18.4, 57.5], [5.81, 63.8], [14.52, 70.8]];
    var rarm = [[128.92, 71.4], [136.86, 68.8], [144.8, 66.2]];
    var lleg = [[24.4, 105.8], [20.2, 117.08]];
    var rleg = [[75.2, 116.2], [71.8, 126.58]];
    var lhOff = [-4.10, 3.59, 5.98, 2.50, -22.2, 1.8];
    var rhOff = [3.86, -1.69, 7.85, 4.02, -21.6, 2.3];
    var lfOff = [-6.50, 0.20, 9.20, 4.30, 8.6, 2.3];
    var rfOff = [6.50, 1.20, 8.60, 3.92, 16.6, 2.15];

    var eyeMode = "normal";
    var mouthMode = "smile";
    var glint = false;
    var cheeks = false;
    var le = [49.65, 61.60, 5.30, -11.6, -0.60];
    var re = [105.72, 68.83, 6.03, 38.0, -2.64];
    var sweat = null;
    var surpriseTicks = false;
    var speedLines = false;
    var stars = null;

    if (pattern === "idle") {
      var breathe = Math.sin(t * 3.2);
      var wave = Math.sin(t * 4.5);
      var blink = (t % 3.4) > 3.24;
      sy = 1 - breathe * 0.025;
      sx = 1 / sy;
      dy = breathe * 0.9;
      rot = Math.sin(t * 1.6) * 0.8;
      var rwY = 62.0 - wave * 5.0;
      rarm = [[128.92, 71.4], [136.96, (71.4 + rwY) * 0.5], [145.0, rwY]];
      rhOff = [4.0, -2.6 - wave * 0.8, 7.85, 4.02, -28.0 - wave * 12.0, 2.3];
      if (blink) {
        le[4] = 8.5;
        re[4] = 9.5;
      }
    } else if (pattern === "run") {
      var ph = t * 11.0;
      var stride = Math.sin(ph);
      var hop = Math.abs(stride);
      var blinkRun = (t % 3.8) > 3.66;
      dy = 1.5 - hop * 7.0;
      sy = 0.96 + hop * 0.09;
      sx = 1 / sy;
      rot = dirX * 7.5 + stride * 3.0;
      larm = [
        [18.4, 57.5],
        [4.0, 58.5 - stride * 8.0],
        [3.0 - stride * 7.0, 61.0 - stride * 16.5]
      ];
      lhOff = [-4.0, -stride * 3.2, 6.5, 2.95, stride * 30.0, 2.0];
      var rwRunY = 67.0 + stride * 13.5;
      rarm = [[128.92, 71.4], [136.36, (71.4 + rwRunY) * 0.5], [143.8, rwRunY]];
      rhOff = [4.3, stride * 3.2 - 0.6, 7.6, 3.9, stride * 34.0 - 6.0, 2.3];
      lleg = [[24.4, 105.8], [20.0 - stride * 6.5, 116.0 - Math.max(0, stride) * 3.0]];
      lfOff = [-6.0, -stride * 1.6, 9.2, 4.3, 6.0 + stride * 16.0, 2.3];
      rleg = [[75.2, 116.2], [75.5 + stride * 7.5, 124.5 - Math.max(0, -stride) * 3.5]];
      rfOff = [7.0, stride * 1.4, 8.6, 3.9, 6.0 - stride * 18.0, 2.15];
      le = [49.8 + dirX * 1.5, 61.6 + dirY * 0.8, 5.1, -14.0, blinkRun ? 8.5 : -2.5];
      re = [105.8 + dirX * 1.5, 68.8 + dirY * 0.8, 5.8, 28.0, blinkRun ? 9.5 : -4.2];
    } else if (pattern === "surprised") {
      var jit = Math.sin(t * 20.0);
      dx = dirX * 1.6;
      dy = -3.5 - Math.abs(Math.sin(t * 9.0)) * 2.5;
      rot = dirX * 11.0 + jit * 2.0;
      sx = 0.97;
      sy = 1.04;
      larm = [[18.4, 57.5], [0.5, 45.0], [-10.0, 35.0 + jit * 2.0]];
      lhOff = [-4.0, -3.5, 6.8, 3.2, 38.0, 2.1];
      var rwSurpY = 51.0 - jit * 2.0;
      rarm = [[128.92, 71.4], [140.71, (71.4 + rwSurpY) * 0.5], [152.5, rwSurpY]];
      rhOff = [4.2, -3.6, 7.8, 4.0, -42.0, 2.3];
      lleg = [[24.4, 105.8], [12.0, 115.5]];
      lfOff = [-6.5, -1.0, 9.2, 4.3, 18.0, 2.3];
      rleg = [[75.2, 116.2], [82.5, 126.5]];
      rfOff = [7.2, 0.8, 8.6, 3.9, 8.0, 2.15];
      le = [49.6 + jit * 0.4, 61.4, 3.8, -8.0, -7.8];
      re = [105.2 + jit * 0.4, 69.0, 4.2, 22.0, -8.8];
      glint = true;
      mouthMode = "o";
      surpriseTicks = true;
    } else if (pattern === "nervous") {
      var shiv = Math.sin(t * 40.0);
      var shivSlow = Math.sin(t * 16.0);
      dx = shiv * 2.2;
      dy = 2.6 + Math.abs(shivSlow) * 0.8;
      rot = shiv * 4.0;
      sx = 1.035;
      sy = 0.945;
      larm = [[18.4, 57.5], [3.0, 58.5], [7.0 + shiv * 1.2, 48.0]];
      lhOff = [-1.2, -4.2, 6.2, 2.9, 68.0, 2.0];
      rarm = [[128.92, 71.4], [142.5, 67.0], [151.5 - shiv * 1.2, 57.0]];
      rhOff = [2.2, -4.0, 7.2, 3.7, -58.0, 2.3];
      lleg = [[24.4, 105.8], [20.0 + shivSlow * 1.8, 116.5]];
      rleg = [[75.2, 116.2], [74.2 - shivSlow * 1.8, 125.8]];
      eyeMode = "nervous";
      mouthMode = "wavy";
      sweat = [137.0, 36.0 + ((t * 14) % 9)];
    } else if (pattern === "sprint") {
      var sp = Math.sin(t * 22.0);
      dx = 2.5;
      dy = -4.5 - Math.abs(sp) * 3.0;
      rot = 11.5 + dirX * 4.0;
      sx = 0.875 + sp * 0.015;
      sy = 1.19 - sp * 0.015;
      larm = [[18.4, 57.5], [1.8, 64.0], [-8.0, 70.0 + sp * 4.5]];
      lhOff = [-5.0, 1.8, 6.8, 3.0, -21.0, 2.0];
      var rwSprY = 83.8 - sp * 2.5;
      rarm = [[128.92, 71.4], [133.96, (71.4 + rwSprY) * 0.5], [139.0, rwSprY]];
      rhOff = [4.2, 3.5, 7.6, 3.8, 37.0, 2.3];
      lleg = [[24.4, 105.8], [17.5 + sp * 10.5, 114.5]];
      lfOff = [-6.0, 1.0, 9.2, 4.3, 3.0 - sp * 15.0, 2.3];
      rleg = [[75.2, 116.2], [75.0 - sp * 10.0, 124.5]];
      rfOff = [6.8, 1.1, 8.6, 3.9, 18.0 + sp * 10.0, 2.15];
      le = [51.3, 61.4, 4.6, 20.0, -1.8];
      re = [106.8, 68.4, 5.2, -22.0, -2.5];
      glint = true;
      mouthMode = "grin";
      speedLines = true;
    } else if (pattern === "ecstatic") {
      var jump = Math.max(0, Math.sin(t * 6.8));
      var waveE = Math.sin(t * 11.0);
      dy = 3.0 - jump * 12.0;
      sy = 0.95 + jump * 0.19;
      sx = 1.05 - jump * 0.14;
      rot = Math.sin(t * 3.4) * 2.5;
      larm = [[18.4, 57.5], [1.8, 43.5], [-8.5, 26.5 + waveE * 4.5]];
      lhOff = [-2.8, -4.8, 6.6, 3.1, 56.0, 2.0];
      var rwEcY = 40.5 - waveE * 4.5;
      rarm = [[128.92, 71.4], [137.56, (71.4 + rwEcY) * 0.5], [146.2, rwEcY]];
      rhOff = [3.2, -4.8, 7.8, 4.0, -56.0, 2.3];
      lleg = [[24.4, 105.8], [14.0 - jump * 2.5, 115.0 - jump * 1.5]];
      lfOff = [-6.5, -0.5, 9.2, 4.3, 12.0 + jump * 16.0, 2.3];
      rleg = [[75.2, 116.2], [82.0 + jump * 2.5, 123.0 - jump * 2.0]];
      rfOff = [7.0, -0.2, 8.6, 3.9, 12.0 - jump * 30.0, 2.15];
      eyeMode = "happy";
      cheeks = true;
      mouthMode = "ecstatic";
      stars = [
        [8.0, 2.0 - jump * 4.0, 9.5 + Math.sin(t * 8.0) * 1.8],
        [173.0, 1.0 - jump * 4.0, 11.0 + Math.cos(t * 8.0) * 1.8]
      ];
    }

    return {
      dx: dx, dy: dy, rot: rot, sx: sx, sy: sy,
      larm: larm, rarm: rarm, lleg: lleg, rleg: rleg,
      lhOff: lhOff, rhOff: rhOff, lfOff: lfOff, rfOff: rfOff,
      le: le, re: re,
      eyeMode: eyeMode, mouthMode: mouthMode, glint: glint, cheeks: cheeks,
      sweat: sweat, surpriseTicks: surpriseTicks, speedLines: speedLines, stars: stars,
      sweatAlpha: sweat ? 1 : 0,
      ticksAlpha: surpriseTicks ? 1 : 0,
      speedAlpha: speedLines ? 1 : 0,
      starsAlpha: stars ? 1 : 0
    };
  }

  function blendNobilkunPose(a, b, alpha) {
    var useB = alpha >= 0.5;
    return {
      dx: lerpNum(a.dx, b.dx, alpha),
      dy: lerpNum(a.dy, b.dy, alpha),
      rot: lerpNum(a.rot, b.rot, alpha),
      sx: lerpNum(a.sx, b.sx, alpha),
      sy: lerpNum(a.sy, b.sy, alpha),
      larm: lerpPoints(a.larm, b.larm, alpha),
      rarm: lerpPoints(a.rarm, b.rarm, alpha),
      lleg: lerpPoints(a.lleg, b.lleg, alpha),
      rleg: lerpPoints(a.rleg, b.rleg, alpha),
      lhOff: lerpArr(a.lhOff, b.lhOff, alpha),
      rhOff: lerpArr(a.rhOff, b.rhOff, alpha),
      lfOff: lerpArr(a.lfOff, b.lfOff, alpha),
      rfOff: lerpArr(a.rfOff, b.rfOff, alpha),
      le: lerpArr(a.le, b.le, alpha),
      re: lerpArr(a.re, b.re, alpha),
      eyeMode: useB ? b.eyeMode : a.eyeMode,
      mouthMode: useB ? b.mouthMode : a.mouthMode,
      glint: useB ? b.glint : a.glint,
      cheeks: useB ? b.cheeks : a.cheeks,
      sweat: b.sweat || a.sweat,
      surpriseTicks: !!(b.surpriseTicks || a.surpriseTicks),
      speedLines: !!(b.speedLines || a.speedLines),
      stars: b.stars || a.stars,
      sweatAlpha: (a.sweat && b.sweat) ? 1 : b.sweat ? alpha : a.sweat ? (1 - alpha) : 0,
      ticksAlpha: (a.surpriseTicks && b.surpriseTicks) ? 1 : b.surpriseTicks ? alpha : a.surpriseTicks ? (1 - alpha) : 0,
      speedAlpha: (a.speedLines && b.speedLines) ? 1 : b.speedLines ? alpha : a.speedLines ? (1 - alpha) : 0,
      starsAlpha: (a.stars && b.stars) ? 1 : b.stars ? alpha : a.stars ? (1 - alpha) : 0
    };
  }

  function drawNobilkun(ctx, x, y, opts) {
    opts = opts || {};
    var pattern = opts.pattern || "idle";
    var t = opts.time || 0;
    var scale = (opts.size || 48) / 162;
    var dirX = opts.dirX || 0;
    var dirY = opts.dirY || 0;
    var isGhost = !!opts.isGhost;

    var pose = (opts.prevPattern && opts.prevPattern !== pattern && opts.patternBlend != null && opts.patternBlend < 1)
      ? blendNobilkunPose(
          computeNobilkunPose(opts.prevPattern, t, dirX, dirY),
          computeNobilkunPose(pattern, t, dirX, dirY),
          opts.patternBlend
        )
      : computeNobilkunPose(pattern, t, dirX, dirY);

    var dx = pose.dx, dy = pose.dy, rot = pose.rot, sx = pose.sx, sy = pose.sy;
    var larm = pose.larm, rarm = pose.rarm, lleg = pose.lleg, rleg = pose.rleg;
    var lhOff = pose.lhOff, rhOff = pose.rhOff, lfOff = pose.lfOff, rfOff = pose.rfOff;
    var le = pose.le, re = pose.re;
    var eyeMode = pose.eyeMode, mouthMode = pose.mouthMode, glint = pose.glint, cheeks = pose.cheeks;
    var sweat = pose.sweat, surpriseTicks = pose.surpriseTicks, speedLines = pose.speedLines, stars = pose.stars;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.setLineDash([]);

    // Drop shadow (omitted for sprint ghosts)
    if (!isGhost) {
      var shadowScale = Math.max(0.68, 1 - Math.max(0, -dy) * 0.025);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.beginPath();
      ctx.ellipse(0, 74, 58 * shadowScale, 15 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Optional outer aura
    if (opts.glowColor && !isGhost) {
      var glow = ctx.createRadialGradient(0, 0, 22, 0, 0, 125);
      glow.addColorStop(0, opts.glowColor);
      glow.addColorStop(1, "rgba(255, 215, 100, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 125, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center around (82, 68) and apply pose transform
    ctx.translate(dx, dy);
    if (rot) ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(sx, sy);
    ctx.translate(-NOBIL_PIVOT_X, -NOBIL_PIVOT_Y);

    // Optional bright outer rim for dark stages
    if (opts.rimColor && !isGhost) {
      ctx.strokeStyle = opts.rimColor;
      ctx.lineWidth = 7.4;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(NOBIL_V[0][0], NOBIL_V[0][1]);
      for (var rv = 1; rv < NOBIL_V.length; rv++) {
        ctx.lineTo(NOBIL_V[rv][0], NOBIL_V[rv][1]);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // 1. Limbs behind body
    ctx.strokeStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(larm[0][0], larm[0][1]);
    for (var la = 1; la < larm.length; la++) ctx.lineTo(larm[la][0], larm[la][1]);
    ctx.stroke();

    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(rarm[0][0], rarm[0][1]);
    for (var ra = 1; ra < rarm.length; ra++) ctx.lineTo(rarm[ra][0], rarm[ra][1]);
    ctx.stroke();

    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(lleg[0][0], lleg[0][1]);
    ctx.lineTo(lleg[1][0], lleg[1][1]);
    ctx.stroke();

    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(rleg[0][0], rleg[0][1]);
    ctx.lineTo(rleg[1][0], rleg[1][1]);
    ctx.stroke();

    // 2. N body polygon
    ctx.fillStyle = "#fcfcbe";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4.0;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(NOBIL_V[0][0], NOBIL_V[0][1]);
    for (var v = 1; v < NOBIL_V.length; v++) {
      ctx.lineTo(NOBIL_V[v][0], NOBIL_V[v][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Hands & feet ovals anchored to wrists/ankles
    var lEnd = larm[larm.length - 1];
    var rEnd = rarm[rarm.length - 1];
    drawNobilOval(ctx, lEnd[0] + lhOff[0], lEnd[1] + lhOff[1], lhOff[2], lhOff[3], lhOff[4], "#fcbc54", "#000000", lhOff[5]);
    drawNobilOval(ctx, rEnd[0] + rhOff[0], rEnd[1] + rhOff[1], rhOff[2], rhOff[3], rhOff[4], "#fcbc54", "#000000", rhOff[5]);
    drawNobilOval(ctx, lleg[1][0] + lfOff[0], lleg[1][1] + lfOff[1], lfOff[2], lfOff[3], lfOff[4], "#fcbc54", "#000000", lfOff[5]);
    drawNobilOval(ctx, rleg[1][0] + rfOff[0], rleg[1][1] + rfOff[1], rfOff[2], rfOff[3], rfOff[4], "#fcbc54", "#000000", rfOff[5]);

    // 4. Optional rosy cheeks
    if (cheeks) {
      drawNobilOval(ctx, 38.5, 73.5, 5.8, 3.2, 0, "rgba(255, 110, 145, 0.48)", null, 0);
      drawNobilOval(ctx, 116.5, 80.5, 5.8, 3.2, 0, "rgba(255, 110, 145, 0.48)", null, 0);
    }

    // 5. Eyes
    drawNobilEye(ctx, 49.56, 61.25, 9.27, 9.24, 1.6, 2.1, eyeMode, le[0], le[1], le[2], le[3], le[4], glint);
    drawNobilEye(ctx, 105.19, 69.15, 10.51, 10.51, 5.8, 2.38, eyeMode, re[0], re[1], re[2], re[3], re[4], glint);

    // 6. Mouth
    ctx.strokeStyle = "#000000";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (mouthMode === "o") {
      drawNobilOval(ctx, 78.5, 89.5, 5.2, 6.2, 0, "#e04f5f", "#000000", 2.35);
    } else if (mouthMode === "wavy") {
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(64.0, 88.5);
      ctx.quadraticCurveTo(69.0, 83.5, 74.0, 88.5);
      ctx.quadraticCurveTo(79.0, 93.5, 84.0, 88.5);
      ctx.quadraticCurveTo(89.0, 83.5, 94.0, 88.5);
      ctx.stroke();
    } else if (mouthMode === "grin") {
      ctx.fillStyle = "#e04f5f";
      ctx.lineWidth = 2.35;
      ctx.beginPath();
      ctx.moveTo(64.0, 83.5);
      ctx.quadraticCurveTo(78.5, 85.0, 93.0, 84.5);
      ctx.bezierCurveTo(90.0, 99.5, 67.0, 99.5, 64.0, 83.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(60.8, 83.0);
      ctx.lineTo(66.2, 82.0);
      ctx.moveTo(90.8, 83.4);
      ctx.lineTo(96.2, 84.8);
      ctx.stroke();
    } else if (mouthMode === "ecstatic") {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(62.5, 82.0);
      ctx.quadraticCurveTo(78.5, 84.5, 94.5, 84.0);
      ctx.bezierCurveTo(91.5, 103.0, 65.5, 103.0, 62.5, 82.0);
      ctx.closePath();
      ctx.fillStyle = "#e63956";
      ctx.fill();
      ctx.save();
      ctx.clip();
      drawNobilOval(ctx, 78.5, 95.0, 8.0, 4.0, 0, "#ff8fa3", null, 0);
      ctx.restore();
      ctx.lineWidth = 2.45;
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.lineWidth = 2.36;
      ctx.beginPath();
      ctx.moveTo(64.0, 82.24);
      ctx.bezierCurveTo(64.86, 98.80, 88.74, 100.30, 92.86, 85.62);
      ctx.stroke();
      ctx.lineWidth = 2.33;
      ctx.beginPath();
      ctx.moveTo(60.45, 81.81);
      ctx.lineTo(65.51, 80.68);
      ctx.moveTo(91.84, 83.93);
      ctx.lineTo(96.97, 85.00);
      ctx.stroke();
    }

    // 7. Expressive FX overlays (unrotated/in character space, omitted for sprint ghosts)
    if (!isGhost) {
      if (sweat && pose.sweatAlpha > 0.01) {
        var swx = sweat[0];
        var swy = sweat[1];
        ctx.save();
        ctx.globalAlpha *= pose.sweatAlpha;
        ctx.fillStyle = "#4cc9ff";
        ctx.strokeStyle = "#004a7c";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(swx, swy - 9.45);
        ctx.bezierCurveTo(swx + 5.25, swy - 2.1, swx + 6.8, swy + 3.68, swx, swy + 7.88);
        ctx.bezierCurveTo(swx - 6.8, swy + 3.68, swx - 5.25, swy - 2.1, swx, swy - 9.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.beginPath();
        ctx.arc(swx - 1.5, swy + 1.0, 1.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (surpriseTicks && pose.ticksAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha *= pose.ticksAlpha;
        ctx.strokeStyle = "#ff5e3a";
        ctx.lineWidth = 2.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(158, -2); ctx.lineTo(168, -11);
        ctx.moveTo(165, 7); ctx.lineTo(177, 3);
        ctx.moveTo(147, -7); ctx.lineTo(150, -18);
        ctx.stroke();
        ctx.restore();
      }
      if (speedLines && pose.speedAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha *= pose.speedAlpha;
        ctx.strokeStyle = "rgba(255, 154, 46, 0.85)";
        ctx.lineWidth = 2.6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-18, 32); ctx.lineTo(-2, 35);
        ctx.moveTo(-22, 54); ctx.lineTo(-4, 57);
        ctx.moveTo(-16, 82); ctx.lineTo(0, 84);
        ctx.stroke();
        ctx.restore();
      }
      if (stars && pose.starsAlpha > 0.01) {
        ctx.save();
        ctx.globalAlpha *= pose.starsAlpha;
        ctx.fillStyle = "#ffd447";
        ctx.strokeStyle = "#d97706";
        ctx.lineWidth = 1.3;
        ctx.lineJoin = "round";
        for (var st = 0; st < stars.length; st++) {
          drawNobilStar4(ctx, stars[st][0], stars[st][1], stars[st][2], stars[st][2] * 0.36);
        }
        ctx.restore();
      }
    }

    ctx.restore();
  }

  // Smooth pose blending & slide-hold state helper (preserved from concepts/engine.js)
  function easeInOutCubic(t) {
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function getTargetPattern(phase, onSlide, slideHoldTimer) {
    if (phase === "intro") return "idle";
    if (phase === "goal") return "ecstatic";
    if (phase === "slowmo") return "nervous";
    if (phase === "sprint") return "sprint";
    if (onSlide || slideHoldTimer > 0) return "surprised";
    return "run";
  }

  function createAnimState() {
    return {
      smoothDirX: 0,
      smoothDirY: 1,
      activePattern: "idle",
      prevPattern: "idle",
      patternBlend: 1,
      slideHoldTimer: 0
    };
  }

  function updateAnimState(anim, dt, phase, onSlide, rawDirX, rawDirY, snapImmediate) {
    if (snapImmediate || phase !== "chase") {
      anim.slideHoldTimer = 0;
    } else if (onSlide) {
      anim.slideHoldTimer = 0.18;
    } else {
      anim.slideHoldTimer = Math.max(0, anim.slideHoldTimer - Math.max(0, dt));
    }

    var targetPattern = getTargetPattern(phase, onSlide, anim.slideHoldTimer);

    if (snapImmediate) {
      anim.smoothDirX = rawDirX;
      anim.smoothDirY = rawDirY;
      anim.activePattern = targetPattern;
      anim.prevPattern = targetPattern;
      anim.patternBlend = 1;
      return anim;
    }

    var k = 1 - Math.exp(-Math.max(0, dt) * 12);
    anim.smoothDirX = lerpNum(anim.smoothDirX, rawDirX, k);
    anim.smoothDirY = lerpNum(anim.smoothDirY, rawDirY, k);

    if (targetPattern !== anim.activePattern) {
      if (targetPattern === anim.prevPattern && anim.patternBlend < 1) {
        anim.prevPattern = anim.activePattern;
        anim.activePattern = targetPattern;
        anim.patternBlend = 1 - anim.patternBlend;
      } else {
        anim.prevPattern = anim.activePattern;
        anim.activePattern = targetPattern;
        anim.patternBlend = 0;
      }
    }
    if (anim.patternBlend < 1) {
      var nextBlend = anim.patternBlend + Math.max(0, dt) / 0.16;
      anim.patternBlend = nextBlend < 0 ? 0 : nextBlend > 1 ? 1 : nextBlend;
    }
    return anim;
  }

  window.drawNobilkun = drawNobilkun;
  window.NobilkunAnim = {
    draw: drawNobilkun,
    createAnimState: createAnimState,
    updateAnimState: updateAnimState,
    getTargetPattern: getTargetPattern,
    getBlendedFactor: easeInOutCubic
  };
})();
