/**
 * Owns guide-player UI state: dock visibility, status, resize, and playback overrides.
 */

const GUIDE_PLAYER_SIZE_KEY = 'nodecast_guide_player_size';
const GUIDE_PLAYER_ENCODE_MODE_KEY = 'nodecast_guide_player_encode_mode';
const GUIDE_PLAYER_MIN_WIDTH = 320;
const GUIDE_PLAYER_MIN_HEIGHT = 180;

class GuidePlayerController {
    constructor(app) {
        this.app = app;
        this.playerWindow = document.getElementById('guide-player-window');
        this.playerDock = document.getElementById('guide-player-dock');
        this.liveDock = document.getElementById('live-player-dock');
        this.playerTitle = document.getElementById('guide-player-title');
        this.playerStatus = document.getElementById('guide-player-status');
        this.closeBtn = document.getElementById('guide-player-close');
        this.stopBtn = document.getElementById('guide-player-stop');
        this.restoreBtn = document.getElementById('guide-player-restore');
        this.encodeModeSelect = document.getElementById('guide-player-encode-mode');
        this.qualitySelect = document.getElementById('guide-player-quality');
        this.resizeHandle = document.getElementById('guide-player-resize-handle');

        this.currentChannel = null;
        this.isVisible = false;

        this.closeBtn?.addEventListener('click', () => this.hide());
        this.stopBtn?.addEventListener('click', () => this.stop());
        this.restoreBtn?.addEventListener('click', () => this.restore());

        this.encodeModeSelect?.addEventListener('change', () => {
            this.saveEncodeModePreference();
            this.syncPlaybackOverrides();
            this.updateQualityControlState();
            this.replayIfNeeded();
        });
        this.qualitySelect?.addEventListener('change', () => {
            this.syncPlaybackOverrides();
            this.replayIfNeeded();
        });

        this._onPlayback = (event) => this.handlePlaybackEvent(event);
        app.player?.onPlaybackEvent?.(this._onPlayback);

        this.loadSavedPreferences();
        this.loadSavedSize();
        this.initResizer();
        this.syncPlaybackOverrides();
        this.updateQualityControlState();
    }

    loadSavedPreferences() {
        try {
            const savedMode = localStorage.getItem(GUIDE_PLAYER_ENCODE_MODE_KEY);
            if (savedMode && this.encodeModeSelect) {
                this.encodeModeSelect.value = savedMode;
            }
        } catch (err) {
            console.warn('[GuidePlayer] Failed to load saved preferences:', err);
        }
    }

    saveEncodeModePreference() {
        try {
            localStorage.setItem(GUIDE_PLAYER_ENCODE_MODE_KEY, this.encodeModeSelect?.value || 'auto');
        } catch (err) {
            console.warn('[GuidePlayer] Failed to save encode mode:', err);
        }
    }

    syncPlaybackOverrides() {
        this.app.player?.setPlaybackOverrides?.({
            encodeMode: this.encodeModeSelect?.value || 'auto',
            quality: this.qualitySelect?.value || 'medium'
        });
    }

    updateQualityControlState() {
        if (!this.qualitySelect || !this.encodeModeSelect) return;
        const directPlayback = this.encodeModeSelect.value === 'direct';
        this.qualitySelect.disabled = directPlayback;
        this.qualitySelect.classList.toggle('disabled', directPlayback);
    }

    async replayIfNeeded() {
        const channel = this.app.player?.currentChannel;
        const url = this.app.player?.sourceStreamUrl || this.app.player?.currentUrl;
        if (!channel || !url || this.app.currentPage !== 'guide') return;
        await this.app.player.play(channel, url);
    }

    handlePlaybackEvent(event) {
        const { name, detail = {} } = event;

        if (this.app.currentPage !== 'guide' && name !== 'stopped') {
            if (name === 'starting' || name === 'playing') {
                this.currentChannel = detail.channel || this.currentChannel;
            }
            return;
        }

        switch (name) {
            case 'starting':
                this.currentChannel = detail.channel || this.currentChannel;
                this.show(this.currentChannel);
                this.updateStatus(detail.text || 'Loading');
                this.app.epgGuide?.setPlayingChannel?.(this.currentChannel);
                break;
            case 'playing':
                this.currentChannel = detail.channel || this.currentChannel;
                this.show(this.currentChannel);
                this.updateStatus(detail.text || 'Playing');
                this.app.epgGuide?.setPlayingChannel?.(this.currentChannel);
                break;
            case 'status':
                if (this.isVisible) {
                    this.updateStatus(detail.text || detail.mode || 'Playing');
                }
                break;
            case 'error':
                this.currentChannel = detail.channel || this.currentChannel;
                this.show(this.currentChannel);
                this.updateStatus(detail.message || 'Playback error', 'error');
                break;
            case 'stopped':
                this.currentChannel = null;
                this.updateStatus('Stopped');
                this.dismiss({ allowRestore: false });
                this.app.epgGuide?.setPlayingChannel?.(null);
                break;
            default:
                break;
        }
    }

