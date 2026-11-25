(function () {
  "use strict";

  var YO_SCALE = [293.66, 329.63, 392.0, 440.0, 493.88, 587.33, 659.25, 783.99];

  function MatsuriSound() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.muted = false;
    this.bgmEnabled = true;
    this.unlocked = false;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  MatsuriSound.prototype.ensureContext = function () {
    if (this.ctx) return true;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.75;

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.88;

    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
    return true;
  };

  MatsuriSound.prototype.unlock = function () {
    if (!this.ensureContext()) return Promise.resolve(false);
    var self = this;
    return this.ctx.resume().then(function () {
      self.unlocked = self.ctx.state === "running";
      if (self.unlocked && self.bgmEnabled && !self.muted && !self.bgmTimer) {
        self.startBgm();
      }
      return self.unlocked;
    }).catch(function () {
      return false;
    });
  };

  MatsuriSound.prototype.setMuted = function (muted) {
    this.muted = !!muted;
    if (this.masterGain && this.ctx) {
      var now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.75, now, 0.03);
    }
    if (!this.muted && this.unlocked && this.bgmEnabled && !this.bgmTimer) {
      this.startBgm();
    }
  };

  MatsuriSound.prototype.isMuted = function () {
    return this.muted;
  };

  MatsuriSound.prototype.isUnlocked = function () {
    return this.unlocked && this.ctx && this.ctx.state === "running";
  };

  MatsuriSound.prototype._tone = function (opts) {
    if (!this.ctx || !this.unlocked || this.muted) return;
    var now = this.ctx.currentTime + (opts.delay || 0);
    var dur = opts.duration || 0.16;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();

    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(opts.freq || 440, now);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.freqEnd), now + dur);
    }

    var peak = opts.gain != null ? opts.gain : 0.25;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + Math.min(0.015, dur * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(gain);
    gain.connect(opts.target || this.sfxGain);

    osc.start(now);
    osc.stop(now + dur + 0.02);
  };

  MatsuriSound.prototype._noiseBurst = function (opts) {
    if (!this.ctx || !this.unlocked || this.muted) return;
    var dur = opts.duration || 0.12;
    var sampleRate = this.ctx.sampleRate;
    var frameCount = Math.floor(sampleRate * dur);
    var buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frameCount; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (frameCount * 0.35));
    }

    var src = this.ctx.createBufferSource();
    src.buffer = buffer;

    var filter = this.ctx.createBiquadFilter();
    filter.type = opts.filterType || "bandpass";
    filter.frequency.value = opts.freq || 1400;
    filter.Q.value = opts.q || 1.2;

    var gain = this.ctx.createGain();
    var now = this.ctx.currentTime + (opts.delay || 0);
    gain.gain.setValueAtTime(opts.gain != null ? opts.gain : 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(opts.target || this.sfxGain);
    src.start(now);
  };

  MatsuriSound.prototype.startBgm = function () {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    var self = this;
    this.bgmTimer = setInterval(function () {
      self._tickBgm();
    }, 220);
  };

  MatsuriSound.prototype.stopBgm = function () {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  };

  MatsuriSound.prototype._tickBgm = function () {
    if (!this.ctx || !this.unlocked || this.muted || !this.bgmEnabled) return;
    var step = this.bgmStep % 16;
    this.bgmStep += 1;

    var mel = [587.33, 0, 659.25, 587.33, 493.88, 440.0, 392.0, 440.0, 587.33, 0, 783.99, 659.25, 587.33, 493.88, 440.0, 0];
    var bass = [146.83, 0, 220.0, 0, 196.0, 0, 220.0, 0, 146.83, 0, 220.0, 0, 196.0, 146.83, 220.0, 0];
    if (mel[step]) {
      this._tone({ freq: mel[step], duration: 0.17, type: "triangle", gain: 0.15, target: this.bgmGain });
    }
    if (bass[step]) {
      this._tone({ freq: bass[step], duration: 0.19, type: "sine", gain: 0.2, target: this.bgmGain });
    }
    if (step % 4 === 0) {
      this._noiseBurst({ duration: 0.05, freq: 2400, gain: 0.075, target: this.bgmGain });
    }
  };

  // Wooden clapper (拍子木: カン・カンッ！)
  MatsuriSound.prototype.playStart = function () {
    if (!this.ctx || !this.unlocked || this.muted) return;
    this._noiseBurst({ duration: 0.07, freq: 2600, q: 3.0, gain: 0.48, delay: 0 });
    this._tone({ freq: 1480, freqEnd: 980, duration: 0.065, type: "triangle", gain: 0.32, delay: 0 });
    this._noiseBurst({ duration: 0.08, freq: 2800, q: 3.0, gain: 0.55, delay: 0.18 });
    this._tone({ freq: 1620, freqEnd: 1050, duration: 0.075, type: "triangle", gain: 0.36, delay: 0.18 });
  };

  MatsuriSound.prototype.playTurn = function (stepIndex) {
    if (!this.ctx || !this.unlocked || this.muted) return;
    var f = YO_SCALE[Math.abs(stepIndex || 0) % YO_SCALE.length];
    this._tone({ freq: f, freqEnd: f * 1.15, duration: 0.11, type: "triangle", gain: 0.25 });
    this._tone({ freq: f * 2, duration: 0.07, type: "sine", gain: 0.11 });
  };

  MatsuriSound.prototype.playSlide = function () {
    if (!this.ctx || !this.unlocked || this.muted) return;
    this._tone({ freq: 880.0, freqEnd: 493.88, duration: 0.16, type: "triangle", gain: 0.24, delay: 0 });
    this._tone({ freq: 493.88 * 1.5, duration: 0.08, type: "sine", gain: 0.14, delay: 0.11 });
  };

  MatsuriSound.prototype.playHeartbeat = function () {
    if (!this.ctx || !this.unlocked || this.muted) return;
    this._tone({ freq: 64 * 1.35, freqEnd: 64 * 0.65, duration: 0.14, type: "sine", gain: 0.55, delay: 0 });
    this._tone({ freq: 64 * 1.15, freqEnd: 64 * 0.55, duration: 0.19, type: "sine", gain: 0.42, delay: 0.17 });
  };

  MatsuriSound.prototype.playBoost = function () {
    if (!this.ctx || !this.unlocked || this.muted) return;
    this._noiseBurst({ duration: 0.24, freq: 2400, filterType: "bandpass", q: 0.9, gain: 0.42, delay: 0 });
    this._tone({ freq: 320, freqEnd: 1420, duration: 0.32, type: "triangle", gain: 0.28, delay: 0 });
    this._tone({ freq: 480, freqEnd: 1775, duration: 0.26, type: "sine", gain: 0.2, delay: 0.06 });
  };

  MatsuriSound.prototype.playKusudama = function (isGrandPrize) {
    if (!this.ctx || !this.unlocked || this.muted) return;
    // Pop burst
    this._noiseBurst({ duration: 0.18, freq: 1200, filterType: "lowpass", gain: 0.55, delay: 0 });
    this._tone({ freq: 240, freqEnd: 780, duration: 0.14, type: "triangle", gain: 0.32, delay: 0 });

    if (isGrandPrize) {
      // Extra deluxe golden fanfare
      var deluxe = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
      for (var i = 0; i < deluxe.length; i++) {
        this._tone({
          freq: deluxe[i],
          duration: i === deluxe.length - 1 ? 0.95 : 0.22,
          type: "triangle",
          gain: 0.25,
          delay: 0.06 + i * 0.075
        });
      }
      this._tone({ freq: 523.25, duration: 0.9, type: "sine", gain: 0.18, delay: 0.48 });
      this._tone({ freq: 783.99, duration: 0.9, type: "sine", gain: 0.16, delay: 0.50 });
      this._tone({ freq: 1046.5, duration: 0.9, type: "sine", gain: 0.16, delay: 0.52 });
      this._tone({ freq: 2093.0, duration: 0.55, type: "sine", gain: 0.11, delay: 0.56 });
    } else {
      var notes = [523.25, 659.25, 783.99, 1046.5, 1174.66];
      for (var j = 0; j < notes.length; j++) {
        this._tone({
          freq: notes[j],
          duration: j === notes.length - 1 ? 0.72 : 0.22,
          type: "triangle",
          gain: 0.24,
          delay: 0.08 + j * 0.08
        });
      }
      this._tone({ freq: notes[0] * 2, duration: 0.65, type: "sine", gain: 0.15, delay: 0.42 });
      this._tone({ freq: notes[2] * 2, duration: 0.65, type: "sine", gain: 0.13, delay: 0.44 });
    }
  };

  window.MatsuriSound = MatsuriSound;
})();
