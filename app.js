(function () {
  "use strict";

  var STORAGE_KEY = "amidakuji_matsuri_v1";
  var W = 1280;
  var H = 720;

  var DEFAULT_NAMES = [
    "田中", "佐藤", "鈴木", "高橋", "伊藤", "渡辺",
    "山本", "中村", "小林", "加藤", "吉田", "山田",
    "佐々木", "山口", "松本", "井上", "木村", "林"
  ];

  var DEFAULT_PRIZES = [
    "高級和牛", "カフェ券", "美容家電", "カタログ", "ホット皿", "高級チョコ",
    "★温泉旅行", "ギフト券", "入浴剤", "電気ケトル", "ラーメン", "イヤホン",
    "旬の果物", "珈琲メーカ", "★お肉ギフト", "お米10kg", "映画ペア券", "スイーツ"
  ];

  var DEFAULT_OPTIONS = {
    useFog: true,
    useXCross: true,
    slowmo: true,
    zoom: true,
    complexity: "complex"
  };

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

  function easeInOutCubic(t) {
    t = clamp(t, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function easeOutCubic(t) {
    t = clamp(t, 0, 1);
    return 1 - Math.pow(1 - t, 3);
  }

  function createConfetti(seed, count) {
    var rng = mulberry32(seed || 2026);
    var items = [];
    for (var i = 0; i < (count || 140); i++) {
      var angle = -Math.PI * 0.88 + rng() * Math.PI * 0.76;
      var speed = 170 + rng() * 350;
      items.push({
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 90,
        w: 7 + rng() * 7,
        h: 10 + rng() * 9,
        rot: rng() * Math.PI * 2,
        vRot: (rng() - 0.5) * 9,
        freq: 2 + rng() * 4,
        phase: rng() * Math.PI * 2
      });
    }
    return items;
  }

  function parseLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; });
  }

  function shuffleArray(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function getTimingProfile(useSlowmo) {
    if (useSlowmo) {
      return {
        introEnd: 1.2,
        chaseEnd: 6.2,
        slowmoEnd: 8.4,
        sprintEnd: 9.4,
        goalStart: 9.4
      };
    }
    return {
      introEnd: 1.0,
      chaseEnd: 6.0,
      slowmoEnd: 6.0,
      sprintEnd: 6.0,
      goalStart: 6.0
    };
  }

  function getPhaseAt(pt, profile) {
    if (pt < profile.introEnd) return "intro";
    if (pt < profile.chaseEnd) return "chase";
    if (pt < profile.slowmoEnd) return "slowmo";
    if (pt < profile.sprintEnd) return "sprint";
    return "goal";
  }

  function timeToPathRatio(pt, profile) {
    if (pt <= profile.introEnd) return 0;
    if (profile.slowmoEnd > profile.chaseEnd) {
      if (pt <= profile.chaseEnd) {
        var u = (pt - profile.introEnd) / (profile.chaseEnd - profile.introEnd);
        return 0.66 * u;
      }
      if (pt <= profile.slowmoEnd) {
        var s = (pt - profile.chaseEnd) / (profile.slowmoEnd - profile.chaseEnd);
        return 0.66 + 0.10 * easeOutCubic(s);
      }
      if (pt <= profile.sprintEnd) {
        var p = clamp((pt - profile.slowmoEnd) / (profile.sprintEnd - profile.slowmoEnd), 0, 1);
        return 0.76 + 0.24 * Math.pow(p, 1.35);
      }
      return 1;
    } else {
      if (pt <= profile.chaseEnd) {
        var u2 = (pt - profile.introEnd) / (profile.chaseEnd - profile.introEnd);
        return clamp(u2, 0, 1);
      }
      return 1;
    }
  }

  function computeCamera(mode, pt, profile, runnerPos, ladder, useZoom) {
    if (mode !== "single" || !useZoom || !runnerPos) {
      return { zoom: 1.0, x: W / 2, y: H / 2 };
    }

    var zoom = 1.0;
    var targetX = W / 2;
    var targetY = H / 2;

    if (pt < profile.introEnd) {
      zoom = 1.0;
    } else if (pt < profile.introEnd + 0.6) {
      var zIn = easeInOutCubic(clamp((pt - profile.introEnd) / 0.6, 0, 1));
      zoom = lerp(1.0, 2.35, zIn);
      targetX = lerp(W / 2, runnerPos.x, zIn);
      targetY = lerp(H / 2, runnerPos.y + 30, zIn);
    } else if (pt < profile.chaseEnd) {
      zoom = 2.35;
      targetX = runnerPos.x;
      targetY = runnerPos.y + 30;
    } else if (pt < profile.slowmoEnd) {
      var zSlow = easeInOutCubic(clamp((pt - profile.chaseEnd) / 0.9, 0, 1));
      zoom = lerp(2.35, 2.05, zSlow);
      targetX = runnerPos.x;
      targetY = lerp(runnerPos.y + 30, runnerPos.y + 20, zSlow);
    } else if (pt < profile.sprintEnd) {
      var zSprint = easeInOutCubic(clamp((pt - profile.slowmoEnd) / 0.6, 0, 1));
      zoom = lerp(2.05, 1.55, zSprint);
      targetX = runnerPos.x;
      targetY = lerp(runnerPos.y + 20, Math.min(runnerPos.y + 50, ladder.layout.bottomY - 30), zSprint);
    } else {
      var startZoom = profile.sprintEnd > profile.chaseEnd ? 1.55 : 2.35;
      var startY = profile.sprintEnd > profile.chaseEnd ? (ladder.layout.bottomY - 30) : (runnerPos.y + 30);
      var zOut = easeInOutCubic(clamp((pt - profile.goalStart) / 0.55, 0, 1));
      zoom = lerp(startZoom, 1.0, zOut);
      targetX = lerp(runnerPos.x, W / 2, zOut);
      targetY = lerp(startY, H / 2, zOut);
    }

    var vw = W / zoom;
    var vh = H / zoom;
    return {
      zoom: zoom,
      x: clamp(targetX, vw / 2, W - vw / 2),
      y: clamp(targetY, vh / 2, H - vh / 2)
    };
  }

  // --- Application State ---
  var canvas = document.getElementById("stage-canvas");
  var ctx = canvas.getContext("2d");
  var fogCanvas = document.createElement("canvas");
  fogCanvas.width = W;
  fogCanvas.height = H;
  var sound = new window.MatsuriSound();

  var state = {
    names: DEFAULT_NAMES.slice(),
    prizes: DEFAULT_PRIZES.slice(),
    options: Object.assign({}, DEFAULT_OPTIONS),
    ladder: null,
    results: [], // { startLane, endLane, name, prize }
    mode: "idle", // "idle" | "single" | "all"
    runTime: 0,
    globalTime: 0,
    lastRaf: null,
    activeRunners: [],
    recentTurns: [],
    firedStart: false,
    firedBoost: false,
    firedGoal: false,
    firedHeartbeats: {},
    lastMultiTurnSfxTime: -99,
    turnSfxCounter: 0,
    goalCommitted: false,
    confetti: createConfetti(2026, 150),
    hoveredLane: -1,
    manualAddMode: false,
    hoverRung: null,
    fogRevealedAll: false
  };

  // DOM References
  var elProgress = document.getElementById("progress-badge");
  var btnNextRandom = document.getElementById("btn-next-random");
  var btnAllStart = document.getElementById("btn-all-start");
  var btnManualRung = document.getElementById("btn-manual-rung");
  var btnRegenerate = document.getElementById("btn-regenerate");
  var btnToggleFog = document.getElementById("btn-toggle-fog");
  var btnResults = document.getElementById("btn-results");
  var btnSetup = document.getElementById("btn-setup");
  var btnSound = document.getElementById("btn-sound");
  var btnFullscreen = document.getElementById("btn-fullscreen");
  var btnGoalContinue = document.getElementById("btn-goal-continue");
  var manualHint = document.getElementById("manual-hint");
  var idleTip = document.getElementById("idle-tip");

  // Setup Modal DOM
  var modalSetup = document.getElementById("modal-setup");
  var inputNames = document.getElementById("input-names");
  var inputPrizes = document.getElementById("input-prizes");
  var countNames = document.getElementById("count-names");
  var countPrizes = document.getElementById("count-prizes");
  var mismatchNote = document.getElementById("mismatch-note");
  var optFog = document.getElementById("opt-fog");
  var optXCross = document.getElementById("opt-xcross");
  var optSlowmo = document.getElementById("opt-slowmo");
  var optZoom = document.getElementById("opt-zoom");
  var optComplexity = document.getElementById("opt-complexity");

  // Results Modal DOM
  var modalResults = document.getElementById("modal-results");
  var resultsSummary = document.getElementById("results-summary");
  var resultsTbody = document.getElementById("results-tbody");

  function saveToStorage() {
    try {
      var payload = {
        names: state.names,
        prizes: state.prizes,
        options: state.options,
        seed: state.ladder ? state.ladder.seed : null,
        manualRungs: state.ladder
          ? state.ladder.layout.rungs.filter(function (r) { return !!r.isManual; })
          : [],
        results: state.results
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      // Ignore storage quota or private-mode errors
    }
  }

  function loadFromStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.names) || parsed.names.length < 2) return false;
      state.names = parsed.names.slice(0, 24);
      state.prizes = Array.isArray(parsed.prizes) ? parsed.prizes.slice(0, state.names.length) : [];
      while (state.prizes.length < state.names.length) {
        state.prizes.push("お楽しみ賞");
      }
      state.options = Object.assign({}, DEFAULT_OPTIONS, parsed.options || {});
      state.ladder = window.AmidakujiLadder.generateLadder(state.names, state.prizes, {
        complexity: state.options.complexity,
        useXCross: state.options.useXCross,
        seed: parsed.seed
      });
      if (Array.isArray(parsed.manualRungs)) {
        for (var i = 0; i < parsed.manualRungs.length; i++) {
          var mr = parsed.manualRungs[i];
          window.AmidakujiLadder.tryAddManualRung(state.ladder, mr.laneA, mr.yA);
        }
      }
      if (Array.isArray(parsed.results)) {
        state.results = parsed.results.filter(function (res) {
          return res && res.startLane >= 0 && res.startLane < state.names.length;
        });
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function getDoneMaps() {
    var doneStartSet = {};
    var claimedByEndLane = {};
    var completedPaths = [];
    for (var i = 0; i < state.results.length; i++) {
      var res = state.results[i];
      doneStartSet[res.startLane] = true;
      claimedByEndLane[res.endLane] = res;
      if (state.ladder && state.ladder.paths[res.startLane]) {
        completedPaths.push(state.ladder.paths[res.startLane]);
      }
    }
    return {
      doneStartSet: doneStartSet,
      claimedByEndLane: claimedByEndLane,
      completedPaths: completedPaths
    };
  }

  function getRemainingStartLanes() {
    var maps = getDoneMaps();
    var remaining = [];
    for (var i = 0; i < state.names.length; i++) {
      if (!maps.doneStartSet[i]) remaining.push(i);
    }
    return remaining;
  }

  function updateUIState() {
    var remaining = getRemainingStartLanes();
    var total = state.names.length;
    elProgress.textContent = "残り " + remaining.length + " / " + total + "名";

    var isIdle = state.mode === "idle";
    var hasStartedAny = state.results.length > 0;
    btnNextRandom.disabled = !isIdle || remaining.length === 0;
    btnAllStart.disabled = !isIdle || remaining.length === 0;
    btnManualRung.disabled = !isIdle || hasStartedAny;
    btnRegenerate.disabled = !isIdle;

    if (!isIdle || hasStartedAny) {
      state.manualAddMode = false;
      state.hoverRung = null;
    }

    if (state.manualAddMode) {
      btnManualRung.classList.add("is-active");
      manualHint.classList.remove("hidden");
      idleTip.classList.add("hidden");
    } else {
      btnManualRung.classList.remove("is-active");
      manualHint.classList.add("hidden");
      if (isIdle && remaining.length > 0) {
        idleTip.classList.remove("hidden");
      } else {
        idleTip.classList.add("hidden");
      }
    }

    btnToggleFog.disabled = !state.options.useFog;
    btnToggleFog.textContent = state.fogRevealedAll ? "☁ 霧を戻す" : "☁ 霧を晴らす";
    btnToggleFog.classList.toggle("is-active", state.fogRevealedAll);

    var soundOn = sound.isUnlocked() && !sound.isMuted();
    btnSound.textContent = soundOn ? "🔊 音声ON" : "🔇 音声OFF";
    btnSound.classList.toggle("is-active", soundOn);

    var profile = getTimingProfile(state.options.slowmo);
    var showContinue = state.mode !== "idle" && state.runTime >= profile.goalStart + 0.85;
    btnGoalContinue.classList.toggle("hidden", !showContinue);
  }

  function rebuildLadder(customSeed) {
    state.ladder = window.AmidakujiLadder.generateLadder(state.names, state.prizes, {
      complexity: state.options.complexity,
      useXCross: state.options.useXCross,
      seed: customSeed
    });
    state.results = [];
    state.mode = "idle";
    state.activeRunners = [];
    state.recentTurns = [];
    state.fogRevealedAll = false;
    saveToStorage();
    updateUIState();
  }

  function startRun(startLanes, modeName) {
    if (state.mode !== "idle" || !startLanes || startLanes.length === 0) return;

    state.manualAddMode = false;
    state.hoverRung = null;
    state.hoveredLane = -1;
    state.mode = modeName;
    state.runTime = 0;
    state.recentTurns = [];
    state.firedStart = false;
    state.firedBoost = false;
    state.firedGoal = false;
    state.firedHeartbeats = {};
    state.lastMultiTurnSfxTime = -99;
    state.turnSfxCounter = 0;
    state.goalCommitted = false;
    state.confetti = createConfetti((Date.now() & 0xffff) + 77, modeName === "all" ? 190 : 145);

    state.activeRunners = [];
    for (var i = 0; i < startLanes.length; i++) {
      var sLane = startLanes[i];
      var pathData = state.ladder.paths[sLane];
      var pos0 = window.AmidakujiLadder.getPointAtDistance(pathData, 0);
      var anim = window.NobilkunAnim.createAnimState();
      window.NobilkunAnim.updateAnimState(anim, 0, "intro", false, 0, 1, true);
      state.activeRunners.push({
        startLane: sLane,
        endLane: pathData.endLane,
        name: state.names[sLane],
        prize: state.prizes[pathData.endLane],
        pathData: pathData,
        pos: { x: pos0.x, y: pos0.y },
        traveledPoints: pos0.traveled,
        firedTurns: {},
        anim: anim
      });
    }

    sound.unlock().then(function () {
      updateUIState();
    });
    updateUIState();
  }

  function finishCelebration() {
    if (state.mode === "idle") return;
    state.mode = "idle";
    state.activeRunners = [];
    state.recentTurns = [];
    state.runTime = 0;
    updateUIState();
  }

  function commitResultsIfGoal() {
    if (state.goalCommitted) return;
    state.goalCommitted = true;
    var maps = getDoneMaps();
    for (var i = 0; i < state.activeRunners.length; i++) {
      var r = state.activeRunners[i];
      if (!maps.doneStartSet[r.startLane]) {
        state.results.push({
          startLane: r.startLane,
          endLane: r.endLane,
          name: r.name,
          prize: r.prize
        });
      }
    }
    saveToStorage();
    updateUIState();
  }

  function processRunFrame(dt) {
    var profile = getTimingProfile(state.options.slowmo);
    var prevT = state.runTime;
    state.runTime += dt;
    var currT = state.runTime;
    var phase = getPhaseAt(currT, profile);
    var pathRatio = timeToPathRatio(currT, profile);

    if (!state.firedStart && currT >= 0.12 && prevT < 0.35) {
      state.firedStart = true;
      sound.playStart();
    }

    if (profile.slowmoEnd > profile.chaseEnd) {
      var hbTimes = [6.35, 7.0, 7.65, 8.15];
      for (var h = 0; h < hbTimes.length; h++) {
        if (!state.firedHeartbeats[h] && currT >= hbTimes[h]) {
          state.firedHeartbeats[h] = true;
          sound.playHeartbeat();
        }
      }
      if (!state.firedBoost && currT >= profile.slowmoEnd + 0.02) {
        state.firedBoost = true;
        sound.playBoost();
      }
    }

    for (var i = 0; i < state.activeRunners.length; i++) {
      var runner = state.activeRunners[i];
      var currDist = pathRatio * runner.pathData.totalDist;
      var sample = window.AmidakujiLadder.getPointAtDistance(runner.pathData, currDist);
      runner.pos = { x: sample.x, y: sample.y };
      runner.traveledPoints = sample.traveled;

      window.NobilkunAnim.updateAnimState(
        runner.anim,
        dt,
        phase,
        sample.onSlide,
        sample.dirX,
        sample.dirY,
        false
      );

      var tds = runner.pathData.turnDists;
      for (var tIdx = 0; tIdx < tds.length; tIdx++) {
        var td = tds[tIdx];
        if (!runner.firedTurns[tIdx] && currDist >= td.dist) {
          runner.firedTurns[tIdx] = true;
          state.recentTurns.push({ x: td.x, y: td.y, time: state.globalTime });
          if (td.isEntry) {
            if (state.mode === "single") {
              if (td.rungType === "xcross") {
                sound.playSlide();
              } else {
                sound.playTurn(state.turnSfxCounter++);
              }
            } else if (state.globalTime - state.lastMultiTurnSfxTime > 0.14) {
              state.lastMultiTurnSfxTime = state.globalTime;
              sound.playTurn(state.turnSfxCounter++);
            }
          }
        }
      }
    }

    // Prune old corner sparks
    if (state.recentTurns.length > 24) {
      state.recentTurns = state.recentTurns.filter(function (rt) {
        return state.globalTime - rt.time < 0.5;
      });
    }

    if (!state.firedGoal && currT >= profile.goalStart + 0.05) {
      state.firedGoal = true;
      commitResultsIfGoal();
      var isGrand = state.mode === "all" || (
        state.activeRunners.length === 1 &&
        window.MatsuriRenderer.stripGrandPrefix(state.activeRunners[0].prize).isGrand
      );
      sound.playKusudama(isGrand);
    }

    if (currT >= profile.goalStart + 0.85 && btnGoalContinue.classList.contains("hidden")) {
      updateUIState();
    }
  }

  function renderCurrentFrame() {
    if (!state.ladder) return;
    var maps = getDoneMaps();
    var profile = getTimingProfile(state.options.slowmo);
    var phase = state.mode === "idle" ? "idle" : getPhaseAt(state.runTime, profile);

    var primaryPos = state.activeRunners.length === 1 ? state.activeRunners[0].pos : null;
    var cam = computeCamera(state.mode, state.runTime, profile, primaryPos, state.ladder, state.options.zoom);

    var celebratingEndLanes = {};
    if (phase === "goal") {
      for (var i = 0; i < state.activeRunners.length; i++) {
        celebratingEndLanes[state.activeRunners[i].endLane] = true;
      }
    }

    var goalWinnerName = "";
    var goalPrizeClean = "";
    var goalIsGrand = false;
    if (state.mode === "single" && state.activeRunners.length === 1) {
      var parsed = window.MatsuriRenderer.stripGrandPrefix(state.activeRunners[0].prize);
      goalWinnerName = state.activeRunners[0].name;
      goalPrizeClean = parsed.clean;
      goalIsGrand = parsed.isGrand;
    } else if (state.mode === "all") {
      goalIsGrand = true;
    }

    var renderState = {
      time: state.globalTime,
      phase: phase,
      phaseTime: state.runTime,
      goalStart: profile.goalStart,
      goalMode: state.mode,
      allCount: state.activeRunners.length,
      activeName: state.activeRunners.length === 1 ? state.activeRunners[0].name : "",
      goalWinnerName: goalWinnerName,
      goalPrizeClean: goalPrizeClean,
      goalIsGrand: goalIsGrand,
      useFog: state.options.useFog,
      fogRevealedAll: state.fogRevealedAll,
      manualAddMode: state.manualAddMode,
      hoverRung: state.hoverRung,
      hoveredLane: state.hoveredLane,
      doneStartSet: maps.doneStartSet,
      claimedByEndLane: maps.claimedByEndLane,
      celebratingEndLanes: celebratingEndLanes,
      completedPaths: maps.completedPaths,
      runners: state.activeRunners,
      recentTurns: state.recentTurns,
      confetti: state.confetti
    };

    window.MatsuriRenderer.renderStage(ctx, fogCanvas, state.ladder, renderState, cam);
  }

  function tick(ts) {
    if (state.lastRaf == null) state.lastRaf = ts;
    var dt = Math.min(0.05, (ts - state.lastRaf) / 1000);
    state.lastRaf = ts;
    state.globalTime += dt;

    if (state.mode !== "idle") {
      processRunFrame(dt);
    }
    renderCurrentFrame();
    requestAnimationFrame(tick);
  }

  // --- Modals & Forms ---
  function syncSetupCounts() {
    var nList = parseLines(inputNames.value);
    var pList = parseLines(inputPrizes.value);
    countNames.textContent = nList.length + "名";
    countPrizes.textContent = pList.length + "個";

    if (nList.length < 2 || nList.length > 24) {
      mismatchNote.textContent = "※ 参加者は 2〜24名 の範囲で入力してください（現在 " + nList.length + "名）。";
      mismatchNote.classList.remove("hidden");
    } else if (nList.length !== pList.length) {
      mismatchNote.textContent = "※ 参加者（" + nList.length + "名）と景品（" + pList.length + "個）の数が異なります。適用時に足りない分は「お楽しみ賞」で補完し、多い分は調整します。";
      mismatchNote.classList.remove("hidden");
    } else {
      mismatchNote.classList.add("hidden");
    }
  }

  function openSetupModal() {
    inputNames.value = state.names.join("\n");
    inputPrizes.value = state.prizes.join("\n");
    optFog.checked = state.options.useFog;
    optXCross.checked = state.options.useXCross;
    optSlowmo.checked = state.options.slowmo;
    optZoom.checked = state.options.zoom;
    optComplexity.value = state.options.complexity || "complex";
    syncSetupCounts();
    modalSetup.classList.remove("hidden");
  }

  function closeSetupModal() {
    modalSetup.classList.add("hidden");
  }

  function applySetupFromModal() {
    var names = parseLines(inputNames.value).slice(0, 24);
    if (names.length < 2) {
      alert("参加者は2名以上入力してください。");
      return;
    }
    var prizes = parseLines(inputPrizes.value).slice(0, names.length);
    while (prizes.length < names.length) {
      prizes.push("お楽しみ賞");
    }

    state.names = names;
    state.prizes = prizes;
    state.options = {
      useFog: optFog.checked,
      useXCross: optXCross.checked,
      slowmo: optSlowmo.checked,
      zoom: optZoom.checked,
      complexity: optComplexity.value
    };
    closeSetupModal();
    rebuildLadder();
  }

  function openResultsModal() {
    resultsSummary.textContent = "当選済み " + state.results.length + "名 / 全" + state.names.length + "名";
    resultsTbody.innerHTML = "";
    if (state.results.length === 0) {
      var emptyTr = document.createElement("tr");
      var emptyTd = document.createElement("td");
      emptyTd.colSpan = 4;
      emptyTd.textContent = "まだ抽選結果がありません。";
      emptyTr.appendChild(emptyTd);
      resultsTbody.appendChild(emptyTr);
    } else {
      for (var i = 0; i < state.results.length; i++) {
        var r = state.results[i];
        var parsed = window.MatsuriRenderer.stripGrandPrefix(r.prize);
        var tr = document.createElement("tr");

        var tdNum = document.createElement("td");
        tdNum.textContent = String(i + 1);
        var tdName = document.createElement("td");
        tdName.textContent = r.name + " さん";
        var tdPrize = document.createElement("td");
        tdPrize.textContent = parsed.clean;
        var tdKind = document.createElement("td");
        if (parsed.isGrand) {
          var badge = document.createElement("span");
          badge.className = "tag-grand";
          badge.textContent = "★特賞";
          tdKind.appendChild(badge);
        } else {
          tdKind.textContent = "通常";
        }

        tr.appendChild(tdNum);
        tr.appendChild(tdName);
        tr.appendChild(tdPrize);
        tr.appendChild(tdKind);
        resultsTbody.appendChild(tr);
      }
    }
    modalResults.classList.remove("hidden");
  }

  function closeResultsModal() {
    modalResults.classList.add("hidden");
  }

  function formatResultsPlainText() {
    var lines = ["【年末あみだくじ 当選結果】"];
    for (var i = 0; i < state.results.length; i++) {
      var r = state.results[i];
      lines.push((i + 1) + ". " + r.name + " さん → " + r.prize);
    }
    return lines.join("\n");
  }

  function downloadResultsCsv() {
    var rows = [["順番", "参加者", "景品", "区分"]];
    for (var i = 0; i < state.results.length; i++) {
      var r = state.results[i];
      var parsed = window.MatsuriRenderer.stripGrandPrefix(r.prize);
      rows.push([
        String(i + 1),
        r.name,
        parsed.clean,
        parsed.isGrand ? "特賞" : "通常"
      ]);
    }
    var csv = "\uFEFF" + rows.map(function (cols) {
      return cols.map(function (c) {
        return '"' + String(c).replace(/"/g, '""') + '"';
      }).join(",");
    }).join("\r\n");

    var blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "amidakuji_results.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
  }

  // --- Event Listeners ---
  btnNextRandom.addEventListener("click", function () {
    var rem = getRemainingStartLanes();
    if (rem.length === 0) return;
    var pick = rem[Math.floor(Math.random() * rem.length)];
    startRun([pick], "single");
  });

  btnAllStart.addEventListener("click", function () {
    var rem = getRemainingStartLanes();
    if (rem.length === 0) return;
    startRun(rem, "all");
  });

  btnManualRung.addEventListener("click", function () {
    if (state.mode !== "idle" || state.results.length > 0) return;
    state.manualAddMode = !state.manualAddMode;
    state.hoverRung = null;
    updateUIState();
  });

  btnRegenerate.addEventListener("click", function () {
    if (state.mode !== "idle") return;
    if (state.results.length > 0 && !confirm("現在の抽選進行状況がリセットされます。あみだを再生成しますか？")) {
      return;
    }
    rebuildLadder();
  });

  btnToggleFog.addEventListener("click", function () {
    state.fogRevealedAll = !state.fogRevealedAll;
    updateUIState();
  });

  btnSound.addEventListener("click", function () {
    if (!sound.isUnlocked()) {
      sound.setMuted(false);
      sound.unlock().then(updateUIState);
      return;
    }
    sound.setMuted(!sound.isMuted());
    updateUIState();
  });

  btnFullscreen.addEventListener("click", function () {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(function () {});
    } else {
      document.exitFullscreen().catch(function () {});
    }
  });

  btnGoalContinue.addEventListener("click", finishCelebration);

  // Canvas interactions (click participant tag OR place manual rung)
  canvas.addEventListener("mousemove", function (ev) {
    if (state.mode !== "idle" || !state.ladder) {
      canvas.style.cursor = "default";
      return;
    }
    var world = window.MatsuriRenderer.clientToWorld(canvas, ev.clientX, ev.clientY, { zoom: 1.0, x: W / 2, y: H / 2 });
    if (state.manualAddMode) {
      var hr = window.MatsuriRenderer.hitTestManualRung(state.ladder.layout, world.x, world.y);
      if (hr) {
        var valid = window.AmidakujiLadder.canPlaceRung(state.ladder.layout.rungs, {
          type: "normal",
          laneA: hr.laneA,
          yA: hr.y,
          laneB: hr.laneA + 1,
          yB: hr.y
        });
        state.hoverRung = { laneA: hr.laneA, y: hr.y, valid: valid };
        canvas.style.cursor = valid ? "crosshair" : "not-allowed";
      } else {
        state.hoverRung = null;
        canvas.style.cursor = "default";
      }
      state.hoveredLane = -1;
      return;
    }

    var hitLane = window.MatsuriRenderer.hitTestParticipantTag(state.ladder.layout, world.x, world.y);
    var maps = getDoneMaps();
    if (hitLane >= 0 && !maps.doneStartSet[hitLane]) {
      state.hoveredLane = hitLane;
      canvas.style.cursor = "pointer";
    } else {
      state.hoveredLane = -1;
      canvas.style.cursor = "default";
    }
  });

  canvas.addEventListener("mouseleave", function () {
    state.hoveredLane = -1;
    state.hoverRung = null;
    canvas.style.cursor = "default";
  });

  canvas.addEventListener("click", function (ev) {
    if (state.mode !== "idle" || !state.ladder) return;
    var world = window.MatsuriRenderer.clientToWorld(canvas, ev.clientX, ev.clientY, { zoom: 1.0, x: W / 2, y: H / 2 });

    if (state.manualAddMode) {
      var hr = window.MatsuriRenderer.hitTestManualRung(state.ladder.layout, world.x, world.y);
      if (hr) {
        var res = window.AmidakujiLadder.tryAddManualRung(state.ladder, hr.laneA, hr.y);
        if (res.ok) {
          sound.unlock().then(function () { sound.playTurn(2); updateUIState(); });
          saveToStorage();
        }
      }
      return;
    }

    var hitLane = window.MatsuriRenderer.hitTestParticipantTag(state.ladder.layout, world.x, world.y);
    var maps = getDoneMaps();
    if (hitLane >= 0 && !maps.doneStartSet[hitLane]) {
      startRun([hitLane], "single");
    }
  });

  // Setup modal handlers
  btnSetup.addEventListener("click", openSetupModal);
  document.getElementById("btn-close-setup").addEventListener("click", closeSetupModal);
  document.getElementById("btn-cancel-setup").addEventListener("click", closeSetupModal);
  document.getElementById("btn-apply-setup").addEventListener("click", applySetupFromModal);
  document.getElementById("btn-reset-progress").addEventListener("click", function () {
    if (!confirm("進行状況のみリセットして、同じあみだで最初からやり直しますか？")) return;
    state.results = [];
    state.mode = "idle";
    state.activeRunners = [];
    closeSetupModal();
    saveToStorage();
    updateUIState();
  });

  inputNames.addEventListener("input", syncSetupCounts);
  inputPrizes.addEventListener("input", syncSetupCounts);

  document.getElementById("btn-shuffle-names").addEventListener("click", function () {
    inputNames.value = shuffleArray(parseLines(inputNames.value)).join("\n");
    syncSetupCounts();
  });
  document.getElementById("btn-shuffle-prizes").addEventListener("click", function () {
    inputPrizes.value = shuffleArray(parseLines(inputPrizes.value)).join("\n");
    syncSetupCounts();
  });
  document.getElementById("btn-load-sample").addEventListener("click", function () {
    inputNames.value = DEFAULT_NAMES.join("\n");
    inputPrizes.value = DEFAULT_PRIZES.join("\n");
    syncSetupCounts();
  });

  // Results modal handlers
  btnResults.addEventListener("click", openResultsModal);
  document.getElementById("btn-close-results").addEventListener("click", closeResultsModal);
  document.getElementById("btn-ok-results").addEventListener("click", closeResultsModal);
  document.getElementById("btn-copy-results").addEventListener("click", function () {
    var txt = formatResultsPlainText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        alert("当選結果をクリップボードにコピーしました！");
      }).catch(function () {
        prompt("以下をコピーしてください：", txt);
      });
    } else {
      prompt("以下をコピーしてください：", txt);
    }
  });
  document.getElementById("btn-csv-results").addEventListener("click", downloadResultsCsv);

  // Keyboard shortcuts
  document.addEventListener("keydown", function (ev) {
    var tag = ev.target && ev.target.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;

    if (ev.key === "Escape") {
      closeSetupModal();
      closeResultsModal();
      if (state.manualAddMode) {
        state.manualAddMode = false;
        updateUIState();
      }
      return;
    }

    if (!modalSetup.classList.contains("hidden") || !modalResults.classList.contains("hidden")) {
      return;
    }

    if (ev.key === " " || ev.key === "Enter") {
      ev.preventDefault();
      var profile = getTimingProfile(state.options.slowmo);
      if (state.mode !== "idle" && state.runTime >= profile.goalStart + 0.85) {
        finishCelebration();
      } else if (state.mode === "idle") {
        btnNextRandom.click();
      }
    } else if (ev.key === "m" || ev.key === "M") {
      btnSound.click();
    } else if (ev.key === "f" || ev.key === "F") {
      btnFullscreen.click();
    }
  });

  // --- Boot ---
  if (!loadFromStorage()) {
    rebuildLadder();
  } else {
    updateUIState();
  }
  renderCurrentFrame();
  requestAnimationFrame(tick);
})();
