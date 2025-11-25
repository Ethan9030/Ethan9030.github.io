(function () {
  "use strict";

  var root = document.documentElement;

  function applyTheme(theme) {
    if (!root) {
      return;
    }
    root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch (error) {
    }
  }

  function initTheme() {
    if (!root) {
      return;
    }
    var saved = null;
    try {
      saved = localStorage.getItem('theme');
    } catch (error) {}
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }
    var prefersDark = false;
    if (typeof window !== 'undefined' && window.matchMedia) {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    applyTheme(prefersDark ? 'dark' : 'light');
  }

  function syncThemeToggle(btn) {
    if (!btn || !root) {
      return;
    }
    var current = root.getAttribute('data-theme');
    btn.setAttribute('aria-pressed', current === 'dark' ? 'true' : 'false');
  }

  initTheme();

  var themeToggle = document.getElementById('themeToggle');
  syncThemeToggle(themeToggle);

  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = root ? root.getAttribute('data-theme') : null;
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      syncThemeToggle(themeToggle);
    });
  }

  var player = document.querySelector('[data-player]');
  if (!player) {
    return;
  }

  var audio = player.querySelector('[data-audio]');
  var playButton = player.querySelector('[data-action="toggle"]');
  var prevButton = player.querySelector('[data-action="prev"]');
  var nextButton = player.querySelector('[data-action="next"]');
  var titleEl = player.querySelector('[data-track-title]');
  var artistEl = player.querySelector('[data-track-artist]');
  var elapsedEl = player.querySelector('[data-elapsed]');
  var durationEl = player.querySelector('[data-duration]');
  var progressEl = player.querySelector('[data-progress]');
  var progressFillEl = player.querySelector('[data-progress-fill]');
  var playlistContainer = player.querySelector('[data-track-list]');
  var emptyMessage = player.querySelector('[data-empty-message]');

  if (!audio || !playButton || !progressEl || !progressFillEl || !playlistContainer) {
    return;
  }

  var config = readConfig();
  var playlist = sanitisePlaylist(config.playlist);
  var loopPlaylist = typeof config.loop === 'boolean' ? config.loop : true;
  var initialAutoplay = Boolean(config.autoplay);
  var trackRefs = new Map();
  var currentIndex = 0;

  if (!playlist.length) {
    player.classList.add('is-empty');
    disableControls(true);
    return;
  }

  player.classList.remove('is-empty');
  player.classList.add('has-tracks');
  disableControls(false);
  buildPlaylist();
  loadTrack(0, { autoplay: initialAutoplay });

  playButton.addEventListener('click', function () {
    if (audio.paused) {
      audio.play().catch(function (error) {
        console.warn('fun-personal: unable to play audio', error);
      });
    } else {
      audio.pause();
    }
  });

  prevButton.addEventListener('click', function () {
    changeTrack(-1);
  });

  nextButton.addEventListener('click', function () {
    changeTrack(1);
  });

  playlistContainer.addEventListener('click', function (event) {
    var button = event.target.closest('button');
    if (!button) {
      return;
    }
    var item = button.closest('.playlist-item');
    if (!item) {
      return;
    }
    var index = Number(item.dataset.index);
    if (!Number.isFinite(index) || index === currentIndex) {
      if (audio.paused) {
        audio.play().catch(function () {});
      }
      return;
    }
    loadTrack(index, { autoplay: !audio.paused });
  });

  progressEl.addEventListener('click', function (event) {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    var rect = progressEl.getBoundingClientRect();
    var position = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    var ratio = position / rect.width;
    audio.currentTime = ratio * audio.duration;
  });

  audio.addEventListener('timeupdate', function () {
    var current = audio.currentTime || 0;
    var duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    elapsedEl.textContent = formatTime(current);
    if (duration > 0) {
      var progress = Math.min(current / duration, 1);
      progressFillEl.style.width = String(progress * 100) + '%';
    } else {
      progressFillEl.style.width = '0%';
    }
  });

  audio.addEventListener('loadedmetadata', function () {
    var duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    durationEl.textContent = duration > 0 ? formatTime(duration) : '00:00';
    var ref = trackRefs.get(currentIndex);
    if (ref && !ref.length.dataset.locked) {
      ref.length.textContent = duration > 0 ? formatTime(duration) : '';
    }
  });

  audio.addEventListener('play', function () {
    updatePlayButton();
  });

  audio.addEventListener('pause', function () {
    updatePlayButton();
  });

  audio.addEventListener('ended', function () {
    if (loopPlaylist || currentIndex < playlist.length - 1) {
      changeTrack(1, { fromEnded: true });
    } else {
      progressFillEl.style.width = '100%';
      durationEl.textContent = formatTime(audio.duration || 0);
      updatePlayButton();
    }
  });

  function buildPlaylist() {
    playlistContainer.innerHTML = '';
    trackRefs.clear();
    for (var index = 0; index < playlist.length; index += 1) {
      var track = playlist[index];
      var item = document.createElement('li');
      item.className = 'playlist-item';
      item.dataset.index = String(index);

      var button = document.createElement('button');
      button.type = 'button';

      var name = document.createElement('span');
      name.className = 'track-name';
      name.textContent = track.title;

      var length = document.createElement('span');
      length.className = 'track-length';
      if (track.length) {
        length.textContent = track.length;
        length.dataset.locked = 'true';
      }

      button.appendChild(name);
      button.appendChild(length);
      item.appendChild(button);
      playlistContainer.appendChild(item);
      trackRefs.set(index, { item: item, length: length });
    }
  }

  function loadTrack(index, options) {
    if (!playlist[index]) {
      return;
    }
    currentIndex = index;
    var track = playlist[index];
    audio.src = track.src;
    audio.load();
    titleEl.textContent = track.title;
    artistEl.textContent = track.artist || 'Personal track';
    elapsedEl.textContent = '00:00';
    durationEl.textContent = track.length || '00:00';
    progressFillEl.style.width = '0%';
    updateActiveTrack();
    updateControlAvailability();
    if (emptyMessage) {
      emptyMessage.setAttribute('aria-hidden', 'true');
    }
    var shouldAutoplay = options && options.autoplay;
    if (shouldAutoplay) {
      audio.play().catch(function (error) {
        console.warn('fun-personal: autoplay blocked', error);
      });
    } else {
      updatePlayButton();
    }
  }

  function changeTrack(offset, meta) {
    if (!playlist.length) {
      return;
    }
    var shouldContinue = !audio.paused;
    var target = currentIndex + offset;
    if (target < 0) {
      target = loopPlaylist && playlist.length > 1 ? playlist.length - 1 : 0;
    } else if (target >= playlist.length) {
      target = loopPlaylist && playlist.length > 1 ? 0 : playlist.length - 1;
    }
    if (target === currentIndex) {
      if (meta && meta.fromEnded) {
        audio.currentTime = 0;
        audio.pause();
      }
      return;
    }
    loadTrack(target, { autoplay: shouldContinue });
  }

  function updateActiveTrack() {
    trackRefs.forEach(function (ref, key) {
      if (key === currentIndex) {
        ref.item.classList.add('is-active');
      } else {
        ref.item.classList.remove('is-active');
      }
    });
  }

  function updateControlAvailability() {
    var single = playlist.length <= 1;
    prevButton.disabled = single || (!loopPlaylist && currentIndex === 0);
    nextButton.disabled = single || (!loopPlaylist && currentIndex === playlist.length - 1);
  }

  function disableControls(isDisabled) {
    playButton.disabled = isDisabled;
    prevButton.disabled = isDisabled;
    nextButton.disabled = isDisabled;
  }

  function updatePlayButton() {
    var paused = audio.paused;
    playButton.textContent = paused ? 'Play' : 'Pause';
    playButton.setAttribute('aria-label', paused ? 'Play track' : 'Pause track');
    playButton.setAttribute('aria-pressed', paused ? 'false' : 'true');
  }

  function readConfig() {
    var base = { playlist: [], loop: true, autoplay: false };
    var script = document.getElementById('funPersonalPlaylist');
    if (script) {
      var raw = script.textContent ? script.textContent.trim() : '';
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            base.playlist = parsed;
          } else if (parsed && typeof parsed === 'object') {
            if (Array.isArray(parsed.playlist)) {
              base.playlist = parsed.playlist;
            }
            if (typeof parsed.loop === 'boolean') {
              base.loop = parsed.loop;
            }
            if (typeof parsed.autoplay === 'boolean') {
              base.autoplay = parsed.autoplay;
            }
          }
        } catch (error) {
          console.warn('fun-personal: playlist JSON invalid', error);
        }
      }
    }

    if (typeof window !== 'undefined' && window.funPersonalConfig) {
      var cfg = window.funPersonalConfig;
      if (cfg) {
        if (Array.isArray(cfg.playlist) && cfg.playlist.length) {
          base.playlist = cfg.playlist;
        }
        if (typeof cfg.loop === 'boolean') {
          base.loop = cfg.loop;
        }
        if (typeof cfg.autoplay === 'boolean') {
          base.autoplay = cfg.autoplay;
        }
      }
    }

    return base;
  }

  function sanitisePlaylist(raw) {
    if (!Array.isArray(raw)) {
      return [];
    }
    var result = [];
    for (var index = 0; index < raw.length; index += 1) {
      var entry = raw[index];
      if (typeof entry === 'string') {
        result.push({
          title: 'Track ' + String(index + 1),
          artist: '',
          src: entry,
          length: ''
        });
        continue;
      }
      if (!entry || typeof entry !== 'object') {
        continue;
      }
      var source = entry.src || entry.url || entry.path;
      if (!source) {
        continue;
      }
      result.push({
        title: entry.title ? String(entry.title) : 'Track ' + String(index + 1),
        artist: entry.artist ? String(entry.artist) : '',
        src: String(source),
        length: entry.length ? String(entry.length) : entry.duration ? String(entry.duration) : ''
      });
    }
    return result;
  }

  function formatTime(value) {
    if (!Number.isFinite(value) || value < 0) {
      return '00:00';
    }
    var totalSeconds = Math.floor(value);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  }
})();