    show(channel = null) {
        const videoContainer = document.getElementById('video-container');
        if (!this.playerWindow || !this.playerDock || !videoContainer) return;

        this.currentChannel = channel || this.currentChannel || this.app.player?.currentChannel;
        this.playerDock.appendChild(videoContainer);
        this.playerWindow.classList.remove('hidden');
        this.restoreBtn?.classList.add('hidden');
        this.isVisible = true;

        if (this.playerTitle) {
            this.playerTitle.textContent = this.currentChannel?.name || this.currentChannel?.tvgName || 'Live TV';
        }
    }

    hide({ allowRestore = true } = {}) {
        const videoContainer = document.getElementById('video-container');
        if (this.liveDock && videoContainer && videoContainer.parentElement !== this.liveDock.parentElement) {
            this.liveDock.insertAdjacentElement('afterend', videoContainer);
        }

        this.playerWindow?.classList.add('hidden');
        this.isVisible = false;

        if (!allowRestore) {
            this.restoreBtn?.classList.add('hidden');
            return;
        }

        const hasActivePlayback = Boolean(this.app.player?.currentChannel || this.currentChannel);
        if (this.app.currentPage === 'guide' && hasActivePlayback) {
            this.restoreBtn?.classList.remove('hidden');
        } else {
            this.restoreBtn?.classList.add('hidden');
        }
    }

    dismiss({ allowRestore = false } = {}) {
        this.hide({ allowRestore });
    }

    stop() {
        this.hide({ allowRestore: false });
        this.app.player?.stop();
    }

    restore() {
        this.show(this.app.player?.currentChannel || this.currentChannel);
    }

    onPageShow() {
        if (this.qualitySelect && this.app.player?.settings?.quality) {
            this.qualitySelect.value = this.app.player.settings.quality;
        }
        this.syncPlaybackOverrides();
        this.updateQualityControlState();

        if (this.app.player?.currentChannel) {
            this.show(this.app.player.currentChannel);
            this.app.epgGuide?.setPlayingChannel?.(this.app.player.currentChannel);
        } else {
            this.restoreBtn?.classList.add('hidden');
        }
    }

    onPageHide() {
        this.hide({ allowRestore: false });
        this.app.player?.setPlaybackOverrides?.({ encodeMode: 'auto', quality: null });
    }

    updateStatus(text, tone = '') {
        if (!this.playerStatus) return;
        this.playerStatus.textContent = text;
        this.playerStatus.classList.toggle('error', tone === 'error');
    }

    loadSavedSize() {
        try {
            const saved = localStorage.getItem(GUIDE_PLAYER_SIZE_KEY);
            if (!saved) return;
            const { width, height } = JSON.parse(saved);
            if (width) {
                document.documentElement.style.setProperty('--guide-player-width', `${width}px`);
            }
            if (height) {
                document.documentElement.style.setProperty('--guide-player-dock-height', `${height}px`);
            }
        } catch (err) {
            console.warn('[GuidePlayer] Failed to load saved size:', err);
        }
    }

    saveSize(width, height) {
        try {
            localStorage.setItem(GUIDE_PLAYER_SIZE_KEY, JSON.stringify({ width, height }));
        } catch (err) {
            console.warn('[GuidePlayer] Failed to save size:', err);
        }
    }

    initResizer() {
        if (!this.playerWindow || !this.resizeHandle) return;

        let isResizing = false;
        let startX = 0;
        let startY = 0;
        let startWidth = 0;
        let startHeight = 0;

        const onMouseMove = (event) => {
            if (!isResizing) return;

            const deltaX = startX - event.clientX;
            const deltaY = startY - event.clientY;
            const maxWidth = Math.min(window.innerWidth * 0.9, window.innerWidth - 32);
            const maxHeight = Math.min(window.innerHeight * 0.7, window.innerHeight - 120);
            const width = Math.max(GUIDE_PLAYER_MIN_WIDTH, Math.min(maxWidth, startWidth + deltaX));
            const height = Math.max(GUIDE_PLAYER_MIN_HEIGHT, Math.min(maxHeight, startHeight + deltaY));

            document.documentElement.style.setProperty('--guide-player-width', `${width}px`);
            document.documentElement.style.setProperty('--guide-player-dock-height', `${height}px`);
        };

        const onMouseUp = () => {
            if (!isResizing) return;
            isResizing = false;
            this.resizeHandle.classList.remove('active');
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const width = this.playerWindow.getBoundingClientRect().width;
            const height = this.playerDock?.getBoundingClientRect().height || GUIDE_PLAYER_MIN_HEIGHT;
            this.saveSize(Math.round(width), Math.round(height));
        };

        this.resizeHandle.addEventListener('mousedown', (event) => {
            isResizing = true;
            startX = event.clientX;
            startY = event.clientY;
            startWidth = this.playerWindow.getBoundingClientRect().width;
            startHeight = this.playerDock?.getBoundingClientRect().height || GUIDE_PLAYER_MIN_HEIGHT;
            this.resizeHandle.classList.add('active');
            document.body.style.cursor = 'nwse-resize';
            event.preventDefault();
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    }
}

window.GuidePlayerController = GuidePlayerController;