/**
 * Guide Page Controller
 */

class GuidePage {
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
        this.currentChannel = null;
        this.playerHidden = true;

        this.closeBtn?.addEventListener('click', () => {
            this.closeGuidePlayer();
        });
        this.stopBtn?.addEventListener('click', () => {
            this.closeGuidePlayer({ stopPlayback: true });
        });
        this.restoreBtn?.addEventListener('click', () => {
            this.showGuidePlayer(this.app.player?.currentChannel || this.currentChannel);
        });

        window.addEventListener('nodecast:player-starting', (e) => {
            this.currentChannel = e.detail.channel || this.currentChannel;
            this.showGuidePlayer(this.currentChannel);
            this.updatePlayerStatus('Loading');
            this.app.epgGuide?.setPlayingChannel?.(this.currentChannel);
        });
        window.addEventListener('nodecast:player-playing', (e) => {
            this.currentChannel = e.detail.channel || this.currentChannel;
            this.showGuidePlayer(this.currentChannel);
            this.updatePlayerStatus('Playing');
            this.app.epgGuide?.setPlayingChannel?.(this.currentChannel);
        });
        window.addEventListener('nodecast:player-status', (e) => {
            this.updatePlayerStatus(e.detail.text || e.detail.mode || 'Playing');
        });
        window.addEventListener('nodecast:player-error', (e) => {
            this.currentChannel = e.detail.channel || this.currentChannel;
            this.showGuidePlayer(this.currentChannel);
            this.updatePlayerStatus(e.detail.message || 'Playback error', 'error');
        });
        window.addEventListener('nodecast:player-stopped', () => {
            this.currentChannel = null;
            this.updatePlayerStatus('Stopped');
            this.closeGuidePlayer();
            this.restoreBtn?.classList.add('hidden');
            this.app.epgGuide?.setPlayingChannel?.(null);
        });
    }

    async init() {
        // EPG guide will lazy load when shown
    }

    showGuidePlayer(channel = null) {
        const videoContainer = document.getElementById('video-container');
        if (!this.playerWindow || !this.playerDock || !videoContainer) return;

        this.currentChannel = channel || this.currentChannel;
        this.playerDock.appendChild(videoContainer);
        this.playerWindow.classList.remove('hidden');
        this.restoreBtn?.classList.add('hidden');
        this.playerHidden = false;

        if (this.playerTitle) {
            this.playerTitle.textContent = this.currentChannel?.name || this.currentChannel?.tvgName || 'Live TV';
        }

        if (this.app.player?.currentChannel) {
            this.app.epgGuide?.setPlayingChannel?.(this.app.player.currentChannel);
        }
    }

    closeGuidePlayer({ stopPlayback = false } = {}) {
        const videoContainer = document.getElementById('video-container');
        if (this.liveDock && videoContainer && videoContainer.parentElement !== this.liveDock.parentElement) {
            this.liveDock.insertAdjacentElement('afterend', videoContainer);
        }

        this.playerWindow?.classList.add('hidden');
        this.playerHidden = true;

        if (stopPlayback) {
            this.app.player?.stop();
            this.restoreBtn?.classList.add('hidden');
        } else if (this.app.currentPage === 'guide' && (this.app.player?.currentChannel || this.currentChannel)) {
            this.restoreBtn?.classList.remove('hidden');
        } else {
            this.restoreBtn?.classList.add('hidden');
        }
    }

    updatePlayerStatus(text, tone = '') {
        if (!this.playerStatus) return;
        this.playerStatus.textContent = text;
        this.playerStatus.classList.toggle('error', tone === 'error');
    }

    async show() {
        // Ensure channel data is loaded before rendering EPG
        // This fixes a race condition where navigating directly to the Guide page
        // before visiting Live TV would result in an empty EPG.
        const channelList = this.app.channelList;
        if (!channelList.channels || channelList.channels.length === 0) {
            await channelList.loadSources();
            await channelList.loadChannels();
        }

        // Only load EPG data if not already loaded
        if (!this.app.epgGuide.programmes || this.app.epgGuide.programmes.length === 0) {
            await this.app.epgGuide.loadEpg();
        } else {
            // Just re-render with existing data (updates time position)
            this.app.epgGuide.render();
        }

        if (this.app.player?.currentChannel) {
            this.showGuidePlayer(this.app.player.currentChannel);
        } else {
            this.restoreBtn?.classList.add('hidden');
        }
    }

    hide() {
        this.closeGuidePlayer();
    }
}

window.GuidePage = GuidePage;
