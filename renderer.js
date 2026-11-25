(function () {
  "use strict";

  var FONT_FAMILY = "'Yu Gothic UI', 'Meiryo', 'Hiragino Kaku Gothic ProN', sans-serif";
  var MULTI_TRAIL_COLORS = [
    "#d92b2b", "#2563eb", "#059669", "#d97706",
    "#7c3aed", "#db2777", "#0891b2", "#ea580c"
  ];

  function roundRectPath(ctx, x, y, w, h, r) {
    var rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
  }

  function easeOutBack(t) {
    var c1 = 1.70158;
    var c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function stripGrandPrefix(prizeText) {
    var s = String(prizeText || "");
    if (s.charAt(0) === "★") {
      return { isGrand: true, clean: s.slice(1).trim() || "特賞" };
    }
    return { isGrand: false, clean: s };
  }

  function drawLantern(ctx, x, y, swayAngle, bodyColor, stripeColor, glowColor, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swayAngle);
    ctx.scale(scale || 1, scale || 1);

    ctx.strokeStyle = "#5c3b1e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(0, 0);
    ctx.stroke();

    if (glowColor) {
      var g = ctx.createRadialGradient(0, 22, 4, 0, 22, 40);
      g.addColorStop(0, glowColor);
      g.addColorStop(1, "rgba(255, 200, 80, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 22, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = bodyColor;
    roundRectPath(ctx, -16, 4, 32, 38, 14);
    ctx.fill();
    ctx.strokeStyle = stripeColor;
    ctx.lineWidth = 1.5;
    for (var r = 13; r <= 33; r += 10) {
      ctx.beginPath();
      ctx.moveTo(-15, r);
      ctx.quadraticCurveTo(0, r + 3, 15, r);
      ctx.stroke();
    }

    ctx.fillStyle = "#2b1d12";
    roundRectPath(ctx, -11, 0, 22, 6, 2);
    ctx.fill();
    roundRectPath(ctx, -10, 40, 20, 5, 2);
    ctx.fill();

    ctx.strokeStyle = "#e6a825";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 45);
    ctx.lineTo(0, 56);
    ctx.stroke();

    ctx.restore();
  }

  function strokePolyline(fctx, pts) {
    if (!pts || pts.length < 2) return;
    fctx.beginPath();
    fctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) {
      fctx.lineTo(pts[i].x, pts[i].y);
    }
    fctx.stroke();
  }

  function sampleBackAlongTrail(pts, distBack) {
    if (!pts || pts.length < 2) return null;
    var remaining = distBack;
    for (var i = pts.length - 1; i > 0; i--) {
      var dx = pts[i].x - pts[i - 1].x;
      var dy = pts[i].y - pts[i - 1].y;
      var seg = Math.hypot(dx, dy);
      if (seg >= remaining && seg > 0) {
        var r = 1 - remaining / seg;
        return { x: pts[i - 1].x + dx * r, y: pts[i - 1].y + dy * r };
      }
      remaining -= seg;
    }
    return pts[0];
  }

  function drawSpeedLines(ctx, w, h, time, color) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    var count = 34;
    for (var i = 0; i < count; i++) {
      var a = (Math.PI * 2 * i) / count + Math.sin(time * 28 + i) * 0.03;
      var innerR = 250 + ((i * 53 + Math.floor(time * 900)) % 95);
      var outerR = Math.max(w, h) * 0.78;
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.25 + ((i * 17) % 5) * 0.11;
      ctx.lineWidth = 2 + (i % 3) * 1.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBackground(ctx, w, h, time) {
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "#fff8eb");
    bg.addColorStop(1, "#f7e7ca");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle Seigaiha wave motif
    ctx.save();
    ctx.strokeStyle = "rgba(217, 43, 43, 0.065)";
    ctx.lineWidth = 1.5;
    var stepX = 84;
    var stepY = 42;
    for (var row = 0; row * stepY <= h + 40; row++) {
      var offsetX = (row % 2) * (stepX / 2);
      for (var col = -1; col * stepX <= w + 40; col++) {
        var cx = col * stepX + offsetX;
        var cy = row * stepY;
        for (var rad = 14; rad <= 38; rad += 12) {
          ctx.beginPath();
          ctx.arc(cx, cy, rad, Math.PI, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
    ctx.restore();

    // Top Kohaku curtain (紅白幕)
    var stripeW = 48;
    for (var sx = 0; sx < w; sx += stripeW) {
      ctx.fillStyle = (Math.floor(sx / stripeW) % 2 === 0) ? "#d92b2b" : "#fffdf7";
      ctx.fillRect(sx, 0, stripeW, 38);
      ctx.beginPath();
      ctx.arc(sx + stripeW / 2, 38, stripeW / 2, 0, Math.PI);
      ctx.fill();
    }
    ctx.strokeStyle = "#b8860b";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.lineTo(w, 38);
    ctx.stroke();

    // Swaying lanterns
    var sway = Math.sin(time * 2.2) * 0.08;
    drawLantern(ctx, 56, 44, sway, "#e63939", "#9e1c1c", "rgba(255,190,70,0.45)", 0.95);
    drawLantern(ctx, 118, 42, -sway * 0.9, "#fff7e8", "#d92b2b", "rgba(255,210,120,0.35)", 0.85);
    drawLantern(ctx, w - 118, 42, sway * 0.9, "#fff7e8", "#d92b2b", "rgba(255,210,120,0.35)", 0.85);
    drawLantern(ctx, w - 56, 44, -sway, "#e63939", "#9e1c1c", "rgba(255,190,70,0.45)", 0.95);
  }

  function drawBoardFrame(ctx, layout, state) {
    ctx.save();
    ctx.fillStyle = "rgba(255, 253, 248, 0.84)";
    ctx.strokeStyle = "#e3b458";
    ctx.lineWidth = 3;
    roundRectPath(ctx, layout.left - 34, layout.topY - 64, layout.width + 68, layout.height + 144, 20);
    ctx.fill();
    ctx.stroke();

    if (state.manualAddMode && state.hoverRung) {
      var hr = state.hoverRung;
      var x1 = layout.lanes[hr.laneA];
      var x2 = layout.lanes[hr.laneA + 1];
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = hr.valid ? "#16a34a" : "#dc2626";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x1, hr.y);
      ctx.lineTo(x2, hr.y);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawMysteryFog(ctx, fogCanvas, layout, state) {
    if (!fogCanvas) return;
    var fctx = fogCanvas.getContext("2d");
    var fw = fogCanvas.width;
    var fh = fogCanvas.height;

    fctx.clearRect(0, 0, fw, fh);
    fctx.save();

    var fogLeft = layout.left - 24;
    var fogWidth = layout.width + 48;
    var fogTop = layout.topY + layout.height * 0.40;
    var fogBottom = layout.bottomY + 6;
    var fogHeight = fogBottom - fogTop;

    // 100% opaque solid veil
    fctx.fillStyle = "#f5e3be";
    roundRectPath(fctx, fogLeft, fogTop, fogWidth, fogHeight, 14);
    fctx.fill();

    // Soft puffy cloud edge along top of fog
    fctx.fillStyle = "#fbf0d8";
    var bumps = 22;
    for (var b = 0; b <= bumps; b++) {
      var bx = fogLeft + 18 + ((fogWidth - 36) * b) / bumps;
      var by = fogTop + Math.sin(b * 1.9 + state.time * 1.2) * 5;
      fctx.beginPath();
      fctx.arc(bx, by, 26, 0, Math.PI * 2);
      fctx.fill();
    }

    // Mystery "?" watermark pattern inside unexplored fog
    fctx.fillStyle = "rgba(194, 140, 66, 0.25)";
    fctx.font = "900 22px " + FONT_FAMILY;
    fctx.textAlign = "center";
    fctx.textBaseline = "middle";
    for (var row = 0; row < 4; row++) {
      var my = fogTop + 44 + row * 68;
      if (my > fogBottom - 16) break;
      for (var col = 0; col < 11; col++) {
        var mx = fogLeft + 52 + col * 102 + (row % 2) * 44;
        if (mx > fogLeft + fogWidth - 36) continue;
        fctx.fillText("？", mx, my);
      }
    }

    // 2. Carve out paths traversed by completed participants & active runners (zero translucent halos)
    fctx.globalCompositeOperation = "destination-out";
    fctx.lineCap = "round";
    fctx.lineJoin = "round";
    fctx.strokeStyle = "#000000";

    if (state.completedPaths && state.completedPaths.length > 0) {
      fctx.lineWidth = 24;
      for (var p = 0; p < state.completedPaths.length; p++) {
        strokePolyline(fctx, state.completedPaths[p].points);
      }
    }

    if (state.runners && state.runners.length > 0) {
      for (var r = 0; r < state.runners.length; r++) {
        var runner = state.runners[r];
        if (runner.traveledPoints && runner.traveledPoints.length > 1) {
          fctx.lineWidth = 28;
          strokePolyline(fctx, runner.traveledPoints);
        }
        if (runner.pos && state.phase !== "intro") {
          var rGrad = fctx.createRadialGradient(
            runner.pos.x, runner.pos.y, 28,
            runner.pos.x, runner.pos.y, 34
          );
          rGrad.addColorStop(0, "rgba(0,0,0,1)");
          rGrad.addColorStop(1, "rgba(0,0,0,0)");
          fctx.fillStyle = rGrad;
          fctx.beginPath();
          fctx.arc(runner.pos.x, runner.pos.y, 34, 0, Math.PI * 2);
          fctx.fill();
        }
      }
    }

    fctx.restore();
    ctx.drawImage(fogCanvas, 0, 0);
  }

  function drawPrizeLabel(ctx, label, cx, cy, maxW, singleSize, multiSize, lineGap) {
    if (label.length <= 4) {
      ctx.font = "800 " + singleSize + "px " + FONT_FAMILY;
      ctx.fillText(label, cx, cy, maxW);
    } else {
      var digitIdx = label.search(/\d/);
      var splitAt = digitIdx > 0 ? digitIdx : Math.floor(label.length / 2);
      var line1 = label.slice(0, splitAt);
      var line2 = label.slice(splitAt);
      ctx.font = "800 " + multiSize + "px " + FONT_FAMILY;
      ctx.fillText(line1, cx, cy - lineGap / 2, maxW);
      ctx.fillText(line2, cx, cy + lineGap / 2, maxW);
    }
  }

  function drawBoardContent(ctx, fogCanvas, ladder, state) {
    var layout = ladder.layout;
    var lanes = layout.lanes;
    var topY = layout.topY;
    var bottomY = layout.bottomY;
    var rungs = layout.rungs;

    var activeStartSet = {};
    if (state.runners) {
      for (var ar = 0; ar < state.runners.length; ar++) {
        activeStartSet[state.runners[ar].startLane] = true;
      }
    }

    // 1. Vertical lane lines
    ctx.lineCap = "round";
    for (var i = 0; i < lanes.length; i++) {
      var lx = lanes[i];
      var isHighlighted = activeStartSet[i] || state.hoveredLane === i;
      ctx.strokeStyle = isHighlighted ? "#e6a825" : "#d6c3a5";
      ctx.lineWidth = isHighlighted ? 4.5 : 4;
      ctx.beginPath();
      ctx.moveTo(lx, topY);
      ctx.lineTo(lx, bottomY);
      ctx.stroke();
    }

    // 2. Rungs: normal horizontal & downward-sloping diagonal cross rungs
    for (var r = 0; r < rungs.length; r++) {
      var rung = rungs[r];
      var xA = lanes[rung.laneA];
      var yA = rung.yA;
      var xB = lanes[rung.laneB];
      var yB = rung.yB;

      if (rung.type === "xcross") {
        var diagCol = "#2b6cb0";
        ctx.strokeStyle = diagCol;
        ctx.lineWidth = 4.8;
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xB, yB);
        ctx.stroke();

        var cx1 = xB + (xA - xB) * 0.25;
        var cy1 = yA + (yB - yA) * 0.25;
        var cx2 = xB + (xA - xB) * 0.75;
        var cy2 = yA + (yB - yA) * 0.75;
        ctx.strokeStyle = "#fffcf5";
        ctx.lineWidth = 8.5;
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.lineTo(cx2, cy2);
        ctx.stroke();

        ctx.strokeStyle = diagCol;
        ctx.lineWidth = 4.8;
        ctx.beginPath();
        ctx.moveTo(xB, yA);
        ctx.lineTo(xA, yB);
        ctx.stroke();

        ctx.fillStyle = diagCol;
        ctx.beginPath();
        ctx.arc(xA, yA, 3.2, 0, Math.PI * 2);
        ctx.arc(xB, yA, 3.2, 0, Math.PI * 2);
        ctx.arc(xA, yB, 3.2, 0, Math.PI * 2);
        ctx.arc(xB, yB, 3.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = rung.isManual ? "#e67e22" : "#c2a57c";
        ctx.lineWidth = rung.isManual ? 4.8 : 4;
        ctx.beginPath();
        ctx.moveTo(xA, yA);
        ctx.lineTo(xB, yB);
        ctx.stroke();
      }
    }

    // 2.5. Completed participants' dashed trails
    if (state.completedPaths && state.completedPaths.length > 0) {
      ctx.save();
      ctx.strokeStyle = "rgba(180, 125, 65, 0.62)";
      ctx.lineWidth = 4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.setLineDash([7, 5]);
      for (var pt = 0; pt < state.completedPaths.length; pt++) {
        strokePolyline(ctx, state.completedPaths[pt].points);
      }
      ctx.restore();
    }

    // 3. Active runner(s)' highlighted trails
    if (state.runners && state.runners.length > 0) {
      var multi = state.runners.length > 1;
      for (var tr = 0; tr < state.runners.length; tr++) {
        var rItem = state.runners[tr];
        if (!rItem.traveledPoints || rItem.traveledPoints.length <= 1) continue;
        var trailCol = multi ? MULTI_TRAIL_COLORS[tr % MULTI_TRAIL_COLORS.length] : "#d92b2b";
        ctx.save();
        if (!multi) {
          ctx.shadowColor = "rgba(230, 80, 40, 0.45)";
          ctx.shadowBlur = 14;
        }
        ctx.strokeStyle = trailCol;
        ctx.lineWidth = multi ? 5.5 : 7;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        strokePolyline(ctx, rItem.traveledPoints);
        ctx.restore();
      }
    }

    // 4. Corner sparkle bursts
    if (state.recentTurns && state.recentTurns.length > 0) {
      for (var st = 0; st < state.recentTurns.length; st++) {
        var rt = state.recentTurns[st];
        var age = state.time - rt.time;
        if (age >= 0 && age < 0.45) {
          var burstP = age / 0.45;
          ctx.save();
          ctx.globalAlpha = 1 - burstP;
          ctx.strokeStyle = "#e6a825";
          ctx.lineWidth = 2.5;
          var rad = 8 + burstP * 26;
          ctx.beginPath();
          ctx.arc(rt.x, rt.y, rad, 0, Math.PI * 2);
          ctx.stroke();
          for (var s = 0; s < 6; s++) {
            var a = (Math.PI * 2 * s) / 6 + burstP * 0.6;
            ctx.beginPath();
            ctx.moveTo(rt.x + Math.cos(a) * (rad * 0.55), rt.y + Math.sin(a) * (rad * 0.55));
            ctx.lineTo(rt.x + Math.cos(a) * (rad * 1.15), rt.y + Math.sin(a) * (rad * 1.15));
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }

    // 4.5. Mid-to-bottom fog veil
    if (state.useFog && !state.fogRevealedAll) {
      drawMysteryFog(ctx, fogCanvas, layout, state);
    }

    // 5. Participant name tags (top)
    var tagW = layout.tagW;
    var tagH = 38;
    var tagY = topY - tagH - 12;
    var nameFontPx = tagW < 46 ? 10.5 : tagW < 54 ? 11.5 : 13;

    for (var n = 0; n < lanes.length; n++) {
      var nx = lanes[n];
      var isSelected = !!activeStartSet[n];
      var isDone = !!(state.doneStartSet && state.doneStartSet[n]);
      var isHovered = !isSelected && !isDone && state.hoveredLane === n;

      ctx.save();
      if (isSelected) {
        var pulse = 1 + Math.sin(state.time * 7) * 0.04;
        ctx.translate(nx, tagY + tagH / 2);
        ctx.scale(pulse, pulse);
        ctx.translate(-nx, -(tagY + tagH / 2));
      } else if (isDone) {
        ctx.globalAlpha = 0.65;
      }

      ctx.fillStyle = isSelected ? "#d92b2b" : isHovered ? "#fff1d6" : "#fffaf0";
      roundRectPath(ctx, nx - tagW / 2, tagY, tagW, tagH, 9);
      ctx.fill();

      ctx.strokeStyle = isSelected ? "#f5b942" : isHovered ? "#d92b2b" : "#d6b37c";
      ctx.lineWidth = isSelected ? 2.8 : isHovered ? 2.4 : 1.5;
      ctx.stroke();

      ctx.fillStyle = isSelected ? "#ffffff" : "#472c16";
      ctx.font = (isSelected ? "900 " : "700 ") + nameFontPx + "px " + FONT_FAMILY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ladder.names[n], nx, isDone ? tagY + 14 : tagY + tagH / 2, tagW - 8);

      if (isDone) {
        ctx.font = "800 9.5px " + FONT_FAMILY;
        ctx.fillStyle = "#a16207";
        ctx.fillText("済", nx, tagY + 29);
      }
      ctx.restore();
    }

    // 6. Prize boxes (bottom — all prizes visible from start)
    var boxW = layout.boxW;
    var boxH = 54;
    var boxY = bottomY + 12;

    for (var p = 0; p < lanes.length; p++) {
      var px = lanes[p];
      var rawPrize = ladder.prizes[p] || "景品";
      var parsed = stripGrandPrefix(rawPrize);
      var claimInfo = state.claimedByEndLane ? state.claimedByEndLane[p] : null;
      var isCelebrating = state.celebratingEndLanes && state.celebratingEndLanes[p];
      var isClaimed = !!claimInfo && !isCelebrating;

      ctx.save();
      if (isCelebrating) {
        var winPulse = 1 + Math.sin(state.time * 10) * 0.05;
        ctx.translate(px, boxY + boxH / 2);
        ctx.scale(winPulse, winPulse);
        ctx.translate(-px, -(boxY + boxH / 2));
        ctx.shadowColor = "rgba(245, 185, 66, 0.9)";
        ctx.shadowBlur = 22;
      } else if (parsed.isGrand && !isClaimed) {
        ctx.shadowColor = "rgba(245, 185, 66, 0.65)";
        ctx.shadowBlur = 10;
      } else if (isClaimed) {
        ctx.globalAlpha = 0.62;
      }

      ctx.fillStyle = (parsed.isGrand || isCelebrating)
        ? "#ffd859"
        : isClaimed
        ? "#f6ead6"
        : "#8a1c1c";
      roundRectPath(ctx, px - boxW / 2, boxY, boxW, boxH, 10);
      ctx.fill();

      ctx.strokeStyle = (parsed.isGrand || isCelebrating)
        ? "#d92b2b"
        : isClaimed
        ? "#d6b37c"
        : "#f5b942";
      ctx.lineWidth = isCelebrating ? 3.2 : parsed.isGrand ? 2.4 : 1.5;
      ctx.stroke();

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var maxTxtW = boxW - 7;
      var sSize = boxW < 48 ? 10 : 11.5;
      var mSize = boxW < 48 ? 9 : 10.5;

      if (isClaimed) {
        ctx.fillStyle = "#a16207";
        ctx.font = "800 9.5px " + FONT_FAMILY;
        ctx.fillText(claimInfo.name + "済", px, boxY + 13, maxTxtW);
        ctx.fillStyle = "#472c16";
        drawPrizeLabel(ctx, parsed.clean, px, boxY + 35, maxTxtW, sSize - 1, mSize - 1, 11);
      } else if (parsed.isGrand) {
        ctx.fillStyle = "#7a1414";
        ctx.font = "900 11.5px " + FONT_FAMILY;
        ctx.fillText("★特賞", px, boxY + 17, maxTxtW);
        drawPrizeLabel(ctx, parsed.clean, px, boxY + 37, maxTxtW, sSize, mSize - 0.5, 11);
      } else {
        ctx.fillStyle = "#ffe39c";
        drawPrizeLabel(ctx, parsed.clean, px, boxY + boxH / 2, maxTxtW, sSize, mSize, 13);
      }
      ctx.restore();
    }
  }

  function drawRunners(ctx, state) {
    if (!state.runners || state.runners.length === 0) return;
    var multi = state.runners.length > 1;
    var nobilSize = multi ? 36 : 46;

    for (var i = 0; i < state.runners.length; i++) {
      var r = state.runners[i];
      if (!r.pos) continue;

      var nobilOpts = {
        size: nobilSize,
        pattern: r.anim.activePattern,
        prevPattern: r.anim.prevPattern,
        patternBlend: window.NobilkunAnim.getBlendedFactor(r.anim.patternBlend),
        time: state.time + i * 0.37,
        dirX: r.anim.smoothDirX,
        dirY: r.anim.smoothDirY,
        glowColor: state.phase === "sprint" ? "rgba(255, 120, 40, 0.85)" : "rgba(255, 200, 80, 0.45)"
      };

      if (state.phase === "sprint" && r.traveledPoints && !multi) {
        var offsets = [34, 22, 11];
        var alphas = [0.18, 0.3, 0.48];
        for (var g = 0; g < offsets.length; g++) {
          var ghostPos = sampleBackAlongTrail(r.traveledPoints, offsets[g]);
          if (!ghostPos) continue;
          ctx.save();
          ctx.globalAlpha = alphas[g];
          window.NobilkunAnim.draw(ctx, ghostPos.x, ghostPos.y, Object.assign({}, nobilOpts, { isGhost: true }));
          ctx.restore();
        }
      }

      window.NobilkunAnim.draw(ctx, r.pos.x, r.pos.y, nobilOpts);

      if (multi && r.name) {
        ctx.save();
        var pw = 48;
        var ph = 18;
        var py = r.pos.y - 38;
        ctx.fillStyle = "rgba(217, 43, 43, 0.92)";
        roundRectPath(ctx, r.pos.x - pw / 2, py, pw, ph, 9);
        ctx.fill();
        ctx.strokeStyle = "#ffd86b";
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "800 10px " + FONT_FAMILY;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(r.name, r.pos.x, py + ph / 2, pw - 6);
        ctx.restore();
      }
    }
  }

  function drawKusudamaCelebration(ctx, w, h, state) {
    var phaseT = state.phaseTime != null ? state.phaseTime : state.time;
    var goalElapsed = Math.max(0, phaseT - state.goalStart);
    if (goalElapsed <= 0) return;

    var isGrand = !!state.goalIsGrand;
    var isAll = state.goalMode === "all";

    var dropP = clamp01(goalElapsed / 0.42);
    var crackP = clamp01((goalElapsed - 0.40) / 0.55);
    var bannerP = clamp01((goalElapsed - 0.62) / 0.65);

    // Pre-crack anticipation wobble right before popping open
    var preShake = (goalElapsed > 0.30 && goalElapsed < 0.50)
      ? Math.sin(goalElapsed * 55) * 0.08 * (1 - clamp01((goalElapsed - 0.30) / 0.20))
      : 0;

    var cx = w * 0.5;
    var radius = 68;
    var cy = 36 + easeOutBack(dropP) * 76;
    var splitAngle = easeOutBack(crackP) * 0.82;
    var hingeOffset = easeOutBack(crackP) * 14;

    var styleOpts = (isGrand || isAll)
      ? {
          shellLight: "#ffe680",
          shellDark: "#d48806",
          shellTrim: "#ffffff",
          shellStripe: "#d92b2b",
          cordColor: "#d9a020",
          rayColor: "rgba(255, 212, 71, 0.28)",
          bannerBg: "#fffdf5",
          bannerBorder: "#e6a825",
          bannerSubColor: "#b45309",
          bannerNameColor: "#261b12",
          bannerAccent: "#d92b2b",
          prizePillBg: "#e6a825",
          prizePillText: "#261b12",
          confettiColors: ["#ffd447", "#ef4444", "#ffffff", "#fb923c", "#fde047"]
        }
      : {
          shellLight: "#ff5252",
          shellDark: "#b91c1c",
          shellTrim: "#f5b942",
          shellStripe: "#fff8eb",
          cordColor: "#d9a020",
          rayColor: "rgba(255, 195, 70, 0.22)",
          bannerBg: "#fffdf7",
          bannerBorder: "#d92b2b",
          bannerSubColor: "#b91c1c",
          bannerNameColor: "#261b12",
          bannerAccent: "#e6a825",
          prizePillBg: "#d92b2b",
          prizePillText: "#ffffff",
          confettiColors: ["#ef4444", "#ffffff", "#f5b942", "#fb7185", "#fde047"]
        };

    if (crackP > 0) {
      ctx.save();
      ctx.translate(cx, cy + 20);
      ctx.rotate(state.time * 0.45);
      var rayCount = isGrand ? 16 : 12;
      for (var i = 0; i < rayCount; i++) {
        ctx.rotate((Math.PI * 2) / rayCount);
        ctx.fillStyle = styleOpts.rayColor;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-26, -540);
        ctx.lineTo(26, -540);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // Hanging cord
    ctx.strokeStyle = styleOpts.cordColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, cy - radius + 8);
    ctx.stroke();

    // Draw Kusudama hemispheres BEFORE the banner, hinged from the top so they open outward & never obscure text
    for (var side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.translate(cx + side * hingeOffset, cy - radius);
      ctx.rotate(-side * splitAngle + preShake);
      ctx.translate(0, radius);

      ctx.beginPath();
      if (side === -1) {
        ctx.arc(0, 0, radius, Math.PI * 0.5, Math.PI * 1.5);
      } else {
        ctx.arc(0, 0, radius, -Math.PI * 0.5, Math.PI * 0.5);
      }
      ctx.closePath();

      var grad = ctx.createRadialGradient(-14, -18, 6, 0, 0, radius);
      grad.addColorStop(0, styleOpts.shellLight);
      grad.addColorStop(1, styleOpts.shellDark);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = styleOpts.shellTrim;
      ctx.stroke();

      ctx.strokeStyle = styleOpts.shellStripe;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      if (side === -1) {
        ctx.arc(0, 0, radius * 0.65, Math.PI * 0.6, Math.PI * 1.4);
      } else {
        ctx.arc(0, 0, radius * 0.65, -Math.PI * 0.4, Math.PI * 0.4);
      }
      ctx.stroke();

      ctx.restore();
    }

    // Unfurling Winner Banner (drawn in front of shells and positioned cleanly below the open mouth)
    if (bannerP > 0) {
      var bh = 315 * easeOutBack(bannerP);
      var bw = 360;
      var bx = cx - bw / 2;
      var by = cy + 36;

      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 8;

      ctx.fillStyle = styleOpts.bannerBg;
      roundRectPath(ctx, bx, by, bw, bh, 14);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = styleOpts.bannerBorder;
      ctx.lineWidth = 6;
      roundRectPath(ctx, bx + 6, by + 6, bw - 12, Math.max(12, bh - 12), 10);
      ctx.stroke();

      if (bannerP > 0.25) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(bx, by, bw, bh);
        ctx.clip();

        ctx.textAlign = "center";
        ctx.fillStyle = styleOpts.bannerSubColor;
        ctx.font = "800 21px " + FONT_FAMILY;
        ctx.fillText(isAll ? "祝・全員ゴール！" : isGrand ? "★ 特賞ご当選！ ★" : "祝・ご当選！", cx, by + 56);

        ctx.fillStyle = styleOpts.bannerNameColor;
        ctx.font = "900 34px " + FONT_FAMILY;
        ctx.fillText(
          isAll ? (state.allCount + "名 抽選完了！") : (state.goalWinnerName + " さん"),
          cx,
          by + 112,
          bw - 36
        );

        ctx.strokeStyle = styleOpts.bannerAccent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - 115, by + 134);
        ctx.lineTo(cx + 115, by + 134);
        ctx.stroke();

        ctx.fillStyle = styleOpts.prizePillBg;
        roundRectPath(ctx, cx - 148, by + 154, 296, 56, 12);
        ctx.fill();

        ctx.fillStyle = styleOpts.prizePillText;
        ctx.font = "900 23px " + FONT_FAMILY;
        var pillLabel = isAll
          ? "「結果一覧」で全員分を確認！"
          : isGrand
          ? ("★特賞 " + state.goalPrizeClean)
          : state.goalPrizeClean;
        ctx.fillText(pillLabel, cx, by + 190, 276);

        ctx.fillStyle = "#5b6475";
        ctx.font = "700 15px " + FONT_FAMILY;
        ctx.fillText("おめでとうございます！", cx, by + 255);
        ctx.restore();
      }
    }

    // Confetti explosion synced to crackP
    if (state.confetti && crackP > 0.02) {
      var confElapsed = Math.max(0, goalElapsed - 0.42);
      for (var c = 0; c < state.confetti.length; c++) {
        var p = state.confetti[c];
        var px = cx + p.vx * confElapsed + Math.sin(confElapsed * p.freq + p.phase) * 18;
        var py = cy + 16 + p.vy * confElapsed + 0.5 * 360 * confElapsed * confElapsed;
        if (py > h + 40) continue;

        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rot + confElapsed * p.vRot);
        ctx.scale(Math.cos(confElapsed * 5 + p.phase), 1);
        ctx.fillStyle = styleOpts.confettiColors[c % styleOpts.confettiColors.length];
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
  }

  function drawScreenOverlay(ctx, w, h, state) {
    if (state.phase === "intro") {
      var introAlpha = clamp01(1 - Math.abs(state.phaseTime - 0.6) / 0.6);
      ctx.save();
      ctx.globalAlpha = introAlpha;
      ctx.fillStyle = "rgba(179, 28, 28, 0.92)";
      roundRectPath(ctx, w / 2 - 235, 62, 470, 52, 26);
      ctx.fill();
      ctx.strokeStyle = "#ffd86b";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 21px " + FONT_FAMILY;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        state.goalMode === "all"
          ? ("太鼓の合図でスタート！ 残り" + state.allCount + "名一斉レース！")
          : ("太鼓の合図でスタート！ " + state.activeName + "さん挑戦！"),
        w / 2,
        88,
        440
      );
      ctx.restore();
    }

    if (state.phase === "slowmo") {
      var pulse = 0.5 + 0.5 * Math.sin(state.time * 10);
      var grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, w * 0.65);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, "rgba(35, 8, 8, " + (0.42 + pulse * 0.16) + ")");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    if (state.phase === "sprint") {
      drawSpeedLines(ctx, w, h, state.time, "#ff7a29");
    }

    if (state.phase === "goal") {
      drawKusudamaCelebration(ctx, w, h, state);
    }
  }

  function renderStage(ctx, fogCanvas, ladder, state, cam) {
    var w = ctx.canvas.width || 1280;
    var h = ctx.canvas.height || 720;
    ctx.clearRect(0, 0, w, h);

    drawBackground(ctx, w, h, state.time);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    drawBoardFrame(ctx, ladder.layout, state);
    drawBoardContent(ctx, fogCanvas, ladder, state);
    drawRunners(ctx, state);

    ctx.restore();

    drawScreenOverlay(ctx, w, h, state);
  }

  function clientToWorld(canvas, clientX, clientY, cam) {
    var rect = canvas.getBoundingClientRect();
    var sx = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
    var sy = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;
    var wx = (sx - canvas.width / 2) / cam.zoom + cam.x;
    var wy = (sy - canvas.height / 2) / cam.zoom + cam.y;
    return { x: wx, y: wy };
  }

  function hitTestParticipantTag(layout, wx, wy) {
    var tagW = layout.tagW;
    var tagH = 38;
    var tagY = layout.topY - tagH - 12;
    if (wy < tagY - 4 || wy > tagY + tagH + 4) return -1;
    for (var i = 0; i < layout.lanes.length; i++) {
      var lx = layout.lanes[i];
      if (wx >= lx - tagW / 2 - 2 && wx <= lx + tagW / 2 + 2) {
        return i;
      }
    }
    return -1;
  }

  function hitTestManualRung(layout, wx, wy) {
    if (wy < layout.topY + 14 || wy > layout.bottomY - 14) return null;
    for (var i = 0; i < layout.lanes.length - 1; i++) {
      var x1 = layout.lanes[i];
      var x2 = layout.lanes[i + 1];
      if (wx >= x1 + 4 && wx <= x2 - 4) {
        return { laneA: i, y: wy };
      }
    }
    return null;
  }

  window.MatsuriRenderer = {
    renderStage: renderStage,
    stripGrandPrefix: stripGrandPrefix,
    clientToWorld: clientToWorld,
    hitTestParticipantTag: hitTestParticipantTag,
    hitTestManualRung: hitTestManualRung
  };
})();
